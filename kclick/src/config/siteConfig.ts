/**
 * K-CLICK — Application & Branding Configuration
 * 
 * Modul ini memudahkan pemilik/pembeli source code untuk mengubah branding,
 * informasi pembayaran manual/QR, kontak, dan pengaturan platform secara terpusat.
 */

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  supportEmail: string;
  instagram: string;
  contactWhatsApp: string;
  currency: string;
  platformFeePercent: number; // e.g. 10 for 10%
  creatorFeePercent: number;  // e.g. 90 for 90%
  
  // Payment Information (Pembayaran Manual QRIS K-Click)
  payment: {
    title: string;
    description: string;
    merchantName: string;
    nmid: string;
    qrImageUrl: string;
    instructions: string[];
  };
}

export const OFFICIAL_ADMIN_EMAIL = 'klick.wd@gmail.com';

export const siteConfig: SiteConfig = {
  name: import.meta.env.VITE_APP_NAME || 'K-Click',
  tagline: 'Aesthetic Photobooth & Digital Creator Marketplace',
  description: 'Platform Photobooth Digital Estetik dan Marketplace Aset Kreatif terpercaya.',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@kclick.id',
  instagram: '@kclick.official',
  contactWhatsApp: '',
  currency: 'IDR',
  platformFeePercent: 10,
  creatorFeePercent: 90,

  payment: {
    title: 'QRIS Pembayaran Resmi K-Click',
    description: 'Pindai kode QRIS merchant resmi K-Click menggunakan aplikasi e-wallet atau mobile banking Anda (GoPay, BCA, Mandiri, BRI, BNI, ShopeePay, Dana, dll.), kemudian unggah bukti pembayaran untuk verifikasi manual oleh admin.',
    merchantName: 'K-CLICK, DIGITAL & KREATIF',
    nmid: 'ID1026592549699',
    qrImageUrl: '/qris-kclick.png',
    instructions: [
      'Pindai (scan) kode QRIS merchant K-Click melalui GoPay, BCA Mobile, ShopeePay, Dana, atau mobile banking ber-QRIS pilihan Anda.',
      'Pastikan nominal pembayaran tepat sesuai harga produk yang tertera pada pesanan.',
      'Pastikan nama merchant penerima tertera: K-CLICK, DIGITAL & KREATIF (NMID: ID1026592549699).',
      'Simpan bukti pembayaran resmi (screenshot atau tanda terima transaksi QRIS berhasil).',
      'Unggah bukti pembayaran pada halaman ini untuk verifikasi manual oleh admin.',
      'Setelah diverifikasi dan disetujui oleh admin, hak unduh (purchase entitlement) resmi akan aktif di My Gallery.',
    ],
  },
};
