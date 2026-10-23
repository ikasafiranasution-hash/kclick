import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import { uploadFileToCloud, uploadProtectedProductFile, getCreatorTotalViews } from '../../services/firebase';
import { 
  Palette, 
  Upload, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  Layers,
  Plus,
  Eye,
  FileCheck,
  FileArchive,
  ArrowRight,
  User,
  Edit3,
  X,
  Award,
  Trash2,
  ShieldCheck
} from 'lucide-react';

const CATEGORIES: ProductCategory[] = [
  'Photobooth',
  'Frame',
  'Sticker',
  'Illustration',
  'Wallpaper',
  'Printing Design',
  'Custom Design',
];

export const CreatorStudio: React.FC = () => {
  const { 
    user, 
    products, 
    allProducts, 
    creatorProducts,
    allOrders, 
    creatorOrders,
    categories,
    addNewProduct, 
    updateProductDetails, 
    deleteProduct,
    showToast, 
    setIsAuthModalOpen,
    refreshData 
  } = useApp();

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const [activeTab, setActiveTab] = useState<'products' | 'sales' | 'upload'>('products');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Merge default categories with dynamic categories from Firestore
  const availableCategories = React.useMemo(() => {
    const dynamicNames = categories.map((c) => c.name as ProductCategory);
    return Array.from(new Set([...CATEGORIES, ...dynamicNames]));
  }, [categories]);

  // Filter products uploaded by this creator (includes pending, approved, and rejected)
  const myProducts = React.useMemo(() => {
    const source = user?.role === 'admin' && allProducts.length > 0 ? allProducts : creatorProducts;
    const owned = source.filter((p) => p.creatorId === user?.id);
    if (owned.length > 0) return owned;
    return products.filter((p) => p.creatorId === user?.id);
  }, [user?.id, user?.role, allProducts, creatorProducts, products]);

  // Filter orders for this creator's products
  const mySalesOrders = React.useMemo(() => {
    const source = user?.role === 'admin' && allOrders.length > 0 ? allOrders : creatorOrders;
    return source.filter((o) => o.creatorId === user?.id);
  }, [user?.id, user?.role, allOrders, creatorOrders]);

  // Creator stats (Strictly derived from real Firestore data)
  const totalSales = mySalesOrders.filter(o => o.status === 'paid').length;
  const grossRevenue = mySalesOrders.filter(o => o.status === 'paid').reduce((acc, o) => acc + o.amount, 0);
  const platformFee = Math.round(grossRevenue * 0.10); // 10% platform fee
  const netEarnings = grossRevenue - platformFee; // 90% creator earnings

  // Real views from Firestore productViews
  const [creatorTotalViews, setCreatorTotalViews] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchViews = async () => {
      if (myProducts.length === 0) {
        setCreatorTotalViews(0);
        return;
      }
      try {
        const viewsCount = await getCreatorTotalViews(myProducts.map((p) => p.id));
        if (isMounted) {
          setCreatorTotalViews(viewsCount);
        }
      } catch (err) {
        console.warn('Failed to fetch creator views:', err);
      }
    };
    fetchViews();
    return () => {
      isMounted = false;
    };
  }, [myProducts.length]);

  // Real rating calculated from creator's products
  const ratedProducts = myProducts.filter((p) => (p.reviewCount || 0) > 0);
  const totalReviewsCount = myProducts.reduce((acc, p) => acc + (p.reviewCount || 0), 0);
  const averageCreatorRating = ratedProducts.length > 0
    ? (ratedProducts.reduce((acc, p) => acc + (p.rating || 0), 0) / ratedProducts.length).toFixed(1)
    : '0.0';

  // Upload form state
  const [draftProductId, setDraftProductId] = useState<string>(() => `prod-${Date.now()}`);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Photobooth');
  const [price, setPrice] = useState<number>(5000);
  const [isFree, setIsFree] = useState<boolean>(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [licenseType, setLicenseType] = useState<'Personal Use' | 'Commercial Use'>('Personal Use');
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [productFile, setProductFile] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Edit product modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ProductCategory>('Photobooth');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editIsFree, setEditIsFree] = useState<boolean>(false);
  const [editLicenseType, setEditLicenseType] = useState<'Personal Use' | 'Commercial Use'>('Personal Use');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editPreviewImage, setEditPreviewImage] = useState('');
  const [editProductFile, setEditProductFile] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleDeleteProduct = async (productId: string) => {
    await deleteProduct(productId);
    setConfirmDeleteId(null);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-purple-200 text-center shadow-lg">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center mb-4">
          <Palette className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-display">Masuk ke Creator Studio</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">
          Kamu dapat mengunggah frame twibbon, stiker grafis, dan template photobooth untuk dijual ke seluruh pengguna.
        </p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors"
        >
          Masuk / Buat Akun Kreator
        </button>
      </div>
    );
  }

  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran thumbnail preview maksimal 5MB.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgressText('Mengunggah gambar thumbnail preview ke Storage...');
    try {
      // Path: previews/{creatorId}/{productId}/{filename}
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `previews/${user.id}/${draftProductId}/preview.${ext}`;
      const url = await uploadFileToCloud(file, storagePath);
      setPreviewImage(url);
      showToast('Thumbnail preview berhasil dimuat!', 'success');
    } catch {
      showToast('Gagal memuat preview.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast('Ukuran file master produk maksimal 20MB.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgressText('Mengunggah file aset master template ke Storage...');
    try {
      // Path: templates/{creatorId}/{productId}/{filename}
      const ext = file.name.split('.').pop() || 'png';
      const targetPath = `templates/${user.id}/${draftProductId}/master.${ext}`;
      const storagePath = await uploadProtectedProductFile(file, targetPath);
      setProductFile(storagePath);
      showToast('File aset master template HD berhasil dimuat!', 'success');
    } catch {
      showToast('Gagal memuat file template produk.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim() || !description.trim()) {
      showToast('Lengkapi nama dan deskripsi karya.', 'error');
      return;
    }
    const numericPrice = [5000, 10000, 15000].includes(Number(price)) ? Number(price) : 5000;
    if (!previewImage) {
      showToast('Harap upload gambar preview thumbnail untuk katalog.', 'error');
      return;
    }
    if (!productFile) {
      showToast('Harap upload file master karya (file HD/template) yang dapat diunduh oleh pembeli.', 'error');
      return;
    }
    if (!copyrightAgreed) {
      showToast('Anda wajib menyetujui pernyataan hak cipta & keaslian karya sebelum mengirim.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newProd: Product = {
        id: draftProductId,
        creatorId: user.id,
        creatorName: user.name,
        creatorAvatar: user.profileImage || '',
        name: name.trim(),
        category,
        description: description.trim(),
        price: numericPrice,
        previewImage,
        productFile: productFile,
        tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
        licenseType,
        copyrightAgreed: true,
        status: 'pending', // Requires admin verification
        rating: 0,
        reviewCount: 0,
        salesCount: 0,
        createdAt: new Date().toISOString(),
      };

      await addNewProduct(newProd);
      setName('');
      setDescription('');
      setTags('');
      setPreviewImage('');
      setProductFile('');
      setCopyrightAgreed(false);
      setLicenseType('Personal Use');
      setDraftProductId(`prod-${Date.now()}`);
      setActiveTab('products');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (p: Product) => {
    // Security check: Creator A cannot edit Creator B's product
    if (p.creatorId !== user.id && user.role !== 'admin') {
      showToast('Akses ditolak: Anda hanya berhak mengedit karya milik Anda sendiri.', 'error');
      return;
    }
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditPrice(p.price);
    setEditIsFree(p.price === 0);
    setEditLicenseType(p.licenseType || 'Personal Use');
    setEditDescription(p.description);
    setEditTags(Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''));
    setEditPreviewImage(p.previewImage);
    setEditProductFile(p.productFile || '');
  };

  const handleEditPreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran thumbnail preview maksimal 5MB.', 'error');
      return;
    }
    setIsUploading(true);
    setUploadProgressText('Mengunggah gambar thumbnail baru...');
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `previews/${user.id}/${editingProduct.id}/preview.${ext}`;
      const url = await uploadFileToCloud(file, storagePath);
      setEditPreviewImage(url);
      showToast('Preview gambar berhasil diperbarui!', 'success');
    } catch {
      showToast('Gagal memuat preview.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  const handleEditProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast('Ukuran file master produk maksimal 20MB.', 'error');
      return;
    }
    setIsUploading(true);
    setUploadProgressText('Mengunggah file master template baru...');
    try {
      const ext = file.name.split('.').pop() || 'png';
      const targetPath = `templates/${user.id}/${editingProduct.id}/master.${ext}`;
      const storagePath = await uploadProtectedProductFile(file, targetPath);
      setEditProductFile(storagePath);
      showToast('File master template berhasil diperbarui!', 'success');
    } catch {
      showToast('Gagal memuat file master.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (editingProduct.creatorId !== user.id && user.role !== 'admin') {
      showToast('Akses ditolak: Anda hanya berhak mengedit karya milik Anda sendiri.', 'error');
      return;
    }
    if (!editName.trim() || !editDescription.trim()) {
      showToast('Nama dan deskripsi karya tidak boleh kosong.', 'error');
      return;
    }
    const numericPrice = [5000, 10000, 15000].includes(Number(editPrice)) ? Number(editPrice) : 5000;

    setIsSavingEdit(true);
    try {
      const success = await updateProductDetails(editingProduct.id, {
        name: editName.trim(),
        category: editCategory,
        price: numericPrice,
        description: editDescription.trim(),
        tags: editTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
        licenseType: editLicenseType,
        previewImage: editPreviewImage,
        productFile: editProductFile,
        // If product was rejected or edited, resubmit for review:
        status: editingProduct.status === 'rejected' ? 'pending' : editingProduct.status,
      });

      if (success) {
        setEditingProduct(null);
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <Palette className="w-3.5 h-3.5" />
            <span>K-Click Creator Studio Dashboard</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            Ruang Kreator Digital
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola karya, pantau hasil penjualan, dan unggah desain photobooth baru untuk komunitas kreatif.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold self-start md:self-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'products'
                ? 'bg-white text-purple-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Karya Saya ({myProducts.length})
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'sales'
                ? 'bg-white text-purple-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Penjualan & Pendapatan ({totalSales})
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'upload'
                ? 'bg-purple-600 text-white shadow-sm font-black'
                : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Upload Karya Baru</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Total Karya
          </div>
          <div className="text-2xl font-black font-display text-slate-900">
            {myProducts.length} Karya
          </div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">
            {myProducts.filter((p) => p.status === 'approved').length} Disetujui • {myProducts.filter((p) => p.status === 'pending').length} Review
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Total Terjual
          </div>
          <div className="text-2xl font-black font-display text-slate-900">
            {totalSales} Unit
          </div>
          <div className="text-xs text-purple-600 font-semibold mt-1">
            Order Lunas
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Total Tayangan
          </div>
          <div className="text-2xl font-black font-display text-blue-700 flex items-center gap-1.5">
            <Eye className="w-5 h-5 text-blue-500" />
            <span>{creatorTotalViews} Views</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Data real Firestore
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Pendapatan Bersih (90%)
          </div>
          <div className="text-2xl font-black font-display text-emerald-700">
            Rp {netEarnings.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Fee K-Click: Rp {platformFee.toLocaleString('id-ID')} (10%)
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Rating Rata-Rata
          </div>
          <div className="text-2xl font-black font-display text-amber-500 flex items-center gap-1.5">
            <Award className="w-5 h-5 text-amber-500" />
            <span>{Number(averageCreatorRating) > 0 ? averageCreatorRating : '0.0'}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {totalReviewsCount > 0 ? `${totalReviewsCount} ulasan pembeli` : 'Belum ada ulasan'}
          </div>
        </div>
      </div>

      {/* TAB 1: KARYA SAYA */}
      {activeTab === 'products' && (
        <div>
          {myProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Belum ada karya diunggah</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
                Mulai berkarya dengan mengunggah template photobooth transparan atau stiker digital buatanmu!
              </p>
              <button
                onClick={() => setActiveTab('upload')}
                className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Karya Pertama →</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {myProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-square bg-slate-100 overflow-hidden">
                      <img src={p.previewImage} alt={p.name} className="w-full h-full object-cover" />
                      <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-900 shadow-xs">
                        {p.category}
                      </span>
                      <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {p.status === 'approved' ? '✓ Live' : p.status === 'pending' ? '⏳ Menunggu Review' : '✕ Ditolak'}
                      </span>
                    </div>

                    <div className="p-4">
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{p.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                      <div className="font-extrabold text-sm text-slate-900 mt-2">
                        {p.price === 0 ? 'FREE' : `Rp ${p.price.toLocaleString('id-ID')}`}
                      </div>

                      {p.status === 'rejected' && p.rejectionReason && (
                        <div className="mt-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
                          <strong>Alasan Ditolak:</strong> {p.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>{p.salesCount || 0} terjual</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                        Rating {p.rating || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {confirmDeleteId === p.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold transition-colors"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-colors"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(p.id)}
                          className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 text-xs font-bold transition-colors shadow-xs"
                          title="Hapus karya ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                        title="Edit detail karya ini"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SALES & EARNINGS */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Sales & Creator Earnings</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar transaksi pembeli untuk karya yang telah kamu publikasikan di K-Click.
            </p>
          </div>

          {/* Transparent Earnings Notice - strictly no fake payout system */}
          <div className="p-4 bg-purple-50/80 border-b border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-purple-900">
              <DollarSign className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>Catatan Transparansi:</strong> Earnings shown here represent calculated creator earnings and do not constitute a withdrawal/payout system.
              </span>
            </div>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full whitespace-nowrap">
              Creator Earnings
            </span>
          </div>

          {mySalesOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Belum ada transaksi penjualan yang tercatat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Order ID</th>
                    <th className="p-3.5">Produk</th>
                    <th className="p-3.5">Pembeli</th>
                    <th className="p-3.5">Total Harga</th>
                    <th className="p-3.5">Fee K-Click (10%)</th>
                    <th className="p-3.5">Pendapatan Bersih (90%)</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mySalesOrders.map((order) => {
                    const fee = Math.round(order.amount * 0.1);
                    const net = order.amount - fee;
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5 font-mono font-bold text-purple-700">{order.id}</td>
                        <td className="p-3.5 font-bold text-slate-900">{order.productName}</td>
                        <td className="p-3.5 text-slate-600">
                          {order.buyerName} <br />
                          <span className="text-[10px] text-slate-400">{order.buyerEmail}</span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          Rp {order.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3.5 text-slate-500">
                          Rp {fee.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-600">
                          Rp {net.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'waiting_verification'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {order.status === 'paid' ? 'Lunas' : order.status === 'waiting_verification' ? 'Verifikasi Admin' : 'Ditolak'}
                          </span>
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

      {/* TAB 3: UPLOAD FORM */}
      {activeTab === 'upload' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <h3 className="text-xl font-bold font-display text-slate-900 mb-1">
            Unggah Karya Kreator Baru
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Karyamu akan diverifikasi oleh tim Admin K-Click sebelum tampil di katalog publik.
          </p>

          <form onSubmit={handleSubmitProduct} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Judul / Nama Karya</label>
              <input
                type="text"
                required
                placeholder="cth: Pastel Aesthetic Cut Y2K Frame"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 text-xs text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Karya</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 text-xs text-slate-800 bg-white"
                >
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Harga Jual Karya</label>
                  <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                    Rp {price.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[5000, 10000, 15000].map((tierVal) => (
                    <button
                      type="button"
                      key={tierVal}
                      onClick={() => setPrice(tierVal)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        price === tierVal
                          ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Rp {tierVal.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi & Panduan Karya</label>
              <textarea
                rows={3}
                required
                placeholder="Jelaskan detail karya, rekomendasi penggunaan foto, dan ornamen yang disertakan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tags (Pisahkan dengan koma)</label>
              <input
                type="text"
                placeholder="cth: aesthetic, pastel, frame, cute, retro"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 text-xs text-slate-800"
              />
            </div>

            {/* License Type Selection */}
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Lisensi Penggunaan Digital
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  licenseType === 'Personal Use'
                    ? 'bg-white border-purple-500 shadow-xs'
                    : 'bg-white/60 border-slate-200 hover:border-purple-300'
                }`}>
                  <input
                    type="radio"
                    name="licenseType"
                    value="Personal Use"
                    checked={licenseType === 'Personal Use'}
                    onChange={() => setLicenseType('Personal Use')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Personal Use Only</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Khusus untuk keseruan photobooth pribadi & fansite non-komersial.
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  licenseType === 'Commercial Use'
                    ? 'bg-white border-purple-500 shadow-xs'
                    : 'bg-white/60 border-slate-200 hover:border-purple-300'
                }`}>
                  <input
                    type="radio"
                    name="licenseType"
                    value="Commercial Use"
                    checked={licenseType === 'Commercial Use'}
                    onChange={() => setLicenseType('Commercial Use')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Commercial License</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Izin digunakan untuk event gathering, merchandise, dan promosi berbayar.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* SEPARATE PREVIEW IMAGE AND PRODUCT FILE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Preview Image for Catalog */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 text-center hover:border-purple-400 transition-colors">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800">1. Thumbnail Preview</div>
                <p className="text-[10px] text-slate-400 mt-0.5 mb-3">
                  Foto mockup yang tampil di katalog marketplace.
                </p>
                {previewImage ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 mb-2">
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <label className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold cursor-pointer inline-block">
                  Pilih Gambar Preview
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePreviewUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Master Product File for Buyers */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 text-center hover:border-purple-400 transition-colors">
                <FileArchive className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800">2. Master Product File (HD)</div>
                <p className="text-[10px] text-slate-400 mt-0.5 mb-3">
                  File asli resolusi tinggi yang diunduh pembeli (PNG/ZIP).
                </p>
                {productFile ? (
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-bold mb-2 flex items-center justify-center gap-1">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>File Master Siap Digunakan</span>
                  </div>
                ) : null}
                <label className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold cursor-pointer inline-block">
                  Pilih File Master Asli
                  <input
                    type="file"
                    accept="image/*,.zip"
                    onChange={handleProductFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {isUploading && (
              <div className="text-xs font-bold text-purple-600 animate-pulse text-center py-2">
                {uploadProgressText}
              </div>
            )}

            {/* Mandatory Copyright & Originality Agreement */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={copyrightAgreed}
                  onChange={(e) => setCopyrightAgreed(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="text-slate-600 text-[11px] leading-relaxed">
                  <strong>Pernyataan Hak Cipta:</strong> Saya memiliki hak atau izin yang diperlukan untuk menjual/mendistribusikan karya ini dan bertanggung jawab atas konten yang saya upload. Karya ini tidak melanggar hak cipta, merek dagang, atau hukum privasi pihak ketiga manapun.
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUploading || isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60"
              >
                <span>{isSubmitting ? 'Mengirim...' : 'Kirim untuk Verifikasi Admin'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EDIT KARYA KREATOR */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-purple-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-900">Edit Karya</h3>
                <p className="text-xs text-slate-400">ID: {editingProduct.id}</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul / Nama Karya</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ProductCategory)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Harga Jual Karya</label>
                    <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                      Rp {editPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[5000, 10000, 15000].map((tierVal) => (
                      <button
                        type="button"
                        key={tierVal}
                        onClick={() => setEditPrice(tierVal)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                          editPrice === tierVal
                            ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Rp {tierVal.toLocaleString('id-ID')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lisensi Penggunaan Digital</label>
                <select
                  value={editLicenseType}
                  onChange={(e) => setEditLicenseType(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-400 focus:outline-hidden bg-white"
                >
                  <option value="Personal Use">Personal Use Only (Non-Komersial)</option>
                  <option value="Commercial Use">Commercial License (Boleh Event/Merch)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Karya</label>
                <textarea
                  rows={3}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-400 focus:outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tags (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                />
              </div>

              {/* Replace Files */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-2xl border border-slate-200 text-center">
                  <div className="text-xs font-bold text-slate-700 mb-1">Thumbnail Preview</div>
                  {editPreviewImage && (
                    <img src={editPreviewImage} alt="Preview" className="w-16 h-16 object-cover mx-auto rounded-lg mb-2" />
                  )}
                  <label className="px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold cursor-pointer inline-block">
                    Ganti Gambar Preview
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditPreviewUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="p-3 rounded-2xl border border-slate-200 text-center">
                  <div className="text-xs font-bold text-slate-700 mb-1">Master File HD</div>
                  <div className="text-[11px] text-emerald-700 font-bold mb-2 flex items-center justify-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{editProductFile ? 'File Tersedia' : 'Belum ada file'}</span>
                  </div>
                  <label className="px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold cursor-pointer inline-block">
                    Ganti File Master
                    <input
                      type="file"
                      accept="image/*,.zip"
                      onChange={handleEditProductFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {isUploading && (
                <div className="text-xs font-bold text-purple-600 animate-pulse text-center py-1">
                  {uploadProgressText}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-60"
                >
                  {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
