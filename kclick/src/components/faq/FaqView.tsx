import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Shield, Camera, ShoppingBag, Palette } from 'lucide-react';

export const FaqView: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Apa itu K-Click?',
      a: 'K-Click adalah platform all-in-one yang menggabungkan Online Photobooth interaktif, digital creative marketplace, dan studio kreator. Pengguna bisa membuat photostrip estetik kekinian, menyesuaikan foto dengan frame twibbon, membeli karya digital orisinal via pembayaran QRIS resmi K-Click, atau menjual karya desain sendiri.',
    },
    {
      q: 'Bagaimana cara foto di Online Photobooth?',
      a: 'Cukup buka tab "Photobooth", pilih jumlah foto (3 atau 4 foto), pilih template frame kesukaanmu, lalu izinkan akses kamera. Kamera memiliki countdown otomatis (3, 2, 1, Smile!) dan flash. Setelah foto diambil, kamu bisa mengatur posisi (zoom, pan/drag, putar) sebelum digenerate menjadi strip utuh.',
    },
    {
      q: 'Apakah bisa menggunakan foto yang sudah ada dari galeri HP / PC?',
      a: 'Ya, tentu saja! Kamu dapat memilih tombol "Upload Foto dari HP / PC" di langkah pertama Photobooth untuk mengunggah file gambar (JPG, PNG, WebP) tanpa perlu menggunakan kamera langsung.',
    },
    {
      q: 'Bagaimana cara kerja Twibbon Image Editor di K-Click?',
      a: 'Di tahap editor, foto yang kamu ambil diletakkan di layer bawah dan frame twibbon berada di layer atas. Kamu bisa langsung menggeser (drag) foto dengan mouse atau sentuhan layar sentuh pada HP, memperbesar (zoom in/out), dan memutar orientasi agar pas di dalam frame.',
    },
    {
      q: 'Bagaimana sistem pembayaran & verifikasinya?',
      a: 'K-Click menggunakan pembayaran manual melalui QRIS resmi merchant "K-CLICK, DIGITAL & KREATIF". Pada saat checkout, pembeli memindai kode QRIS yang ditampilkan melalui aplikasi e-wallet atau mobile banking ber-QRIS pilihan, membayar tepat sesuai nominal pesanan, dan mengunggah bukti pembayaran. Admin memverifikasi bukti tersebut secara manual. Setelah disetujui, hak unduh (purchase entitlement) otomatis aktif dan file original resolusi tinggi dapat langsung diunduh di My Gallery.',
    },
    {
      q: 'Bagaimana cara bergabung menjadi Kreator di K-Click?',
      a: 'Cukup beralih ke "Creator Mode" di bagian header atau buka tab Creator Studio. Kamu bisa langsung mengupload desain frame photobooth, twibbon estetik, stiker PNG, atau wallpaper digital. Admin akan mereview karyamu agar sesuai dengan standar kualitas sebelum tayang di marketplace.',
    },
    {
      q: 'Apakah fitur cerdas seperti Smart Caption berbayar?',
      a: 'Tidak! Semua fitur cerdas dan otomatis di K-Click, termasuk Smart Caption untuk photobooth, dapat dinikmati secara gratis oleh pengguna tanpa biaya langganan ataupun biaya tambahan.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold mb-2">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Bantuan & Panduan</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
          Pertanyaan yang Sering Diajukan (FAQ)
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
          Temukan jawaban seputar cara menggunakan photobooth, marketplace kreatif, verifikasi pembayaran, dan panduan kreator.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs transition-all"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-slate-50"
              >
                <span className="font-bold text-slate-900 text-sm md:text-base pr-4">
                  {item.q}
                </span>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-pink-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-slate-600 text-xs md:text-sm leading-relaxed border-t border-slate-100 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Official Admin Contact Card */}
      <div className="mt-8 p-6 rounded-3xl bg-gradient-to-r from-pink-50 via-white to-purple-50 border border-pink-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-xs font-extrabold uppercase text-pink-600 tracking-wider">
            Verifikasi Pembayaran & Dukungan Admin Resmi
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            Butuh bantuan verifikasi pesanan atau informasi kreator?
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Kirimkan pertanyaan atau laporan kendala Anda langsung ke Tim Bantuan & Administrator Resmi K-Click.
          </p>
        </div>
        <button
          onClick={() => {
            const subject = encodeURIComponent('Bantuan & Dukungan Pengguna K-Click');
            window.location.href = `mailto:support@kclick.id?subject=${subject}`;
          }}
          className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-pink-600 text-white text-xs font-bold shadow-sm transition-colors shrink-0 cursor-pointer"
        >
          Hubungi Tim Admin
        </button>
      </div>
    </div>
  );
};
