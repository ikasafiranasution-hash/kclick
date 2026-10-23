import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  resetPassword 
} from '../services/firebase';
import { 
  X, 
  Camera, 
  Shield, 
  Palette, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

type AuthTab = 'login' | 'register' | 'forgot';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, showToast, refreshData } = useApp();
  
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isAuthModalOpen) return null;

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    try {
      setLoading(true);
      await loginWithGoogle();
      await refreshData();
      showToast('Login dengan Google berhasil!', 'success');
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      let msg = err.message || 'Login Google gagal atau dibatalkan.';
      if (err.code === 'auth/api-key-not-valid' || err.message?.includes('api-key-not-valid')) {
        msg = 'Firebase API Key tidak valid. Pastikan variabel VITE_FIREBASE_API_KEY diatur dengan benar.';
      } else if (err.code === 'auth/configuration-not-found' || err.message?.includes('CONFIGURATION_NOT_FOUND')) {
        msg = 'Layanan Google Sign-in belum diaktifkan di Firebase Console (Authentication > Sign-in method).';
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = 'Domain ini belum didaftarkan di Authorized Domains Firebase Console. Harap tambahkan domain ini di pengaturan Firebase Console.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'Pop-up login diblokir oleh browser. Harap izinkan jendela pop-up pada browser Anda.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Jendela login Google ditutup sebelum selesai.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Masukkan alamat email yang valid.');
      return;
    }

    if (activeTab === 'forgot') {
      try {
        setLoading(true);
        await resetPassword(email.trim());
        setSuccessMessage('Tautan reset password telah dikirim ke email kamu. Periksa inbox/spam.');
        showToast('Tautan reset password dikirim!', 'success');
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal mengirim email reset password.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password minimal harus terdiri dari 6 karakter.');
      return;
    }

    try {
      setLoading(true);
      if (activeTab === 'register') {
        if (!name.trim()) {
          setErrorMessage('Nama lengkap/panggilan wajib diisi.');
          setLoading(false);
          return;
        }
        await registerWithEmail(email.trim(), password, name.trim());
        await refreshData();
        showToast(`Selamat datang di K-Click, ${name}!`, 'success');
        setIsAuthModalOpen(false);
      } else {
        await loginWithEmail(email.trim(), password);
        await refreshData();
        showToast('Login berhasil! Selamat datang kembali.', 'success');
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      console.error('Email auth failed:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Email atau kata sandi tidak cocok.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Email ini sudah terdaftar. Silakan pilih tab Masuk.');
      } else if (err.code === 'auth/configuration-not-found' || err.message?.includes('CONFIGURATION_NOT_FOUND')) {
        setErrorMessage('Metode Email/Password belum diaktifkan di Firebase Console.');
      } else if (err.code === 'auth/api-key-not-valid' || err.message?.includes('api-key-not-valid')) {
        setErrorMessage('Firebase API Key tidak valid. Periksa konfigurasi Firebase Anda.');
      } else {
        setErrorMessage(err.message || 'Terjadi kendala saat autentikasi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-pink-100/70 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-100/70 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/20 mb-3">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            {activeTab === 'login' && 'Masuk ke K-Click'}
            {activeTab === 'register' && 'Buat Akun K-Click'}
            {activeTab === 'forgot' && 'Reset Kata Sandi'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'login' && 'Akses photobooth, marketplace karya, dan creator studio'}
            {activeTab === 'register' && 'Satu akun fleksibel untuk Buyer maupun Creator!'}
            {activeTab === 'forgot' && 'Masukkan email kamu untuk mendapatkan link pemulihan'}
          </p>
        </div>

        {/* Auth Tabs */}
        <div className="flex rounded-2xl bg-slate-100 p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {/* Error / Success feedback */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Google Sign-in */}
        {activeTab !== 'forgot' && (
          <>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs shadow-xs hover:bg-slate-50 active:scale-[0.99] transition-all mb-4 disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}</span>
            </button>

            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Atau Menggunakan Email
              </span>
            </div>
          </>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap / Panggilan</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="cth: Minji Kim"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 text-xs text-slate-800"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 text-xs text-slate-800"
              />
            </div>
          </div>

          {activeTab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
                {activeTab === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] font-semibold text-pink-600 hover:text-pink-700"
                  >
                    Lupa sandi?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 text-xs text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-pink-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            <span>
              {loading
                ? 'Memproses...'
                : activeTab === 'login'
                ? 'Masuk ke Akun'
                : activeTab === 'register'
                ? 'Daftar Sekarang'
                : 'Kirim Link Reset'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {activeTab === 'forgot' && (
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              ← Kembali ke menu Masuk
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
