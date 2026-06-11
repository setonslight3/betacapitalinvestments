interface LogoIconProps {
  className?: string;
  size?: number;
}

export default function LogoIcon({ className = '', size = 32 }: LogoIconProps) {
  const w = size;
  const h = Math.round(size * 0.72);

  // Candlestick market bar logo with red/green trend
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: w, height: h }}>
      <svg
        viewBox="0 0 64 46"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background subtle glow */}
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f2ca50" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f2ca50" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Baseline grid line */}
        <line x1="2" y1="38" x2="62" y2="38" stroke="#f2ca50" strokeOpacity="0.15" strokeWidth="0.5" />

        {/* Candlestick 1 — red (down) */}
        {/* wick */}
        <line x1="8" y1="10" x2="8" y2="32" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.8" />
        {/* body */}
        <rect x="5" y="16" width="6" height="10" rx="0.8" fill="#ef4444" fillOpacity="0.85" filter="url(#glow)" />

        {/* Candlestick 2 — green (up) */}
        <line x1="18" y1="8" x2="18" y2="28" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.8" />
        <rect x="15" y="12" width="6" height="10" rx="0.8" fill="#22c55e" fillOpacity="0.85" filter="url(#glow)" />

        {/* Candlestick 3 — red (down) */}
        <line x1="28" y1="14" x2="28" y2="36" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.8" />
        <rect x="25" y="20" width="6" height="12" rx="0.8" fill="#ef4444" fillOpacity="0.7" filter="url(#glow)" />

        {/* Candlestick 4 — green (up, taller) */}
        <line x1="38" y1="4" x2="38" y2="28" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.9" />
        <rect x="35" y="8" width="6" height="14" rx="0.8" fill="#22c55e" fillOpacity="0.9" filter="url(#glow)" />

        {/* Candlestick 5 — green (up, breakout — brightest) */}
        <line x1="50" y1="2" x2="50" y2="22" stroke="#f2ca50" strokeWidth="1.2" strokeOpacity="1" />
        <rect x="47" y="5" width="7" height="12" rx="1" fill="#f2ca50" fillOpacity="0.95" filter="url(#glow)" />

        {/* Trend line arrow */}
        <polyline
          points="8,26 18,17 28,24 38,13 50,8"
          stroke="#f2ca50"
          strokeWidth="1.2"
          strokeDasharray="2 2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />

        {/* Arrow head at top right */}
        <polyline
          points="46,6 50,3 54,6"
          stroke="#f2ca50"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}
