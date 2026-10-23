import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { WALLPAPER_PRODUCTS } from '../../data/mockProducts';
import { 
  Smartphone, 
  Monitor, 
  Image as ImageIcon, 
  Search, 
  Eye, 
  ShoppingBag, 
  Check, 
  Heart, 
  Star, 
  ShieldCheck, 
  Download, 
  Maximize2, 
  X, 
  Layers, 
  Palette,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  Clock
} from 'lucide-react';

type DeviceFilterType = 'all' | 'mobile' | 'desktop' | 'bundle';
type PriceRangeFilter = 'all' | '25k_35k' | '36k_50k' | '50k_60k';

export const WallpaperStoreView: React.FC = () => {
  const { 
    products, 
    user,
    setSelectedProductForDetail, 
    setSelectedProductForCheckout,
    downloadProductFile,
    hasPurchasedProduct,
    isFavorite,
    toggleFav,
    showToast,
    setIsAuthModalOpen
  } = useApp();

  const [deviceFilter, setDeviceFilter] = useState<DeviceFilterType>('all');
  const [priceFilter, setPriceFilter] = useState<PriceRangeFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMockupProduct, setSelectedMockupProduct] = useState<Product | null>(null);
  const [mockupMode, setMockupMode] = useState<'lockscreen' | 'homescreen' | 'clean'>('lockscreen');

  // Combine local canonical wallpaper products with any user/admin created wallpapers from DB
  const allWallpapers = useMemo(() => {
    const map = new Map<string, Product>();
    WALLPAPER_PRODUCTS.forEach((wp) => {
      const live = products.find((p) => p.id === wp.id);
      if (live) {
        map.set(wp.id, {
          ...wp,
          price: typeof live.price === 'number' && live.price > 0 ? live.price : wp.price,
          salesCount: typeof live.salesCount === 'number' ? live.salesCount : (wp.salesCount || 0),
          rating: typeof live.rating === 'number' ? live.rating : (wp.rating || 0),
          reviewCount: typeof live.reviewCount === 'number' ? live.reviewCount : (wp.reviewCount || 0),
        });
      } else {
        map.set(wp.id, wp);
      }
    });

    // Also include any approved products categorized as 'Wallpaper'
    products
      .filter((p) => p.category === 'Wallpaper' && p.status === 'approved' && !map.has(p.id))
      .forEach((p) => {
        map.set(p.id, p);
      });

    return Array.from(map.values());
  }, [products]);

  // Filtered wallpapers
  const filteredWallpapers = useMemo(() => {
    return allWallpapers.filter((wp) => {
      // Device filter
      if (deviceFilter === 'mobile' && wp.wallpaperDetails?.deviceType !== 'mobile' && wp.wallpaperDetails?.deviceType !== 'bundle') return false;
      if (deviceFilter === 'desktop' && wp.wallpaperDetails?.deviceType !== 'desktop' && wp.wallpaperDetails?.deviceType !== 'bundle') return false;
      if (deviceFilter === 'bundle' && wp.wallpaperDetails?.deviceType !== 'bundle') return false;

      // Price filter (Rp 25.000 - Rp 60.000)
      if (priceFilter === '25k_35k' && (wp.price < 25000 || wp.price > 35000)) return false;
      if (priceFilter === '36k_50k' && (wp.price < 36000 || wp.price > 50000)) return false;
      if (priceFilter === '50k_60k' && (wp.price < 50000 || wp.price > 60000)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = wp.name.toLowerCase().includes(q);
        const matchDesc = (wp.description || '').toLowerCase().includes(q);
        const matchTheme = (wp.wallpaperDetails?.theme || '').toLowerCase().includes(q);
        const matchTags = (wp.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchPrice = String(wp.price).includes(q);
        return matchName || matchDesc || matchTheme || matchTags || matchPrice;
      }

      return true;
    });
  }, [allWallpapers, deviceFilter, priceFilter, searchQuery]);

  const handleBuyNow = (product: Product) => {
    setSelectedProductForCheckout(product);
  };

  const handleDownload = async (product: Product) => {
    await downloadProductFile(product);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 animate-fade-in space-y-10">
      
      {/* 1. Hero Showcase Banner */}
      <div className="relative rounded-3xl p-6 md:p-12 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 text-white shadow-2xl overflow-hidden border border-purple-500/20">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/25 border border-purple-400/30 text-purple-200 text-xs font-bold tracking-wide">
            <ImageIcon className="w-3.5 h-3.5 text-purple-200" />
            <span>K-Click Digital Studio · Official Wallpaper Collection</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight text-white leading-tight">
            Koleksi Wallpaper HD <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300">
              Mobile & Desktop Ultra HD
            </span>
          </h1>

          <p className="text-sm md:text-base text-purple-200/90 leading-relaxed max-w-2xl">
            Tingkatkan estetika layar smartphone dan setup monitor komputermu dengan karya seni digital orisinal resolusi 4K & 5K. Harga bervariasi mulai dari <strong className="text-white">Rp 25.000 hingga Rp 60.000</strong>, siap unduh langsung dan berlisensi jernih!
          </p>

          {/* Quick Metrics */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-purple-200">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Format 9:16 & 16:9 Siap Pakai</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Resolusi 4K (1290x2796) & 5K (5120x2880)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Fitur Pratinjau Device Interaktif</span>
            </div>
          </div>
        </div>

        {/* Floating preview badge graphic */}
        <div className="hidden lg:flex absolute right-12 bottom-8 items-center gap-4 select-none pointer-events-none">
          {/* Mini Phone Mockup preview */}
          <div className="w-36 h-64 rounded-3xl bg-slate-900 border-4 border-slate-700/80 shadow-2xl overflow-hidden relative rotate-3 hover:rotate-0 transition-transform">
            <img 
              src="https://images.unsplash.com/photo-1514565131-fce0801e5785?w=500&auto=format&fit=crop&q=80" 
              alt="Preview Phone"
              className="w-full h-full object-cover" 
            />
            <div className="absolute top-2 inset-x-0 flex justify-center">
              <div className="w-12 h-3 bg-black rounded-full" />
            </div>
            <div className="absolute top-8 inset-x-0 text-center text-white">
              <div className="text-lg font-bold font-mono">09:41</div>
              <div className="text-[8px] opacity-80">Rabu, 7 Okt</div>
            </div>
          </div>

          {/* Mini Desktop Mockup preview */}
          <div className="w-64 h-40 rounded-2xl bg-slate-900 border-4 border-slate-700/80 shadow-2xl overflow-hidden relative -rotate-3 hover:rotate-0 transition-transform -ml-6 mt-16">
            <img 
              src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80" 
              alt="Preview Desktop"
              className="w-full h-full object-cover" 
            />
            <div className="absolute top-0 inset-x-0 h-3 bg-black/40 backdrop-blur-xs flex items-center px-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Filter Bar & Search */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari tema wallpaper (Cyberpunk, Anime, Lo-Fi, K-Pop, Pastel, Minimalist, Space) atau harga..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Device & Price Filter Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-slate-100">
          
          {/* Device Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Semua Layar', icon: Layers },
              { id: 'mobile', label: '📱 Mobile (9:16)', icon: Smartphone },
              { id: 'desktop', label: '🖥️ Desktop (16:9)', icon: Monitor },
              { id: 'bundle', label: '🎁 Dual Bundle Pack', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDeviceFilter(tab.id as DeviceFilterType)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    deviceFilter === tab.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Price Range Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-semibold overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-purple-600" />
              <span>Harga:</span>
            </span>
            {[
              { id: 'all', label: 'Semua (25k-60k)' },
              { id: '25k_35k', label: 'Rp 25k - 35k' },
              { id: '36k_50k', label: 'Rp 36k - 50k' },
              { id: '50k_60k', label: 'Rp 50k - 60k' },
            ].map((tier) => (
              <button
                key={tier.id}
                onClick={() => setPriceFilter(tier.id as PriceRangeFilter)}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  priceFilter === tier.id
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* 3. Wallpapers Grid */}
      {filteredWallpapers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Tidak ada wallpaper yang cocok</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Coba ubah filter format layar atau kisaran harga untuk menemukan wallpaper lainnya.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setDeviceFilter('all');
              setPriceFilter('all');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredWallpapers.map((wp) => {
            const isOwned = wp.price === 0 || hasPurchasedProduct(wp.id);
            const isFav = isFavorite(wp.id);
            const details = wp.wallpaperDetails;
            const isDesktop = details?.deviceType === 'desktop';
            const isBundle = details?.deviceType === 'bundle';

            return (
              <div
                key={wp.id}
                className="group bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 transition-all flex flex-col justify-between"
              >
                {/* Visual Preview Box */}
                <div className="relative overflow-hidden bg-slate-950 flex items-center justify-center">
                  {/* Aspect ratio frame depending on mobile (portrait) vs desktop (widescreen) */}
                  <div 
                    onClick={() => setSelectedMockupProduct(wp)}
                    className={`w-full cursor-pointer relative overflow-hidden ${
                      isDesktop ? 'aspect-[16/10]' : isBundle ? 'aspect-[16/10]' : 'aspect-[9/14]'
                    }`}
                  >
                    <img
                      src={wp.previewImage}
                      alt={wp.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                      <div className="px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-md text-slate-900 font-extrabold text-xs shadow-lg flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-purple-600" />
                        <span>Pratinjau Device</span>
                      </div>
                    </div>
                  </div>

                  {/* Device Tag */}
                  <span className="absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-xs flex items-center gap-1">
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

                  {/* Favorite button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(wp.id);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-rose-500 hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'text-rose-500 fill-rose-500' : ''}`} />
                  </button>

                  {/* Resolution pill at bottom of image */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-bold text-white/90 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10">
                      {details?.resolution || 'Ultra HD'}
                    </span>
                    {isOwned && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white font-extrabold">
                        ✓ Dimiliki
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Info & Actions */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium truncate">{wp.creatorName}</span>
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-[11px] shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{wp.rating ? wp.rating.toFixed(1) : '5.0'}</span>
                        <span className="text-slate-400 font-normal">({wp.salesCount || 0} terjual)</span>
                      </div>
                    </div>

                    <h3 
                      onClick={() => setSelectedMockupProduct(wp)}
                      className="font-bold text-sm text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-1 cursor-pointer"
                    >
                      {wp.name}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {wp.description}
                    </p>
                  </div>

                  {/* Price & Action Button */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Harga Resmi</div>
                      <div className="text-base font-extrabold font-mono text-purple-700">
                        Rp {wp.price.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setSelectedMockupProduct(wp)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 transition-colors cursor-pointer"
                        title="Lihat Pratinjau Device"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isOwned ? (
                        <button
                          onClick={() => handleDownload(wp)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyNow(wp)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-extrabold transition-all shadow-sm shadow-purple-600/20 active:scale-95 cursor-pointer"
                        >
                          Beli Sekarang
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 4. Interactive Live Device Simulator Modal */}
      {selectedMockupProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 my-8 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  {selectedMockupProduct.wallpaperDetails?.deviceType === 'desktop' ? (
                    <Monitor className="w-5 h-5" />
                  ) : (
                    <Smartphone className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white line-clamp-1">
                    Pratinjau Device: {selectedMockupProduct.name}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{selectedMockupProduct.wallpaperDetails?.resolution || 'Ultra HD'}</span>
                    <span>•</span>
                    <span className="font-mono text-purple-300 font-bold">
                      Rp {selectedMockupProduct.price.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedMockupProduct(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two Columns (Simulator on Left, Details & Checkout on Right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8">
              
              {/* Simulator Frame (Left) */}
              <div className="md:col-span-7 flex flex-col items-center justify-center bg-slate-950 p-6 rounded-2xl border border-slate-800/80">
                
                {/* View Mode Switcher */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl mb-6 text-xs font-semibold">
                  <button
                    onClick={() => setMockupMode('lockscreen')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      mockupMode === 'lockscreen' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Lockscreen
                  </button>
                  <button
                    onClick={() => setMockupMode('clean')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      mockupMode === 'clean' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Karya Bersih
                  </button>
                </div>

                {/* Render Phone Mockup for Mobile, Monitor Mockup for Desktop */}
                {selectedMockupProduct.wallpaperDetails?.deviceType === 'desktop' ? (
                  /* DESKTOP MONITOR SIMULATOR */
                  <div className="w-full max-w-md">
                    {/* Monitor Screen Bezel */}
                    <div className="rounded-2xl border-8 border-slate-800 shadow-2xl bg-black overflow-hidden relative aspect-[16/10]">
                      <img
                        src={selectedMockupProduct.previewImage}
                        alt="Desktop Simulator"
                        className="w-full h-full object-cover"
                      />

                      {/* Mock macOS Top Bar */}
                      {mockupMode === 'lockscreen' && (
                        <>
                          <div className="absolute top-0 inset-x-0 h-4 bg-black/40 backdrop-blur-xs px-2 flex items-center justify-between text-[8px] text-white/90 font-mono">
                            <div className="flex items-center gap-2">
                              <span></span>
                              <span>Finder</span>
                              <span>File</span>
                              <span>Edit</span>
                              <span>View</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>100%</span>
                              <span>Rab 7 Okt</span>
                              <span className="font-bold">09:41</span>
                            </div>
                          </div>

                          {/* Mock bottom Dock */}
                          <div className="absolute bottom-2 inset-x-0 flex justify-center">
                            <div className="h-6 px-3 bg-white/20 backdrop-blur-md border border-white/20 rounded-xl flex items-center gap-2 shadow-lg">
                              <div className="w-3 h-3 rounded-md bg-blue-500" />
                              <div className="w-3 h-3 rounded-md bg-purple-500" />
                              <div className="w-3 h-3 rounded-md bg-pink-500" />
                              <div className="w-3 h-3 rounded-md bg-emerald-500" />
                              <div className="w-3 h-3 rounded-md bg-amber-500" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Monitor Stand */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-6 bg-slate-700" />
                      <div className="w-28 h-2 bg-slate-600 rounded-full shadow-md" />
                    </div>
                  </div>
                ) : (
                  /* SMARTPHONE SIMULATOR */
                  <div className="w-60 h-[480px] rounded-[42px] border-6 border-slate-800 shadow-2xl bg-black overflow-hidden relative select-none">
                    <img
                      src={selectedMockupProduct.previewImage}
                      alt="Smartphone Simulator"
                      className="w-full h-full object-cover"
                    />

                    {/* Dynamic Island / Notch */}
                    <div className="absolute top-2.5 inset-x-0 flex justify-center z-10">
                      <div className="w-20 h-4 bg-black rounded-full border border-slate-800/60" />
                    </div>

                    {/* Lockscreen Overlay Elements */}
                    {mockupMode === 'lockscreen' && (
                      <div className="absolute inset-0 flex flex-col justify-between p-6 pt-12 text-white pointer-events-none">
                        {/* Clock & Date */}
                        <div className="text-center space-y-0.5">
                          <div className="text-xs font-semibold uppercase tracking-wider text-white/80">
                            Rabu, 7 Oktober
                          </div>
                          <div className="text-4xl font-black font-mono tracking-tight drop-shadow-md">
                            09:41
                          </div>
                        </div>

                        {/* Bottom Flashlight, Camera & Swipe Bar */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                            <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                              <span className="text-xs">🔦</span>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                              <span className="text-xs">📸</span>
                            </div>
                          </div>

                          {/* Home Swipe Indicator */}
                          <div className="flex justify-center">
                            <div className="w-24 h-1 bg-white/70 rounded-full" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Details & Purchase Action (Right) */}
              <div className="md:col-span-5 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      {selectedMockupProduct.wallpaperDetails?.deviceType === 'desktop' ? '🖥️ Desktop Wallpaper 16:9' : selectedMockupProduct.wallpaperDetails?.deviceType === 'bundle' ? '🎁 Dual Pack (Mobile + Desktop)' : '📱 Mobile Wallpaper 9:16'}
                    </span>
                    <h2 className="text-xl font-black text-white mt-2 leading-tight">
                      {selectedMockupProduct.name}
                    </h2>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedMockupProduct.description}
                  </p>

                  {/* Specification List */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Spesifikasi File Digital:
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Resolusi Asli</span>
                      <strong className="text-white font-mono">{selectedMockupProduct.wallpaperDetails?.resolution || 'Ultra HD 4K'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Rasio Layar</span>
                      <strong className="text-white font-mono">{selectedMockupProduct.wallpaperDetails?.aspectRatio || '9:16'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Format File</span>
                      <strong className="text-white">{selectedMockupProduct.wallpaperDetails?.fileFormat || 'PNG High-Res'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Ukuran File</span>
                      <strong className="text-white font-mono">{selectedMockupProduct.wallpaperDetails?.fileSizeMb || 6.5} MB</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Lisensi</span>
                      <strong className="text-emerald-400">{selectedMockupProduct.licenseType || 'Personal Use'}</strong>
                    </div>
                  </div>

                  {/* Color Palette */}
                  {selectedMockupProduct.wallpaperDetails?.palette && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Palette className="w-3 h-3 text-purple-400" />
                        <span>Palet Warna Estetik:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedMockupProduct.wallpaperDetails.palette.map((hex, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-lg border border-white/20 shadow-xs"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Purchase CTA */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Total Harga:</span>
                    <span className="text-2xl font-black font-mono text-purple-400">
                      Rp {selectedMockupProduct.price.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {hasPurchasedProduct(selectedMockupProduct.id) ? (
                    <button
                      onClick={() => handleDownload(selectedMockupProduct)}
                      className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh File Asli Resolusi Penuh</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const target = selectedMockupProduct;
                        setSelectedMockupProduct(null);
                        handleBuyNow(target);
                      }}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Beli & Dapatkan File Master Sekarang</span>
                    </button>
                  )}
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* 5. Helpful Guide & FAQ Accordion */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 rounded-3xl p-6 sm:p-8 border border-purple-200/80">
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          Panduan Pemasangan Wallpaper K-Click
        </h3>
        <p className="text-xs text-slate-600 mb-4">
          Semua wallpaper diunduh langsung dalam format lossless PNG berkualitas tinggi tanpa kompresi buram.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="font-bold text-purple-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-purple-600" />
              <span>iPhone & Android</span>
            </div>
            <p className="text-slate-500">
              Setelah pembayaran diverifikasi, klik Unduh lalu buka Pengaturan &gt; Wallpaper &gt; Pasang sebagai Layar Kunci atau Layar Utama.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="font-bold text-purple-900 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-purple-600" />
              <span>Mac & Windows</span>
            </div>
            <p className="text-slate-500">
              Klik kanan file yang diunduh lalu pilih "Set as Desktop Background" (Windows) atau "Set Desktop Picture" (macOS).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="font-bold text-purple-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Akses Selamanya</span>
            </div>
            <p className="text-slate-500">
              Wallpaper yang sudah dibeli tersimpan aman di akun K-Click kamu dan dapat diunduh ulang kapan saja lewat menu My Gallery.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
