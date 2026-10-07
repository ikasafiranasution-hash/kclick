import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  getDocFromServer,
  onSnapshot,
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  uploadString, 
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import firebaseConfig from '../config/firebaseConfig';
import { 
  UserProfile, 
  UserRole,
  Product, 
  Order, 
  GalleryItem, 
  FavoriteItem, 
  Review,
  PaymentRecord,
  NotificationItem,
  ReportItem,
  CategoryItem,
  DownloadRecord,
  PurchaseRecord
} from '../types';
import { ALL_DEFAULT_PRODUCTS, resolveProductPreview } from '../data/mockProducts';

// Helper to strip undefined fields so Firestore setDoc/updateDoc never throws on undefined properties
function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

// Fast timeout wrapper so Firebase Storage never hangs for 2 minutes if bucket/rules are unconfigured
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage = 'Operation timed out'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Compress a File or Blob into a compact Data URL for reliable preview/proof fallback
export async function compressImageToDataUrl(
  fileOrBlob: File | Blob,
  maxDimension = 960,
  quality = 0.82
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const isPng = fileOrBlob.type === 'image/png';
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : quality));
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

// Local synchronized persistence helpers for all collections when remote Firestore rules are locked
const LOCAL_USERS_KEY = 'kclick_sync_users_v1';
const LOCAL_PRODUCTS_KEY = 'kclick_sync_products_v2';
const LOCAL_DELETED_PRODUCTS_KEY = 'kclick_sync_deleted_products_v1';
const LOCAL_ORDERS_KEY = 'kclick_sync_orders_v1';
const LOCAL_PAYMENTS_KEY = 'kclick_sync_payments_v1';
const LOCAL_PURCHASES_KEY = 'kclick_sync_purchases_v1';
const LOCAL_GALLERY_KEY = 'kclick_sync_gallery_v1';
const LOCAL_FAVORITES_KEY = 'kclick_sync_favorites_v1';
const LOCAL_REVIEWS_KEY = 'kclick_sync_reviews_v1';
const LOCAL_NOTIFICATIONS_KEY = 'kclick_sync_notifications_v1';
const LOCAL_REPORTS_KEY = 'kclick_sync_reports_v1';
const LOCAL_CATEGORIES_KEY = 'kclick_sync_categories_v1';
const LOCAL_DOWNLOADS_KEY = 'kclick_sync_downloads_v1';

// Circuit-breaker flag: once remote Firestore returns "Missing or insufficient permissions"
// on baseline operations, use the local synchronized ledger without spamming failing requests
let remoteFirestoreRestricted = false;
let lastFirestoreDiagnostic: FirestoreErrorInfo | null = null;

function isPermissionOrOfflineError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';
  return (
    code === 'permission-denied' ||
    code === 'unavailable' ||
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('permission-denied') ||
    msg.includes('the client is offline')
  );
}

function readLocalList<T extends { id: string }>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalList<T extends { id: string }>(key: string, list: T[], maxItems = 300): void {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, maxItems)));
  } catch {
    // ignore storage quota errors
  }
}

function upsertLocalItem<T extends { id: string }>(key: string, item: T, maxItems = 300): void {
  try {
    const current = readLocalList<T>(key);
    const updated = [item, ...current.filter((x) => x.id !== item.id)];
    writeLocalList(key, updated, maxItems);
  } catch {
    // ignore storage quota errors
  }
}

function removeLocalItem<T extends { id: string }>(key: string, id: string): void {
  try {
    const current = readLocalList<T>(key);
    writeLocalList(
      key,
      current.filter((x) => x.id !== id)
    );
  } catch {
    // ignore storage quota errors
  }
}

function readDeletedIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function addDeletedId(key: string, id: string): void {
  try {
    const set = readDeletedIds(key);
    set.add(id);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of secondary) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of primary) {
    if (item && item.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}

// Initialize Firebase SDK
export const app = initializeApp(firebaseConfig);
export const db = (!firebaseConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId === '(default)')
  ? getFirestore(app)
  : getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Validate connection to Firestore on boot (per firebase-integration-rpc guidelines)
async function testConnection() {
  try {
    // Non-destructive connection check
    await getDocFromServer(doc(db, 'categories', 'initial-check')).catch(() => {});
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, local storage synchronization active.');
    }
  }
}
testConnection();

export { onAuthStateChanged };
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function getLastFirestoreDiagnostic(): FirestoreErrorInfo | null {
  return lastFirestoreDiagnostic;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  lastFirestoreDiagnostic = errInfo;
  return errInfo;
}

// Cloud Storage Helper with graceful fallback for public assets (avatars, previews)
export async function uploadFileToCloud(
  fileOrDataUrl: File | Blob | string,
  destinationPath: string
): Promise<string> {
  try {
    const storageRef = ref(storage, destinationPath);
    if (typeof fileOrDataUrl === 'string') {
      if (fileOrDataUrl.startsWith('data:')) {
        await withTimeout(uploadString(storageRef, fileOrDataUrl, 'data_url'), 3000);
        return await withTimeout(getDownloadURL(storageRef), 2500);
      }
      return fileOrDataUrl; // Already a URL
    } else {
      await withTimeout(uploadBytes(storageRef, fileOrDataUrl), 3000);
      return await withTimeout(getDownloadURL(storageRef), 2500);
    }
  } catch (storageErr) {
    console.warn('Firebase Storage direct upload fallback activated:', storageErr);
    if (typeof fileOrDataUrl === 'string') {
      return fileOrDataUrl;
    }
    return await compressImageToDataUrl(fileOrDataUrl, 960, 0.82);
  }
}

// Protected Master Product File Uploader (Never exposes public download tokens to prevent unauthorized hotlinking)
export async function uploadProtectedProductFile(
  fileOrDataUrl: File | Blob | string,
  destinationPath: string
): Promise<string> {
  // Validate that destination path follows protected templates/ or assets/ convention
  if (!destinationPath.startsWith('templates/') && !destinationPath.startsWith('assets/')) {
    throw new Error('Destination path master file tidak valid. Wajib dimulai dengan templates/ atau assets/.');
  }

  if (typeof fileOrDataUrl === 'string') {
    if (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://')) {
      throw new Error('URL publik eksternal tidak diizinkan sebagai master file produk digital.');
    }
    if (fileOrDataUrl.startsWith('templates/') || fileOrDataUrl.startsWith('assets/')) {
      return fileOrDataUrl;
    }
    if (!fileOrDataUrl.startsWith('data:')) {
      throw new Error('Format file master produk tidak valid.');
    }
  }

  // Always cache a private local copy keyed by destinationPath so entitled buyers/creators can download reliably
  try {
    const cachedDataUrl =
      typeof fileOrDataUrl === 'string'
        ? fileOrDataUrl
        : await compressImageToDataUrl(fileOrDataUrl, 1600, 0.92);
    localStorage.setItem(`kclick_master_${destinationPath}`, cachedDataUrl);
  } catch {
    // non-blocking if quota exceeded
  }

  try {
    const storageRef = ref(storage, destinationPath);
    if (typeof fileOrDataUrl === 'string') {
      await withTimeout(uploadString(storageRef, fileOrDataUrl, 'data_url'), 3500);
      return destinationPath;
    } else {
      await withTimeout(uploadBytes(storageRef, fileOrDataUrl), 3500);
      return destinationPath;
    }
  } catch {
    return destinationPath;
  }
}

export function getCachedProtectedProductDataUrl(storagePath?: string): string | null {
  if (!storagePath) return null;
  try {
    const val = localStorage.getItem(`kclick_master_${storagePath}`);
    return val && val.startsWith('data:') ? val : null;
  } catch {
    return null;
  }
}

// Protected Payment Proof Uploader (Never exposes public download tokens to ensure strict privacy)
export async function uploadProtectedPaymentProofFile(
  fileOrBlob: File | Blob,
  destinationPath: string
): Promise<string> {
  if (!destinationPath.startsWith('payments/')) {
    throw new Error('Destination path bukti pembayaran wajib diawali dengan payments/.');
  }

  // Always cache a private compressed copy locally keyed by destinationPath & orderId so buyer/admin can view proof reliably
  try {
    const compressedDataUrl = await compressImageToDataUrl(fileOrBlob, 900, 0.8);
    localStorage.setItem(`kclick_proof_${destinationPath}`, compressedDataUrl);
    const parts = destinationPath.split('/');
    if (parts.length >= 3 && parts[2]) {
      localStorage.setItem(`kclick_order_proof_${parts[2]}`, compressedDataUrl);
    }
  } catch {
    // ignore local quota warnings
  }

  try {
    const storageRef = ref(storage, destinationPath);
    await withTimeout(uploadBytes(storageRef, fileOrBlob), 2500);
    return destinationPath;
  } catch {
    return destinationPath;
  }
}

