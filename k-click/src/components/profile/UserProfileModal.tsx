import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { uploadFileToCloud } from '../../services/firebase';
import { 
  X, 
  User, 
  Mail, 
  Calendar, 
  Camera, 
  Save, 
  Loader2, 
  Coins, 
  Shield, 
  FileText
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, credits, updateProfileData, showToast } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setBio(user.bio || '');
      setProfileImage(user.profileImage || '');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('Ukuran foto profil maksimal 3MB.', 'error');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `users/${user.id}/avatar-${Date.now()}.${ext}`;
      const cloudUrl = await uploadFileToCloud(file, storagePath);
      setProfileImage(cloudUrl);
      showToast('Foto profil berhasil diunggah! Klik Simpan Perubahan.', 'success');
    } catch (err) {
      console.error('Upload avatar error:', err);
      showToast('Gagal mengunggah foto profil ke Firebase Storage.', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama tidak boleh kosong.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateProfileData({
        name: name.trim(),
        bio: bio.trim(),
        profileImage,
      });
      if (success) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const joinDateStr = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Pengguna Setia';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-slate-900">
              Profil Pengguna
            </h3>
            <p className="text-xs text-slate-500">
              Kelola identitas dan akun K-Click Anda
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Avatar Upload Area */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="relative group">
              <img
                src={profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md"
              />
              <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                {isUploadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="text-xs font-bold text-slate-800">Foto Profil</div>
              <p className="text-[11px] text-slate-500">
                Format JPG/PNG/WEBP, maksimal 3MB. Tersimpan langsung ke Firebase Storage.
              </p>
              <label className="inline-block mt-1 text-[11px] font-bold text-pink-600 hover:text-pink-700 cursor-pointer">
                {isUploadingPhoto ? 'Mengunggah...' : 'Pilih Foto Baru'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Account Meta Badges */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-center gap-2.5">
              <Coins className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <div>
                <div className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">Saldo Kredit</div>
                <div className="font-extrabold text-amber-900">{credits} Photobooth Credits</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/70 flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <div className="text-[10px] text-purple-700 font-semibold uppercase tracking-wider">Peran Akun</div>
                <div className="font-extrabold text-purple-900 capitalize">{user.role}</div>
              </div>
            </div>
          </div>

          {/* Input: Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Nama Tampilan (Display Name)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-pink-500 text-xs text-slate-800 transition-colors"
              placeholder="Masukkan nama Anda..."
            />
          </div>

          {/* Input: Email (Read Only) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Alamat Email (Akun Firebase)</span>
            </label>
            <input
              type="email"
              value={user.email}
              readOnly
              disabled
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-100 text-xs text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Input: Bio */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Bio Singkat (Deskripsi Profil)</span>
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-pink-500 text-xs text-slate-800 transition-colors resize-none"
              placeholder="Ceritakan bio singkat atau gaya desain kreasimu..."
            />
          </div>

          {/* Join Date */}
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Bergabung sejak: {joinDateStr}</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSaving || isUploadingPhoto}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-bold shadow-md shadow-pink-500/25 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan ke Firebase...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
