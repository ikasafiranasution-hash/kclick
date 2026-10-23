/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { AuthModal } from './components/AuthModal';
import { NotificationToast } from './components/common/NotificationToast';
import { HomeView } from './components/home/HomeView';
import { PhotoboothEngine } from './components/photobooth/PhotoboothEngine';
import { MarketplaceView } from './components/marketplace/MarketplaceView';
import { WallpaperStoreView } from './components/wallpaper/WallpaperStoreView';
import { TemplatesView } from './components/templates/TemplatesView';
import { CreatorStudio } from './components/creator/CreatorStudio';
import { AdminPortal } from './components/admin/AdminPortal';
import { MyGalleryView } from './components/gallery/MyGalleryView';
import { FaqView } from './components/faq/FaqView';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { CreatorProfileModal } from './components/creator/CreatorProfileModal';
import { ReportProductModal } from './components/marketplace/ReportProductModal';
import { ProductDetailModal } from './components/marketplace/ProductDetailModal';
import { CheckoutModal } from './components/marketplace/CheckoutModal';
import { isFirebaseConfigured } from './config/firebaseConfig';
import { KClickLogo } from './components/common/KClickLogo';
import { Camera, Heart, Shield, AlertTriangle } from 'lucide-react';

const MainContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab,
    isUserProfileModalOpen,
    setIsUserProfileModalOpen,
    selectedCreatorForModal,
    setSelectedCreatorForModal,
    reportProductTarget,
    setReportProductTarget,
    selectedProductForDetail,
    setSelectedProductForDetail,
    selectedProductForCheckout,
    setSelectedProductForCheckout
  } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9FC] text-slate-900 selection:bg-pink-100 selection:text-pink-900">
      {!isFirebaseConfigured && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-center text-xs font-semibold shadow-sm flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
          <span>
            <strong>Firebase configuration is missing.</strong> Please configure the required environment variables in your <code className="bg-amber-600/30 px-1.5 py-0.5 rounded font-mono">.env</code> file (VITE_FIREBASE_*).
          </span>
        </div>
      )}
      <Navbar />

      <main className="flex-1 genz-bottom-nav-spacer">
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'photobooth' && <PhotoboothEngine />}
        {activeTab === 'marketplace' && <MarketplaceView />}
        {activeTab === 'wallpapers' && <WallpaperStoreView />}
        {activeTab === 'templates' && <TemplatesView />}
        {activeTab === 'gallery' && <MyGalleryView />}
        {activeTab === 'creator-studio' && <CreatorStudio />}
        {(activeTab === 'admin' || activeTab === 'admin-portal') && <AdminPortal />}
        {activeTab === 'faq' && <FaqView />}
      </main>

      {/* Cute Modern Photostudio Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-10 pb-28 md:pb-10 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div 
              onClick={() => setActiveTab('home')}
              className="cursor-pointer group"
            >
              <KClickLogo size="md" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-600">
              <button onClick={() => setActiveTab('photobooth')} className="hover:text-pink-600 transition-colors cursor-pointer">
                Photobooth Live
              </button>
              <button onClick={() => setActiveTab('marketplace')} className="hover:text-pink-600 transition-colors cursor-pointer">
                Marketplace Frame
              </button>
              <button onClick={() => setActiveTab('wallpapers')} className="hover:text-purple-600 transition-colors cursor-pointer">
                Wallpaper Store
              </button>
              <button onClick={() => setActiveTab('templates')} className="hover:text-pink-600 transition-colors cursor-pointer">
                Templates
              </button>
              <button onClick={() => setActiveTab('creator-studio')} className="hover:text-pink-600 transition-colors cursor-pointer">
                Creator Studio
              </button>
              <button onClick={() => setActiveTab('faq')} className="hover:text-pink-600 transition-colors cursor-pointer">
                FAQ & Bantuan
              </button>
            </div>

            <div className="text-xs text-slate-400 text-center md:text-right font-medium">
              &copy; {new Date().getFullYear()} K-Click. Online Photobooth & Creative Studio.
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Modals and Navigation */}
      <MobileNav />
      <NotificationToast />
      <AuthModal />

      {isUserProfileModalOpen && (
        <UserProfileModal 
          isOpen={isUserProfileModalOpen} 
          onClose={() => setIsUserProfileModalOpen(false)} 
        />
      )}

      {selectedCreatorForModal && (
        <CreatorProfileModal
          creatorId={selectedCreatorForModal.creatorId}
          creatorName={selectedCreatorForModal.creatorName}
          creatorAvatar={selectedCreatorForModal.creatorAvatar}
          onClose={() => setSelectedCreatorForModal(null)}
          onSelectProduct={(product) => setSelectedProductForDetail(product)}
        />
      )}

      {reportProductTarget && (
        <ReportProductModal
          product={reportProductTarget}
          onClose={() => setReportProductTarget(null)}
        />
      )}

      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
          onOpenCheckout={(prod) => {
            setSelectedProductForDetail(null);
            setSelectedProductForCheckout(prod);
          }}
        />
      )}

      {selectedProductForCheckout && (
        <CheckoutModal
          product={selectedProductForCheckout}
          onClose={() => setSelectedProductForCheckout(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