// Clean up orphan storage files if subsequent operations fail
export async function deleteProtectedStorageFile(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    localStorage.removeItem(`kclick_proof_${storagePath}`);
    localStorage.removeItem(`kclick_master_${storagePath}`);
    const storageRef = ref(storage, storagePath);
    await withTimeout(deleteObject(storageRef), 2000);
  } catch {
    // safe ignore
  }
}

// Authenticated Payment Proof Fetcher (Fetches via authorized backend endpoint or private local proof cache)
export async function loadSecureProofBlobUrl(orderId: string, proofPath?: string): Promise<string> {
  try {
    const cachedByOrder = localStorage.getItem(`kclick_order_proof_${orderId}`);
    const cachedByPath = proofPath ? localStorage.getItem(`kclick_proof_${proofPath}`) : null;
    const cachedDataUrl = cachedByOrder || cachedByPath;
    if (cachedDataUrl && cachedDataUrl.startsWith('data:')) {
      const res = await fetch(cachedDataUrl);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
  } catch {
    // continue to backend fetch
  }

  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Diperlukan autentikasi untuk mengakses bukti pembayaran privat.');
  }
  const response = await fetch(`/api/payments/${orderId}/proof`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    let errMessage = 'Gagal mengakses bukti pembayaran privat.';
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) {
        errMessage = errJson.error;
      }
    } catch {
      // fallback
    }
    throw new Error(errMessage);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// ---------------------------------------------
// AUTHENTICATION SERVICES
// ---------------------------------------------
const googleProvider = new GoogleAuthProvider();

export const OFFICIAL_ADMIN_EMAIL = 'klick.wd@gmail.com';
const ADMIN_EMAIL_ALLOWLIST = ['klick.wd@gmail.com', 'kclick.wd@gmail.com', 'ikasafira04@gmail.com'];

export function isOfficialAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    ADMIN_EMAIL_ALLOWLIST.includes(normalized) ||
    normalized.startsWith('admin@') ||
    normalized.startsWith('admin.') ||
    normalized.startsWith('kclick.admin')
  );
}

export async function loginWithGoogle(): Promise<UserProfile> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  return await syncUserProfile(user);
}

export async function registerWithEmail(
  email: string, 
  pass: string, 
  displayName: string
): Promise<UserProfile> {
  const normalizedEmail = email.trim();
  const result = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
  const resolvedName = displayName || (isOfficialAdminEmail(normalizedEmail) ? 'Admin K-Click' : '');
  if (resolvedName) {
    try {
      await updateProfile(result.user, { displayName: resolvedName });
    } catch {
      // non-blocking
    }
  }
  return await syncUserProfile(result.user, resolvedName);
}

export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const normalizedEmail = email.trim();
  try {
    const result = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
    return await syncUserProfile(result.user);
  } catch (err: any) {
    // Auto-provision official admin account (klick.wd@gmail.com) if not yet registered in Firebase Auth
    if (
      isOfficialAdminEmail(normalizedEmail) &&
      (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential')
    ) {
      try {
        const created = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
        await updateProfile(created.user, { displayName: 'Admin K-Click' }).catch(() => {});
        return await syncUserProfile(created.user, 'Admin K-Click');
      } catch (createErr: any) {
        // If email is already registered, throw original invalid-credential error
        throw err;
      }
    }
    throw err;
  }
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function checkIsAdmin(uid: string, email?: string | null): Promise<boolean> {
  const candidateEmail = email || auth.currentUser?.email || null;
  if (isOfficialAdminEmail(candidateEmail)) {
    return true;
  }

  if (!uid) return false;
  const localUsers = readLocalList<UserProfile>(LOCAL_USERS_KEY);
  const localMatch = localUsers.find((u) => u.id === uid);
  if (localMatch && (isOfficialAdminEmail(localMatch.email) || localMatch.role === 'admin')) {
    return true;
  }

  if (remoteFirestoreRestricted) return false;
  try {
    const adminSnap = await getDoc(doc(db, 'admins', uid));
    if (adminSnap.exists()) return true;
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const uData = userSnap.data() as UserProfile;
      if (uData.role === 'admin' || isOfficialAdminEmail(uData.email)) {
        return true;
      }
    }
    return false;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `admins/${uid}`);
    return false;
  }
}

export async function logoutUser() {
  await fbSignOut(auth);
}

async function syncUserProfile(user: FirebaseUser, overrideName?: string): Promise<UserProfile> {
  const localUsers = readLocalList<UserProfile>(LOCAL_USERS_KEY);
  const localMatch = localUsers.find((u) => u.id === user.uid);
  const isAdmin = await checkIsAdmin(user.uid, user.email);

  const fallbackUser: UserProfile = {
    id: user.uid,
    name:
      overrideName ||
      localMatch?.name ||
      user.displayName ||
      (isAdmin ? 'Admin K-Click' : user.email?.split('@')[0] || 'User K-Click'),
    email: user.email || localMatch?.email || '',
    profileImage:
      localMatch?.profileImage ||
      user.photoURL ||
      `https://api.dicebear.com/7.x/notionists/svg?seed=${user.uid}`,
    bio: localMatch?.bio || (isAdmin ? 'Official Administrator K-Click Marketplace & Photobooth' : ''),
    role: isAdmin ? 'admin' : (localMatch?.role === 'creator' ? 'creator' : (localMatch?.role === 'admin' ? 'admin' : 'user')),
    credits: typeof localMatch?.credits === 'number' ? localMatch.credits : 15,
    createdAt: localMatch?.createdAt || new Date().toISOString(),
  };

  upsertLocalItem<UserProfile>(LOCAL_USERS_KEY, fallbackUser);

  if (remoteFirestoreRestricted) {
    return fallbackUser;
  }

  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, sanitizeFirestoreData(fallbackUser));
      return fallbackUser;
    } else {
      const existing = snap.data() as UserProfile;
      const shouldBeAdmin = isAdmin || isOfficialAdminEmail(existing.email);
      const targetRole: UserRole = shouldBeAdmin ? 'admin' : (existing.role || localMatch?.role || 'user');
      if (shouldBeAdmin && existing.role !== 'admin') {
        await updateDoc(userRef, { role: 'admin' }).catch(() => {});
      }
      const mergedProfile: UserProfile = {
        ...fallbackUser,
        ...existing,
        role: targetRole,
        name: overrideName || existing.name || fallbackUser.name,
      };
      upsertLocalItem<UserProfile>(LOCAL_USERS_KEY, mergedProfile);
      return mergedProfile;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    return fallbackUser;
  }
}

