import React from 'react';

interface TextlyIconProps {
  className?: string;
  size?: number;
}

export const TextlyIcon: React.FC<TextlyIconProps> = ({ className = '', size = 36 }) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-xs"
      >
        <defs>
          <linearGradient id="textlyBubbleGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        {/* Main Chat Bubble */}
        <path
          d="M 20,22 C 20,13 28,6 48,6 C 68,6 82,13 82,26 C 82,39 68,48 48,48 C 42,48 37,47 32,45 C 23,52 14,53 12,53 C 11,53 10.5,52 11,51 C 13,47 16,42 17,39 C 13,34 10,28 10,22 Z"
          fill="url(#textlyBubbleGrad)"
          transform="scale(1.15) translate(-3, 0)"
        />
        {/* 3 White Dots in Bubble */}
        <circle cx="33" cy="33" r="3.5" fill="#FFFFFF" />
        <circle cx="48" cy="33" r="3.5" fill="#FFFFFF" />
        <circle cx="63" cy="33" r="3.5" fill="#FFFFFF" />

        {/* Clock Overlay Badge on Bottom Right */}
        <circle cx="68" cy="68" r="21" fill="#FFFFFF" stroke="#059669" strokeWidth="4" />
        <circle cx="68" cy="68" r="17" fill="#FFFFFF" />
        {/* Clock Center Dot */}
        <circle cx="68" cy="68" r="2.5" fill="#0F172A" />
        {/* Clock Hands (1:20 time) */}
        <path d="M 68,68 L 68,57" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
        <path d="M 68,68 L 77,72" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
};

export const TextlyLogo: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const textSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <TextlyIcon size={iconSize} />
      <div className="flex flex-col relative">
        <div className={`font-black ${textSize} tracking-tight leading-none text-slate-900 flex items-baseline`}>
          <span>Text</span>
          <span className="text-emerald-600 relative">
            ly
            {/* Rays above 'y' */}
            <svg
              className="absolute -top-2.5 -right-3 w-3.5 h-3.5 text-emerald-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="19" y1="5" x2="16" y2="8" />
              <line x1="22" y1="12" x2="18" y2="12" />
            </svg>
          </span>
        </div>
        {/* Curved Swoosh Underline */}
        <svg
          className="w-full h-1.5 text-emerald-500 -mt-0.5 overflow-visible"
          viewBox="0 0 100 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 2 3 Q 50 11 98 2"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};
