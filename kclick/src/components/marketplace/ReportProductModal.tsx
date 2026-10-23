import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ReportCategory } from '../../types';
import { 
  X, 
  Flag, 
  AlertTriangle, 
  Send, 
  Loader2, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface ReportProductModalProps {
  product: Product;
  onClose: () => void;
}

const REPORT_CATEGORIES: { id: ReportCategory; label: string; description: string }[] = [
  { id: 'copyright', label: 'Pelanggaran Hak Cipta', description: 'Karya ini menjiplak karya asli orang lain tanpa izin lisensi.' },
  { id: 'trademark_ip', label: 'Pelanggaran Merek / Trademark', description: 'Penggunaan logo agensi, brand, atau merchandise resmi tanpa otorisasi.' },
  { id: 'unauthorized_image', label: 'Foto / Wajah Orang Tanpa Izin', description: 'Penggunaan foto orang lain, potret publik, atau materi tanpa izin komersial.' },
  { id: 'fraud', label: 'Indikasi Penipuan / Scam', description: 'File yang diunduh rusak, kosong, atau tidak sesuai preview.' },
  { id: 'inappropriate', label: 'Konten Tidak Pantas', description: 'Memuat unsur pornografi, kekerasan, atau ujaran kebencian.' },
  { id: 'wrong_description', label: 'Deskripsi / Info Salah', description: 'Informasi atau tag produk menyesatkan calon pembeli.' },
  { id: 'other', label: 'Lainnya', description: 'Masalah lain yang perlu ditinjau oleh tim admin K-Click.' },
];

export const ReportProductModal: React.FC<ReportProductModalProps> = ({ product, onClose }) => {
  const { user, submitReport, setIsAuthModalOpen, showToast } = useApp();

  const [category, setCategory] = useState<ReportCategory>('copyright');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!reason.trim()) {
      showToast('Mohon berikan penjelasan laporan.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReport({
        userId: user.id,
        userEmail: user.email,
        type: 'inappropriate_product',
        subject: `Laporan Konten: ${product.name} (${category})`,
        message: reason.trim(),
        productId: product.id,
        productName: product.name,
        creatorId: product.creatorId,
      });

      setIsSuccess(true);
      showToast('Laporan berhasil dikirimkan ke tim Admin K-Click.', 'success');
    } catch (err) {
      console.error('Failed to submit report:', err);
      showToast('Gagal mengirimkan laporan. Silakan coba kembali.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSuccess ? (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-slate-900">
                  Laporkan Karya
                </h3>
                <p className="text-xs text-slate-500">
                  Bantu jaga keamanan dan orisinalitas ekosistem K-Click
                </p>
              </div>
            </div>

            {/* Product Summary */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 mb-5">
              <img
                src={product.previewImage}
                alt={product.name}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0 text-xs">
                <div className="font-bold text-slate-900 truncate">{product.name}</div>
                <div className="text-slate-500">Karya oleh {product.creatorName}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Pilih Kategori Pelanggaran
                </label>
                <div className="space-y-2">
                  {REPORT_CATEGORIES.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        category === cat.id
                          ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportCategory"
                        value={cat.id}
                        checked={category === cat.id}
                        onChange={() => setCategory(cat.id)}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-slate-900">{cat.label}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{cat.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Detail / Penjelasan Laporan
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  placeholder="Jelaskan bukti atau alasan spesifik laporan Anda..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-rose-500 text-xs text-slate-800 transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Laporan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold font-display text-slate-900 mb-1">
              Laporan Berhasil Diterima
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto mb-6">
              Terima kasih telah berkontribusi menjaga integritas karya di K-Click. Tim administrator kami akan segera meninjau laporan Anda.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
