import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Camera, ShoppingBag, Image as ImageIcon, User, Palette, Shield } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    mode, 
    setMode, 
    user, 
    setIsAuthModalOpen,
    allProducts,
    allOrders 
  } = useApp();

  const isAdmin = user?.role === 'admin';
  const isCreator = user?.role === 'creator' || mode === 'creator';

  const pendingApprovalsCount = allProducts.filter((p) => p.status === 'pending').length;
  const pendingPaymentsCount = allOrders.filter((o) => o.status === 'waiting_verification').length;
  const totalAdminPending = pendingApprovalsCount + pendingPaymentsCount;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-xl">
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center gap-0.5 p-1.5 transition-all cursor-pointer ${
          activeTab === 'home' ? 'text-pink-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-bold">Home</span>
      </button>

      <button
        onClick={() => setActiveTab('marketplace')}
        className={`flex flex-col items-center gap-0.5 p-1.5 transition-all cursor-pointer ${
          activeTab === 'marketplace' ? 'text-pink-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <ShoppingBag className="w-5 h-5" />
        <span className="text-[10px] font-bold">Market</span>
      </button>

      {/* Floating Center Photobooth Action - K-Click Gradient Camera */}
      <button
        onClick={() => setActiveTab('photobooth')}
        className="flex flex-col items-center -mt-6 group cursor-pointer"
        aria-label="Start Photobooth"
      >
        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#FF2D75] via-[#E11D74] to-[#7C3AED] text-white flex items-center justify-center border-4 border-white shadow-lg shadow-pink-500/35 group-hover:scale-105 group-active:scale-95 transition-transform">
          <Camera className="w-6 h-6 stroke-[2.5]" />
        </div>
        <span className="text-[10px] font-black text-pink-600 mt-0.5 tracking-wider">
          PHOTO
        </span>
      </button>

      {/* 4th Tab: Wallpaper Store */}
      <button
        onClick={() => setActiveTab('wallpapers')}
        className={`flex flex-col items-center gap-0.5 p-1.5 transition-all cursor-pointer ${
          activeTab === 'wallpapers' ? 'text-purple-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <ImageIcon className="w-5 h-5" />
        <span className="text-[10px] font-bold">Wallpaper</span>
      </button>

      {/* 5th Tab: Account / Gallery for all users */}
      <button
        onClick={() => {
          if (!user) {
            setIsAuthModalOpen(true);
          } else {
            setActiveTab('gallery');
          }
        }}
        className={`flex flex-col items-center gap-0.5 p-1.5 transition-all cursor-pointer ${
          activeTab === 'gallery' ? 'text-pink-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] font-bold">{user ? 'Akun' : 'Masuk'}</span>
      </button>
    </nav>
  );
};
