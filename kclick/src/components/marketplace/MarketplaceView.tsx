import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import { 
  isPhotoboothFrameProduct, 
  MARKETPLACE_FRAME_PRODUCTS, 
  WALLPAPER_PRODUCTS,
  ALL_DEFAULT_PRODUCTS,
  getProductFallbackImage,
  resolveProductPreview 
} from '../../data/mockProducts';
import { 
  Search, 
  Star, 
  Heart, 
  ShoppingBag, 
  ArrowUpDown, 
  Palette, 
  Camera,
  Check,
  Flame,
  X,
  Eye,
  Clock,
  ShieldCheck,
  Smartphone,
  Monitor,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

const CATEGORIES: Array<'All' | ProductCategory> = [
  'All',
  'Frame',
  'Photobooth',
  'Wallpaper',
  'Sticker',
  'Illustration',
  'Printing Design',
];

type PriceFilterType = 'all' | 'frames' | 'wallpapers' | '25k_35k' | '36k_60k' | 'owned';
type SortByType = 'popular' | 'newest' | 'rating' | 'price_low' | 'price_high' | 'name_asc';

export const MarketplaceView: React.FC = () => {
  const { 
    user,
    products, 
    productsLoading,
    productsError,
    categories,
    searchQuery,
    setSearchQuery,
    refreshData,
    isFavorite, 
    toggleFav, 
    hasPurchasedProduct,
    isProductPendingVerification,
    applyProductToPhotobooth,
    setActiveTab,
    setSelectedProductForDetail,
    setSelectedProductForCheckout,
    setSelectedCreatorForModal,
    setIsAuthModalOpen,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [onlyFrameCollection, setOnlyFrameCollection] = useState<boolean>(false);
  const [wallpaperDeviceFilter, setWallpaperDeviceFilter] = useState<'all' | 'mobile' | 'desktop'>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilterType>('all');
  const [sortBy, setSortBy] = useState<SortByType>('popular');

  const categoryList = useMemo(() => {
    const dynamicCats = categories.map((c) => c.name as ProductCategory);
    return Array.from(new Set([...CATEGORIES, ...dynamicCats]));
  }, [categories]);

  const officialProductIds = useMemo(
    () => new Set(ALL_DEFAULT_PRODUCTS.map((p) => p.id)),
    []
  );

  // Combine Firestore approved products + Official Marketplace Products with strict authentic data
  const catalogProducts = useMemo(() => {
    const map = new Map<string, Product>();

    // 1. Official Starter Products (Frames & Wallpapers)
    ALL_DEFAULT_PRODUCTS.forEach((dp) => {
      const live = products.find((p) => p.id === dp.id);
      if (live) {
        map.set(dp.id, {
          ...dp,
          price: typeof live.price === 'number' && live.price > 0 ? live.price : dp.price,
          salesCount: typeof live.salesCount === 'number' ? live.salesCount : (dp.salesCount || 0),
          rating: typeof live.rating === 'number' ? live.rating : (dp.rating || 0),
          reviewCount: typeof live.reviewCount === 'number' ? live.reviewCount : (dp.reviewCount || 0),
          creatorName: dp.creatorName,
          creatorId: dp.creatorId,
        });
      } else {
        map.set(dp.id, dp);
      }
    });

    // 2. Real Community Creator Uploads (approved items)
    products
      .filter((p) => p.status === 'approved' && !officialProductIds.has(p.id))
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

    return Array.from(map.values());
  }, [products, officialProductIds]);

  // Filter & sort products for public marketplace
  const filteredProducts = useMemo(() => {
    return catalogProducts
      .filter((p) => p.status === 'approved')
      .filter((p) => {
        if (onlyFrameCollection && !isPhotoboothFrameProduct(p)) return false;

        // Category filter: support both 'Frame' and 'Photobooth' for frame filter
        if (selectedCategory === 'Frame') {
          if (p.category !== 'Frame' && p.category !== 'Photobooth') return false;
        } else if (selectedCategory !== 'All' && p.category !== selectedCategory) {
          return false;
        }

        // Subfilter for Wallpapers
        if (selectedCategory === 'Wallpaper' && wallpaperDeviceFilter !== 'all') {
          const dev = p.wallpaperDetails?.deviceType;
          if (wallpaperDeviceFilter === 'mobile' && dev !== 'mobile' && dev !== 'bundle') return false;
          if (wallpaperDeviceFilter === 'desktop' && dev !== 'desktop' && dev !== 'bundle') return false;
        }

        // Price filter tiers
        if (priceFilter === 'frames' && (p.price > 15000 || p.price < 5000)) return false;
        if (priceFilter === 'wallpapers' && (p.price < 25000 || p.price > 60000)) return false;
        if (priceFilter === '25k_35k' && (p.price < 25000 || p.price > 35000)) return false;
        if (priceFilter === '36k_60k' && (p.price < 36000 || p.price > 60000)) return false;
        if (priceFilter === 'owned' && !hasPurchasedProduct(p.id)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCreator = p.creatorName.toLowerCase().includes(q);
          const matchCategory = p.category.toLowerCase().includes(q);
          const matchDesc = (p.description || '').toLowerCase().includes(q);
          const matchBanner = (p.photoboothConfig?.bannerText || '').toLowerCase().includes(q);
          const matchSubtitle = (p.photoboothConfig?.subtitleText || p.photoboothConfig?.koreanText || '').toLowerCase().includes(q);
          const matchPrice = String(p.price).includes(q);
          const matchTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
          return (
            matchName ||
            matchCreator ||
            matchCategory ||
            matchDesc ||
            matchBanner ||
            matchSubtitle ||
            matchPrice ||
            matchTags
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return (b.salesCount || 0) - (a.salesCount || 0);
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'rating') {
          const diff = (b.rating || 0) - (a.rating || 0);
          return diff !== 0 ? diff : (b.salesCount || 0) - (a.salesCount || 0);
        }
        if (sortBy === 'price_low') return a.price - b.price;
        if (sortBy === 'price_high') return b.price - a.price;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [catalogProducts, onlyFrameCollection, selectedCategory, priceFilter, searchQuery, sortBy, hasPurchasedProduct]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setOnlyFrameCollection(false);
    setPriceFilter('all');
    setSortBy('popular');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 animate-fade-in">
      {/* Hero Header */}
      <div className="relative rounded-3xl p-6 md:p-10 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-xl overflow-hidden mb-8">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold mb-3">
              <ShoppingBag className="w-3.5 h-3.5 text-pink-200" />
              <span>Digital Creative Marketplace & Frame Collection</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold font-display tracking-tight text-white">
              Creative Studio & Frame Collection
            </h1>
            <p className="text-sm md:text-base text-pink-100 mt-2">
              Temukan koleksi <span className="font-bold text-white">Marketplace Frame Collection (Rp 5.000, Rp 10.000, Rp 15.000)</span>, twibbon estetik, dan karya orisinal para kreator yang langsung terintegrasi dengan Photobooth Live!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setOnlyFrameCollection((prev) => !prev);
                setSelectedCategory('All');
              }}
              className={`px-4 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md cursor-pointer ${
                onlyFrameCollection
                  ? 'bg-slate-950 text-white ring-2 ring-white'
                  : 'bg-white text-pink-600 hover:bg-pink-50'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>{onlyFrameCollection ? '✓ Menampilkan Frame Collection' : 'Filter: Frame Collection'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wallpapers')}
              className="px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <ImageIcon className="w-4 h-4 text-white" />
              <span>Wallpaper Store (25k - 60k)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('photobooth')}
              className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Photobooth Live</span>
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Search, Price Filter, Sort & Category Controls (Unified - NO DUPLICATION) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 mb-8">
        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama frame, wallpaper mobile/desktop, harga (25000 - 60000), atau uploader..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Single Unified Sort & Price Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Unified Sort Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-pink-600" />
              <span>Urutkan:</span>
            </span>
            {[
              { id: 'popular', label: '🔥 Paling Populer' },
              { id: 'newest', label: '🚀 Terbaru' },
              { id: 'price_low', label: '💸 Termurah' },
              { id: 'price_high', label: '💎 Termahal' },
              { id: 'rating', label: '🏆 Rating Tertinggi' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSortBy(item.id as SortByType)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sortBy === item.id
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Price Tier Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-2xl p-1 text-xs font-semibold overflow-x-auto">
            {[
              { id: 'all', label: 'Semua Harga' },
              { id: 'frames', label: 'Frame (5k-15k)' },
              { id: 'wallpapers', label: 'Wallpaper (25k-60k)' },
              { id: '25k_35k', label: 'Rp 25k-35k' },
              { id: '36k_60k', label: 'Rp 36k-60k' },
              { id: 'owned', label: 'Sudah Dibeli' },
            ].map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setPriceFilter(tier.id as PriceFilterType)}
                className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
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

        {/* Category Filter Tabs & Active Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categoryList.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  if (cat !== 'Wallpaper') setWallpaperDeviceFilter('all');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat === 'All' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Menampilkan <strong className="text-slate-900">{filteredProducts.length}</strong> dari{' '}
              <strong className="text-slate-900">{catalogProducts.length}</strong> produk
            </span>
            {(searchQuery || selectedCategory !== 'All' || priceFilter !== 'all' || onlyFrameCollection || sortBy !== 'popular') && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs font-bold text-pink-600 hover:text-pink-700 underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Wallpaper Device Format Sub-filter */}
        {selectedCategory === 'Wallpaper' && (
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-purple-700 flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Format Layar:</span>
            </span>
            {[
              { id: 'all', label: 'Semua Format' },
              { id: 'mobile', label: '📱 Mobile (9:16)' },
              { id: 'desktop', label: '🖥️ Desktop (16:9)' },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setWallpaperDeviceFilter(sub.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  wallpaperDeviceFilter === sub.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Creator Studio Prompt Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/80 rounded-3xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Punya karya desain frame photobooth, twibbon, atau stiker digital?
            </h3>
            <p className="text-xs text-slate-500">
              Jual karyamu langsung ke ribuan pengguna di K-Click Creator Studio!
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('creator-studio')}
          className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all shrink-0"
        >
          Buka Creator Studio →
        </button>
      </div>

      {/* Products Grid */}
      {productsLoading && catalogProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <div className="w-10 h-10 rounded-full border-3 border-pink-500 border-t-transparent animate-spin mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Memuat Katalog Produk...</h3>
          <p className="text-xs text-slate-500 mt-1">Mengambil data karya digital terbaru dari database.</p>
        </div>
      ) : productsError && catalogProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-rose-200 p-8 shadow-xs">
          <ShoppingBag className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">Gagal Memuat Produk</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {productsError}
          </p>
          <button
            onClick={() => refreshData()}
            className="mt-4 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            Muat Ulang Produk
          </button>
        </div>
      ) : catalogProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Belum Ada Produk</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Marketplace belum memiliki karya digital yang disetujui. Kreator dapat mengunggah karya pertamanya melalui Creator Studio!
          </p>
          <button
            onClick={() => setActiveTab('creator-studio')}
            className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            Unggah Karya di Creator Studio →
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Tidak ada karya yang cocok</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau reset filter kategori dan harga untuk melihat karya lainnya.
          </p>
          <button
            onClick={resetAllFilters}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const isFav = isFavorite(product.id);
            const isOwned = product.price === 0 || hasPurchasedProduct(product.id);
            const isPendingAdmin = !isOwned && isProductPendingVerification(product.id);
            const isFrame = isPhotoboothFrameProduct(product);
            const isWallpaper = product.category === 'Wallpaper';
            const isOfficialCollection = officialProductIds.has(product.id);
            return (
              <div
                key={product.id}
                className="group bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-pink-300 hover:shadow-xl hover:shadow-pink-500/5 transition-all flex flex-col"
              >
                {/* Image Preview */}
                <div
                  onClick={() => setSelectedProductForDetail(product)}
                  className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/90 cursor-pointer flex items-center justify-center p-2.5"
                >
                  <img
                    src={resolveProductPreview(product)}
                    alt={product.name}
                    onError={(e) => {
                      const fallback = getProductFallbackImage(product);
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                    className={`w-full h-full ${isWallpaper ? 'object-cover rounded-2xl' : 'object-contain'} group-hover:scale-[1.03] transition-transform duration-300 drop-shadow-sm`}
                  />
                  
                  {/* Category Tag */}
                  <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md text-slate-900 shadow-xs">
                    {isWallpaper
                      ? `Wallpaper · ${product.wallpaperDetails?.deviceType === 'desktop' ? '🖥️ Desktop' : product.wallpaperDetails?.deviceType === 'bundle' ? '🎁 Bundle' : '📱 Mobile'}`
                      : isOfficialCollection
                      ? `${product.category} · Frame Collection`
                      : product.category}
                  </span>

                  {/* Favorite Heart Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(product.id);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-md shadow-sm text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Favorit"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'text-rose-500 fill-rose-500' : ''}`} />
                  </button>

                  {/* Bottom Status Badges */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-1.5 pointer-events-none">
                    {product.price === 0 ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-xs">
                        GRATIS
                      </span>
                    ) : isFrame ? (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-pink-600/90 text-white shadow-xs flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>Photobooth Live</span>
                      </span>
                    ) : isWallpaper ? (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-700/95 text-white shadow-xs flex items-center gap-1">
                        {product.wallpaperDetails?.deviceType === 'desktop' ? (
                          <>
                            <Monitor className="w-3 h-3 text-cyan-200" />
                            <span>Desktop 4K</span>
                          </>
                        ) : product.wallpaperDetails?.deviceType === 'bundle' ? (
                          <>
                            <Layers className="w-3 h-3 text-amber-300" />
                            <span>Dual Pack</span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-3 h-3 text-pink-200" />
                            <span>Mobile 4K</span>
                          </>
                        )}
                      </span>
                    ) : <span />}

                    {hasPurchasedProduct(product.id) ? (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Sudah Dibeli</span>
                      </span>
                    ) : isPendingAdmin ? (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Menunggu ACC Admin</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Creator avatar & name (Real verified uploader identity) */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 text-xs text-slate-500">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (product.creatorId) {
                            setSelectedCreatorForModal({
                              creatorId: product.creatorId,
                              creatorName: product.creatorName,
                              creatorAvatar: product.creatorAvatar,
                            });
                          }
                        }}
                        className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:text-pink-600 transition-colors group/creator"
                        title={`Uploader Asli: ${product.creatorName} (Klik untuk lihat profil & karya terverifikasi)`}
                      >
                        <img
                          src={product.creatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                          alt={product.creatorName}
                          className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                        />
                        <span className="truncate font-semibold text-slate-700 group-hover/creator:text-pink-600 group-hover/creator:underline">
                          {product.creatorName}
                        </span>
                        <span title="Uploader Asli Terverifikasi" className="inline-flex">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        </span>
                      </div>
                      <span className="text-[10px] text-pink-600 font-bold shrink-0">
                        {product.category}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3 
                      onClick={() => setSelectedProductForDetail(product)}
                      className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-pink-600 transition-colors cursor-pointer"
                    >
                      {product.name}
                    </h3>
                  </div>

                  {/* Rating Bintang & Jumlah Terjual Asli */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      {product.reviewCount && product.reviewCount > 0 && product.rating ? (
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span>{product.rating.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({product.reviewCount})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                          <Star className="w-3 h-3 text-slate-300 shrink-0" />
                          <span>0 rating</span>
                        </div>
                      )}
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {product.salesCount || 0} terjual
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-sm text-slate-900 font-display">
                        Rp {product.price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isOwned && isFrame ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => applyProductToPhotobooth(product)}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Pakai Frame</span>
                      </button>
                      <button
                        onClick={() => setSelectedProductForDetail(product)}
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Detail
                      </button>
                    </div>
                  ) : isOwned ? (
                    <button
                      onClick={() => setSelectedProductForDetail(product)}
                      className="w-full mt-3 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Lihat & Unduh</span>
                    </button>
                  ) : isPendingAdmin ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setActiveTab('gallery')}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Menunggu ACC Admin</span>
                      </button>
                      <button
                        onClick={() => setSelectedProductForDetail(product)}
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Detail
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          if (!user) {
                            setIsAuthModalOpen(true);
                            return;
                          }
                          setSelectedProductForCheckout(product);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-pink-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Beli Frame</span>
                      </button>
                      <button
                        onClick={() => setSelectedProductForDetail(product)}
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Detail
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
