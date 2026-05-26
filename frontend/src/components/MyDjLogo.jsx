import React from 'react';

export default function MyDjLogo({ className = 'w-32 h-32', glow = true }) {
  return (
    <div className={`relative inline-block ${className} select-none`}>
      {/* Outer glow effect */}
      {glow && (
        <div className="absolute inset-2 bg-amber-600/30 blur-2xl rounded-full animate-pulse pointer-events-none" />
      )}
      
      <svg
        viewBox="0 0 320 320"
        className="w-full h-full relative z-10 filter drop-shadow-[0_8px_24px_rgba(217,119,6,0.3)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic golden-bronze gradients */}
          <linearGradient id="bronzeBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="25%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#1e0c02" />
          </linearGradient>

          <linearGradient id="goldGleam" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#cf8c3a" />
            <stop offset="30%" stopColor="#fae6cd" />
            <stop offset="50%" stopColor="#cc832d" />
            <stop offset="85%" stopColor="#673909" />
            <stop offset="100%" stopColor="#cf8c3a" />
          </linearGradient>

          <radialGradient id="innerEclipse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          <linearGradient id="neonGlowLine" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>

          {/* Text/Glow Filters */}
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id="intenseNeon" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Curved Text Paths */}
          {/* Top text path - clockwise from left to right */}
          <path id="pathMyDjTop" d="M 50,160 A 110,110 0 0,1 270,160" fill="none" />
          
          {/* Bottom text path - counter-clockwise from left to right so that text is upright at the bottom */}
          <path id="pathMyDjBottom" d="M 50,160 A 110,110 0 0,0 270,160" fill="none" />
        </defs>

        {/* Outer Metallic Ring */}
        <circle cx="160" cy="160" r="148" fill="url(#bronzeBorder)" stroke="#78350f" strokeWidth="2" />
        
        {/* Mid Ring / Highlight Ring */}
        <circle cx="160" cy="160" r="140" fill="none" stroke="url(#goldGleam)" strokeWidth="6" />
        <circle cx="160" cy="160" r="135" fill="#020617" />

        {/* Dark vinyl grid / Record concentric circles */}
        <circle cx="160" cy="160" r="130" fill="url(#innerEclipse)" stroke="#b45309" strokeWidth="1" strokeOpacity="0.4" />
        <circle cx="160" cy="160" r="120" fill="none" stroke="#b45309" strokeWidth="0.5" strokeOpacity="0.2" />
        <circle cx="160" cy="160" r="110" fill="none" stroke="#b45309" strokeWidth="0.5" strokeOpacity="0.15" />
        <circle cx="160" cy="160" r="100" fill="none" stroke="#b45309" strokeWidth="0.5" strokeOpacity="0.1" />

        {/* Outer text background shading */}
        <path d="M 50,160 A 110,110 0 0,1 270,160" fill="none" stroke="#ea580c" strokeWidth="2" strokeOpacity="0.3" filter="url(#neonGlow)" />
        <path d="M 50,160 A 110,110 0 0,0 270,160" fill="none" stroke="#f97316" strokeWidth="2" strokeOpacity="0.2" />

        {/* Equalizer Waveform Background */}
        <g opacity="0.35" transform="translate(45, 125)">
          {/* Symmetrical Soundwaves */}
          <rect x="10" y="20" width="4" height="25" fill="#f97316" rx="2" />
          <rect x="18" y="15" width="4" height="35" fill="#ea580c" rx="2" />
          <rect x="26" y="10" width="4" height="45" fill="#fb923c" rx="2" />
          <rect x="34" y="5" width="4" height="55" fill="#f97316" rx="2" />
          <rect x="42" y="12" width="4" height="40" fill="#f97316" rx="2" />
          <rect x="50" y="18" width="4" height="30" fill="#ea580c" rx="2" />
          <rect x="58" y="22" width="4" height="20" fill="#ea580c" rx="2" />
          
          {/* Middle gap for DJ */}
          <g opacity="0.2">
            <rect x="66" y="25" width="4" height="15" fill="#94a3b8" rx="1" />
            <rect x="74" y="28" width="4" height="10" fill="#94a3b8" rx="1" />
            <rect x="82" y="28" width="4" height="10" fill="#94a3b8" rx="1" />
            <rect x="90" y="28" width="4" height="10" fill="#94a3b8" rx="1" />
            <rect x="98" y="25" width="4" height="15" fill="#94a3b8" rx="1" />
          </g>

          {/* Right side soundwaves */}
          <rect x="106" y="22" width="4" height="20" fill="#ea580c" rx="2" />
          <rect x="114" y="18" width="4" height="30" fill="#ea580c" rx="2" />
          <rect x="122" y="12" width="4" height="40" fill="#f97316" rx="2" />
          <rect x="130" y="5" width="4" height="55" fill="#fb923c" rx="2" />
          <rect x="138" y="10" width="4" height="45" fill="#fb923c" rx="2" />
          <rect x="146" y="15" width="4" height="35" fill="#ea580c" rx="2" />
          <rect x="154" y="20" width="4" height="25" fill="#f97316" rx="2" />
          
          {/* Ambient center rays */}
          <circle cx="82" cy="30" r="60" fill="none" stroke="#f97316" strokeWidth="0.5" strokeDasharray="3 3" />
        </g>

        {/* DJ System Console Deck Assembly (Perspective skewed) */}
        <g transform="translate(56, 160)">
          {/* Base Deck Plate */}
          <path d="M 12,38 L 196,38 L 168,74 L 40,74 Z" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          
          {/* Deck highlights / glowing edges */}
          <path d="M 12,38 L 196,38" stroke="url(#neonGlowLine)" strokeWidth="1.5" filter="url(#neonGlow)" />
          <path d="M 40,74 L 168,74" stroke="#ea580c" strokeWidth="1" strokeOpacity="0.6" />

          {/* Left Turntable */}
          <ellipse cx="55" cy="53" rx="26" ry="14" fill="#0f172a" stroke="#b45309" strokeWidth="1.5" />
          <ellipse cx="55" cy="53" rx="18" ry="9" fill="#020617" stroke="#475569" strokeWidth="1" />
          <ellipse cx="55" cy="53" rx="8" ry="4" fill="#fb923c" />
          
          {/* Right Turntable */}
          <ellipse cx="149" cy="53" rx="26" ry="14" fill="#0f172a" stroke="#b45309" strokeWidth="1.5" />
          <ellipse cx="149" cy="53" rx="18" ry="9" fill="#020617" stroke="#475569" strokeWidth="1" />
          <ellipse cx="149" cy="53" rx="8" ry="4" fill="#fb923c" />

          {/* Mixer buttons and controls (center) */}
          <g transform="translate(90, 44)" fill="#475569">
            <rect x="0" y="0" width="3" height="15" fill="#ea580c" />
            <rect x="8" y="2" width="4" height="12" fill="#fb923c" />
            <rect x="16" y="0" width="3" height="15" fill="#ea580c" />
            <circle cx="2" cy="20" r="1.5" fill="#10b981" />
            <circle cx="10" cy="22" r="1.5" fill="#ef4444" />
            <circle cx="18" cy="20" r="1.5" fill="#3b82f6" />
          </g>
        </g>

        {/* DJ Artist Silhouette (Center stage) */}
        <g transform="translate(85, 96)">
          {/* Shadow Behind DJ */}
          <path d="M 35,45 C 20,45 12,65 14,80 L 14,94 L 138,94 L 138,80 C 140,65 132,45 117,45 C 110,45 92,62 76,62 C 60,62 42,45 35,45 Z" fill="#020617" opacity="0.6" />

          {/* Body and shoulders */}
          <path d="M 35,45 C 20,45 14,58 14,76 C 14,84 15,92 16,102 L 136,102 C 137,92 138,84 138,76 C 138,58 132,45 117,45 C 104,45 94,58 76,58 C 58,58 48,45 35,45 Z" fill="#0f172a" stroke="#fb923c" strokeWidth="1" />
          {/* Inner chest shading */}
          <path d="M 52,58 C 52,58 64,72 76,72 C 88,72 100,58 100,58" fill="none" stroke="#ea580c" strokeWidth="2" strokeOpacity="0.4" />

          {/* Arms / Hands Action */}
          {/* Left Arm reaching for turntable */}
          <path d="M 18,52 C 5,56 -10,65 -22,78 C -24,80 -25,84 -23,86 C -20,88 -14,86 -10,82 C 2,72 12,64 22,60" fill="none" stroke="#0f172a" strokeWidth="15" strokeLinecap="round" />
          <path d="M 18,52 C 5,56 -10,65 -22,78" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeOpacity="0.8" />
          
          {/* Right Arm raised or scratching */}
          <path d="M 132,54 C 146,58 152,70 156,84 C 158,88 162,90 164,88 C 166,86 164,80 160,74 C 150,56 142,48 130,48" fill="none" stroke="#0f172a" strokeWidth="14" strokeLinecap="round" />
          <path d="M 132,54 C 146,58 152,70 156,84" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeOpacity="0.8" />

          {/* Head & Earphones */}
          <circle cx="76" cy="24" r="16" fill="#0f172a" stroke="#fb923c" strokeWidth="1.5" />
          <path d="M 76,12 C 70,12 60,18 60,26" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
          <path d="M 76,12 C 82,12 92,18 92,26" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
          
          {/* Headphones band arching over the head */}
          <path d="M 57,26 C 57,10 95,10 95,26" fill="none" stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" filter="url(#neonGlow)" />
          
          {/* Left & Right headphone ear cups */}
          <rect x="54" y="20" width="6" height="12" rx="3" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
          <rect x="92" y="20" width="6" height="12" rx="3" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
        </g>

        {/* Inner Border Ring */}
        <circle cx="160" cy="160" r="115" fill="none" stroke="#ea580c" strokeWidth="2" strokeDasharray="600" strokeDashoffset="0" strokeOpacity="0.75" />
        <circle cx="160" cy="160" r="113" fill="none" stroke="#fb923c" strokeWidth="0.5" strokeOpacity="0.5" />

        {/* Curved Text TOP: "MY DJ" */}
        {/* We use letter-spacing and standard textPath for absolute vector quality */}
        <text
          fill="#ff7a00"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="31"
          letterSpacing="4"
          filter="url(#intenseNeon)"
        >
          <textPath href="#pathMyDjTop" startOffset="50%" textAnchor="middle">
            MY DJ
          </textPath>
        </text>

        {/* Curved Text BOTTOM: "by R'Key Prod" */}
        {/* To make bottom text upright, it starts left and curves round. To do this robustly: */}
        <text
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="750"
          fontSize="15"
          letterSpacing="2.5"
          filter="url(#neonGlow)"
        >
          <textPath href="#pathMyDjBottom" startOffset="50%" textAnchor="middle">
            by R'Key Prod
          </textPath>
        </text>

        {/* Inner Highlight Reflection */}
        <path
          d="M 28,160 A 132,132 0 0,1 292,160"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeOpacity="0.15"
          strokeLinecap="round"
        />
        <path
          d="M 40,160 A 120,120 0 0,1 280,160"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.75"
          strokeOpacity="0.12"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
