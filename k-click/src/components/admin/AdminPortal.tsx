import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Order, CategoryItem, ReportItem } from '../../types';
import { loadSecureProofBlobUrl } from '../../services/firebase';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShoppingBag, 
  Eye, 
  AlertCircle, 
  DollarSign, 
  Users, 
  Layers,
  FileCheck,
  Search,
  Plus,
  Trash2,
  MessageSquare,
  Tag,
  Loader2
} from 'lucide-react';

const SecureAdminProofViewer: React.FC<{
  orderId: string;
  proofPath?: string;
  onExpand: (url: string) => void;
  onError?: (msg: string) => void;
}> = ({ orderId, proofPath, onExpand, onError }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!proofPath) return;

    if (proofPath.startsWith('blob:') || proofPath.startsWith('data:')) {
      setBlobUrl(proofPath);
      return;
    }

    setLoading(true);
    loadSecureProofBlobUrl(orderId, proofPath)
      .then((url) => {
        if (isMounted) {
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error loading private payment proof:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [orderId, proofPath]);

  if (!proofPath) {
    return (
      <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-medium">
        Belum ada screenshot bukti diupload.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-32 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-xs text-slate-500 gap-1.5">
        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
        <span>Memuat bukti pembayaran privat...</span>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs space-y-1.5">
        <div className="font-semibold text-slate-800">Bukti Pembayaran (Privat)</div>
        <div className="text-[10px] font-mono text-slate-400 truncate">{proofPath}</div>
        <button
          type="button"
          onClick={async () => {
            try {
              const url = await loadSecureProofBlobUrl(orderId);
              setBlobUrl(url);
              onExpand(url);
            } catch (e: any) {
              if (onError) {
                onError(e.message || 'Gagal memuat bukti pembayaran');
              }
            }
          }}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" /> Buka Bukti
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-semibold text-slate-700 mb-1">Bukti Pembayaran:</div>
      <div
        onClick={() => onExpand(blobUrl)}
        className="relative rounded-xl overflow-hidden border border-slate-200 h-32 cursor-pointer group bg-slate-100"
      >
        <img
          src={blobUrl}
          alt="Bukti Pembayaran"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
          <Eye className="w-4 h-4 mr-1" /> Perbesar
        </div>
      </div>
    </div>
  );
};

export const AdminPortal: React.FC = () => {
  const { 
    user, 
    allProducts, 
    updateProductStatus, 
    allOrders, 
    payments,
    verifyOrderPayment, 
    categories,
    addCategory,
    deleteCategory,
    reports,
    updateReportStatus,
    setIsAuthModalOpen,
    setActiveTab: setNavTab,
    refreshData,
    showToast 
  } = useApp();

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const [activeTab, setActiveTab] = useState<'approvals' | 'payments' | 'categories' | 'reports' | 'overview'>('payments');
  const [rejectionModalItem, setRejectionModalItem] = useState<{ id: string; type: 'product' | 'order' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewProofModal, setPreviewProofModal] = useState<string | null>(null);

  // New Category Form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const pendingProducts = allProducts.filter((p) => p.status === 'pending');
  const reviewedProducts = allProducts.filter((p) => p.status !== 'pending');
  const pendingOrders = allOrders.filter(
    (o) => o.status === 'waiting_verification' || (o.status === 'pending' && o.amount > 0)
  );
  const reviewedOrders = allOrders.filter(
    (o) => o.status !== 'waiting_verification' && !(o.status === 'pending' && o.amount > 0)
  );

  // Guard: if current user is not admin
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-rose-200 text-center shadow-lg">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-display">Akses Terbatas (Admin Only)</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">
          {user 
            ? `Akun Anda (${user.email}) tidak memiliki hak akses administrator. Silakan masuk menggunakan akun Administrator resmi.`
            : 'Halaman ini khusus untuk administrator resmi K-Click. Silakan masuk dengan akun admin terdaftar.'}
        </p>
        <div className="flex flex-col gap-2">
          {!user ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              Masuk dengan Akun Admin
            </button>
          ) : (
            <button
              onClick={() => setNavTab('marketplace')}
              className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-colors"
            >
              Kembali ke Beranda
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleApproveProduct = (productId: string) => {
    updateProductStatus(productId, 'approved');
  };

  const handleRejectAction = () => {
    if (!rejectionModalItem) return;
    if (rejectionModalItem.type === 'product') {
      updateProductStatus(rejectionModalItem.id, 'rejected', rejectionReason || 'Tidak memenuhi kriteria visual K-Click.');
    } else {
      verifyOrderPayment(rejectionModalItem.id, 'rejected', rejectionReason || 'Bukti pembayaran tidak valid atau dana belum masuk.');
    }
    setRejectionModalItem(null);
    setRejectionReason('');
  };

  const handleApprovePayment = (orderId: string) => {
    verifyOrderPayment(orderId, 'paid');
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const slug = newCatSlug.trim() || newCatName.toLowerCase().replace(/\s+/g, '-');
    const newCat: CategoryItem = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      slug,
      description: newCatDesc.trim() || `Kategori produk ${newCatName.trim()}`,
    };
    await addCategory(newCat);
    setNewCatName('');
    setNewCatSlug('');
    setNewCatDesc('');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-32 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>K-Click Administrator Control Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            Portal Verifikasi & Manajemen Admin
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Logged in as: <strong className="text-purple-700">{user.email}</strong> • Verified Administrator
          </p>
        </div>

        {/* Tab Switcher - Responsive Grid on Mobile, Flex on Desktop (All 5 tabs always fully visible) */}
        <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'approvals'
                ? 'bg-white text-purple-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Persetujuan Karya</span>
            {pendingProducts.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingProducts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-white text-purple-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Verifikasi Pembayaran</span>
            {pendingOrders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-white text-purple-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Kategori ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-white text-purple-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Laporan User</span>
            {reports.filter((r) => r.status === 'open').length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {reports.filter((r) => r.status === 'open').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-purple-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Statistik Platform</span>
          </button>
        </div>
      </div>

      {/* Realtime Alert Banners for Pending Submissions & Payments */}
      <div className="space-y-3 mb-6">
        {pendingProducts.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-pink-50 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                🎨
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                  <span>Notifikasi Realtime Kurasi Frame Masuk</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                  Ada {pendingProducts.length} karya/frame kreator yang baru diajukan dan menunggu kurasi Anda saat ini!
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('approvals')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm cursor-pointer shrink-0 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>Tinjau Karya Sekarang ({pendingProducts.length})</span>
            </button>
          </div>
        )}

        {pendingOrders.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-pink-50 to-purple-50 border-2 border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                💳
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                  <span>Notifikasi Realtime Verifikasi Pembayaran</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                  Ada {pendingOrders.length} transaksi QRIS pembeli yang menunggu verifikasi admin.
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('payments')}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm cursor-pointer shrink-0 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>Verifikasi Bukti QRIS ({pendingOrders.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: PRODUCT APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-display text-slate-900">
              Antrean Karya Kreator Menunggu Review ({pendingProducts.length})
            </h3>
            <span className="text-xs text-slate-500">
              Setujui untuk otomatis menerbitkan karya ke marketplace publik
            </span>
          </div>

          {pendingProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">Semua karya telah ditinjau!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Tidak ada produk kreator yang menunggu persetujuan saat ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                      <img src={prod.previewImage} alt={prod.name} className="w-full h-full object-cover" />
                      <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-purple-600 text-white shadow-xs">
                        {prod.category}
                      </span>
                      <span className="absolute top-3 right-3 text-xs font-black px-2.5 py-1 rounded-full bg-white text-slate-900 shadow-xs">
                        {prod.price === 0 ? 'FREE' : `Rp ${prod.price.toLocaleString('id-ID')}`}
                      </span>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="text-xs text-slate-500">
                        Diajukan oleh: <strong className="text-slate-800">{prod.creatorName}</strong>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{prod.name}</h4>
                      <p className="text-xs text-slate-600 line-clamp-3">{prod.description}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {prod.tags.map((t, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Approve / Reject Actions */}
                  <div className="p-4 pt-0 border-t border-slate-100 grid grid-cols-2 gap-2 mt-4">
                    <button
                      onClick={() => handleApproveProduct(prod.id)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Setujui (Publish)</span>
                    </button>

                    <button
                      onClick={() => setRejectionModalItem({ id: prod.id, type: 'product' })}
                      className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Tolak Karya</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reviewed Products Catalog Table & Mobile Cards */}
          {reviewedProducts.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs mt-8">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    Katalog Karya yang Telah Ditinjau ({reviewedProducts.length})
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daftar seluruh produk yang telah disetujui atau ditolak.
                  </p>
                </div>
              </div>

              {/* Mobile Card View (No horizontal scrolling required!) */}
              <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
                {reviewedProducts.map((prod) => (
                  <div key={prod.id} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2.5">
                    <div className="flex items-start gap-3">
                      <img src={prod.previewImage} alt={prod.name} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-sm truncate">{prod.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Kreator: <strong className="text-slate-700">{prod.creatorName}</strong>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
                            {prod.category}
                          </span>
                          <span className="text-xs font-black text-slate-900">
                            {prod.price === 0 ? 'FREE' : `Rp ${prod.price.toLocaleString('id-ID')}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        prod.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {prod.status === 'approved' ? 'Approved (Live)' : 'Rejected'}
                      </span>
                      <div className="space-x-1.5">
                        {prod.status !== 'approved' && (
                          <button
                            onClick={() => handleApproveProduct(prod.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            Setujui
                          </button>
                        )}
                        {prod.status === 'approved' && (
                          <button
                            onClick={() => setRejectionModalItem({ id: prod.id, type: 'product' })}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Tarik / Tolak
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Karya</th>
                      <th className="p-3.5">Kreator</th>
                      <th className="p-3.5">Kategori</th>
                      <th className="p-3.5">Harga</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ubah Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviewedProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5 font-bold text-slate-900">{prod.name}</td>
                        <td className="p-3.5 text-slate-600">{prod.creatorName}</td>
                        <td className="p-3.5 text-slate-600">{prod.category}</td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {prod.price === 0 ? 'FREE' : `Rp ${prod.price.toLocaleString('id-ID')}`}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            prod.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {prod.status === 'approved' ? 'Approved (Live)' : 'Rejected'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          {prod.status !== 'approved' && (
                            <button
                              onClick={() => handleApproveProduct(prod.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Setujui
                            </button>
                          )}
                          {prod.status === 'approved' && (
                            <button
                              onClick={() => setRejectionModalItem({ id: prod.id, type: 'product' })}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Tarik / Tolak
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYMENT VERIFICATION */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-display text-slate-900">
              Antrean Verifikasi Pembayaran ({pendingOrders.length})
            </h3>
            <span className="text-xs text-slate-500">
              Periksa bukti pembayaran sebelum memberikan akses unduhan kepada pembeli
            </span>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">Semua pembayaran terverifikasi!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Tidak ada pesanan yang sedang menunggu validasi pembayaran.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                        {order.id}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400">Pembeli:</div>
                      <div className="text-sm font-bold text-slate-900">{order.buyerName}</div>
                      <div className="text-xs text-slate-500">{order.buyerEmail}</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-xs text-slate-500">Produk yang dibeli:</div>
                      <div className="text-xs font-bold text-slate-800 truncate">{order.productName}</div>
                      <div className="text-sm font-black font-display text-slate-900 mt-1">
                        Rp {order.amount.toLocaleString('id-ID')}
                      </div>
                    </div>

                    {/* Proof image preview */}
                    <SecureAdminProofViewer
                      orderId={order.id}
                      proofPath={order.proofImage}
                      onExpand={(url) => setPreviewProofModal(url)}
                      onError={(msg) => showToast(msg, 'error')}
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleApprovePayment(order.id)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Setujui (ACC Lunas)</span>
                    </button>

                    <button
                      onClick={() => setRejectionModalItem({ id: order.id, type: 'order' })}
                      className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Tolak Pembayaran</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reviewed Orders History Table & Mobile Cards */}
          {reviewedOrders.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs mt-8">
              <div className="p-4 sm:p-5 border-b border-slate-100">
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  Riwayat Transaksi Pembayaran ({reviewedOrders.length})
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar pesanan yang telah diverifikasi lunas maupun ditolak.
                </p>
              </div>

              {/* Mobile Card View (No horizontal scrolling required!) */}
              <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
                {reviewedOrders.map((ord) => (
                  <div key={ord.id} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-100">
                        {ord.id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {ord.status === 'paid' ? 'Disetujui (Lunas)' : ord.status === 'rejected' ? 'Ditolak' : ord.status}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-sm text-slate-900 truncate">{ord.productName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Pembeli: <strong className="text-slate-700">{ord.buyerName}</strong> ({ord.buyerEmail})
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <div className="font-black text-slate-900 text-sm font-display">
                        {ord.amount === 0 ? 'FREE' : `Rp ${ord.amount.toLocaleString('id-ID')}`}
                      </div>
                      <div className="space-x-1.5">
                        {ord.status !== 'paid' && (
                          <button
                            onClick={() => handleApprovePayment(ord.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            Setujui (ACC)
                          </button>
                        )}
                        {ord.status === 'paid' && ord.amount > 0 && (
                          <button
                            onClick={() => setRejectionModalItem({ id: ord.id, type: 'order' })}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Batalkan / Tolak
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Order ID</th>
                      <th className="p-3.5">Pembeli</th>
                      <th className="p-3.5">Produk</th>
                      <th className="p-3.5">Nominal</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Tindakan Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviewedOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5 font-mono font-bold text-purple-700">{ord.id}</td>
                        <td className="p-3.5 text-slate-700">
                          <div className="font-bold">{ord.buyerName}</div>
                          <div className="text-[10px] text-slate-400">{ord.buyerEmail}</div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{ord.productName}</td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {ord.amount === 0 ? 'FREE' : `Rp ${ord.amount.toLocaleString('id-ID')}`}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            ord.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {ord.status === 'paid' ? 'Disetujui (Lunas)' : ord.status === 'rejected' ? 'Ditolak' : ord.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          {ord.status !== 'paid' && (
                            <button
                              onClick={() => handleApprovePayment(ord.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Setujui (ACC)
                            </button>
                          )}
                          {ord.status === 'paid' && ord.amount > 0 && (
                            <button
                              onClick={() => setRejectionModalItem({ id: ord.id, type: 'order' })}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Batalkan / Tolak
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Category Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">Tambah Kategori Baru</h3>
            <p className="text-xs text-slate-500 mb-4">
              Kategori akan otomatis muncul di filter marketplace K-Click.
            </p>

            <form onSubmit={handleAddCategorySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kategori</label>
                <input
                  type="text"
                  required
                  placeholder="cth: K-Drama Posters"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Slug URL (Opsional)</label>
                <input
                  type="text"
                  placeholder="cth: kdrama-posters"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi kategori untuk kreator dan pembeli..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 text-xs text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Kategori ke Database</span>
              </button>
            </form>
          </div>

          {/* Existing Categories List */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">Daftar Kategori Aktif</h3>
            <p className="text-xs text-slate-500 mb-4">
              Semua kategori yang tersimpan dalam koleksi Firestore.
            </p>

            <div className="divide-y divide-slate-100">
              {categories.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-sm font-bold text-slate-900">{c.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        /{c.slug}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                  </div>

                  <button
                    onClick={() => deleteCategory(c.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                    title="Hapus Kategori"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USER REPORTS & FEEDBACK */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Laporan & Masukan Pengguna</h3>
              <p className="text-xs text-slate-500">
                Keluhan, bug, atau masukan yang dikirim oleh pengguna melalui menu Bantuan.
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Belum ada laporan atau masukan dari pengguna.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        rep.type === 'bug'
                          ? 'bg-rose-100 text-rose-800'
                          : rep.type === 'payment_issue'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {rep.type.replace('_', ' ')}
                      </span>
                      <span className="font-bold text-sm text-slate-900">{rep.subject}</span>
                    </div>
                    {rep.productName && (
                      <p className="text-xs font-semibold text-pink-600">Produk Terkait: {rep.productName}</p>
                    )}
                    <p className="text-xs text-slate-600">{rep.message}</p>
                    <div className="text-[11px] text-slate-400">
                      Dari: {rep.userEmail} • {new Date(rep.createdAt).toLocaleDateString('id-ID')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                      rep.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rep.status === 'reviewed'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {rep.status === 'resolved' ? 'Selesai' : rep.status === 'reviewed' ? 'Ditinjau' : 'Menunggu'}
                    </span>

                    {rep.status !== 'resolved' && (
                      <button
                        onClick={() => updateReportStatus(rep.id, 'resolved')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                      >
                        Tandai Selesai
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PLATFORM STATS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                Total Transaksi
              </div>
              <div className="text-3xl font-black font-display text-slate-900">
                {allOrders.length} Transaksi
              </div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">
                {allOrders.filter((o) => o.status === 'paid').length} Selesai & Terverifikasi
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                Volume Penjualan
              </div>
              <div className="text-3xl font-black font-display text-slate-900">
                Rp {allOrders.filter((o) => o.status === 'paid').reduce((a, b) => a + b.amount, 0).toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-purple-600 font-semibold mt-1">Pembayaran Terverifikasi</div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                Total Produk Terdaftar
              </div>
              <div className="text-3xl font-black font-display text-slate-900">
                {allProducts.length} Karya
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {allProducts.filter((p) => p.status === 'approved').length} Live di Marketplace
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                Status Sistem & DB
              </div>
              <div className="text-2xl font-black font-display text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" /> Online
              </div>
              <div className="text-xs text-slate-500 mt-1">Firestore Connected</div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Konfirmasi Penolakan {rejectionModalItem.type === 'product' ? 'Karya' : 'Pembayaran'}
            </h3>
            <p className="text-xs text-slate-500">
              Berikan alasan yang jelas agar kreator atau pembeli dapat memperbaiki pengajuannya.
            </p>

            <textarea
              rows={3}
              placeholder="Contoh: Bukti pembayaran terpotong atau nominal tidak sesuai..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setRejectionModalItem(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleRejectAction}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
              >
                Tolak Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Image Lightbox */}
      {previewProofModal && (
        <div 
          onClick={() => setPreviewProofModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-xl max-h-[85vh] overflow-hidden rounded-3xl bg-white p-2 shadow-2xl">
            <img src={previewProofModal} alt="Bukti Pembayaran Penuh" className="w-full h-auto rounded-2xl object-contain max-h-[80vh]" />
          </div>
        </div>
      )}
    </div>
  );
};
