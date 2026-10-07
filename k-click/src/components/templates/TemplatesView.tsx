import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PHOTOBOOTH_TEMPLATES } from '../../data/mockTemplates';
import { MARKETPLACE_FRAME_PRODUCTS, productToPhotoboothTemplate, getProductFallbackImage } from '../../data/mockProducts';
import { PhotoboothTemplate } from '../../types';
import { 
  LayoutGrid, 
  Camera, 
  Check, 
  Lock, 
  Palette, 
  Plus, 
  Upload, 
  Trash2, 
  UserCheck, 
  Sliders
} from 'lucide-react';
import { CustomTemplateModal } from './CustomTemplateModal';

export const TemplatesView: React.FC = () => {
  const { 
    launchPhotoboothWithTemplate, 
    userCustomTemplates, 
    removeUserCustomTemplate,
    showToast 
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);

  // Convert official marketplace frames to compatible photobooth templates with full previews
  const marketplaceTemplates = useMemo<PhotoboothTemplate[]>(() => {
    return MARKETPLACE_FRAME_PRODUCTS.map((prod) => {
      const tmpl = productToPhotoboothTemplate(prod);
      return {
        ...tmpl,
        previewUrl: prod.previewImage,
        isMarketplaceFrame: true,
      };
    });
  }, []);

  // Combine custom templates with marketplace frames and built-in presets
  const allTemplates: PhotoboothTemplate[] = useMemo(() => [
    ...userCustomTemplates,
    ...marketplaceTemplates,
    ...PHOTOBOOTH_TEMPLATES,
  ], [userCustomTemplates, marketplaceTemplates]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('All');
    set.add(`Template Saya (${userCustomTemplates.length})`);
    set.add('Marketplace Frames');
    allTemplates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [userCustomTemplates.length, allTemplates]);

  const filtered = selectedCategory === 'All'
    ? allTemplates
    : selectedCategory.startsWith('Template Saya')
    ? userCustomTemplates
    : selectedCategory === 'Marketplace Frames'
    ? marketplaceTemplates
    : allTemplates.filter((t) => t.category?.toLowerCase() === selectedCategory.toLowerCase());

  const handleDeleteCustom = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Hapus template kustom "${name}"?`)) {
      removeUserCustomTemplate(id);
      showToast(`Template "${name}" telah dihapus.`, 'info');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 animate-fade-in space-y-8">
      {/* 1. Header Banner & CTA */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-pink-50 via-purple-50 to-white border border-pink-200/80 shadow-xs">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Katalog Template & Frame Kustom</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            Pilihan Frame & Tema Foto Estetik
          </h1>
          <p className="text-sm text-slate-600">
            Pilih dari template studio viral, atau <strong>masukkan & gunakan template buatanmu sendiri</strong> langsung di Photobooth!
          </p>
        </div>

        {/* Action Button: Masukkan Template Sendiri */}
        <button
          onClick={() => setIsCustomModalOpen(true)}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF2D75] via-[#E11D74] to-[#7C3AED] hover:opacity-95 text-white font-extrabold text-sm shadow-md shadow-pink-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Masukkan Template Sendiri</span>
        </button>
      </div>

      {/* 2. Categories Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat || (cat.startsWith('Template Saya') && selectedCategory.startsWith('Template Saya'));
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 3. Empty state for Template Saya */}
      {selectedCategory.startsWith('Template Saya') && userCustomTemplates.length === 0 && (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border-2 border-dashed border-slate-200 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Belum Ada Template Kustom Anda</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Anda dapat mengunggah frame foto karya Anda sendiri (PNG transparan) atau merancang warna tema favorit.
          </p>
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="mt-5 px-6 py-2.5 rounded-xl bg-pink-600 text-white font-bold text-xs shadow-sm hover:bg-pink-700 transition-colors"
          >
            ➕ Buat / Masukkan Template Sekarang
          </button>
        </div>
      )}

      {/* 4. Grid of Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {filtered.map((tmpl) => (
          <div
            key={tmpl.id}
            className={`bg-white rounded-3xl p-5 border shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group ${
              tmpl.isCustomUserTemplate
                ? 'border-pink-300 ring-2 ring-pink-500/10'
                : 'border-slate-200 hover:border-pink-300'
            }`}
          >
            <div>
              {/* Template Mockup Display */}
              <div
                className="w-full h-56 rounded-2xl p-4 flex flex-col items-center justify-between border border-black/5 shadow-inner transition-transform group-hover:scale-[1.02] relative overflow-hidden"
                style={{ backgroundColor: tmpl.themeColor || '#ffffff' }}
              >
                {/* Preview Image: Frame overlay or full preview mockup */}
                {tmpl.previewUrl || tmpl.frameOverlayUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center p-2.5 bg-gradient-to-b from-slate-50 to-slate-100/90">
                    <img
                      src={tmpl.previewUrl || tmpl.frameOverlayUrl}
                      alt={tmpl.name}
                      onError={(e) => {
                        const matchedProd = MARKETPLACE_FRAME_PRODUCTS.find((p) => p.id === tmpl.id);
                        if (matchedProd) {
                          const fallback = getProductFallbackImage(matchedProd);
                          if (e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                          }
                        }
                      }}
                      className="w-full h-full object-contain drop-shadow-sm"
                    />
                  </div>
                ) : (
                  <>
                    <div className="text-center z-10">
                      <div
                        className="text-xs font-black tracking-wider uppercase"
                        style={{ color: tmpl.textColor }}
                      >
                        {tmpl.bannerText}
                      </div>
                      <div
                        className="text-[10px] font-medium opacity-80"
                        style={{ color: tmpl.textColor }}
                      >
                        {tmpl.koreanText}
                      </div>
                    </div>

                    {/* Mini photo slots representation */}
                    <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] z-10">
                      <div className="aspect-[4/3] bg-white/90 rounded-lg shadow-xs border border-white flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="aspect-[4/3] bg-white/90 rounded-lg shadow-xs border border-white flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="aspect-[4/3] bg-white/90 rounded-lg shadow-xs border border-white flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 z-10">
                      {tmpl.stickers && tmpl.stickers.slice(0, 3).map((stk, i) => (
                        <span key={i} className="text-sm">
                          {stk.icon}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Title & Badges */}
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-extrabold uppercase text-pink-600 tracking-wider">
                      {tmpl.category}
                    </span>
                    {tmpl.isCustomUserTemplate && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded-full bg-pink-100 text-pink-700">
                        Template Anda
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base line-clamp-1">{tmpl.name}</h3>
                </div>

                {tmpl.isCustomUserTemplate ? (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCustom(e, tmpl.id, tmpl.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Hapus template kustom"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Launch in Photobooth Button */}
            <button
              onClick={() => launchPhotoboothWithTemplate(tmpl)}
              className="mt-5 w-full py-3 px-4 rounded-2xl bg-slate-900 group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-rose-600 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Gunakan di Photobooth</span>
            </button>
          </div>
        ))}
      </div>

      {/* 5. Custom Template Creator / Uploader Modal */}
      <CustomTemplateModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
      />
    </div>
  );
};
