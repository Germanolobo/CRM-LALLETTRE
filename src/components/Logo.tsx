import React, { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'sidebar' | 'login';
}

export default function Logo({ className = '', variant = 'sidebar' }: LogoProps) {
  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const [imgSrc, setImgSrc] = useState(`${cleanBase}logo.png`);
  const [hasError, setHasError] = useState(false);

  // If the image fails to load, we can also try common extensions like .jpg
  // before falling back to the elegant gold CSS signature text.
  const handleImageError = () => {
    if (imgSrc === `${cleanBase}logo.png`) {
      setImgSrc(`${cleanBase}logo.jpg`);
    } else {
      setHasError(true);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      {!hasError ? (
        <img
          src={imgSrc}
          alt="Lallettre Maison de Parfum"
          className={`${
            variant === 'sidebar' ? 'h-12 max-h-12' : 'h-20 max-h-20'
          } w-auto object-contain relative z-10 filter drop-shadow-[0_2px_8px_rgba(223,186,115,0.15)] transition-all duration-300 ${className}`}
          onError={handleImageError}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div 
          className={`relative inline-block select-none ${
            variant === 'sidebar' ? 'w-36' : 'w-52'
          } ${className}`} 
          id={`${variant}-brand-logo-fallback`}
        >
          <div className="absolute inset-0 bg-[#DFBA73]/5 blur-md rounded-full pointer-events-none"></div>
          <h1 className={`${
            variant === 'sidebar' ? 'text-[46px]' : 'text-[56px]'
          } font-signature font-normal text-[#DFBA73] leading-none tracking-wide -rotate-1 relative z-10`}>
            Lallettre
          </h1>
        </div>
      )}
    </div>
  );
}