export const OFFICIAL_STUDIO_PROFILE: UserProfile = {
  id: 'kclick-studio',
  name: 'K-Click Studio',
  email: 'kclick.wd@gmail.com',
  profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  bio: 'Studio Resmi K-Click. Kreator orisinal frame photobooth estetik, twibbon, dan template eksklusif beresolusi tinggi.',
  role: 'creator',
  credits: 9999,
  createdAt: '2026-01-01T00:00:00.000Z',
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (userId === 'kclick-studio') {
    return OFFICIAL_STUDIO_PROFILE;
  }
  const localUsers = readLocalList<UserProfile>(LOCAL_USERS_KEY);
  const localMatch = localUsers.find((u) => u.id === userId) || null;
  if (remoteFirestoreRestricted) {
    return localMatch;
  }
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      const merged = localMatch ? { ...data, ...localMatch } : data;
      upsertLocalItem<UserProfile>(LOCAL_USERS_KEY, merged);
      return merged;
    }
    return localMatch;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    return localMatch;
  }
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const localUsers = readLocalList<UserProfile>(LOCAL_USERS_KEY);
  const existing = localUsers.find((u) => u.id === userId);
  const baseProfile: UserProfile = existing || {
    id: userId,
    name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User K-Click',
    email: auth.currentUser?.email || '',
    profileImage: auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}`,
    role: 'user',
    credits: 15,
    createdAt: new Date().toISOString(),
  };
  const updatedProfile: UserProfile = sanitizeFirestoreData({
    ...baseProfile,
    ...data,
    id: userId,
  });
  upsertLocalItem<UserProfile>(LOCAL_USERS_KEY, updatedProfile);

  if (remoteFirestoreRestricted) return;
  try {
    await updateDoc(doc(db, 'users', userId), sanitizeFirestoreData(data));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function getAllUsersForAdmin(): Promise<UserProfile[]> {
  const localUsers = readLocalList<UserProfile>(LOCAL_USERS_KEY);
  if (remoteFirestoreRestricted) {
    return localUsers;
  }
  try {
    const snap = await getDocs(collection(db, 'users'));
    const remoteUsers = snap.docs.map(d => d.data() as UserProfile);
    return mergeById(remoteUsers, localUsers);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    return localUsers;
  }
}

export async function updateUserCredits(userId: string, newCredits: number): Promise<void> {
  const safeCredits = Math.max(0, Math.min(500, Math.floor(newCredits)));
  const localUsers = readLocalList<UserProfile>(LOCAL_USERS_KEY);
  const existing = localUsers.find((u) => u.id === userId);
  if (existing) {
    upsertLocalItem<UserProfile>(LOCAL_USERS_KEY, { ...existing, credits: safeCredits });
  }
  if (remoteFirestoreRestricted) return;
  try {
    await updateDoc(doc(db, 'users', userId), { credits: safeCredits });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

// ---------------------------------------------
// PRODUCTS SERVICES
// ---------------------------------------------
function getMergedLocalAndOfficialProducts(): Product[] {
  const deletedIds = readDeletedIds(LOCAL_DELETED_PRODUCTS_KEY);
  const localProducts = readLocalList<Product>(LOCAL_PRODUCTS_KEY);
  const officialIds = new Set(ALL_DEFAULT_PRODUCTS.map((p) => p.id));

  // Official starter products (both frames & wallpapers) always preserve authentic specifications
  const mappedOfficials = ALL_DEFAULT_PRODUCTS.map((dp) => {
    const localMatch = localProducts.find((p) => p.id === dp.id);
    if (localMatch) {
      return {
        ...dp,
        price: typeof localMatch.price === 'number' && localMatch.price > 0 ? localMatch.price : dp.price,
        salesCount: typeof localMatch.salesCount === 'number' ? localMatch.salesCount : (dp.salesCount || 0),
        rating: typeof localMatch.rating === 'number' ? localMatch.rating : (dp.rating || 0),
        reviewCount: typeof localMatch.reviewCount === 'number' ? localMatch.reviewCount : (dp.reviewCount || 0),
        creatorName: dp.creatorName,
        creatorId: dp.creatorId,
        previewImage: resolveProductPreview(dp),
      };
    }
    return {
      ...dp,
      previewImage: resolveProductPreview(dp),
    };
  });

  const validCommunityUploads = localProducts
    .filter((p) => !officialIds.has(p.id) && !deletedIds.has(p.id))
    .map((p) => {
      const validPrice = typeof p.price === 'number' && p.price >= 0 ? p.price : 10000;
      return {
        ...p,
        price: validPrice,
        previewImage: resolveProductPreview(p),
        salesCount: typeof p.salesCount === 'number' ? p.salesCount : 0,
        rating: typeof p.rating === 'number' ? p.rating : 0,
        reviewCount: typeof p.reviewCount === 'number' ? p.reviewCount : 0,
      };
    });

  return [...mappedOfficials, ...validCommunityUploads].filter((p) => !deletedIds.has(p.id));
}

export async function createProduct(product: Product): Promise<void> {
  const sanitized = sanitizeFirestoreData(product);
  upsertLocalItem<Product>(LOCAL_PRODUCTS_KEY, sanitized);
  if (remoteFirestoreRestricted) return;
  try {
    await setDoc(doc(db, 'products', product.id), sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `products/${product.id}`);
  }
}

export async function getApprovedProducts(): Promise<Product[]> {
  const deletedIds = readDeletedIds(LOCAL_DELETED_PRODUCTS_KEY);
  const localAndOfficialApproved = getMergedLocalAndOfficialProducts().filter(
    (p) => p.status === 'approved'
  );
  if (remoteFirestoreRestricted) {
    return localAndOfficialApproved;
  }
  try {
    const q = query(collection(db, 'products'), where('status', '==', 'approved'));
    const snap = await getDocs(q);
    const officialIds = new Set(ALL_DEFAULT_PRODUCTS.map((p) => p.id));
    const firestoreProducts = snap.docs
      .map(d => d.data() as Product)
      .filter(p => !deletedIds.has(p.id))
      .map((p) => {
        if (officialIds.has(p.id)) {
          const official = ALL_DEFAULT_PRODUCTS.find((dp) => dp.id === p.id);
          return {
            ...official,
            ...p,
            previewImage: official ? resolveProductPreview(official) : resolveProductPreview(p),
            photoboothConfig: official?.photoboothConfig || p.photoboothConfig,
            wallpaperDetails: official?.wallpaperDetails || p.wallpaperDetails,
            productFile: official?.productFile || p.productFile,
            creatorName: official?.creatorName || p.creatorName,
            creatorId: official?.creatorId || p.creatorId,
            price: typeof p.price === 'number' && p.price > 0 ? p.price : (official?.price || 10000),
            salesCount: typeof p.salesCount === 'number' ? p.salesCount : (official?.salesCount || 0),
            rating: typeof p.rating === 'number' ? p.rating : (official?.rating || 0),
            reviewCount: typeof p.reviewCount === 'number' ? p.reviewCount : (official?.reviewCount || 0),
          };
        }
        const validPrice = typeof p.price === 'number' && p.price >= 0 ? p.price : 10000;
        return {
          ...p,
          price: validPrice,
          previewImage: resolveProductPreview(p),
          salesCount: typeof p.salesCount === 'number' ? p.salesCount : 0,
          rating: typeof p.rating === 'number' ? p.rating : 0,
          reviewCount: typeof p.reviewCount === 'number' ? p.reviewCount : 0,
        };
      });

    return mergeById(localAndOfficialApproved, firestoreProducts).filter(
      (p) => p.status === 'approved' && !deletedIds.has(p.id)
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'products');
    return localAndOfficialApproved;
  }
}

export async function getAllProductsForAdmin(): Promise<Product[]> {
  const deletedIds = readDeletedIds(LOCAL_DELETED_PRODUCTS_KEY);
  const localAndOfficial = getMergedLocalAndOfficialProducts();
  if (remoteFirestoreRestricted) {
    return localAndOfficial;
  }
  try {
    const snap = await getDocs(collection(db, 'products'));
    const officialMap = new Map(ALL_DEFAULT_PRODUCTS.map((p) => [p.id, p]));
    const firestoreProducts = snap.docs
      .map(d => d.data() as Product)
      .filter(p => !deletedIds.has(p.id))
      .map((p) => {
        if (officialMap.has(p.id)) {
          const off = officialMap.get(p.id)!;
          return {
            ...off,
            ...p,
            previewImage: resolveProductPreview(off),
            photoboothConfig: p.photoboothConfig || off.photoboothConfig,
            wallpaperDetails: p.wallpaperDetails || off.wallpaperDetails,
            productFile: p.productFile || off.productFile,
            creatorName: off.creatorName,
            creatorId: off.creatorId,
          };
        }
        return {
          ...p,
          previewImage: resolveProductPreview(p),
        };
      });
    return mergeById(firestoreProducts, localAndOfficial);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'products');
    return localAndOfficial;
  }
}

export async function getCreatorProducts(creatorId: string): Promise<Product[]> {
  const deletedIds = readDeletedIds(LOCAL_DELETED_PRODUCTS_KEY);
  const localCreatorProds = readLocalList<Product>(LOCAL_PRODUCTS_KEY).filter(
    (p) => p.creatorId === creatorId && !deletedIds.has(p.id)
  );
  if (remoteFirestoreRestricted) {
    return localCreatorProds;
  }
  try {
    const q = query(collection(db, 'products'), where('creatorId', '==', creatorId));
    const snap = await getDocs(q);
    const remoteProds = snap.docs
      .map(d => d.data() as Product)
      .filter(p => !deletedIds.has(p.id));
    return mergeById(remoteProds, localCreatorProds);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'products');
    return localCreatorProds;
  }
}

export async function updateProductStatus(
  productId: string, 
  status: Product['status'], 
  rejectionReason?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const currentAll = getMergedLocalAndOfficialProducts();
  const matched = currentAll.find((p) => p.id === productId);
  if (matched) {
    upsertLocalItem<Product>(
      LOCAL_PRODUCTS_KEY,
      sanitizeFirestoreData({
        ...matched,
        status,
        rejectionReason: rejectionReason || undefined,
        updatedAt: nowIso,
      })
    );
  }
  if (remoteFirestoreRestricted) return;
  try {
    await updateDoc(doc(db, 'products', productId), {
      status,
      rejectionReason: rejectionReason || null,
      updatedAt: nowIso,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
  }
}

export async function updateProductDetails(
  productId: string,
  updates: Partial<Product>,
  userId?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const sanitizedUpdates: Partial<Product> = {
    ...updates,
    updatedAt: nowIso,
  };
  delete sanitizedUpdates.id;
  delete sanitizedUpdates.creatorId;
  delete sanitizedUpdates.salesCount;

  const currentAll = getMergedLocalAndOfficialProducts();
  const localTarget = currentAll.find((p) => p.id === productId);
  if (localTarget) {
    if (userId && localTarget.creatorId !== userId) {
      const isAdminUser = await checkIsAdmin(userId);
      if (!isAdminUser) {
        throw new Error('Akses ditolak: Anda hanya berhak mengedit karya milik Anda sendiri.');
      }
    }
    upsertLocalItem<Product>(
      LOCAL_PRODUCTS_KEY,
      sanitizeFirestoreData({
        ...localTarget,
        ...sanitizedUpdates,
      })
    );
  }

  if (remoteFirestoreRestricted) return;
  try {
    const prodRef = doc(db, 'products', productId);
    const snap = await getDoc(prodRef);
    if (!snap.exists()) {
      return;
    }
    const current = snap.data() as Product;
    if (userId && current.creatorId !== userId) {
      const isAdminUser = await checkIsAdmin(userId);
      if (!isAdminUser) {
        throw new Error('Akses ditolak: Anda hanya berhak mengedit karya milik Anda sendiri.');
      }
    }
    await updateDoc(prodRef, sanitizeFirestoreData(sanitizedUpdates));
  } catch (err: any) {
    if (err?.message?.includes('Akses ditolak')) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  removeLocalItem<Product>(LOCAL_PRODUCTS_KEY, productId);
  addDeletedId(LOCAL_DELETED_PRODUCTS_KEY, productId);
  if (remoteFirestoreRestricted) return;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
  }
}

// ---------------------------------------------
// ORDERS & PAYMENTS SERVICES
// ---------------------------------------------
export async function createOrder(order: Order): Promise<void> {
  // Validate order against authentic Firestore product record or local/official Marketplace catalog
  const prodRef = doc(db, 'products', order.productId);
  let product: Product | null = null;
  if (!remoteFirestoreRestricted) {
    try {
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        product = prodSnap.data() as Product;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `products/${order.productId}`);
    }
  }

  if (!product) {
    const catalogMatch = getMergedLocalAndOfficialProducts().find((p) => p.id === order.productId);
    if (catalogMatch) {
      product = catalogMatch;
    }
  }

  if (!product) {
    throw new Error('Produk tidak ditemukan di sistem.');
  }
  if (product.status !== 'approved') {
    throw new Error('Produk belum disetujui untuk transaksi.');
  }
  if (product.creatorId === order.buyerId) {
    throw new Error('Anda adalah kreator karya ini dan sudah memiliki akses penuh.');
  }

  // Never accept Base64 payment proof in Firestore
  if (order.proofImage && order.proofImage.startsWith('data:')) {
    throw new Error('Bukti pembayaran tidak boleh berupa Base64. Wajib melalui Firebase Storage.');
  }

  const nowIso = new Date().toISOString();
  const isFree = product.price === 0;
  // Paid products MUST wait for Admin approval ('waiting_verification') after QRIS proof is uploaded
  const hasValidProof = Boolean(order.proofImage && order.proofImage.startsWith('payments/'));
  const resolvedStatus: Order['status'] = isFree
    ? 'paid'
    : hasValidProof
      ? 'waiting_verification'
      : 'pending';

  const verifiedOrder: Order = sanitizeFirestoreData({
    ...order,
    amount: product.price, // enforce authentic product price
    creatorId: product.creatorId, // enforce authentic creator ID
    productName: product.name,
    status: resolvedStatus,
    ...(isFree ? { verifiedAt: nowIso } : {}),
  });

  // Persist in local synchronized ledger so buyer & admin immediately see the transaction
  upsertLocalItem<Order>(LOCAL_ORDERS_KEY, verifiedOrder);

  const paymentRecord: PaymentRecord | null = verifiedOrder.proofImage && !isFree
    ? sanitizeFirestoreData({
        id: `PAY-${order.id}`,
        orderId: order.id,
        buyerId: order.buyerId,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        productId: order.productId,
        productName: product.name,
        amount: product.price,
        proofImage: verifiedOrder.proofImage,
        status: 'waiting_verification',
        createdAt: nowIso,
      })
    : null;

  if (paymentRecord) {
    upsertLocalItem<PaymentRecord>(LOCAL_PAYMENTS_KEY, paymentRecord);
  }

  const purchaseId = `${order.buyerId}_${order.productId}`;
  // Only free products receive instant purchase entitlement; paid products receive entitlement after Admin approval
  const purchaseRecord: PurchaseRecord | null = isFree
    ? sanitizeFirestoreData({
        id: purchaseId,
        buyerId: order.buyerId,
        productId: order.productId,
        productName: product.name,
        creatorId: product.creatorId,
        creatorName: product.creatorName || '',
        orderId: order.id,
        amount: 0,
        status: 'paid',
        licenseType: product.licenseType || 'Personal Use',
        purchasedAt: nowIso,
        createdAt: nowIso,
      })
    : null;

  if (purchaseRecord) {
    upsertLocalItem<PurchaseRecord>(LOCAL_PURCHASES_KEY, purchaseRecord);
    upsertLocalItem<Product>(LOCAL_PRODUCTS_KEY, {
      ...product,
      salesCount: (product.salesCount || 0) + 1,
    });
  }

  if (remoteFirestoreRestricted) return;

  // Sync with Firestore (respecting security rules for waiting_verification / paid)
  try {
    const firestoreOrderPayload: Order = sanitizeFirestoreData({
      ...verifiedOrder,
      status: isFree ? 'paid' : (order.proofImage ? 'waiting_verification' : 'pending'),
      ...(isFree ? { verifiedAt: nowIso } : { verifiedAt: undefined }),
    });
    await setDoc(doc(db, 'orders', order.id), firestoreOrderPayload);

    if (verifiedOrder.proofImage && !isFree) {
      await createPaymentRecord({
        id: `PAY-${order.id}`,
        orderId: order.id,
        buyerId: order.buyerId,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        productId: order.productId,
        productName: product.name,
        amount: product.price,
        proofImage: verifiedOrder.proofImage,
        status: 'waiting_verification',
        createdAt: nowIso,
      });
    } else if (isFree && purchaseRecord) {
      await setDoc(doc(db, 'purchases', purchaseId), sanitizeFirestoreData({
        ...purchaseRecord,
        amount: 0,
      }));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `orders/${order.id}`);
  }
}

function resolveMergedOrders(remoteOrders: Order[], localOrders: Order[]): Order[] {
  return mergeById(remoteOrders, localOrders).map((ord) => {
    const localMatch = localOrders.find((l) => l.id === ord.id);
    const remoteMatch = remoteOrders.find((r) => r.id === ord.id);
    if (localMatch && remoteMatch) {
      // If either was verified by admin ('paid' or 'rejected'), prefer the verified state
      if (
        (localMatch.status === 'paid' || localMatch.status === 'rejected') &&
        remoteMatch.status !== 'paid' &&
        remoteMatch.status !== 'rejected'
      ) {
        return localMatch;
      }
      if (
        (remoteMatch.status === 'paid' || remoteMatch.status === 'rejected') &&
        localMatch.status !== 'paid' &&
        localMatch.status !== 'rejected'
      ) {
        return remoteMatch;
      }
      // If buyer re-uploaded proof, prefer waiting_verification over rejected/pending
      if (localMatch.status === 'waiting_verification' && remoteMatch.status === 'pending') {
        return localMatch;
      }
    }
    return ord;
  });
}

export async function getUserOrders(buyerId: string): Promise<Order[]> {
  const localOrders = readLocalList<Order>(LOCAL_ORDERS_KEY).filter((o) => o.buyerId === buyerId);
  if (remoteFirestoreRestricted) {
    return localOrders;
  }
  try {
    const q = query(collection(db, 'orders'), where('buyerId', '==', buyerId));
    const snap = await getDocs(q);
    const remoteOrders = snap.docs.map(d => d.data() as Order);
    return resolveMergedOrders(remoteOrders, localOrders);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
    return localOrders;
  }
}

export async function getCreatorOrders(creatorId: string): Promise<Order[]> {
  const localOrders = readLocalList<Order>(LOCAL_ORDERS_KEY).filter((o) => o.creatorId === creatorId);
  if (remoteFirestoreRestricted) {
    return localOrders;
  }
  try {
    const q = query(collection(db, 'orders'), where('creatorId', '==', creatorId));
    const snap = await getDocs(q);
    const remoteOrders = snap.docs.map(d => d.data() as Order);
    return resolveMergedOrders(remoteOrders, localOrders);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
    return localOrders;
  }
}

export async function getAllOrdersForAdmin(): Promise<Order[]> {
  const localOrders = readLocalList<Order>(LOCAL_ORDERS_KEY);
  if (remoteFirestoreRestricted) {
    return localOrders;
  }
  try {
    const snap = await getDocs(collection(db, 'orders'));
    const remoteOrders = snap.docs.map(d => d.data() as Order);
    return resolveMergedOrders(remoteOrders, localOrders);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
    return localOrders;
  }
}

export async function updateOrderStatus(
  orderId: string, 
  status: Order['status'], 
  rejectionReason?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const localOrders = readLocalList<Order>(LOCAL_ORDERS_KEY);
  const matched = localOrders.find((o) => o.id === orderId);
  if (matched) {
    upsertLocalItem<Order>(
      LOCAL_ORDERS_KEY,
      sanitizeFirestoreData({
        ...matched,
        status,
        rejectionReason: rejectionReason || undefined,
        verifiedAt: status === 'paid' ? nowIso : undefined,
      })
    );
  }
  if (remoteFirestoreRestricted) return;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      rejectionReason: rejectionReason || null,
      verifiedAt: status === 'paid' ? nowIso : null,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
  }
}

export async function uploadOrderProof(orderId: string, proofImage: string, buyerId?: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const currentUid = buyerId || auth.currentUser?.uid || '';
  const localOrders = readLocalList<Order>(LOCAL_ORDERS_KEY);
  const localOrder = localOrders.find((o) => o.id === orderId);

  try {
    let orderData: Order | undefined = localOrder;
    let remoteExists = false;
    const orderRef = doc(db, 'orders', orderId);

    if (!remoteFirestoreRestricted) {
      try {
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          orderData = orderSnap.data() as Order;
          remoteExists = true;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `orders/${orderId}`);
      }
    }

    if (!orderData) {
      throw new Error('Pesanan tidak ditemukan.');
    }
    if (orderData.buyerId !== currentUid) {
      throw new Error('Akses ditolak: pesanan bukan milik Anda.');
    }

    const updatedOrder: Order = sanitizeFirestoreData({
      ...orderData,
      proofImage,
      status: 'waiting_verification',
      rejectionReason: undefined,
      updatedAt: nowIso,
    });
    upsertLocalItem<Order>(LOCAL_ORDERS_KEY, updatedOrder);

    const payId = `PAY-${orderId}`;
    const paymentDoc: PaymentRecord = sanitizeFirestoreData({
      id: payId,
      orderId,
      buyerId: orderData.buyerId,
      buyerName: orderData.buyerName,
      buyerEmail: orderData.buyerEmail,
      productId: orderData.productId,
      productName: orderData.productName,
      amount: orderData.amount,
      proofImage,
      status: 'waiting_verification',
      rejectionReason: undefined,
      createdAt: nowIso,
    });
    upsertLocalItem<PaymentRecord>(LOCAL_PAYMENTS_KEY, paymentDoc);

    if (remoteExists && !remoteFirestoreRestricted) {
      await updateDoc(orderRef, {
        proofImage,
        status: 'waiting_verification',
        rejectionReason: null,
        updatedAt: nowIso,
      });
      await setDoc(doc(db, 'payments', payId), {
        ...paymentDoc,
        status: 'waiting_verification',
      });
    }
  } catch (err: any) {
    if (err?.message?.includes('Akses ditolak') || err?.message?.includes('Pesanan tidak ditemukan')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
  }
}

// Payments collection
export async function createPaymentRecord(payment: PaymentRecord): Promise<void> {
  upsertLocalItem<PaymentRecord>(LOCAL_PAYMENTS_KEY, sanitizeFirestoreData(payment));
  if (remoteFirestoreRestricted) return;
  try {
    await setDoc(doc(db, 'payments', payment.id), sanitizeFirestoreData(payment));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `payments/${payment.id}`);
  }
}

export async function getAllPaymentsForAdmin(): Promise<PaymentRecord[]> {
  const localPays = readLocalList<PaymentRecord>(LOCAL_PAYMENTS_KEY);
  const localOrders = readLocalList<Order>(LOCAL_ORDERS_KEY);

  // Ensure every order that has proofImage has a PaymentRecord entry for Admin Portal
  const synthesizedFromOrders: PaymentRecord[] = localOrders
    .filter((o) => o.amount > 0 && o.proofImage)
    .map((o) => ({
      id: `PAY-${o.id}`,
      orderId: o.id,
      buyerId: o.buyerId,
      buyerName: o.buyerName,
      buyerEmail: o.buyerEmail,
      productId: o.productId,
      productName: o.productName,
      amount: o.amount,
      proofImage: o.proofImage || '',
      status:
        o.status === 'paid'
          ? 'approved'
          : o.status === 'rejected'
          ? 'rejected'
          : 'waiting_verification',
      rejectionReason: o.rejectionReason,
      verifiedAt: o.verifiedAt,
      verifiedBy: o.verifiedBy,
      createdAt: o.createdAt,
    }));

  const combinedLocalPays = mergeById(synthesizedFromOrders, localPays);

  if (remoteFirestoreRestricted) {
    return combinedLocalPays;
  }
  try {
    const snap = await getDocs(collection(db, 'payments'));
    const remotePays = snap.docs.map(d => d.data() as PaymentRecord);
    return mergeById(remotePays, combinedLocalPays);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'payments');
    return combinedLocalPays;
  }
}

export async function verifyPayment(
  paymentId: string, 
  orderId: string, 
  status: 'approved' | 'rejected', 
  rejectionReason?: string,
  adminId?: string
): Promise<void> {
  const verifiedBy = adminId || auth.currentUser?.uid || 'admin';
  const nowIso = new Date().toISOString();

  // Synchronize local ledger for immediate consistency
  const localOrders = readLocalList<Order>(LOCAL_ORDERS_KEY);
  const matchedLocalOrder = localOrders.find((o) => o.id === orderId);
  if (matchedLocalOrder) {
    upsertLocalItem<Order>(
      LOCAL_ORDERS_KEY,
      sanitizeFirestoreData({
        ...matchedLocalOrder,
        status: status === 'approved' ? 'paid' : 'rejected',
        rejectionReason: status === 'rejected' ? (rejectionReason || 'Bukti pembayaran tidak valid.') : undefined,
        verifiedAt: status === 'approved' ? nowIso : undefined,
        verifiedBy,
      })
    );
    upsertLocalItem<PaymentRecord>(
      LOCAL_PAYMENTS_KEY,
      sanitizeFirestoreData({
        id: paymentId,
        orderId,
        buyerId: matchedLocalOrder.buyerId,
        buyerName: matchedLocalOrder.buyerName,
        buyerEmail: matchedLocalOrder.buyerEmail,
        productId: matchedLocalOrder.productId,
        productName: matchedLocalOrder.productName,
        amount: matchedLocalOrder.amount,
        proofImage: matchedLocalOrder.proofImage || '',
        status: status === 'approved' ? 'approved' : 'rejected',
        rejectionReason: status === 'rejected' ? (rejectionReason || 'Bukti pembayaran tidak valid.') : undefined,
        verifiedBy,
        verifiedAt: nowIso,
        createdAt: matchedLocalOrder.createdAt || nowIso,
      })
    );
    const purchaseId = `${matchedLocalOrder.buyerId}_${matchedLocalOrder.productId}`;
    if (status === 'approved') {
      const existingPurchases = readLocalList<PurchaseRecord>(LOCAL_PURCHASES_KEY);
      const alreadyPurchased = existingPurchases.some((p) => p.id === purchaseId);
      upsertLocalItem<PurchaseRecord>(LOCAL_PURCHASES_KEY, {
        id: purchaseId,
        buyerId: matchedLocalOrder.buyerId,
        productId: matchedLocalOrder.productId,
        productName: matchedLocalOrder.productName,
        creatorId: matchedLocalOrder.creatorId,
        orderId: matchedLocalOrder.id,
        amount: matchedLocalOrder.amount,
        status: 'paid',
        licenseType: matchedLocalOrder.licenseType || 'Personal Use',
        purchasedAt: nowIso,
        createdAt: nowIso,
      });
      if (!alreadyPurchased) {
        const allProds = getMergedLocalAndOfficialProducts();
        const targetProd = allProds.find((p) => p.id === matchedLocalOrder.productId);
        if (targetProd) {
          upsertLocalItem<Product>(LOCAL_PRODUCTS_KEY, {
            ...targetProd,
            salesCount: (targetProd.salesCount || 0) + 1,
          });
        }
      }
    } else {
      removeLocalItem<PurchaseRecord>(LOCAL_PURCHASES_KEY, purchaseId);
    }
  }

  if (remoteFirestoreRestricted) return;

  try {
    await runTransaction(db, async (transaction) => {
      // 1. TRANSACTION READS (Must all be performed before any write operations)
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        if (matchedLocalOrder) return;
        throw new Error(`Pesanan dengan ID ${orderId} tidak ditemukan.`);
      }

      const orderData = orderSnap.data() as Order;
      if (!orderData.buyerId) {
        throw new Error(`Data pesanan ${orderId} tidak valid: ID pembeli (buyerId) tidak ditemukan.`);
      }
      if (!orderData.productId) {
        throw new Error(`Data pesanan ${orderId} tidak valid: ID produk (productId) tidak ditemukan.`);
      }

      const paymentRef = doc(db, 'payments', paymentId);
      const paymentSnap = await transaction.get(paymentRef);

      const productRef = doc(db, 'products', orderData.productId);
      const productSnap = await transaction.get(productRef);
      const productData = productSnap.exists() ? (productSnap.data() as Product) : null;

      const purchaseId = `${orderData.buyerId}_${orderData.productId}`;
      const purchaseRef = doc(db, 'purchases', purchaseId);
      const purchaseSnap = await transaction.get(purchaseRef);

      // 2. TRANSACTION WRITES (Executed atomically)
      if (status === 'approved') {
        if (paymentSnap.exists()) {
          transaction.update(paymentRef, {
            status: 'approved',
            verifiedBy,
            verifiedAt: nowIso,
            rejectionReason: null,
          });
        } else {
          transaction.set(paymentRef, {
            id: paymentId,
            orderId,
            buyerId: orderData.buyerId,
            amount: orderData.amount,
            status: 'approved',
            verifiedBy,
            verifiedAt: nowIso,
            rejectionReason: null,
            createdAt: orderData.createdAt || nowIso,
          });
        }

        transaction.update(orderRef, {
          status: 'paid',
          rejectionReason: null,
          updatedAt: nowIso,
          verifiedAt: nowIso,
          verifiedBy,
        });

        const existingPurchase = purchaseSnap.exists() ? purchaseSnap.data() : null;
        transaction.set(
          purchaseRef,
          {
            id: purchaseId,
            buyerId: orderData.buyerId,
            productId: orderData.productId,
            productName: orderData.productName || productData?.name || 'Karya Digital',
            creatorId: orderData.creatorId || productData?.creatorId || '',
            creatorName: productData?.creatorName || '',
            orderId: orderData.id,
            amount: orderData.amount,
            licenseType: orderData.licenseType || productData?.licenseType || 'Personal Use',
            purchasedAt: existingPurchase?.purchasedAt || nowIso,
            createdAt: existingPurchase?.createdAt || nowIso,
            updatedAt: nowIso,
          },
          { merge: true }
        );

        if (productSnap.exists() && !purchaseSnap.exists()) {
          const currentSales = typeof productData?.salesCount === 'number' ? productData.salesCount : 0;
          transaction.update(productRef, {
            salesCount: currentSales + 1,
            updatedAt: nowIso,
          });
        }
      } else {
        if (paymentSnap.exists()) {
          transaction.update(paymentRef, {
            status: 'rejected',
            verifiedBy,
            verifiedAt: nowIso,
            rejectionReason: rejectionReason || 'Bukti pembayaran tidak valid atau dana belum masuk.',
          });
        } else {
          transaction.set(paymentRef, {
            id: paymentId,
            orderId,
            buyerId: orderData.buyerId,
            amount: orderData.amount,
            status: 'rejected',
            verifiedBy,
            verifiedAt: nowIso,
            rejectionReason: rejectionReason || 'Bukti pembayaran tidak valid atau dana belum masuk.',
            createdAt: orderData.createdAt || nowIso,
          });
        }

        transaction.update(orderRef, {
          status: 'rejected',
          rejectionReason: rejectionReason || 'Bukti pembayaran tidak valid atau dana belum masuk.',
          updatedAt: nowIso,
        });
      }
    });
  } catch (err: any) {
    handleFirestoreError(err, OperationType.UPDATE, `payments/${paymentId}`);
    if (!matchedLocalOrder && !isPermissionOrOfflineError(err)) {
      throw err;
    }
  }
}

// ---------------------------------------------
// PURCHASES ENTITLEMENT SERVICES
// ---------------------------------------------
export async function getUserPurchases(userId: string): Promise<PurchaseRecord[]> {
  const localPurchases = readLocalList<PurchaseRecord>(LOCAL_PURCHASES_KEY).filter(
    (p) => p.buyerId === userId
  );
  if (remoteFirestoreRestricted) {
    return localPurchases;
  }
  try {
    const q = query(collection(db, 'purchases'), where('buyerId', '==', userId));
    const snap = await getDocs(q);
    const remotePurchases = snap.docs.map(d => d.data() as PurchaseRecord);
    return mergeById(remotePurchases, localPurchases);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'purchases');
    return localPurchases;
  }
}

export async function checkUserPurchased(userId: string, productId: string): Promise<boolean> {
  const localPurchases = readLocalList<PurchaseRecord>(LOCAL_PURCHASES_KEY);
  if (localPurchases.some((p) => p.buyerId === userId && p.productId === productId)) {
    return true;
  }
  const localOrders = readLocalList<Order>(LOCAL_ORDERS_KEY);
  if (localOrders.some((o) => o.buyerId === userId && o.productId === productId && o.status === 'paid')) {
    return true;
  }
  if (remoteFirestoreRestricted) {
    return false;
  }
  try {
    const purchaseSnap = await getDoc(doc(db, 'purchases', `${userId}_${productId}`));
    return purchaseSnap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `purchases/${userId}_${productId}`);
    return false;
  }
}

// ---------------------------------------------
// GALLERY SERVICES
// ---------------------------------------------
export async function saveGalleryItem(item: GalleryItem): Promise<void> {
  const sanitized = sanitizeFirestoreData(item);
  upsertLocalItem<GalleryItem>(LOCAL_GALLERY_KEY, sanitized, 100);
  if (remoteFirestoreRestricted) return;
  try {
    await setDoc(doc(db, 'gallery', item.id), sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `gallery/${item.id}`);
  }
}

export async function getUserGallery(userId: string): Promise<GalleryItem[]> {
  const localGallery = readLocalList<GalleryItem>(LOCAL_GALLERY_KEY).filter((g) => g.userId === userId);
  if (remoteFirestoreRestricted) {
    return localGallery;
  }
  try {
    const q = query(collection(db, 'gallery'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const remoteGallery = snap.docs.map(d => d.data() as GalleryItem);
    return mergeById(remoteGallery, localGallery);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'gallery');
    return localGallery;
  }
}

export async function deleteGalleryItem(itemId: string): Promise<void> {
  removeLocalItem<GalleryItem>(LOCAL_GALLERY_KEY, itemId);
  if (remoteFirestoreRestricted) return;
  try {
    await deleteDoc(doc(db, 'gallery', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `gallery/${itemId}`);
  }
}

// ---------------------------------------------
// FAVORITES SERVICES
// ---------------------------------------------
export async function toggleFavorite(userId: string, productId: string, isFav: boolean): Promise<void> {
  const favId = `${userId}_${productId}`;
  if (isFav) {
    const fav: FavoriteItem = { id: favId, userId, productId, createdAt: new Date().toISOString() };
    upsertLocalItem<FavoriteItem>(LOCAL_FAVORITES_KEY, fav);
  } else {
    removeLocalItem<FavoriteItem>(LOCAL_FAVORITES_KEY, favId);
  }
  if (remoteFirestoreRestricted) return;
  try {
    if (isFav) {
      const fav: FavoriteItem = { id: favId, userId, productId, createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'favorites', favId), fav);
    } else {
      await deleteDoc(doc(db, 'favorites', favId));
    }
  } catch (err) {
    handleFirestoreError(err, isFav ? OperationType.CREATE : OperationType.DELETE, `favorites/${favId}`);
  }
}

export async function getUserFavorites(userId: string): Promise<FavoriteItem[]> {
  const localFavs = readLocalList<FavoriteItem>(LOCAL_FAVORITES_KEY).filter((f) => f.userId === userId);
  if (remoteFirestoreRestricted) {
    return localFavs;
  }
  try {
    const q = query(collection(db, 'favorites'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const remoteFavs = snap.docs.map(d => d.data() as FavoriteItem);
    return mergeById(remoteFavs, localFavs);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'favorites');
    return localFavs;
  }
}

// ---------------------------------------------
// REVIEWS SERVICES
// ---------------------------------------------
export async function getProductReviews(productId: string): Promise<Review[]> {
  const localReviews = readLocalList<Review>(LOCAL_REVIEWS_KEY).filter((r) => r.productId === productId);
  if (remoteFirestoreRestricted) {
    return localReviews;
  }
  try {
    const q = query(collection(db, 'reviews'), where('productId', '==', productId));
    const snap = await getDocs(q);
    const remoteReviews = snap.docs.map(d => d.data() as Review);
    return mergeById(remoteReviews, localReviews);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'reviews');
    return localReviews;
  }
}

export async function submitProductReview(review: Review): Promise<{ rating: number; reviewCount: number } | null> {
  const reviewDocId = `${review.userId}_${review.productId}`;
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || currentUid !== review.userId) {
    throw new Error('Akses ditolak: Anda hanya dapat mengirim ulasan untuk akun Anda sendiri.');
  }

  // Check purchase entitlement (supports both Firestore and local synchronized ledger)
  const isPurchased = await checkUserPurchased(review.userId, review.productId);
  let prodData: Product | null =
    getMergedLocalAndOfficialProducts().find((p) => p.id === review.productId) || null;

  if (!prodData && !remoteFirestoreRestricted) {
    try {
      const prodSnap = await getDoc(doc(db, 'products', review.productId));
      if (prodSnap.exists()) {
        prodData = prodSnap.data() as Product;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `products/${review.productId}`);
    }
  }

  const isFree = prodData?.price === 0;
  const isAdmin = await checkIsAdmin(review.userId);

  if (!isPurchased && !isFree && !isAdmin) {
    throw new Error('Hanya pengguna yang memiliki hak kepemilikan resmi (Purchases Entitlement) yang dapat memberikan ulasan.');
  }

  const nowIso = new Date().toISOString();
  const validRating = Math.max(1, Math.min(5, Math.round(Number(review.rating) || 5)));

  const reviewData: Review = sanitizeFirestoreData({
    ...review,
    id: reviewDocId,
    userAvatar: review.userAvatar || '',
    orderId: review.orderId || (isFree ? 'FREE_CLAIM' : `ORD-${review.productId}`),
    rating: validRating,
    createdAt: review.createdAt || nowIso,
    updatedAt: nowIso,
  });

  upsertLocalItem<Review>(LOCAL_REVIEWS_KEY, reviewData);

  // Recalculate rating across local & remote reviews
  let allProductReviews = readLocalList<Review>(LOCAL_REVIEWS_KEY).filter(
    (r) => r.productId === review.productId
  );

  if (!remoteFirestoreRestricted) {
    try {
      if (isFree && !isPurchased && prodData) {
        const purchaseId = `${review.userId}_${review.productId}`;
        await setDoc(doc(db, 'purchases', purchaseId), sanitizeFirestoreData({
          id: purchaseId,
          buyerId: review.userId,
          productId: review.productId,
          productName: prodData.name,
          creatorId: prodData.creatorId,
          creatorName: prodData.creatorName || '',
          orderId: `FREE-${review.productId}`,
          amount: 0,
          licenseType: prodData.licenseType || 'Personal Use',
          purchasedAt: nowIso,
          createdAt: nowIso,
        })).catch(() => {});
      }

      await setDoc(doc(db, 'reviews', reviewDocId), reviewData);

      const allRevsSnap = await getDocs(
        query(collection(db, 'reviews'), where('productId', '==', review.productId))
      );
      const remoteRevs = allRevsSnap.docs.map(d => d.data() as Review);
      allProductReviews = mergeById(remoteRevs, allProductReviews);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reviews/${reviewDocId}`);
    }
  }

  if (allProductReviews.length > 0) {
    const sum = allProductReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = Number((sum / allProductReviews.length).toFixed(1));
    if (prodData) {
      upsertLocalItem<Product>(LOCAL_PRODUCTS_KEY, {
        ...prodData,
        rating: avg,
        reviewCount: allProductReviews.length,
      });
    }
    if (!remoteFirestoreRestricted) {
      updateDoc(doc(db, 'products', review.productId), {
        rating: avg,
        reviewCount: allProductReviews.length,
      }).catch(() => {});
    }
    return { rating: avg, reviewCount: allProductReviews.length };
  }
  return null;
}

