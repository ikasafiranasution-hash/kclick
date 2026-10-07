import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Review } from '../../types';
import { getProductReviews, submitProductReview, recordProductView } from '../../services/firebase';
import { isPhotoboothFrameProduct, getProductFallbackImage, resolveProductPreview } from '../../data/mockProducts';
import { 
  X, 
  Heart, 
  ShoppingBag, 
  Download, 
  Camera,
  Check, 
  ShieldCheck, 
  Layers, 
  MessageSquarePlus,
  Loader2,
  Flag,
  ChevronRight,
  Clock,
  Star
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onOpenCheckout: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onOpenCheckout,
}) => {
  const { 
    user, 
    orders, 
    isFavorite, 
    toggleFav, 
    downloadProductFile, 
    applyProductToPhotobooth,
    hasPurchasedProduct,
    isProductPendingVerification,
    setActiveTab,
    syncProductRating,
    showToast, 
    setIsAuthModalOpen,
    setSelectedCreatorForModal,
    setReportProductTarget
  } = useApp();

  const isFav = isFavorite(product.id);
  const isFrameTemplate = isPhotoboothFrameProduct(product);

  // Check if current user already owns or purchased this item with verified entitlement
  const isFree = product.price === 0;
  const isCreator = Boolean(user?.id && user.id === product.creatorId);
  const isAdmin = user?.role === 'admin';
  const hasEntitlement = Boolean(user && (isCreator || isAdmin || hasPurchasedProduct(product.id)));
  const hasPaidOrderWithoutEntitlement = false;
  const isWaitingVerification = !isFree && !isCreator && !hasEntitlement && isProductPendingVerification(product.id);
  const isPaymentRejected = !isFree && !isCreator && !hasEntitlement && !isWaitingVerification && orders.some(
    (o) => o.buyerId === user?.id && o.productId === product.id && o.status === 'rejected'
  );
  const canReview = Boolean(user && (hasEntitlement || isFree) && !isCreator);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Record product view analytics & fetch genuine reviews from Firestore
  useEffect(() => {
    recordProductView(product.id, user?.id);

    let isMounted = true;
    const fetchReviews = async () => {
      try {
        const fetched = await getProductReviews(product.id);
        if (isMounted) {
          setReviews(fetched);
          // If user already wrote a review, prefill it for editing
          const userRev = fetched.find((r) => r.userId === user?.id);
          if (userRev) {
            setNewComment(userRev.comment);
            setNewRating(userRev.rating);
          }
        }
      } catch (err) {
        console.warn('Failed to load reviews:', err);
      }
    };

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [product.id, user?.id]);

  const existingUserReview = user ? reviews.find((r) => r.userId === user.id) : null;

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!canReview) {
      if (isCreator) {
        showToast('Kreator tidak dapat memberikan ulasan pada produk sendiri.', 'error');
      } else {
        showToast('Hanya pembeli dengan status pesanan lunas (Paid Order) yang dapat memberikan ulasan.', 'error');
      }
      return;
    }

    if (!newComment.trim()) {
      showToast('Komentar ulasan tidak boleh kosong.', 'error');
      return;
    }

    if (newRating < 1 || newRating > 5) {
      showToast('Rating harus antara 1 sampai 5 bintang.', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const reviewPayload: Review = {
        id: existingUserReview ? existingUserReview.id : `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.profileImage,
        productId: product.id,
        rating: newRating,
        comment: newComment.trim(),
        createdAt: new Date().toISOString(),
      };

      const updatedStats = await submitProductReview(reviewPayload);
      if (updatedStats) {
        syncProductRating(product.id, updatedStats.rating, updatedStats.reviewCount);
      }

      // Update local reviews list
      setReviews((prev) => {
        const filtered = prev.filter((r) => r.userId !== user.id);
        return [reviewPayload, ...filtered];
      });

      showToast(existingUserReview ? 'Ulasanmu berhasil diperbarui!' : 'Ulasanmu berhasil dikirimkan!', 'success');
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      showToast(err?.message || 'Gagal mengirim ulasan. Silakan coba kembali.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDownloadAsset = async () => {
    await downloadProductFile(product);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 shadow-sm transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[85vh] overflow-y-auto">
          {/* Left Column: Preview Image */}
          <div className="md:col-span-6 bg-slate-100 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200">
            <div className="relative rounded-2xl overflow-hidden shadow-md bg-white border border-slate-200 p-3 flex items-center justify-center">
              <img
                src={resolveProductPreview(product)}
                alt={product.name}
                onError={(e) => {
                  const fallback = getProductFallbackImage(product);
                  if (e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  }
                }}
                className={`w-full h-auto max-h-[480px] ${product.category === 'Wallpaper' ? 'object-cover rounded-xl' : 'object-contain'} drop-shadow-sm`}
              />
              <button
                onClick={() => toggleFav(product.id)}
                className="absolute top-3 right-3 p-2.5 rounded-full bg-white/90 backdrop-blur-xs shadow-md text-slate-400 hover:text-rose-500 transition-colors"
              >
                <Heart className={`w-5 h-5 ${isFav ? 'text-rose-500 fill-rose-500' : ''}`} />
              </button>
            </div>

            {/* Included highlights */}
            <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Paket Berisi (What's Included):</span>
              </div>
              {product.category === 'Wallpaper' ? (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Resolusi Ultra HD Lossless ({product.wallpaperDetails?.resolution || '4K/5K'})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Rasio Layar: {product.wallpaperDetails?.aspectRatio || '9:16'} ({product.wallpaperDetails?.deviceType === 'desktop' ? '🖥️ Desktop' : '📱 Mobile'})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Format PNG / ZIP Asli Tanpa Watermark</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Siap Pakai untuk iPhone, Android, Mac & PC</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Format PNG Transparan Resolusi Tinggi (High Resolution)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Kompatibel langsung di K-Click Photobooth</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Lisensi Penggunaan Digital & Komunitas Kreatif</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="md:col-span-6 p-6 md:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 tracking-wider">
                  {product.category}
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  {reviews.length > 0 ? (
                    <div className="flex items-center gap-1 font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                      <span>{(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}</span>
                      <span className="text-slate-400 font-normal">({reviews.length} ulasan bintang)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Star className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span>Belum ada ulasan bintang</span>
                    </div>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 font-semibold">{product.salesCount || 0} Terjual (Transaksi Asli)</span>
                </div>
              </div>

              <h2 className="text-xl md:text-2xl font-bold font-display text-slate-900 leading-tight">
                {product.name}
              </h2>

              {/* Creator / Uploader Asli */}
              <div 
                onClick={() => {
                  setSelectedCreatorForModal({
                    creatorId: product.creatorId,
                    creatorName: product.creatorName,
                    creatorAvatar: product.creatorAvatar
                  });
                }}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-purple-50/80 border border-slate-200/80 hover:border-purple-300 cursor-pointer transition-all group shadow-2xs"
                title="Lihat profil & etalase karya orisinal kreator ini"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={product.creatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                    alt={product.creatorName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-200"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors flex items-center gap-1">
                      <span>{product.creatorName}</span>
                      <span title="Uploader Asli Terverifikasi" className="inline-flex">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] font-medium">Uploader Asli Terverifikasi K-Click</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-purple-600 opacity-90 group-hover:opacity-100 pr-1">
                  <span>Lihat Profil</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Detail Keterangan Asli Karya */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                  Keterangan Asli Karya (Original Specs)
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Uploader Resmi:</span>
                    <strong className="text-slate-800 truncate block">{product.creatorName}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Tanggal Upload:</span>
                    <strong className="text-slate-800 block">
                      {new Date(product.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Rating Bintang:</span>
                    <strong className="text-amber-600 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{product.rating > 0 ? `${product.rating.toFixed(1)} / 5.0` : 'Belum diulas'}</span>
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Data Terjual:</span>
                    <strong className="text-slate-800 block">{product.salesCount || 0} Terjual (Real)</strong>
                  </div>
                </div>
              </div>

              {/* License Card */}
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-purple-950 flex items-center gap-1.5">
                    <span>Lisensi: {product.licenseType || 'Personal Use'}</span>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-purple-200 text-purple-800">
                      {product.licenseType === 'Commercial Use' ? 'Komersial' : 'Non-Komersial'}
                    </span>
                  </div>
                  <div className="text-[11px] text-purple-700 mt-0.5">
                    {product.licenseType === 'Commercial Use'
                      ? 'Diberikan izin untuk merchandise, promosi bisnis, dan event komersial.'
                      : 'Khusus untuk keseruan photobooth pribadi & koleksi non-komersial.'}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Deskripsi Karya
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {product.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Price and Buy/Download Bar */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500">Harga Karya:</span>
                <span className="text-2xl font-black font-display text-slate-900">
                  {product.price === 0 ? 'FREE' : `Rp ${product.price.toLocaleString('id-ID')}`}
                </span>
              </div>

              {hasEntitlement ? (
                <div className="space-y-2.5">
                  {isFrameTemplate && (
                    <button
                      onClick={() => applyProductToPhotobooth(product)}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Pakai Frame di Photobooth Live</span>
                    </button>
                  )}
                  <button
                    onClick={handleDownloadAsset}
                    className="w-full py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File Original (Siap Diunduh)</span>
                  </button>
                </div>
              ) : hasPaidOrderWithoutEntitlement ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-amber-900">Pembayaran Terverifikasi</div>
                    <div className="text-[11px] text-amber-700 mt-0.5">
                      Akses unduh sedang disiapkan oleh sistem. Silakan refresh halaman dalam beberapa saat.
                    </div>
                  </div>
                </div>
              ) : isWaitingVerification ? (
                <div className="space-y-2.5">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm text-amber-900">Menunggu Persetujuan Admin</div>
                      <div className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        Bukti pembayaran Anda sedang diperiksa oleh Tim Verifikasi Admin K-Click. Frame & file HD akan otomatis terbuka begitu disetujui.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      setActiveTab('gallery');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Lihat Status Verifikasi di My Gallery</span>
                  </button>
                </div>
              ) : isPaymentRejected ? (
                <div className="space-y-2">
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <div className="font-bold text-rose-900">Pembayaran Ditolak</div>
                      <div className="text-[11px] text-rose-700 mt-0.5">
                        Bukti pembayaran sebelumnya ditolak oleh admin. Anda dapat melakukan checkout ulang dengan bukti yang sah.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenCheckout(product)}
                    className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Checkout Ulang (QRIS K-Click)</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onOpenCheckout(product)}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Beli Sekarang (QRIS K-Click - Rp {product.price.toLocaleString('id-ID')})</span>
                </button>
              )}
            </div>

            {/* Reviews Section */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Ulasan Pembeli</span>
                <span className="text-[11px] font-normal text-slate-400">{reviews.length} ulasan</span>
              </h4>

              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800">{rev.userName}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                        <span className="text-[10px] font-bold text-amber-700 ml-1">
                          {rev.rating}.0
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-600 text-[11px]">{rev.comment}</p>
                  </div>
                ))}
              </div>

              {/* Review input section */}
              {!user ? (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="font-bold text-pink-600 hover:text-pink-700 underline mr-1"
                  >
                    Masuk ke Akun K-Click
                  </button>
                  untuk menulis ulasan karya ini.
                </div>
              ) : isCreator ? (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Sebagai kreator karya ini, Anda tidak dapat menulis ulasan sendiri.</span>
                </div>
              ) : !canReview ? (
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Hanya pengguna yang <strong>telah memiliki hak unduh resmi (Verified Purchase)</strong> yang dapat menulis ulasan.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleAddReview} className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-semibold">Beri Rating Bintang:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            type="button"
                            key={score}
                            onClick={() => setNewRating(score)}
                            className="p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                            title={`Beri ${score} Bintang`}
                          >
                            <Star
                              className={`w-4 h-4 transition-transform hover:scale-110 ${
                                score <= newRating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300 hover:text-amber-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    {existingUserReview && (
                      <span className="text-[10px] text-pink-600 font-bold bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                        Mode Edit Ulasan
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={existingUserReview ? 'Edit ulasan karyamu...' : 'Tulis pengalamanmu menggunakan karya ini...'}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      disabled={isSubmittingReview}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingReview || !newComment.trim()}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isSubmittingReview ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : existingUserReview ? (
                        'Perbarui'
                      ) : (
                        'Kirim'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Protection and Report footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Dilindungi hak cipta K-Click & Creator</span>
              <button
                type="button"
                onClick={() => setReportProductTarget(product)}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 transition-colors text-[11px] font-semibold"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Laporkan Karya Ini</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
