import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Camera, 
  ShoppingBag, 
  LayoutGrid, 
  Image as ImageIcon, 
  Shield, 
  Palette, 
  Coins, 
  User, 
  LogOut, 
  ChevronDown, 
  Heart,
  HelpCircle,
  Plus,
  Bell,
  Search,
  Check,
  ExternalLink
} from 'lucide-react';
import { KClickLogo } from './common/KClickLogo';
import { HelpFeedbackModal } from './common/HelpFeedbackModal';

export const Navbar: React.FC = () => {
  const { 
    user, 
    mode, 
    setMode, 
    activeTab, 
    setActiveTab, 
    credits, 
    addCredits, 
    setIsAuthModalOpen, 
    setIsUserProfileModalOpen,
    logout,
    gallery,
    allOrders,
    allProducts,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    searchQuery,
    setSearchQuery
  } = useApp();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');

  const pendingApprovalsCount = allProducts.filter((p) => p.status === 'pending').length;
  const pendingPaymentsCount = allOrders.filter((o) => o.status === 'waiting_verification').length;
  const totalAdminPending = pendingApprovalsCount + pendingPaymentsCount;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    if (activeTab !== 'marketplace') {
      setActiveTab('marketplace');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20 gap-3">
            
            {/* Official K-Click Brand Logo matching uploaded asset */}
            <div 
              onClick={() => setActiveTab('home')}
              className="cursor-pointer group shrink-0 select-none"
            >
              <KClickLogo size="md" />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-bold tracking-wide">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'home'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white font-extrabold shadow-sm shadow-pink-500/25'
                    : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50/60'
                }`}
              >
                Home
              </button>

              <button
                onClick={() => setActiveTab('photobooth')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'photobooth'
                    ? 'bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 text-white font-black shadow-md shadow-pink-500/30'
                    : 'text-pink-600 bg-pink-50 hover:bg-pink-100 font-extrabold border border-pink-200/80'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Photobooth</span>
              </button>

              <button
                onClick={() => setActiveTab('marketplace')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'marketplace'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white font-extrabold shadow-sm shadow-pink-500/25'
                    : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50/60'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Marketplace</span>
              </button>

              <button
                onClick={() => setActiveTab('wallpapers')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'wallpapers'
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white font-extrabold shadow-sm shadow-purple-500/25'
                    : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50/60'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Wallpaper</span>
              </button>

              <button
                onClick={() => setActiveTab('templates')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'templates'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white font-extrabold shadow-sm shadow-pink-500/25'
                    : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50/60'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Templates</span>
              </button>

              <button
                onClick={() => setActiveTab('gallery')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'gallery'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white font-extrabold shadow-sm shadow-pink-500/25'
                    : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50/60'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Gallery</span>
                {gallery.length > 0 && (
                  <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded-full bg-pink-100 text-pink-700">
                    {gallery.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('faq')}
                className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'faq'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white font-extrabold shadow-sm shadow-pink-500/25'
                    : 'text-slate-600 hover:text-pink-600 hover:bg-pink-50/60'
                }`}
              >
                FAQ
              </button>
            </nav>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative max-w-xs w-full">
              <input
                type="text"
                placeholder="Cari frame, template, stiker..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100/80 border border-slate-200 focus:outline-none focus:border-pink-500 focus:bg-white focus:ring-2 focus:ring-pink-500/20 text-xs text-slate-800 placeholder-slate-400 transition-all font-sans"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            </form>

            {/* Right Side Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* One Account Multi-Function Mode Switcher */}
              <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => {
                    setMode('buyer');
                    if (activeTab === 'creator-studio' || activeTab === 'admin') setActiveTab('marketplace');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    mode === 'buyer'
                      ? 'bg-white text-slate-900 font-extrabold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-pink-600" />
                  <span>Buyer</span>
                </button>

                <button
                  onClick={() => {
                    setMode('creator');
                    setActiveTab('creator-studio');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    mode === 'creator'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white font-extrabold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Creator</span>
                </button>
              </div>

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
                  title="Notifikasi Akun"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-white animate-pulse" />
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white shadow-xl border border-slate-200 p-3 z-50 animate-fade-in text-slate-800">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900">NOTIFIKASI</div>
                      {unreadNotificationsCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[10px] font-bold text-pink-600 hover:underline"
                        >
                          Tandai Dibaca
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          Tidak ada notifikasi baru
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markNotificationRead(n.id);
                              if (n.linkTab) {
                                if (n.linkTab === 'admin') {
                                  setMode('admin');
                                  setActiveTab('admin');
                                } else if (n.linkTab === 'creator-studio') {
                                  setMode('creator');
                                  setActiveTab('creator-studio');
                                } else {
                                  setActiveTab(n.linkTab as any);
                                }
                                setIsNotificationsOpen(false);
                              }
                            }}
                            className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                              n.read ? 'bg-slate-50 text-slate-500' : 'bg-pink-50/70 border border-pink-100 text-slate-900 shadow-xs'
                            }`}
                          >
                            <div className="text-xs font-bold text-pink-600">{n.title}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5">{n.message}</div>
                            <div className="text-[9px] text-slate-400 mt-1">
                              {new Date(n.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile / Login */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <img
                      src={user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-pink-500/30"
                    />
                    <span className="hidden md:inline text-xs font-semibold text-slate-800 max-w-[90px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-white shadow-2xl border border-slate-200 p-2.5 z-50 text-sm animate-fade-in">
                      <div className="p-3 border-b border-slate-100">
                        <div className="font-bold text-slate-900 truncate">{user.name}</div>
                        <div className="text-xs text-slate-500 truncate">{user.email}</div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : user.role === 'creator'
                              ? 'bg-pink-100 text-pink-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {user.role}
                          </span>
                          <span className="text-xs text-amber-700 font-semibold">
                            {credits} Credits
                          </span>
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        <button
                          onClick={() => {
                            setIsUserProfileModalOpen(true);
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors text-left text-xs font-semibold"
                        >
                          <User className="w-4 h-4 text-pink-500" />
                          <span>Pengaturan Profil Akun</span>
                        </button>

                        <button
                          onClick={() => {
                            const nextMode = mode === 'buyer' ? 'creator' : 'buyer';
                            setMode(nextMode);
                            if (nextMode === 'creator') setActiveTab('creator-studio');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors text-left text-xs font-semibold"
                        >
                          <span className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-pink-500" />
                            <span>Beralih ke {mode === 'buyer' ? 'Creator Mode' : 'Buyer Mode'}</span>
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('gallery');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors text-left text-xs font-semibold"
                        >
                          <ImageIcon className="w-4 h-4 text-purple-500" />
                          <span>My Gallery & Unduhan</span>
                        </button>

                        {(mode === 'creator' || user.role === 'creator' || user.role === 'admin') && (
                          <button
                            onClick={() => {
                              setMode('creator');
                              setActiveTab('creator-studio');
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-purple-700 bg-purple-50/80 hover:bg-purple-100 transition-colors text-left text-xs font-bold cursor-pointer"
                          >
                            <Palette className="w-4 h-4 text-purple-600" />
                            <span>Creator Studio</span>
                          </button>
                        )}

                        {user.role === 'admin' && (
                          <button
                            onClick={() => {
                              setMode('admin');
                              setActiveTab('admin');
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-purple-800 bg-purple-100/70 hover:bg-purple-200 transition-colors text-left text-xs font-bold cursor-pointer"
                          >
                            <Shield className="w-4 h-4" />
                            <span>Admin Portal ({totalAdminPending})</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setIsHelpModalOpen(true);
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors text-left text-xs font-semibold"
                        >
                          <HelpCircle className="w-4 h-4 text-sky-500" />
                          <span>Bantuan & Hubungi Admin</span>
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            logout();
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium text-xs"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Keluar (Logout)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm"
                >
                  Masuk / Akun
                </button>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Help & Feedback Modal */}
      <HelpFeedbackModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </>
  );
};
