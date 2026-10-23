import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, UserProfile } from '../../types';
import { getUserProfile, getCreatorTotalViews } from '../../services/firebase';
import { 
  X, 
  Palette, 
  ShoppingBag, 
  Award,
  Eye, 
  Tag, 
  Calendar,
  Layers,
  Heart,
  Star,
  ShieldCheck
} from 'lucide-react';

interface CreatorProfileModalProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const CreatorProfileModal: React.FC<CreatorProfileModalProps> = ({
  creatorId,
  creatorName,
  creatorAvatar,
  onClose,
  onSelectProduct,
}) => {
  const { products, favorites, toggleFavorite } = useApp();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [totalViews, setTotalViews] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Products belonging to this creator
  const creatorProducts = products.filter((p) => p.creatorId === creatorId && p.status === 'approved');

  useEffect(() => {
    let isMounted = true;
    const loadCreator = async () => {
      setLoading(true);
      try {
        const [profData, viewsCount] = await Promise.all([
          getUserProfile(creatorId),
          creatorProducts.length > 0 ? getCreatorTotalViews(creatorProducts.map((p) => p.id)) : 0,
        ]);
        if (isMounted) {
          setProfile(profData);
          setTotalViews(viewsCount);
        }
      } catch (err) {
        console.warn('Failed to load creator profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadCreator();
    return () => {
      isMounted = false;
    };
  }, [creatorId, creatorProducts.length]);

  const totalSales = creatorProducts.reduce((acc, p) => acc + (p.salesCount || 0), 0);
  const ratedProducts = creatorProducts.filter((p) => (p.reviewCount || 0) > 0);
  const avgRating = ratedProducts.length > 0
    ? (ratedProducts.reduce((acc, p) => acc + (p.rating || 0), 0) / ratedProducts.length).toFixed(1)
    : '0.0';

  const avatar = profile?.profileImage || creatorAvatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${creatorId}`;
  const displayName = profile?.name || creatorName;
  const bio = profile?.bio || 'K-Click Verified Creator yang berdedikasi memproduksi twibbon, frame photobooth, dan aset digital kreatif berkualitas tinggi.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Creator Info Header */}
        <div className="px-6 md:px-8 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 mb-5">
            <div className="flex items-end gap-4">
              <img
                src={avatar}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-xl bg-white"
              />
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-bold font-display text-slate-900">
                    {displayName}
                  </h2>
                  <span title="Uploader Asli Terverifikasi" className="inline-flex">
                    <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 tracking-wider">
                    Creator
                  </span>
                </div>
                <p className="text-xs text-slate-500">Verified Uploader & Creator Resmi Komunitas K-Click</p>
              </div>
            </div>
          </div>

          {/* Bio */}
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mb-6">
            {bio}
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-center">
              <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Total Karya</div>
              <div className="text-lg font-black font-display text-purple-900">{creatorProducts.length}</div>
            </div>

            <div className="p-3 rounded-2xl bg-pink-50/70 border border-pink-100 text-center">
              <div className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">Total Terjual (Real)</div>
              <div className="text-lg font-black font-display text-pink-900">{totalSales}</div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 text-center">
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Rating Bintang</div>
              <div className="text-lg font-black font-display text-amber-900 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{avgRating}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-center">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Kunjungan Karya</div>
              <div className="text-lg font-black font-display text-blue-900">{totalViews}</div>
            </div>
          </div>

          {/* Published Products Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-pink-500" />
                <span>Katalog Karya ({creatorProducts.length})</span>
              </h3>
            </div>

            {creatorProducts.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                <Palette className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Kreator ini belum mempublikasikan karya baru.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-80 overflow-y-auto pr-1">
                {creatorProducts.map((prod) => {
                  const isFav = favorites.includes(prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        onClose();
                        onSelectProduct(prod);
                      }}
                      className="group p-2.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-pink-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="relative rounded-xl overflow-hidden aspect-4/3 bg-slate-100 mb-2">
                        <img
                          src={prod.previewImage}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(prod.id);
                          }}
                          className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 transition-colors shadow-xs"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'text-rose-500 fill-rose-500' : ''}`} />
                        </button>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-pink-600 uppercase tracking-wider truncate">
                          {prod.category}
                        </div>
                        <div className="text-xs font-bold text-slate-900 truncate group-hover:text-pink-600 transition-colors">
                          {prod.name}
                        </div>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                          <span className="text-xs font-black text-slate-800">
                            Rp {prod.price.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{prod.rating > 0 ? prod.rating.toFixed(1) : '0'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
