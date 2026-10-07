import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, MessageSquare, Send, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { ReportType } from '../../types';
import { siteConfig } from '../../config/siteConfig';

interface HelpFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpFeedbackModal: React.FC<HelpFeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user, submitReport, showToast } = useApp();

  const [type, setType] = useState<ReportType>('feedback');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      showToast('Harap lengkapi email dan isi pesan bantuan.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await submitReport({
        userId: user?.id,
        userEmail: email.trim(),
        type,
        subject: subject.trim() || 'Pertanyaan / Feedback K-Click',
        message: message.trim(),
      });
      showToast('Pesan bantuan berhasil dikirim! Admin akan segera meninjau.', 'success');
      setSubject('');
      setMessage('');
      onClose();
    } catch {
      showToast('Gagal mengirim laporan bantuan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-slate-900">Bantuan & Hubungi Admin</h3>
            <p className="text-xs text-slate-500">
              Laporkan kendala verifikasi pembayaran, saran fitur, atau hubungi langsung via email{' '}
              <a href={`mailto:${siteConfig.supportEmail}`} className="text-pink-600 font-semibold hover:underline">
                {siteConfig.supportEmail}
              </a>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Laporan / Masukan</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'feedback', label: 'Saran Fitur' },
                { id: 'payment_issue', label: 'Kendala Bayar' },
                { id: 'bug', label: 'Bug Teknis' },
                { id: 'inappropriate_product', label: 'Hak Cipta' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setType(opt.id as ReportType)}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                    type === opt.id
                      ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Anda (Untuk Balasan)</label>
            <input
              type="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Judul / Subjek</label>
            <input
              type="text"
              required
              placeholder="cth: Verifikasi Pembayaran Order #ORD-12345"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Detail Masalah / Pesan</label>
            <textarea
              rows={4}
              required
              placeholder="Tuliskan kendala Anda dengan jelas agar tim admin K-Click dapat memproses secepatnya..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-pink-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Mengirim...' : 'Kirim Laporan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
