import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PHOTOBOOTH_TEMPLATES } from '../../data/mockTemplates';
import { 
  MARKETPLACE_FRAME_PRODUCTS, 
  WALLPAPER_PRODUCTS, 
  ALL_DEFAULT_PRODUCTS, 
  getProductFallbackImage,
  resolveProductPreview 
} from '../../data/mockProducts';
import { Product } from '../../types';
import { 
  Camera, 
  ShoppingBag, 
  Palette, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Download,
  Heart,
  QrCode,
  Star,
  Image as ImageIcon,
  Smartphone,
  Monitor
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { 
    setActiveTab, 
    products, 
    productsLoading, 
    productsError, 
    refreshData, 
    setSelectedProductForDetail,
    setSelectedPhotoboothTemplate
  } = useApp();

  const featuredProducts = useMemo(() => {
    const map = new Map<string, Product>();
    const officialIds = new Set(ALL_DEFAULT_PRODUCTS.map((fp) => fp.id));

    ALL_DEFAULT_PRODUCTS.forEach((fp) => {
      const live = products.find((p) => p.id === fp.id);
      if (live) {
        map.set(fp.id, {
          ...fp,
          price: typeof live.price === 'number' && live.price > 0 ? live.price : fp.price,
          salesCount: typeof live.salesCount === 'number' ? live.salesCount : (fp.salesCount || 0),
          rating: typeof live.rating === 'number' ? live.rating : (fp.rating || 0),
          reviewCount: typeof live.reviewCount === 'number' ? live.reviewCount : (fp.reviewCount || 0),
          creatorName: fp.creatorName,
          creatorId: fp.creatorId,
        });
      } else {
        map.set(fp.id, fp);
      }
    });

    products
      .filter((p) => p.status === 'approved' && !officialIds.has(p.id))
      .forEach((p) => {
        const validPrice = typeof p.price === 'number' && p.price >= 0 ? p.price : 10000;
        map.set(p.id, {
          ...p,
          price: validPrice,
          salesCount: typeof p.salesCount === 'number' ? p.salesCount : 0,
          rating: typeof p.rating === 'number' ? p.rating : 0,
          reviewCount: typeof p.reviewCount === 'number' ? p.reviewCount : 0,
        });
      });

    return Array.from(map.values()).slice(0, 8);
  }, [products]);

  const featuredWallpapers = useMemo(() => {
    return WALLPAPER_PRODUCTS.slice(0, 4);
  }, []);

  // Diverse cute models representing both girls and guys in photobooth poses
  const samplePhotos = [
    {
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      label: 'Photo 1',
    },
    {
      url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80',
      label: 'Photo 2',
    },
    {
      url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
      label: 'Photo 3',
    },
    {
      url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80',
      label: 'Photo 4',
    },
  ];

  return (
    <div className="pb-24 animate-fade-in space-y-16">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-6 pb-12 md:py-20 bg-gradient-to-b from-pink-50/70 via-purple-50/40 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-100/80 border border-pink-200 text-pink-700 text-xs font-bold tracking-wide">
                <Camera className="w-3.5 h-3.5 text-pink-600" />
                <span>Photobooth Estetik & Creative Studio Hub</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display text-slate-900 tracking-tight leading-[1.1]">
                Ciptakan Momen Istimewa <br />
                <span className="bg-gradient-to-r from-[#FF2D75] via-[#E11D74] to-[#7C3AED] bg-clip-text text-transparent">
                  4-Cut Photostrip & Twibbon
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Abadikan foto selfie estetik dengan layout photostrip kekinian, gunakan frame twibbon eksklusif, atau bagikan dan jual desain karyamu ke seluruh komunitas kreator.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  onClick={() => setActiveTab('photobooth')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl bg-gradient-to-r from-[#FF2D75] via-[#E11D74] to-[#7C3AED] hover:from-[#E0266A] hover:to-[#6D28D9] text-white font-extrabold text-base shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>Mulai Photobooth Gratis</span>
                </button>

                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl bg-white border border-slate-300 hover:border-pink-300 text-slate-800 font-bold text-base hover:bg-pink-50/40 transition-all shadow-xs cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5 text-pink-600" />
                  <span>Jelajahi Marketplace</span>
                </button>
              </div>

              {/* Trust Points */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Kamera Langsung & Upload Foto</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Twibbon Drag & Zoom Real-Time</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Verified Digital Goods & Instant Downloads</span>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic Mockup (Clean 4-Cut Strip matching logo) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative">
                {/* Visual strip card */}
                <div className="w-64 sm:w-72 p-3 bg-white rounded-3xl shadow-2xl border border-pink-100 rotate-2 hover:rotate-0 transition-transform duration-300 select-none">
                  <div className="bg-sky-50 rounded-2xl p-2.5 text-center space-y-2 border border-sky-200">
                    <div className="text-[10px] font-bold text-sky-800 tracking-wider uppercase">
                      PHOTO STUDIO • K-CLICK EDITION
                    </div>

                    {/* 4 slots preview */}
                    <div className="space-y-1.5">
                      {samplePhotos.map((photo, i) => (
                        <div key={i} className="aspect-[7/5] rounded-lg overflow-hidden shadow-xs border border-white bg-slate-100">
                          <img
                            src={photo.url}
                            alt={photo.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] font-bold text-sky-900 pt-1">
                      FOREVER WITH YOU • 2026.10.03
                    </div>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -bottom-4 -left-6 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF2D75] to-[#7C3AED] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    HD
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-900">High Resolution Output</div>
                    <div className="text-[10px] text-slate-500">Siap Cetak Strip Asli</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. FEATURED PHOTOBOOTH TEMPLATES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-1">
              Pilihan Tema Populer
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">
              Template Photobooth Pilihan Favorit
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Gunakan langsung di kamera photobooth dengan 1 klik!
            </p>
          </div>

          <button
            onClick={() => setActiveTab('templates')}
            className="flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 mt-2 md:mt-0 cursor-pointer"
          >
            <span>Lihat Semua Template</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {PHOTOBOOTH_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => {
                setSelectedPhotoboothTemplate(tmpl);
                setActiveTab('photobooth');
              }}
              className="group cursor-pointer bg-white rounded-3xl p-3 border border-slate-200 hover:border-pink-300 hover:shadow-lg transition-all flex flex-col items-center text-center"
            >
              <div
                className="w-full h-32 rounded-2xl flex flex-col items-center justify-center p-2 mb-3 border border-black/5 transition-transform group-hover:scale-105"
                style={{ backgroundColor: tmpl.themeColor }}
              >
                <div className="w-12 h-14 bg-white/90 rounded-md shadow-xs border border-white flex items-center justify-center mb-1">
                  <Camera className="w-4 h-4 text-slate-400" />
                </div>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/80 truncate max-w-full"
                  style={{ color: tmpl.textColor }}
                >
                  {tmpl.category}
                </span>
              </div>

              <div className="font-bold text-xs text-slate-900 truncate w-full">{tmpl.name}</div>
              <span className="text-[10px] text-pink-600 font-semibold mt-1 flex items-center gap-0.5">
                Coba Foto →
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FEATURED MARKETPLACE CREATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">
              Karya Kreator Komunitas
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">
              Marketplace Produk Kreatif & Frame
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Frame photobooth, twibbon estetik, stiker PNG, dan karya seni digital siap pakai.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('marketplace')}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 mt-2 md:mt-0 cursor-pointer"
          >
            <span>Buka Marketplace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {productsLoading ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <div className="w-8 h-8 rounded-full border-3 border-pink-500 border-t-transparent animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">Memuat karya terbaru dari database...</p>
          </div>
        ) : productsError ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-rose-200 p-8 shadow-xs">
            <p className="text-sm font-bold text-slate-900">Gagal memuat produk</p>
            <p className="text-xs text-slate-500 mt-1">{productsError}</p>
            <button
              onClick={() => refreshData()}
              className="mt-3 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <p className="text-sm font-bold text-slate-800">Belum ada produk</p>
            <p className="text-xs text-slate-500 mt-1">Karya yang diunggah dan disetujui akan tampil di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => setSelectedProductForDetail(prod)}
                className="group cursor-pointer bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-pink-300 hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/90 flex items-center justify-center p-2.5">
                  <img
                    src={resolveProductPreview(prod)}
                    alt={prod.name}
                    onError={(e) => {
                      const fb = getProductFallbackImage(prod);
                      if (e.currentTarget.src !== fb) {
                        e.currentTarget.src = fb;
                      }
                    }}
                    className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300 drop-shadow-sm"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-800 shadow-xs">
                    {prod.category}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <span className="truncate">{prod.creatorName}</span>
                    <span title="Uploader Asli" className="inline-flex">
                      <ShieldCheck className="w-3 h-3 text-blue-500 shrink-0" />
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-pink-600 transition-colors">{prod.name}</h4>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      {prod.reviewCount && prod.reviewCount > 0 && prod.rating ? (
                        <div className="flex items-center gap-0.5 text-amber-500 font-bold text-[11px]">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                          <span>{prod.rating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Belum diulas</span>
                      )}
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] text-slate-500">{prod.salesCount || 0} terjual</span>
                    </div>
                    <div className="font-extrabold text-sm text-slate-900 font-display">
                      Rp {prod.price.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. FEATURED WALLPAPERS (Mobile & Desktop) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Official Wallpaper Hub</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">
              Koleksi Wallpaper Mobile & Desktop (Rp 25k - 60k)
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Wallpaper resolusi 4K & 5K Retina Ultra HD dengan estetika cyberpunk, lo-fi, dan anime estetik.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('wallpapers')}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 mt-2 md:mt-0 cursor-pointer"
          >
            <span>Buka Semua Wallpaper</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredWallpapers.map((wp) => {
            const isDesktop = wp.wallpaperDetails?.deviceType === 'desktop';
            const isBundle = wp.wallpaperDetails?.deviceType === 'bundle';
            return (
              <div
                key={wp.id}
                onClick={() => {
                  setSelectedProductForDetail(wp);
                }}
                className="group cursor-pointer bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-slate-950 flex items-center justify-center">
                  <img
                    src={wp.previewImage}
                    alt={wp.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-white border border-white/20 shadow-xs flex items-center gap-1">
                    {isDesktop ? (
                      <>
                        <Monitor className="w-3 h-3 text-cyan-300" />
                        <span>Desktop 16:9</span>
                      </>
                    ) : isBundle ? (
                      <>
                        <Layers className="w-3 h-3 text-amber-300" />
                        <span>Dual Pack</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-3 h-3 text-pink-300" />
                        <span>Mobile 9:16</span>
                      </>
                    )}
                  </span>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-bold text-white/90 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10">
                      {wp.wallpaperDetails?.resolution || 'Ultra HD'}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
                    <span className="truncate">{wp.creatorName}</span>
                    <span className="text-[10px] text-purple-600 font-bold">Wallpaper</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-purple-600 transition-colors">
                    {wp.name}
                  </h4>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-[11px]">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{wp.rating ? wp.rating.toFixed(1) : '5.0'}</span>
                    </div>
                    <div className="font-extrabold text-sm text-purple-700 font-mono">
                      Rp {wp.price.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. CREATOR STUDIO CALLOUT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#FF2D75] via-[#E02690] to-[#7C3AED] text-white p-8 md:p-12 shadow-xl shadow-pink-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold">
              <Palette className="w-3.5 h-3.5" />
              <span>K-Click Creator Partner</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black font-display tracking-tight text-white">
              Dapatkan Penghasilan dari Karya Desain Kreatif
            </h2>
            <p className="text-sm text-pink-100 leading-relaxed font-normal">
              Bergabunglah dengan ratusan kreator digital di K-Click. Upload karyamu (template frame, stiker PNG, twibbon), atur harga Rp 5.000, Rp 10.000, atau Rp 15.000, dan dapatkan pembayaran langsung!
            </p>
          </div>

          <button
            onClick={() => setActiveTab('creator-studio')}
            className="z-10 px-8 py-4 rounded-2xl bg-white text-pink-600 hover:bg-pink-50 font-extrabold text-sm shadow-xl shadow-black/10 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            Buka Creator Studio Sekarang →
          </button>

          {/* Background glow decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </section>

    </div>
  );
};
