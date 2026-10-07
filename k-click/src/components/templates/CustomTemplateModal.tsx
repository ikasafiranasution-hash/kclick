import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { PhotoboothTemplate, AspectRatioType } from '../../types';
import { 
  X, 
  Upload, 
  Palette, 
  Camera, 
  Check, 
  Image as ImageIcon, 
  Layers, 
  Trash2,
  CheckCircle2,
  Sliders,
  Type
} from 'lucide-react';

interface CustomTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCreatedAndApply?: (template: PhotoboothTemplate) => void;
}

const PRESET_COLORS = [
  { name: 'Sakura Pink', bg: '#fce7f3', accent: '#db2777', text: '#9d174d' },
  { name: 'Haru Sky', bg: '#e0f2fe', accent: '#0284c7', text: '#0369a1' },
  { name: 'Cyber Lavender', bg: '#f3e8ff', accent: '#9333ea', text: '#6b21a8' },
  { name: 'Matcha Mint', bg: '#dcfce7', accent: '#16a34a', text: '#15803d' },
  { name: 'Butter Cream', bg: '#fef3c7', accent: '#d97706', text: '#92400e' },
  { name: 'Midnight Dark', bg: '#18181b', accent: '#e4e4e7', text: '#ffffff' },
  { name: 'Pure White', bg: '#ffffff', accent: '#ec4899', text: '#1e293b' },
  { name: 'Peach Coral', bg: '#ffedd5', accent: '#ea580c', text: '#9a3412' },
];

const AVAILABLE_STICKERS = [
  '💖', '🎀', '🌸', '☁️', '🎵', '📸', '🧸', '🍰', 
  '💌', '💎', '🍀', '🐾', '🍒', '🎧', '🌷', '🦋'
];

