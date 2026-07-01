import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'sidebar' | 'login';
}

export default function Logo({ className = '', variant = 'sidebar' }: LogoProps) {
  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const logoSrc = `${cleanBase}logo.png`;

  const sizeClasses = variant === 'sidebar' ? 'h-[132px] max-h-[132px] w-auto max-w-full' : 'h-[240px] max-h-[240px] w-auto max-w-full';

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Soft golden ambient glow behind the logo */}
      <div className="absolute inset-0 bg-[#DFBA73]/4 blur-lg rounded-full pointer-events-none"></div>

      <img
        src={logoSrc}
        alt="Lallettre Maison"
        className={`${sizeClasses} relative z-10 filter drop-shadow-[0_2px_10px_rgba(223,186,115,0.25)] transition-all duration-300 object-contain`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