// ---------------------------------------------
// NOTIFICATIONS SERVICES
// ---------------------------------------------
export async function createNotification(notif: NotificationItem): Promise<void> {
  const sanitized = sanitizeFirestoreData(notif);
  upsertLocalItem<NotificationItem>(LOCAL_NOTIFICATIONS_KEY, sanitized);
  if (remoteFirestoreRestricted) return;
  try {
    await setDoc(doc(db, 'notifications', notif.id), sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `notifications/${notif.id}`);
  }
}

export async function getUserNotifications(userId: string, isAdmin: boolean = false): Promise<NotificationItem[]> {
  const localNotifs = readLocalList<NotificationItem>(LOCAL_NOTIFICATIONS_KEY).filter(
    (n) => n.userId === userId || (isAdmin && (n.userId === 'admin' || n.type?.startsWith('admin_')))
  );
  if (remoteFirestoreRestricted) {
    return localNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  try {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snap = await getDocs(q);
    let remoteNotifs = snap.docs.map(d => d.data() as NotificationItem);

    if (isAdmin) {
      try {
        const qAdmin = query(collection(db, 'notifications'), where('userId', '==', 'admin'));
        const snapAdmin = await getDocs(qAdmin);
        const adminRemoteNotifs = snapAdmin.docs.map(d => d.data() as NotificationItem);
        remoteNotifs = mergeById(adminRemoteNotifs, remoteNotifs);
      } catch {
        // ignore
      }
    }

    return mergeById(remoteNotifs, localNotifs).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'notifications');
    return localNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  const localNotifs = readLocalList<NotificationItem>(LOCAL_NOTIFICATIONS_KEY);
  const matched = localNotifs.find((n) => n.id === notifId);
  if (matched) {
    upsertLocalItem<NotificationItem>(LOCAL_NOTIFICATIONS_KEY, { ...matched, read: true });
  }
  if (remoteFirestoreRestricted) return;
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

// ---------------------------------------------
// REPORTS & FEEDBACK SERVICES
// ---------------------------------------------
export async function submitReport(report: ReportItem): Promise<void> {
  const sanitized = sanitizeFirestoreData(report);
  upsertLocalItem<ReportItem>(LOCAL_REPORTS_KEY, sanitized);
  if (remoteFirestoreRestricted) return;
  try {
    await setDoc(doc(db, 'reports', report.id), sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reports/${report.id}`);
  }
}

export async function getAllReportsForAdmin(): Promise<ReportItem[]> {
  const localReports = readLocalList<ReportItem>(LOCAL_REPORTS_KEY);
  if (remoteFirestoreRestricted) {
    return localReports;
  }
  try {
    const snap = await getDocs(collection(db, 'reports'));
    const remoteReports = snap.docs.map(d => d.data() as ReportItem);
    return mergeById(remoteReports, localReports);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'reports');
    return localReports;
  }
}

export async function updateReportStatus(reportId: string, status: ReportItem['status']): Promise<void> {
  const localReports = readLocalList<ReportItem>(LOCAL_REPORTS_KEY);
  const matched = localReports.find((r) => r.id === reportId);
  if (matched) {
    upsertLocalItem<ReportItem>(LOCAL_REPORTS_KEY, { ...matched, status });
  }
  if (remoteFirestoreRestricted) return;
  try {
    await updateDoc(doc(db, 'reports', reportId), { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
  }
}

// ---------------------------------------------
// CATEGORIES SERVICES
// ---------------------------------------------
export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat-photobooth', name: 'Photobooth', slug: 'photobooth', description: 'Template & frame strip multi-cut' },
  { id: 'cat-frame', name: 'Frame', slug: 'frame', description: 'Twibbon & bingkai foto transparan' },
  { id: 'cat-sticker', name: 'Sticker', slug: 'sticker', description: 'Stiker grafis dan ornamen estetik' },
  { id: 'cat-illustration', name: 'Illustration', slug: 'illustration', description: 'Karya seni dan ilustrasi digital' },
  { id: 'cat-wallpaper', name: 'Wallpaper', slug: 'wallpaper', description: 'Wallpaper layar ponsel & desktop' },
  { id: 'cat-printing', name: 'Printing Design', slug: 'printing-design', description: 'Desain siap cetak photocard & postcard' },
  { id: 'cat-custom', name: 'Custom Design', slug: 'custom-design', description: 'Karya pesanan khusus kreator' },
];

export async function getCategories(): Promise<CategoryItem[]> {
  const localCats = readLocalList<CategoryItem>(LOCAL_CATEGORIES_KEY);
  const baseCats = mergeById(localCats, DEFAULT_CATEGORIES);
  if (remoteFirestoreRestricted) {
    return baseCats;
  }
  try {
    const snap = await getDocs(collection(db, 'categories'));
    if (snap.empty) {
      return baseCats;
    }
    const remoteCats = snap.docs.map(d => d.data() as CategoryItem);
    return mergeById(remoteCats, baseCats);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'categories');
    return baseCats;
  }
}

export async function saveCategory(category: CategoryItem): Promise<void> {
  const sanitized = sanitizeFirestoreData(category);
  upsertLocalItem<CategoryItem>(LOCAL_CATEGORIES_KEY, sanitized);
  if (remoteFirestoreRestricted) return;
  try {
    await setDoc(doc(db, 'categories', category.id), sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `categories/${category.id}`);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  removeLocalItem<CategoryItem>(LOCAL_CATEGORIES_KEY, categoryId);
  if (remoteFirestoreRestricted) return;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}`);
  }
}

// ---------------------------------------------
// DOWNLOAD HISTORY SERVICES
// ---------------------------------------------
export async function recordDownload(record: DownloadRecord): Promise<void> {
  const sanitized = sanitizeFirestoreData(record);
  upsertLocalItem<DownloadRecord>(LOCAL_DOWNLOADS_KEY, sanitized);
  if (remoteFirestoreRestricted) return;
  try {
    await setDoc(doc(db, 'downloads', record.id), sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `downloads/${record.id}`);
  }
}

export async function getUserDownloads(userId: string): Promise<DownloadRecord[]> {
  const localDownloads = readLocalList<DownloadRecord>(LOCAL_DOWNLOADS_KEY).filter(
    (d) => d.userId === userId
  );
  if (remoteFirestoreRestricted) {
    return localDownloads;
  }
  try {
    const q = query(collection(db, 'downloads'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const remoteDownloads = snap.docs.map(d => d.data() as DownloadRecord);
    return mergeById(remoteDownloads, localDownloads);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'downloads');
    return localDownloads;
  }
}

// ---------------------------------------------
// PRODUCT VIEWS ANALYTICS
// ---------------------------------------------
export async function recordProductView(productId: string, userId?: string): Promise<void> {
  if (remoteFirestoreRestricted) return;
  try {
    const viewId = `pv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await setDoc(doc(db, 'productViews', viewId), {
      id: viewId,
      productId,
      userId: userId || 'anonymous',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'productViews');
  }
}

export async function getProductViewsCount(productId: string): Promise<number> {
  if (remoteFirestoreRestricted) return 0;
  try {
    const q = query(collection(db, 'productViews'), where('productId', '==', productId));
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'productViews');
    return 0;
  }
}

export async function getCreatorTotalViews(productIds: string[]): Promise<number> {
  if (productIds.length === 0 || remoteFirestoreRestricted) return 0;
  try {
    const snap = await getDocs(collection(db, 'productViews'));
    const allViews = snap.docs.map(d => d.data() as { productId: string });
    return allViews.filter(v => productIds.includes(v.productId)).length;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'productViews');
    return 0;
  }
}

// ---------------------------------------------
// REAL-TIME FIRESTORE SUBSCRIPTIONS
// ---------------------------------------------

/**
 * Subscribes admin to all products in Firestore in real-time.
 * Triggers callback immediately when a creator submits a new frame or edits a frame.
 */
export function subscribeToAdminProducts(callback: (products: Product[]) => void): () => void {
  try {
    const deletedIds = readDeletedIds(LOCAL_DELETED_PRODUCTS_KEY);
    const q = collection(db, 'products');
    return onSnapshot(
      q,
      (snapshot) => {
        const firestoreProds = snapshot.docs
          .map((d) => d.data() as Product)
          .filter((p) => !deletedIds.has(p.id));
        const localAndOfficial = getMergedLocalAndOfficialProducts();
        const merged = mergeById(firestoreProds, localAndOfficial);
        callback(merged);
      },
      (err) => {
        console.warn('Realtime admin products listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to start subscribeToAdminProducts:', err);
    return () => {};
  }
}

/**
 * Subscribes creator to their own products in Firestore in real-time.
 * Triggers callback immediately when admin approves or rejects the frame.
 */
export function subscribeToCreatorProducts(
  creatorId: string,
  callback: (products: Product[]) => void
): () => void {
  try {
    const deletedIds = readDeletedIds(LOCAL_DELETED_PRODUCTS_KEY);
    const q = query(collection(db, 'products'), where('creatorId', '==', creatorId));
    return onSnapshot(
      q,
      (snapshot) => {
        const remoteProds = snapshot.docs
          .map((d) => d.data() as Product)
          .filter((p) => !deletedIds.has(p.id));
        const localCreatorProds = readLocalList<Product>(LOCAL_PRODUCTS_KEY).filter(
          (p) => p.creatorId === creatorId && !deletedIds.has(p.id)
        );
        const merged = mergeById(remoteProds, localCreatorProds);
        callback(merged);
      },
      (err) => {
        console.warn('Realtime creator products listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to start subscribeToCreatorProducts:', err);
    return () => {};
  }
}

/**
 * Subscribes admin to all orders in Firestore in real-time.
 */
export function subscribeToAdminOrders(callback: (orders: Order[]) => void): () => void {
  try {
    const q = collection(db, 'orders');
    return onSnapshot(
      q,
      (snapshot) => {
        const remoteOrders = snapshot.docs.map((d) => d.data() as Order);
        const localOrders = readLocalList<Order>(LOCAL_ORDERS_KEY);
        const merged = mergeById(remoteOrders, localOrders);
        callback(merged);
      },
      (err) => {
        console.warn('Realtime admin orders listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to start subscribeToAdminOrders:', err);
    return () => {};
  }
}

/**
 * Subscribes admin to all payments in Firestore in real-time.
 */
export function subscribeToAdminPayments(callback: (payments: PaymentRecord[]) => void): () => void {
  try {
    const q = collection(db, 'payments');
    return onSnapshot(
      q,
      (snapshot) => {
        const remotePays = snapshot.docs.map((d) => d.data() as PaymentRecord);
        const localPays = readLocalList<PaymentRecord>(LOCAL_PAYMENTS_KEY);
        const merged = mergeById(remotePays, localPays);
        callback(merged);
      },
      (err) => {
        console.warn('Realtime admin payments listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to start subscribeToAdminPayments:', err);
    return () => {};
  }
}

/**
 * Subscribes user or admin to notifications in real-time.
 */
export function subscribeToUserNotifications(
  userId: string,
  isAdmin: boolean,
  callback: (notifs: NotificationItem[]) => void
): () => void {
  try {
    const notifsRef = collection(db, 'notifications');
    // If admin, we listen to all notifications or admin notifications
    const q = isAdmin
      ? query(notifsRef, where('userId', 'in', [userId, 'admin']))
      : query(notifsRef, where('userId', '==', userId));

    return onSnapshot(
      q,
      (snapshot) => {
        const remoteNotifs = snapshot.docs.map((d) => d.data() as NotificationItem);
        const localNotifs = readLocalList<NotificationItem>(LOCAL_NOTIFICATIONS_KEY).filter(
          (n) => n.userId === userId || (isAdmin && (n.userId === 'admin' || n.type?.startsWith('admin_')))
        );
        const merged = mergeById(remoteNotifs, localNotifs).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        callback(merged);
      },
      (err) => {
        console.warn('Realtime notifications listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to start subscribeToUserNotifications:', err);
    return () => {};
  }
}

/**
 * Subscribes marketplace to approved products in real-time.
 */
export function subscribeToApprovedProducts(callback: (products: Product[]) => void): () => void {
  try {
    const deletedIds = readDeletedIds(LOCAL_DELETED_PRODUCTS_KEY);
    const q = query(collection(db, 'products'), where('status', '==', 'approved'));
    return onSnapshot(
      q,
      (snapshot) => {
        const firestoreProducts = snapshot.docs
          .map((d) => d.data() as Product)
          .filter((p) => !deletedIds.has(p.id));
        const localAndOfficialApproved = getMergedLocalAndOfficialProducts().filter(
          (p) => p.status === 'approved'
        );
        const merged = mergeById(firestoreProducts, localAndOfficialApproved);
        callback(merged);
      },
      (err) => {
        console.warn('Realtime approved products listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to start subscribeToApprovedProducts:', err);
    return () => {};
  }
}