export const CustomTemplateModal: React.FC<CustomTemplateModalProps> = ({
  isOpen,
  onClose,
  onTemplateCreatedAndApply,
}) => {
  const { addUserCustomTemplate, launchPhotoboothWithTemplate, showToast, user } = useApp();

  const [mode, setMode] = useState<'upload' | 'design'>('upload');
  const [templateName, setTemplateName] = useState<string>('Template Kustom Saya');
  const [category, setCategory] = useState<string>('Custom');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('strip');

  // Uploaded frame state
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Designed template state
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [customBgColor, setCustomBgColor] = useState<string>('#fce7f3');
  const [bannerText, setBannerText] = useState<string>('K-CLICK • SPECIAL EDITION');
  const [koreanText, setKoreanText] = useState<string>('SPECIAL MOMENTS • FOREVER MEMORIES');
  const [selectedStickers, setSelectedStickers] = useState<string[]>(['💖', '🎀', '🌸']);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (PNG transparan atau JPG).', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('Ukuran file maksimal 15MB.', 'error');
      return;
    }

    setUploadedFileName(file.name);
    if (!templateName || templateName === 'Template Kustom Saya') {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTemplateName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFrameDataUrl(result);
      showToast('Frame gambar kustom berhasil dimuat!', 'success');
    };
    reader.onerror = () => {
      showToast('Gagal membaca file gambar.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const toggleSticker = (stk: string) => {
    if (selectedStickers.includes(stk)) {
      setSelectedStickers((prev) => prev.filter((s) => s !== stk));
    } else {
      if (selectedStickers.length >= 6) {
        showToast('Maksimal 6 stiker per template.', 'info');
        return;
      }
      setSelectedStickers((prev) => [...prev, stk]);
    }
  };

  const handleSaveAndLaunch = (launchImmediate: boolean = true) => {
    if (!templateName.trim()) {
      showToast('Harap masukkan nama template.', 'error');
      return;
    }

    if (mode === 'upload' && !frameDataUrl) {
      showToast('Harap upload file frame gambar terlebih dahulu.', 'error');
      return;
    }

    const createdTemplate: Omit<PhotoboothTemplate, 'id'> = {
      name: templateName.trim(),
      category: category || 'Custom',
      themeColor: mode === 'upload' ? '#ffffff' : customBgColor,
      accentColor: mode === 'upload' ? '#ec4899' : selectedColor.accent,
      textColor: mode === 'upload' ? '#1e293b' : selectedColor.text,
      bannerText: mode === 'upload' ? templateName.toUpperCase() : bannerText.trim(),
      koreanText: mode === 'upload' ? 'CUSTOM FRAME • K-CLICK' : koreanText.trim(),
      aspectRatio,
      previewUrl: frameDataUrl || '',
      frameOverlayUrl: mode === 'upload' ? (frameDataUrl || undefined) : undefined,
      isPremium: false,
      isCustomUserTemplate: true,
      authorName: user?.name || 'User K-Click',
      stickers: selectedStickers.map((icon, idx) => ({
        icon,
        label: `Sticker ${idx + 1}`,
        x: (idx * 20) % 80 + 10,
        y: idx < 2 ? 4 : 92,
      })),
    };

    const saved = addUserCustomTemplate(createdTemplate);
    showToast(`Template "${saved.name}" berhasil disimpan!`, 'success');

    if (launchImmediate) {
      if (onTemplateCreatedAndApply) {
        onTemplateCreatedAndApply(saved);
      } else {
        launchPhotoboothWithTemplate(saved);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF2D75] via-[#E11D74] to-[#7C3AED] text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900">
                Masukkan Template Sendiri
              </h2>
              <p className="text-xs text-slate-500">
                Upload frame milikmu atau buat desain kustom untuk langsung digunakan di Photobooth!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {/* Method Selector: Upload Frame File vs Design Style */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'upload'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4 text-pink-600" />
              <span>Upload Gambar Frame (PNG/JPG)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('design')}
              className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'design'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-4 h-4 text-purple-600" />
              <span>Desain Tema & Warna Sendiri</span>
            </button>
          </div>

          {/* Template Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Template <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Contoh: Frame Ulang Tahun Jimin, Twibbon Konser"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:outline-none text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Format / Rasio Foto
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatioType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:outline-none text-xs font-semibold text-slate-900"
              >
                <option value="strip">4-Cut Photostrip Vertikal (Classic Studio Strip)</option>
                <option value="2:3">Photocard Klasik 2:3</option>
                <option value="3:4">Studio Portrait 3:4</option>
                <option value="4:5">Instagram Feed 4:5</option>
                <option value="9:16">Story / Reel 9:16</option>
              </select>
            </div>
          </div>

          {/* MODE 1: UPLOAD FRAME FILE */}
          {mode === 'upload' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Unggah Berkas Frame / Twibbon Anda (PNG Transparan Direkomendasikan)
                </label>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {frameDataUrl ? (
                  <div className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-24 h-32 rounded-xl bg-white border border-emerald-200 overflow-hidden shadow-xs shrink-0 flex items-center justify-center p-1">
                      <img
                        src={frameDataUrl}
                        alt="Frame Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-800 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Frame berhasil dipilih: {uploadedFileName || 'Custom Frame'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Frame ini akan otomatis menjadi bingkai live di Photobooth K-Click.
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 text-xs font-bold text-pink-600 hover:text-pink-700 underline cursor-pointer"
                      >
                        Ganti Gambar Lain
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 rounded-3xl border-2 border-dashed border-slate-300 hover:border-pink-500 bg-slate-50/70 hover:bg-pink-50/30 transition-all text-center cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 mb-1">
                      Klik untuk Memilih File Frame / Twibbon
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Format didukung: PNG transparan (paling optimal agar wajah terlihat di lubang foto), JPG, atau WebP hingga 15MB.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: DESIGN CUSTOM THEME */}
          {mode === 'design' && (
            <div className="space-y-4">
              {/* Color Preset Palette */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Warna Tema Bingkai
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => {
                        setSelectedColor(col);
                        setCustomBgColor(col.bg);
                      }}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                        customBgColor === col.bg
                          ? 'border-pink-500 ring-2 ring-pink-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: col.bg }}
                      />
                      <span className="truncate">{col.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Banner Text & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teks Slogan / Header Frame
                  </label>
                  <input
                    type="text"
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                    placeholder="Contoh: K-CLICK • HARU FILM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subtitle Footer / Teks Estetik
                  </label>
                  <input
                    type="text"
                    value={koreanText}
                    onChange={(e) => setKoreanText(e.target.value)}
                    placeholder="Contoh: SPECIAL MOMENTS • FOREVER MEMORIES"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Stickers Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilih Stiker Dekorasi Frame
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {selectedStickers.length}/6 stiker terpilih
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_STICKERS.map((stk) => {
                    const isSelected = selectedStickers.includes(stk);
                    return (
                      <button
                        type="button"
                        key={stk}
                        onClick={() => toggleSticker(stk)}
                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-pink-100 border-2 border-pink-500 scale-105 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {stk}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mini Preview Box */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Preview Tampilan Frame:
                </div>
                <div
                  className="rounded-2xl p-3 max-w-xs mx-auto border border-black/10 shadow-sm flex flex-col items-center justify-between space-y-3"
                  style={{ backgroundColor: customBgColor }}
                >
                  <div
                    className="text-xs font-black tracking-wider text-center"
                    style={{ color: selectedColor.text }}
                  >
                    {bannerText || 'HEADER BANNER'}
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full max-w-[200px]">
                    <div className="aspect-[4/3] bg-white/90 rounded-lg flex items-center justify-center shadow-xs">
                      <Camera className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="aspect-[4/3] bg-white/90 rounded-lg flex items-center justify-center shadow-xs">
                      <Camera className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedStickers.map((s, i) => (
                      <span key={i} className="text-sm">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div
                    className="text-[10px] font-semibold text-center"
                    style={{ color: selectedColor.text }}
                  >
                    {koreanText || 'SUBTITLE FOOTER'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() => handleSaveAndLaunch(false)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            Simpan Saja
          </button>

          <button
            type="button"
            onClick={() => handleSaveAndLaunch(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2D75] via-[#E11D74] to-[#7C3AED] hover:opacity-95 text-white text-xs font-black shadow-md shadow-pink-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Gunakan di Photobooth Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
