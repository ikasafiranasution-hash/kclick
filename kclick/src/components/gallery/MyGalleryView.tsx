import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GalleryItem, Product } from '../../types';
import { 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Eye, 
  ShoppingBag, 
  Heart, 
  Calendar, 
  Camera, 
  Layers, 
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck,
  ShieldCheck
} from 'lucide-react';
import { recordDownload, loadSecureProofBlobUrl } from '../../services/firebase';
import { isPhotoboothFrameProduct, MARKETPLACE_FRAME_PRODUCTS, getProductFallbackImage } from '../../data/mockProducts';

export const MyGalleryView: React.FC = () => {
  const { 
    user,
    gallery, 
    purchases,
    removeFromGallery, 
    products, 
    favorites, 
    orders,
    hasPurchasedProduct,
    downloadProductFile,
    applyProductToPhotobooth,
    setActiveTab, 
    setSelectedProductForDetail,
    setSelectedProductForCheckout,
    showToast 
  } = useApp();

  const pendingVerificationOrders = orders.filter((o) => o.status === 'waiting_verification');
  const [activeSubTab, setActiveSubTab] = useState<'strips' | 'purchased' | 'orders' | 'favorites'>(() =>
    orders.some((o) => o.status === 'waiting_verification') ? 'orders' : 'strips'
  );
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const photoboothStrips = gallery.filter((item) => item.type === 'photobooth');
  const purchasedItems = gallery.filter((item) => item.type === 'purchased');
  const favoriteProducts = products.filter((p) => favorites.includes(p.id));

  // Check if string is a safe web-displayable URL (HTTP or data URL)
  const isDisplayableImageUrl = (url?: string): boolean => {
    if (!url) return false;
    const trimmed = url.trim();
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('/')
    );
  };

  // Merge items from persistent purchases and gallery purchased items (deduplicated by productId)
  const allPurchasedList = React.useMemo(() => {
    const list: Array<{
      id: string;
      productId: string;
      title: string;
      creatorName?: string;
      previewUrl?: string;
      licenseType?: string;
      purchasedAt?: string;
      orderId?: string;
      status?: string;
    }> = [];

    const seenProductIds = new Set<string>();

    // 1. Primary source: genuine Firestore purchases collection (verified by Admin)
    purchases.forEach((p) => {
      if (!p.productId || seenProductIds.has(p.productId)) return;
      if (!hasPurchasedProduct(p.productId)) return;
      seenProductIds.add(p.productId);

      const matched =
        products.find((prod) => prod.id === p.productId) ||
        MARKETPLACE_FRAME_PRODUCTS.find((prod) => prod.id === p.productId);
      const safePreview = isDisplayableImageUrl(matched?.previewImage)
        ? matched!.previewImage
        : '';

      list.push({
        id: p.id,
        productId: p.productId,
        title: p.productName || matched?.name || 'Karya Digital',
        creatorName: p.creatorName || matched?.creatorName,
        previewUrl: safePreview,
        licenseType: p.licenseType || matched?.licenseType || 'Personal Use',
        purchasedAt: p.purchasedAt,
        orderId: p.orderId,
      });
    });

    // 2. Secondary source: local gallery items if verified/entitled
    purchasedItems.forEach((item) => {
      const pid = item.productId;
      if (!pid || seenProductIds.has(pid)) return;
      if (!hasPurchasedProduct(pid)) return;
      seenProductIds.add(pid);

      const matched =
        products.find((prod) => prod.id === pid) ||
        MARKETPLACE_FRAME_PRODUCTS.find((prod) => prod.id === pid);
      const safePreview = isDisplayableImageUrl(matched?.previewImage)
        ? matched!.previewImage
        : '';

      list.push({
        id: item.id,
        productId: pid,
        title: item.title || matched?.name || 'Karya Digital',
        creatorName: matched?.creatorName,
        previewUrl: safePreview,
        licenseType: 'Personal Use',
        purchasedAt: item.createdAt,
      });
    });

    return list;
  }, [purchases, products, purchasedItems, hasPurchasedProduct]);

  const handleDownload = async (url: string, filename: string, productId?: string) => {
    try {
      if (user && productId) {
        await recordDownload({
          id: `dl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          userId: user.id,
          productId,
          productName: filename,
          orderId: `ORD-${productId}`,
          fileUrl: url,
          downloadedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Non-blocking log
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Download dimulai! Simpan file HD kamu.', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-xs font-bold mb-2">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>K-Click Vault & Koleksi</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            My Creative Gallery
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Simpanan hasil foto photobooth kamu, aset digital yang telah dibeli, riwayat transaksi pembayaran, dan produk favorit.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('strips')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all shrink-0 ${
              activeSubTab === 'strips'
                ? 'bg-white text-slate-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-pink-500" />
            <span>Photo Strips ({photoboothStrips.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('purchased')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all shrink-0 ${
              activeSubTab === 'purchased'
                ? 'bg-white text-slate-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-purple-600" />
            <span>Karya Terbeli ({allPurchasedList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('orders')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all shrink-0 ${
              activeSubTab === 'orders'
                ? 'bg-white text-slate-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Riwayat Order ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('favorites')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all shrink-0 ${
              activeSubTab === 'favorites'
                ? 'bg-white text-slate-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Favorit ({favoriteProducts.length})</span>
          </button>
        </div>
      </div>

      {/* Pending Verification Notice Banner */}
      {pendingVerificationOrders.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-extrabold text-amber-900">
                {pendingVerificationOrders.length} Pesanan Menunggu Verifikasi Tim Admin Resmi
              </div>
              <p className="text-[11px] text-amber-800">
                Begitu pembayaran disetujui oleh Admin, frame & file HD akan otomatis aktif di tab Karya Terbeli dan Photobooth Live.
              </p>
            </div>
          </div>
          {activeSubTab !== 'orders' && (
            <button
              onClick={() => setActiveSubTab('orders')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Lihat Riwayat Order →
            </button>
          )}
        </div>
      )}

      {/* TAB 1: PHOTO STRIPS */}
      {activeSubTab === 'strips' && (
        <div>
          {photoboothStrips.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Belum ada photo strip tersimpan</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
                Buka photobooth K-Click untuk mengambil foto seru dengan frame estetik favoritmu!
              </p>
              <button
                onClick={() => setActiveTab('photobooth')}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
              >
                Mulai Photobooth Sekarang →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {photoboothStrips.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div 
                    onClick={() => setLightboxUrl(item.fileUrl)}
                    className="relative aspect-[9/14] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center p-3"
                  >
                    <img
                      src={item.fileUrl}
                      alt={item.title}
                      className="w-full h-full object-contain rounded-xl shadow-xs group-hover:scale-102 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold backdrop-blur-xs">
                      <Eye className="w-4 h-4 mr-1" /> Perbesar
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{item.title}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(item.createdAt).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleDownload(item.fileUrl, item.title)}
                        className="flex-1 py-2 px-3 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>

                      <button
                        onClick={() => removeFromGallery(item.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PURCHASED PRODUCTS & DOWNLOAD HISTORY */}
      {activeSubTab === 'purchased' && (
        <div>
          {allPurchasedList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Belum ada karya terbeli</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
                Jelajahi marketplace untuk menemukan frame twibbon, stiker digital, dan template siap pakai.
              </p>
              <button
                onClick={() => setActiveTab('marketplace')}
                className="px-6 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-md hover:bg-slate-800 transition-colors"
              >
                Kunjungi Marketplace →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {allPurchasedList.map((item) => {
                const matchedProduct = item.productId
                  ? products.find((p) => p.id === item.productId) ||
                    MARKETPLACE_FRAME_PRODUCTS.find((p) => p.id === item.productId)
                  : null;
                const isFrame = Boolean(matchedProduct && isPhotoboothFrameProduct(matchedProduct));

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between"
                  >
                    <div className="relative aspect-square bg-slate-100 overflow-hidden group flex items-center justify-center">
                      {item.previewUrl ? (
                        <img 
                          src={item.previewUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                          <ShoppingBag className="w-12 h-12 text-slate-300 mb-1" />
                          <span className="text-[10px] font-medium text-slate-400 line-clamp-1">{item.title}</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex flex-col gap-1">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-xs">
                          Siap Diunduh ✓
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-100 backdrop-blur-xs flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>{item.licenseType || 'Personal Use'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{item.title}</h4>
                        {item.creatorName && (
                          <div className="text-[11px] text-slate-500 mt-0.5">Oleh: {item.creatorName}</div>
                        )}
                        {item.purchasedAt && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Dibeli: {new Date(item.purchasedAt).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {isFrame && matchedProduct && (
                          <button
                            onClick={() => applyProductToPhotobooth(matchedProduct)}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Pakai di Photobooth Live</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (matchedProduct) {
                              downloadProductFile(matchedProduct, item.orderId);
                            } else if (item.productId) {
                              downloadProductFile({ id: item.productId, name: item.title, price: 1 } as any, item.orderId);
                            } else {
                              showToast('File master belum siap atau produk tidak ditemukan.', 'error');
                            }
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-4 h-4" />
                          <span>Unduh File HD</span>
                        </button>

                        {matchedProduct && (
                          <button
                            onClick={() => setSelectedProductForDetail(matchedProduct)}
                            className="w-full py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Detail & Ulasan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ORDER HISTORY */}
      {activeSubTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Riwayat Pesanan & Transaksi Pembayaran</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau status verifikasi bukti pembayaran kamu oleh admin K-Click.
            </p>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Belum ada riwayat pesanan yang tercatat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Order ID</th>
                    <th className="p-3.5">Produk</th>
                    <th className="p-3.5">Total Harga</th>
                    <th className="p-3.5">Tanggal</th>
                    <th className="p-3.5">Status Verifikasi</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => {
                    const matchedProduct =
                      products.find((p) => p.id === order.productId) ||
                      MARKETPLACE_FRAME_PRODUCTS.find((p) => p.id === order.productId);
                    const isFrame = Boolean(matchedProduct && isPhotoboothFrameProduct(matchedProduct));
                    const isEntitled = Boolean(order.amount === 0 || order.status === 'paid');

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5 font-mono font-bold text-purple-700">
                          <div>{order.id}</div>
                          {order.proofImage && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const url = await loadSecureProofBlobUrl(order.id, order.proofImage);
                                  setLightboxUrl(url);
                                } catch (err: any) {
                                  showToast(err.message || 'Gagal memuat bukti pembayaran.', 'error');
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-800 font-semibold underline mt-0.5"
                            >
                              <Eye className="w-2.5 h-2.5" /> Bukti Pembayaran
                            </button>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{order.productName}</td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {order.amount === 0 ? 'FREE' : `Rp ${order.amount.toLocaleString('id-ID')}`}
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            order.status === 'paid'
                              ? isEntitled
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                              : order.status === 'waiting_verification'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {order.status === 'paid' && isEntitled && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {order.status === 'paid' && !isEntitled && <Clock className="w-3 h-3 text-amber-600" />}
                            {order.status === 'waiting_verification' && <Clock className="w-3 h-3 text-amber-600" />}
                            {order.status === 'rejected' && <XCircle className="w-3 h-3 text-rose-600" />}
                            <span>
                              {order.status === 'paid'
                                ? isEntitled
                                  ? 'Lunas & Siap Unduh'
                                  : 'Pembayaran terverifikasi. Akses unduh sedang disiapkan.'
                                : order.status === 'waiting_verification'
                                ? 'Menunggu Review Admin'
                                : order.status === 'pending'
                                ? 'Menunggu Pembayaran'
                                : 'Ditolak'}
                            </span>
                          </span>
                          {order.status === 'rejected' && order.rejectionReason && (
                            <div className="text-[10px] text-rose-600 mt-1 max-w-xs">
                              Alasan: {order.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {order.status === 'paid' && isEntitled ? (
                            <div className="inline-flex items-center gap-1.5">
                              {isFrame && matchedProduct && (
                                <button
                                  onClick={() => applyProductToPhotobooth(matchedProduct)}
                                  className="py-1.5 px-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>Pakai Frame</span>
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  downloadProductFile(
                                    matchedProduct || ({ id: order.productId, name: order.productName, price: order.amount } as Product),
                                    order.id
                                  )
                                }
                                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download HD</span>
                              </button>
                            </div>
                          ) : (order.status === 'rejected' || order.status === 'pending') && matchedProduct ? (
                            <button
                              onClick={() => setSelectedProductForCheckout(matchedProduct)}
                              className="py-1.5 px-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>{order.status === 'rejected' ? 'Checkout Ulang' : 'Unggah Bukti'}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              {order.status === 'waiting_verification'
                                ? 'Proses verifikasi manual'
                                : order.status === 'paid' && !isEntitled
                                ? 'Menyiapkan hak unduh...'
                                : 'Tidak tersedia'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FAVORITES */}
      {activeSubTab === 'favorites' && (
        <div>
          {favoriteProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Daftar favorit kosong</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
                Klik ikon hati di katalog marketplace untuk menyimpan karya yang kamu sukai.
              </p>
              <button
                onClick={() => setActiveTab('marketplace')}
                className="px-6 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold transition-colors"
              >
                Cari Karya Favorit →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {favoriteProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProductForDetail(p)}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-pink-300 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-square bg-slate-100 overflow-hidden">
                    <img
                      src={p.previewImage || getProductFallbackImage(p)}
                      alt={p.name}
                      onError={(e) => {
                        const fb = getProductFallbackImage(p);
                        if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                      }}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-800 shadow-xs">
                      {p.category}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="text-xs text-slate-400">{p.creatorName}</div>
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1 mt-0.5">{p.name}</h4>
                    <div className="font-extrabold text-sm text-slate-900 mt-2">
                      {p.price === 0 ? 'FREE' : `Rp ${p.price.toLocaleString('id-ID')}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm cursor-pointer animate-fade-in"
        >
          <div className="relative max-h-[90vh] max-w-sm overflow-hidden rounded-3xl bg-white p-2 shadow-2xl">
            <img src={lightboxUrl} alt="Preview Strip" className="w-full h-auto rounded-2xl object-contain max-h-[85vh]" />
          </div>
        </div>
      )}
    </div>
  );
};
