import React from 'react';

interface KClickLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const KClickLogo: React.FC<KClickLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', container: 'gap-2' },
    md: { icon: 'w-10 h-10', text: 'text-xl', container: 'gap-2.5' },
    lg: { icon: 'w-14 h-14', text: 'text-2xl', container: 'gap-3' },
    xl: { icon: 'w-24 h-24', text: 'text-4xl', container: 'gap-4' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center ${currentSize.container} select-none ${className}`}>
      {/* App Icon matching the user's uploaded logo */}
      <div
        className={`${currentSize.icon} relative rounded-[26%] p-[2px] bg-gradient-to-tr from-white/90 via-slate-200 to-white shadow-md shadow-pink-500/20 shrink-0 transition-transform group-hover:scale-105 overflow-hidden`}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full rounded-[24%] overflow-hidden"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Background Gradient matching logo: Rose Pink to Violet Purple */}
            <linearGradient id="kclick-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF2D75" />
              <stop offset="45%" stopColor="#ED2082" />
              <stop offset="100%" stopColor="#7E22CE" />
            </linearGradient>

            {/* Lens metallic ring gradient */}
            <linearGradient id="lens-metal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="50%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>

            {/* Inner lens gradient */}
            <radialGradient id="inner-lens" cx="45%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#3B0764" />
              <stop offset="50%" stopColor="#1E1B4B" />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>
          </defs>

          {/* Icon Background */}
          <rect width="200" height="200" rx="48" fill="url(#kclick-bg)" />

          {/* Subtle Aperture / Swirl lines in background */}
          <g opacity="0.16" stroke="#FFFFFF" strokeWidth="2.5" fill="none">
            <circle cx="100" cy="100" r="85" />
            <path d="M 20 100 Q 100 20 180 100" />
            <path d="M 100 20 Q 180 100 100 180" />
            <path d="M 180 100 Q 100 180 20 100" />
            <path d="M 100 180 Q 20 100 100 20" />
          </g>

          {/* White Camera Outline with top flash bump & shutter button */}
          <g filter="drop-shadow(0px 3px 6px rgba(0,0,0,0.25))">
            {/* Camera Body Outline */}
            <path
              d="M 52 56 
                 L 70 56 
                 C 74 56 78 52 82 46 
                 C 86 40 92 40 100 40 
                 C 108 40 114 40 118 46 
                 C 122 52 126 56 130 56 
                 L 148 56 
                 C 158 56 166 64 166 74 
                 L 166 128 
                 C 166 138 158 146 148 146 
                 L 52 146 
                 C 42 146 34 138 34 128 
                 L 34 74 
                 C 34 64 42 56 52 56 Z"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="9"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Small camera sensor dot */}
            <circle cx="148" cy="74" r="4.5" fill="#FFFFFF" />

            {/* Outer Lens Metal Rim */}
            <circle cx="100" cy="102" r="39" fill="url(#lens-metal)" />
            {/* Dark grooved ring */}
            <circle cx="100" cy="102" r="35" fill="#18181B" stroke="#27272A" strokeWidth="2" />
            {/* Inner Glass Lens */}
            <circle cx="100" cy="102" r="29" fill="url(#inner-lens)" />
            
            {/* Lens Reflection Arc */}
            <path
              d="M 80 88 A 24 24 0 0 1 120 88"
              stroke="#A855F7"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />

            {/* Center "K" Logo */}
            <text
              x="100"
              y="114"
              textAnchor="middle"
              fontFamily="Outfit, Plus Jakarta Sans, sans-serif"
              fontWeight="900"
              fontSize="34"
              fill="#F3E8FF"
            >
              K
            </text>
          </g>

          {/* Mini Bottom "K-Click" text inside app icon like the user's asset */}
          <text
            x="100"
            y="178"
            textAnchor="middle"
            fontFamily="Outfit, Plus Jakarta Sans, sans-serif"
            fontWeight="900"
            fontSize="26"
            fill="#FFFFFF"
            letterSpacing="-0.5"
            filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.3))"
          >
            K-Click
          </text>
        </svg>
      </div>

      {/* Brand Text beside icon when showText is true */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-display font-black tracking-tight ${currentSize.text} bg-gradient-to-r from-[#FF2D75] via-[#E11D74] to-[#7C3AED] bg-clip-text text-transparent`}
            >
              K-Click
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-extrabold tracking-wider shadow-xs">
              LIVE
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mt-0.5">
            Online Photobooth & Creative Hub
          </span>
        </div>
      )}
    </div>
  );
};
