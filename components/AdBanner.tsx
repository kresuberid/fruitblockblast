import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdBannerProps {
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ className }) => {
  const adRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in strict mode or re-renders
    if (initialized.current) return;

    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        initialized.current = true;
      }
    } catch (e) {
      console.error('AdSense Error:', e);
    }
  }, []);

  return (
    <div className={`w-full flex justify-center items-center my-2 overflow-hidden ${className || ''}`}>
      <div className="text-[10px] text-black/20 text-center uppercase font-bold tracking-widest mb-1">Advertisement</div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-6859885802745834"
        data-ad-slot="auto" 
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};