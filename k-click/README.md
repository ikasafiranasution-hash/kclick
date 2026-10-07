# K-CLICK
### K-Pop Photobooth & Digital Creator Marketplace

> **Productized Source Code & MVP Package**  
> Clean, modular, secure, and ready-to-deploy digital photobooth and creator marketplace web application built with React, TypeScript, Tailwind CSS, Express, and Firebase.

---

## Table of Contents
1. [Features](#1-features)
2. [Requirements](#2-requirements)
3. [Installation](#3-installation)
4. [Environment Variables](#4-environment-variables)
5. [Firebase Setup](#5-firebase-setup)
6. [Authentication Setup](#6-authentication-setup)
7. [Firestore Setup](#7-firestore-setup)
8. [Storage Setup](#8-storage-setup)
9. [Security Rules](#9-security-rules)
10. [Admin Setup](#10-admin-setup)
11. [Payment Configuration](#11-payment-configuration)
12. [Gemini API Configuration](#12-gemini-api-configuration)
13. [Development](#13-development)
14. [Production Build](#14-production-build)
15. [Deployment](#15-deployment)
16. [Customization](#16-customization)
17. [Troubleshooting](#17-troubleshooting)
18. [Project Structure](#18-project-structure)
19. [License](#19-license)

---

## 1. Features

* **Korean-Style Photobooth Studio**
  * Support for multiple aspect ratios: **Strip 4-Cut**, **2:3 (Photocard)**, **3:4 (Portrait)**, **4:5 (Social Feed)**, and **9:16 (Story)**.
  * Interactive canvas controls: Real-time pan / drag-and-drop, zoom in/out, 360° rotation, and horizontal flip for each individual cut window.
  * Live camera with automated countdown (3, 2, 1, Smile!) and flash effect, or direct upload from phone / PC gallery.
  * High-resolution canvas composite export (PNG, JPG, WebP) combining background layers, user photos, stickers, transparent twibbon frames, and aesthetic typography.

* **Digital Creator Marketplace**
  * Catalog of digital K-Pop fan assets: photobooth frames, twibbons, sticker packs, illustrations, wallpapers, and print-ready files.
  * Clear separation between **Public Preview** thumbnails and **Protected Original Master Files**.
  * Dual licensing support: **Personal Use** and **Commercial License**.
  * Verified reviews and 1–5 star ratings (only buyers with verified paid orders can review).
  * Mandatory creator copyright declarations and user reporting system for copyright or inappropriate content.

* **Manual QRIS Payment & Order Pipeline**
  * Integrated QRIS checkout screen with official merchant QR display.
  * Transaction workflow: `Checkout` &rarr; `Pembayaran QRIS & Unggah Bukti Pembayaran` &rarr; `waiting_verification` &rarr; `Verifikasi Manual Admin` &rarr; `paid` status &rarr; instant master asset download.
  * No deceptive claims: Honest manual verification workflow without external gateway dependency.

* **Secure Digital Download Engine**
  * Master files are never exposed via permanent public download tokens.
  * Entitlement-verified backend endpoint (`/api/products/:productId/download`) strictly requiring `Authorization: Bearer <Firebase ID token>` in request headers (query parameter token authentication is strictly rejected).
  * Validates user authentication, admin role (`admins/{uid}`), creator ownership, or verified paid purchase entitlement (`purchases/{uid}_{productId}`) before streaming master asset from protected Firebase Storage.

* **Creator Studio & Fair Earnings Summary**
  * Independent asset upload with separate preview and master file pickers.
  * Real-time sales statistics, commission calculation, and transparent earnings breakdown.
  * Clear disclaimer: *Earnings shown represent calculated earnings and do not constitute an automated withdrawal/payout system.*

* **Admin Portal & Moderation**
  * Product approval queue with one-click approve / reject (with reason).
  * Manual payment verification queue with zoomable payment proof images.
  * User management, feedback & complaint tickets, and category management.

---

## 2. Requirements

Ensure the following runtimes and tools are installed on your system before beginning:
* **Node.js**: Version `18.x`, `20.x`, or higher (`node -v`)
* **npm**: Version `9.x` or higher (`npm -v`)
* A free or paid **Firebase Account** ([https://firebase.google.com](https://firebase.google.com))
* A free **Google Gemini API Key** (optional, for AI captions: [https://aistudio.google.com](https://aistudio.google.com))

---

## 3. Installation

Clone or extract the source code archive to your computer or server:

```bash
# 1. Navigate to the project directory
cd k-click

# 2. Install all required dependencies
npm install
```

---

## 4. Environment Variables

K-Click separates client-side configuration (`VITE_*`) and server-side secrets (`GEMINI_API_KEY`, etc.) cleanly.

Copy the provided `.env.example` template into a new `.env` file in the root directory:

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in your values:

```env
# =================================================================
# 1. Branding & Site Identity
# =================================================================
VITE_APP_NAME="K-Click"
VITE_SUPPORT_EMAIL="support@yourdomain.com"

# =================================================================
# 2. Firebase Client Configuration
# =================================================================
VITE_FIREBASE_API_KEY="your-api-key-here"
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-web-app-id"
VITE_FIREBASE_DATABASE_ID="(default)"

# =================================================================
# 3. Konfigurasi Pembayaran QRIS Manual
# =================================================================
# QRIS resmi aplikasi menggunakan aset bawaan /qris-kclick.png
# dengan merchant: K-CLICK, DIGITAL & KREATIF (NMID: ID1026592549699).
VITE_PAYMENT_QR_IMAGE_URL="" # Opsional: URL gambar QRIS eksternal jika ingin kustomisasi (default: /qris-kclick.png)

# =================================================================
# 4. Server-Side Private Secrets
# =================================================================
GEMINI_API_KEY="your-gemini-api-key-here"
APP_URL=""
```

> **Security Notice**: Never commit `.env` containing your real private API keys to public Git repositories. `.env` is already included in `.gitignore`.

---

## 5. Firebase Setup

Follow these straightforward steps to connect K-Click to your own Firebase project:

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project** (or **Create a project**).
2. Name your project (e.g. `kclick-app`) and click **Continue**. Google Analytics is optional.
3. Once created, click the Web icon (`</>`) on the project dashboard to add a **Web App**.
4. Register the app name (e.g., `K-Click Web`) and click **Register app**.
5. Firebase will display your web configuration object:
   ```javascript
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
6. Copy each value into your `.env` file under the corresponding `VITE_FIREBASE_*` keys.

---

## 6. Authentication Setup

1. In the Firebase Console sidebar, navigate to **Build** &rarr; **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab:
   * **Email/Password**: Click Email/Password, toggle **Enable**, and click **Save**.
   * **Google**: Click Google, toggle **Enable**, choose your project support email, and click **Save**.
4. Under the **Settings** tab &rarr; **Authorized domains**, add your custom domain or deployment URL (e.g., `yourdomain.com`, `localhost`).

---

## 7. Firestore Setup

1. In the Firebase Console sidebar, navigate to **Build** &rarr; **Firestore Database**.
2. Click **Create database**.
3. Choose a location closest to your target audience (e.g., `asia-southeast1` for Indonesia/Southeast Asia or `us-central1`).
4. Select **Start in production mode** and click **Create**.

---

## 8. Storage Setup

1. In the Firebase Console sidebar, navigate to **Build** &rarr; **Storage**.
2. Click **Get Started**.
3. Select **Start in production mode** and choose your cloud storage region.
4. Click **Done**.

---

## 9. Security Rules

K-Click comes pre-configured with industry-standard, zero-trust security rules for both Firestore and Cloud Storage.

### Deploying Firestore Rules
Open `firestore.rules` in this project. Go to **Firestore Database** &rarr; **Rules** in the Firebase Console, paste the content of `firestore.rules`, and click **Publish**.

Key protections enforced in `firestore.rules`:
* Default deny (`match /{document=**} { allow read, write: if false; }`).
* Users can only modify their own profile data and cannot self-assign the `admin` role.
* Non-admins cannot approve products or verify payments.
* Reviews require a verified purchase record (`purchases/{uid}_{productId}`).
* Products, orders, and payments can only be viewed and operated on by their respective owners and admins.

### Deploying Storage Rules
Open `storage.rules` in this project. Go to **Storage** &rarr; **Rules** in the Firebase Console, paste the content of `storage.rules`, and click **Publish**.

Key protections enforced in `storage.rules`:
* `/previews/{creatorId}/{productId}/*` is publicly readable for marketplace browsing.
* `/templates/{creatorId}/{productId}/*` and `/assets/*` (master files) are strictly protected: only creator owners, admins, users with verified purchase entitlement documents, or authenticated users accessing free products that are strictly approved can read them. Master files are never public.
* Bukti pembayaran (`payments/{userId}/{orderId}/*`) bersifat privat dan hanya dapat diakses oleh pemilik pesanan dan admin.

---

## 10. Admin Setup

K-Click uses a secure, database-driven Admin RBAC pattern. Admin status is never hardcoded in client code.

To grant an account Admin privileges:
1. Open the application in your browser and register or sign in with your email/Google account.
2. In the Firebase Console, navigate to **Build** &rarr; **Authentication** &rarr; **Users**.
3. Locate your user row and copy the **User UID** (e.g., `abc123XYZ456...`).
4. In the Firebase Console, navigate to **Firestore Database** &rarr; **Data**.
5. Click **Start collection**:
   * Collection ID: `admins`
   * Document ID: Paste your **User UID** copied from step 3.
   * Add field: `role` (string) = `"admin"`
   * Add field: `email` (string) = your email
   * Add field: `createdAt` (string) = ISO timestamp (e.g., `2026-01-01T00:00:00.000Z`)
6. Click **Save**.
7. In the `users` collection, find your user document and set `role` to `"admin"`.
8. Refresh K-Click. The **Admin Portal** tab will immediately appear on the navigation bar!

---

## 11. Pembayaran QRIS & Purchase Entitlement Flow

K-Click menggunakan sistem **Pembayaran QRIS** resmi dengan alur **Verifikasi Manual** oleh admin tanpa memerlukan biaya langganan payment gateway pihak ketiga.

### QRIS Merchant Resmi:
* **Nama Merchant**: `K-CLICK, DIGITAL & KREATIF`
* **NMID**: `ID1026592549699`
* **Asset QR**: Menggunakan kode QRIS statis bawaan di `public/qris-kclick.png` yang siap digunakan langsung out-of-the-box.

### Alur Pembayaran & Hak Unduh:
1. **Checkout & Order Creation**: Pembeli memilih karya digital atau template pada marketplace dan membuat pesanan (`orders` collection).
2. **Pembayaran QRIS**: Pembeli memindai kode QRIS resmi yang ditampilkan pada modal checkout menggunakan aplikasi e-wallet (GoPay, ShopeePay, Dana, OVO) atau mobile banking (BCA, Mandiri, BRI, BNI, dll.).
3. **Unggah Bukti Pembayaran**: Pembeli mengunggah bukti pembayaran (screenshot/tanda terima QRIS) ke Firebase Storage terproteksi (`payments/{userId}/{orderId}/*`). Status pesanan diperbarui menjadi `waiting_verification`.
4. **Verifikasi Manual Admin**: Admin platform memeriksa bukti pembayaran pada Admin Portal dan memverifikasi kesesuaian transaksi.
5. **Aktivasi Hak Unduh (Purchase Entitlement)**: Saat disetujui, sistem secara atomik via Firestore transaction memperbarui status pembayaran dan membuat dokumen hak unduh resmi di `purchases/{buyerId}_{productId}`.
6. **Protected Master File Download**: 
   * Endpoint unduh aman (`/api/products/:productId/download`) memvalidasi token autentikasi (`Authorization: Bearer <Firebase ID token>`).
   * **Strict Entitlement Check**: Hanya pengguna yang memiliki hak unduh aktif (`purchases/{buyerId}_{productId}`), pemilik karya (kreator), atau admin yang diizinkan mengunduh file master resolusi tinggi.
   * File master dialirkan (streamed) langsung dari Firebase Storage terproteksi (`templates/{creatorId}/{productId}/*` atau `assets/{creatorId}/{productId}/*`) tanpa mengekspos token atau path publik.

### Konfigurasi Environment:
Variabel opsional di `.env.example` dapat disesuaikan pada dashboard deployment tanpa perlu mengubah kode sumber:
```env
# Konfigurasi Display Pembayaran QRIS (Opsional)
VITE_PAYMENT_QR_IMAGE_URL=""
```
Aplikasi secara default menggunakan aset bawaan `/qris-kclick.png` untuk memastikan QRIS selalu tampil optimal tanpa dependensi URL eksternal.

---

## 12. Gemini API Configuration

K-Click integrates with Google Gemini (`gemini-2.5-flash`) through a secure, rate-limited backend proxy (`/api/gemini/*`) to provide:
* AI Photobooth Caption & Sticker Generator
* AI Creator Product Listing Assistant

### Setting up the Gemini API Key:
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account and click **Get API key**.
3. Create a free API key and copy it.
4. Add it to your `.env` file:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   ```
5. If no key is provided, K-Click automatically falls back to curated built-in Korean aesthetic captions and templates with zero errors or disruption.

---

## 13. Development

To launch the local development server:

```bash
npm run dev
```

The application and Express backend will run simultaneously at:
`http://localhost:3000`

---

## 14. Production Build

To test and compile the production bundle:

```bash
npm run build
```

This compiles:
1. Client-side React/Vite assets into optimized static files in `/dist`.
2. Server-side Express backend into a bundled CommonJS file in `/dist/server.cjs`.

To run the compiled production server locally:
```bash
npm start
```

---

## 15. Deployment

K-Click can be deployed to any modern cloud host:

### Option A: Vercel (Direkomendasikan untuk GitHub Deploy)
Proyek ini sudah dilengkapi file konfigurasi `vercel.json` dan serverless function `/api/index.ts` sehingga frontend (Vite React) dan backend API (Express/Gemini/Storage) berjalan penuh di Vercel tanpa perlu setup server tambahan.

#### Langkah-langkah Deploy dari GitHub ke Vercel:
1. **Push repository ke GitHub**:
   ```bash
   git add .
   git commit -m "feat: persiapkan konfigurasi vercel dan serverless api"
   git push origin main
   ```
2. **Buka Vercel Dashboard**:
   - Masuk ke [vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
   - Klik **"Add New..."** lalu pilih **"Project"**.
   - Pilih repository GitHub K-Click Anda, lalu klik **"Import"**.
3. **Konfigurasi Project di Vercel**:
   - **Framework Preset**: Vite (akan terdeteksi secara otomatis).
   - **Root Directory**: `./` (default).
   - **Build Command**: `npm run build` (default).
   - **Output Directory**: `dist` (default).
4. **Environment Variables**:
   Buka accordion **"Environment Variables"** di Vercel, lalu tambahkan variabel berikut dari file `.env` Anda:
   - `VITE_FIREBASE_API_KEY`: API Key Firebase
   - `VITE_FIREBASE_AUTH_DOMAIN`: Domain autentikasi Firebase
   - `VITE_FIREBASE_PROJECT_ID`: ID project Firebase
   - `VITE_FIREBASE_STORAGE_BUCKET`: Bucket penyimpanan Firebase Storage
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: Messaging sender ID
   - `VITE_FIREBASE_APP_ID`: ID aplikasi Firebase
   - `VITE_FIREBASE_DATABASE_ID`: `(default)`
   - `GEMINI_API_KEY`: API key Google Gemini (untuk fitur AI Caption & Creator Copywriting)
   - `VITE_APP_NAME`: `K-Click`
5. **Klik "Deploy"**:
   - Vercel akan melakukan instalasi dependensi, menjalankan `npm run build`, menyusun serverless function `/api`, dan menerbitkan aplikasi ke domain publik `https://your-project.vercel.app` dalam ~1 menit!
   - Setiap kali Anda melakukan `git push` ke branch `main`, Vercel akan secara otomatis melakukan auto-deploy update terbaru.

### Option B: Google Cloud Run (Container / Docker)
1. Pastikan `PORT=3000` diekspos.
2. Build container image atau hubungkan repository Git Anda di Google Cloud Console.
3. Atur environment variables di setelan Cloud Run service.
4. Set execution command ke `npm start`.

### Option C: VPS (Ubuntu / Debian dengan PM2)
```bash
# Di server Anda
git clone <your-repo>
cd k-click
npm install
npm run build

# Jalankan dengan PM2 process manager
pm2 start dist/server.cjs --name "kclick"
pm2 startup
pm2 save
```
Konfigurasikan Nginx reverse proxy untuk meneruskan traffic ke `http://localhost:3000`.

---

## 16. Customization

* **App Name & Branding**: Edit `siteConfig.ts` and `index.html` (`<title>` and `<meta>` tags).
* **Color Scheme & Theme**: Tailwind CSS utility classes are centralized across UI components. Primary accent: `pink-500` / `purple-600`.
* **Categories**: Edit `DEFAULT_CATEGORIES` in `src/services/firebase.ts` or add new categories live via the **Admin Portal** &rarr; **Kelola Kategori**.
* **Mock & Seed Data**: Initial marketplace items are located in `src/data/mockProducts.ts`.

---

## 17. Troubleshooting

* **Problem**: *Firebase: Error (auth/configuration-not-found) or popup blocked.*  
  **Solution**: Ensure **Google** and **Email/Password** are enabled under **Authentication** in the Firebase Console, and ensure your domain is added to **Authorized domains**.

* **Problem**: *Missing or insufficient permissions on categories or products.*  
  **Solution**: Ensure you have published `firestore.rules` and `storage.rules` in your Firebase Console.

* **Problem**: *Master file download fails with 403 Forbidden.*  
  **Solution**: The user must either be the creator of the item, an admin, or have an order for that item verified with `status: 'paid'`.

* **Problem**: *Port 3000 is already in use.*  
  **Solution**: Terminate existing processes on port 3000 using `npx kill-port 3000` or specify a custom port in `server.ts`.

---

## 18. Project Structure

```
k-click/
├── .env.example                 # Configuration template for buyers
├── firestore.rules              # Zero-trust ABAC Firestore security rules
├── storage.rules                # Strict Cloud Storage entitlement rules
├── firebase-blueprint.json      # Schema models and collection definitions
├── index.html                   # Entry HTML document
├── package.json                 # Scripts and dependencies
├── server.ts                    # Backend server: secure download & AI proxy
├── src/
│   ├── components/
│   │   ├── admin/               # Admin Portal: approvals, payments, reports
│   │   ├── auth/                # Login, registration, and reset modals
│   │   ├── common/              # Navbar, footer, feedback modal, alerts
│   │   ├── creator/             # Creator Studio: upload & sales analytics
│   │   ├── faq/                 # Buyer and user FAQ guide
│   │   ├── gallery/             # User photo strips & purchased vault
│   │   ├── home/                # Homepage showcases & hero features
│   │   ├── marketplace/         # Product catalog, details, & checkout
│   │   └── photobooth/          # Photobooth engine, canvas editor, & export
│   ├── config/
│   │   ├── firebaseConfig.ts    # Firebase client initializers
│   │   └── siteConfig.ts        # Reusable store, payment, & brand config
│   ├── context/
│   │   └── AppContext.tsx       # Global state: auth, products, orders, cart
│   ├── data/
│   │   └── mockProducts.ts      # Curated starter products & sample templates
│   ├── services/
│   │   └── firebase.ts          # Firestore & Storage query services
│   ├── types.ts                 # TypeScript interfaces and data models
│   ├── App.tsx                  # Main router and view switcher
│   └── main.tsx                 # React DOM mount point
```

---

## 19. License

This source code is licensed for commercial or personal use as an MVP / application template.  
You are free to rebrand, customize, deploy, and adapt this codebase for your business or clients.  
Redistribution or resale of the uncompiled source code as a competing raw template is prohibited.

Copyright &copy; 2026 K-Click. All rights reserved.
