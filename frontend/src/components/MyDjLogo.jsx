import React from 'react';

export default function MyDjLogo({ className = 'w-32 h-32', glow = true }) {
  return (
    <div className={`relative inline-block ${className} select-none`}>
      {/* Outer glow effect matching the vibrant orange branding */}
      {glow && (
        <div className="absolute inset-2 bg-orange-600/30 blur-2xl rounded-full animate-pulse pointer-events-none" />
      )}
      
      <svg
        viewBox="0 0 512 512"
        className="w-full h-full relative z-10 filter drop-shadow-[0_8px_24px_rgba(232,100,5,0.35)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Solid vibrant orange circle background */}
        <circle cx="256" cy="256" r="256" fill="#e86405" />
        
        {/* Stacked bold italicized logo typography centered perfectly */}
        <g font-family="Impact, 'Arial Black', system-ui, -apple-system, sans-serif" font-weight="900" font-style="italic" text-anchor="middle">
          {/* R'KEY in Black */}
          <text x="256" y="240" fill="#000000" font-size="120" letter-spacing="-3">R'KEY</text>
          
          {/* PROD in White */}
          <text x="256" y="365" fill="#ffffff" font-size="120" letter-spacing="-3">PROD</text>
        </g>
      </svg>
    </div>
  );
}
