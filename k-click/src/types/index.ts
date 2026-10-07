export type UserRole = 'user' | 'creator' | 'admin';
export type AppMode = 'buyer' | 'creator' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  role: UserRole;
  status?: 'active' | 'pending' | 'suspended' | string;
  credits: number;
  bio?: string;
  createdAt?: string;
}

export type ProductCategory = 
  | 'Photobooth' 
  | 'Frame' 
  | 'Sticker' 
  | 'Illustration' 
  | 'Animation' 
  | 'Wallpaper' 
  | 'Printing Design' 
  | 'Custom Design';

export type ProductStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface WallpaperDetails {
  deviceType: 'mobile' | 'desktop' | 'bundle';
  resolution: string; // e.g. "1290 x 2796 (Mobile 4K)" or "3840 x 2160 (Desktop UHD)"
  aspectRatio: '9:16' | '16:9' | '21:9';
  fileFormat: string; // e.g. "PNG Ultra HD"
  fileSizeMb?: number;
  theme?: string;
  palette?: string[];
  mockupPreviewUrl?: string;
}

export interface Product {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number; // 0 for Free, or in IDR (Rp)
  previewImage: string;
  productFile?: string;
  tags: string[];
  status: ProductStatus;
  rejectionReason?: string;
  rating: number;
  reviewCount: number;
  salesCount: number;
  licenseType?: 'Personal Use' | 'Commercial Use';
  copyrightAgreed?: boolean;
  photoboothConfig?: PhotoboothTemplate;
  wallpaperDetails?: WallpaperDetails;
  createdAt: string;
  updatedAt?: string;
}

export type OrderStatus = 'pending' | 'waiting_verification' | 'paid' | 'rejected';

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  productId: string;
  productName: string;
  creatorId: string;
  amount: number;
  platformFee?: number;
  creatorEarnings?: number;
  status: OrderStatus;
  proofImage?: string;
  rejectionReason?: string;
  licenseType?: 'Personal Use' | 'Commercial Use';
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
}

export type PaymentStatus = 'pending' | 'waiting_verification' | 'approved' | 'rejected' | 'paid';

export interface PaymentRecord {
  id: string;
  orderId: string;
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  productId?: string;
  productName?: string;
  amount: number;
  proofImage: string;
  status: PaymentStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 
    | 'product_approved' 
    | 'product_rejected' 
    | 'payment_approved' 
    | 'payment_rejected' 
    | 'order_received' 
    | 'gallery_saved' 
    | 'system'
    | 'admin_product_pending'
    | 'admin_payment_pending'
    | 'admin_report_pending';
  title: string;
  message: string;
  read: boolean;
  status?: string;
  linkTab?: string;
  createdAt: string;
}

export type ReportType = 'bug' | 'inappropriate_product' | 'payment_issue' | 'feedback' | 'other';

export interface ReportItem {
  id: string;
  userId?: string;
  userEmail: string;
  type: ReportType;
  subject: string;
  message: string;
  productId?: string;
  productName?: string;
  creatorId?: string;
  status: 'open' | 'reviewed' | 'resolved' | string;
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  description: string;
  slug: string;
  status?: string;
}

export interface DownloadRecord {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  orderId: string;
  fileUrl: string;
  status?: string;
  downloadedAt: string;
}

export type GalleryType = 'photobooth' | 'purchased' | 'custom';

export interface GalleryItem {
  id: string;
  userId: string;
  productId?: string;
  title: string;
  type: GalleryType;
  fileUrl: string;
  templateId?: string;
  templateName?: string;
  status?: string;
  createdAt: string;
  meta?: {
    photosCount?: number;
    frameColor?: string;
    caption?: string;
  };
}

export interface PurchaseRecord {
  id: string; // `${buyerId}_${productId}`
  buyerId: string;
  productId: string;
  productName?: string;
  creatorId?: string;
  creatorName?: string;
  orderId: string;
  amount: number;
  status?: 'paid' | 'completed' | 'active' | 'pending' | string;
  licenseType?: 'Personal Use' | 'Commercial Use';
  purchasedAt?: string;
  createdAt: string;
}

export interface FavoriteItem {
  id: string;
  userId: string;
  productId: string;
  status?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  productId: string;
  orderId?: string;
  rating: number;
  comment: string;
  status?: string;
  createdAt: string;
}

export type AspectRatioType = 'strip' | '2:3' | '3:4' | '4:5' | '9:16';

export interface PhotoboothTemplate {
  id: string;
  name: string;
  category: string;
  themeColor: string;
  accentColor: string;
  textColor: string;
  bannerText: string;
  footerText?: string;
  subtitleText?: string;
  koreanText: string;
  status?: string;
  stickers: Array<{
    icon: string;
    label: string;
    x: number; // percentage
    y: number; // percentage
  }>;
  previewUrl: string;
  isPremium?: boolean;
  frameOverlayUrl?: string;
  aspectRatio?: AspectRatioType;
  isCustomUserTemplate?: boolean;
  authorName?: string;
  createdAt?: string;
}

export interface PhotoCapture {
  id: string;
  rawImage: string; // base64
  zoom: number; // 0.5 - 3.0
  panX: number; // in pixels
  panY: number; // in pixels
  rotation: number; // degrees
  isFlipped?: boolean;
}

export interface ProductView {
  id: string;
  productId: string;
  userId?: string;
  createdAt: string;
}

export type ReportCategory = 'copyright' | 'trademark_ip' | 'unauthorized_image' | 'inappropriate' | 'fraud' | 'wrong_description' | 'other';


