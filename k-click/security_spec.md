# Security Specification - K-Click Platform

## 1. Role-Based Access Control (RBAC) & Admin Verification
- **Admin Authorization**: Admin privileges are strictly determined by the presence of the caller's Firebase Auth UID within the Firestore `admins/{uid}` document (`exists(/databases/$(database)/documents/admins/$(request.auth.uid))`).
- **No Hardcoded Emails or Backdoors**: Admin status is NEVER derived from hardcoded email addresses, client claims, or frontend state.
- **Immutable Admin Registry**: The `admins` collection is protected against all client write operations (`allow write: if false;`), ensuring it can only be provisioned via the secure Firebase Console or server-side Admin SDK.

## 2. Core Data Invariants & Access Control
- **User Profiles (`users/{userId}`)**: Can only be created and updated by the authenticated owner (`request.auth.uid == userId`). The `role` field cannot be modified by non-admin users. Credits updates are strictly clamped within non-monetary bounds (0 - 500, max +10 per update).
- **Products (`products/{productId}`)**: Approved products are publicly readable. Draft, pending, or rejected products are strictly restricted to the creator owner (`creatorId == request.auth.uid`) or Admins. Creators can only modify their own products and cannot change approval status, sales count, or price without review.
- **Orders (`orders/{orderId}`)**: Accessible only to the purchasing buyer (`buyerId == request.auth.uid`), the seller creator (`creatorId == request.auth.uid`), or Admins. Buyers cannot spoof `buyerId`, `creatorId`, or `amount`. Non-free items cannot be marked as `paid` directly by the buyer.
- **Payments (`payments/{paymentId}`)**: Accessible only to the order buyer and Admins. Payment status approval/rejection is strictly restricted to Admins.
- **Purchases (`purchases/{purchaseId}`)**: Entitlement records representing verified ownership. Can only be created by Admins upon approving paid orders, or by users for verified free items (`price == 0`). Cannot be updated or deleted by normal users.
- **Master Digital Assets & Downloads**: Master files (`templates/{creatorId}/{productId}/*` or `assets/{creatorId}/{productId}/*`) are stored in private Cloud Storage. They are NEVER public. Access is granted only via server-side entitlement verification at `/api/products/:productId/download`, which strictly requires an `Authorization: Bearer <Firebase ID token>` HTTP header (query parameter token authentication is rejected with 401). Entitlement checks strictly validate user identity (`buyerId == callerUid`, `productId == requested productId`, and valid purchase records) before streaming. Production master files must strictly originate from private Firebase Storage with creator ownership verification; Base64 data URLs, preview images, Unsplash, or arbitrary external URLs are strictly rejected.
- **Payment Proofs**: Stored in `payments/{userId}/{orderId}/*` and are strictly private between the buyer and Admins.
- **Photobooth Strips & Gallery**: Private to the authenticated user (`gallery/{userId}/*`).
- **Product Views**: Restricted to valid documents with existing product references and strict schema validation to prevent spam.
- **Reviews & Ratings**: Publicly readable, but can only be authored by authenticated buyers who have a verified entitlement (`purchases/{uid}_{productId}`) for that product. Maximum 1 review per product per user.
- **Favorites & Notifications**: Strictly private to the individual user. Notification dispatching cannot be hijacked to target other users.

