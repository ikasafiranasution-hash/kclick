/**
 * PHOTOBOOTH LAYOUT PRESETS
 * 
 * Preset konfigurasi frame dan layout canvas untuk fitur photobooth in-browser.
 * Preview URL hanya untuk tampilan picker frame lokal pada web camera.
 */
import { PhotoboothTemplate } from '../types';

export const PHOTOBOOTH_TEMPLATES: PhotoboothTemplate[] = [
  {
    id: 'haru-sky',
    name: 'Sky Blue Pastel',
    category: 'Aesthetic',
    themeColor: '#e0f2fe', // sky-100
    accentColor: '#0284c7', // sky-600
    textColor: '#0369a1',
    bannerText: 'K-CLICK • SKY EDITION',
    koreanText: 'BLUE SKY • BEAUTIFUL MOMENTS',
    stickers: [
      { icon: '☁️', label: 'Cloud', x: 8, y: 3 },
      { icon: '🎵', label: 'Music', x: 85, y: 3 },
      { icon: '💙', label: 'Heart', x: 12, y: 92 },
      { icon: '🎧', label: 'Headphones', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    isPremium: false,
  },
  {
    id: 'sakura-blossom',
    name: 'Sakura Blossom Stage',
    category: 'Blossom',
    themeColor: '#fce7f3', // pink-100
    accentColor: '#db2777', // pink-600
    textColor: '#be185d',
    bannerText: 'SPRING BLOSSOM • SPECIAL MOMENT',
    koreanText: 'SHINING MOMENTS • LOVELY MEMORIES',
    stickers: [
      { icon: '🌸', label: 'Blossom', x: 8, y: 3 },
      { icon: '💖', label: 'Heart', x: 85, y: 3 },
      { icon: '🌷', label: 'Tulip', x: 12, y: 92 },
      { icon: '🎀', label: 'Ribbon', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    isPremium: false,
  },
  {
    id: 'y2k-cyber',
    name: 'Cyber Violet Neon',
    category: 'Cyber Neon',
    themeColor: '#f3e8ff', // purple-100
    accentColor: '#9333ea', // purple-600
    textColor: '#7e22ce',
    bannerText: 'CYBER VIOLET // 2026 EDITION',
    koreanText: 'DIGITAL WAVE • NEON LIGHTS',
    stickers: [
      { icon: '👾', label: 'Alien', x: 8, y: 3 },
      { icon: '⚡', label: 'Bolt', x: 85, y: 3 },
      { icon: '💿', label: 'CD', x: 12, y: 92 },
      { icon: '💜', label: 'Purple Heart', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
    isPremium: false,
  },
  {
    id: 'midnight-noir',
    name: 'Midnight Black Onyx',
    category: 'Minimalist',
    themeColor: '#18181b', // zinc-900
    accentColor: '#e4e4e7', // zinc-200
    textColor: '#ffffff',
    bannerText: 'BLACK ONYX • EXCLUSIVE CUT',
    koreanText: 'EXCLUSIVE STUDIO • MIDNIGHT EDITION',
    stickers: [
      { icon: '🖤', label: 'Black Heart', x: 8, y: 3 },
      { icon: '🌙', label: 'Moon', x: 85, y: 3 },
      { icon: '🍸', label: 'Glass', x: 12, y: 92 },
      { icon: '♟️', label: 'Chess', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    isPremium: false,
  },
  {
    id: 'matcha-mint',
    name: 'Lucky Green Clover',
    category: 'Fresh Nature',
    themeColor: '#dcfce7', // green-100
    accentColor: '#16a34a', // green-600
    textColor: '#15803d',
    bannerText: 'LUCKY GREEN CLOVER • SPECIAL CUT',
    koreanText: 'GOOD LUCK & HAPPY MOMENTS',
    stickers: [
      { icon: '🍀', label: 'Clover', x: 8, y: 3 },
      { icon: '🏆', label: 'Trophy', x: 85, y: 3 },
      { icon: '💚', label: 'Green Heart', x: 12, y: 92 },
      { icon: '🎈', label: 'Balloon', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
    isPremium: false,
  },
  {
    id: 'vintage-cafe',
    name: 'Warm Bear Coffee',
    category: 'Cute Cafe',
    themeColor: '#fef3c7', // amber-100
    accentColor: '#d97706', // amber-600
    textColor: '#b45309',
    bannerText: 'WARM BEAR CAFE • SWEET MOMENTS',
    koreanText: 'SWEET COFFEE • HAPPY MEMORIES',
    stickers: [
      { icon: '🧸', label: 'Teddy', x: 8, y: 3 },
      { icon: '☕', label: 'Coffee', x: 85, y: 3 },
      { icon: '🧁', label: 'Cupcake', x: 12, y: 92 },
      { icon: '💛', label: 'Yellow Heart', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&auto=format&fit=crop&q=80',
    isPremium: false,
  },
];
