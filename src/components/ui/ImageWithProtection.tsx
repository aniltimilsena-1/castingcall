import React from 'react';

interface ImageWithProtectionProps {
  src: string;
  alt: string;
  className?: string;
  watermark?: boolean;
  preventDownload?: boolean;
}

const ImageWithProtection: React.FC<ImageWithProtectionProps> = ({
  src,
  alt,
  className = "",
  watermark = false,
  preventDownload = false,
}) => {
  const handleContextMenu = (e: React.MouseEvent) => {
    if (preventDownload) {
      e.preventDefault();
    }
  };

  return (
    <div 
      className={`relative inline-block overflow-hidden ${className} ${preventDownload ? 'select-none pointer-events-none' : ''}`}
      onContextMenu={handleContextMenu}
    >
      <img 
        src={src} 
        alt={alt} 
        className="w-full h-full object-cover"
        style={{ pointerEvents: preventDownload ? 'none' : 'auto' }}
      />
      
      {watermark && (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none select-none overflow-hidden">
          <div className="text-[2rem] font-bold text-white border-2 border-white px-4 py-2 rotate-[-45deg] whitespace-nowrap">
            CAASTINGCALL.ME
          </div>
          {/* Tiled Watermark */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-10">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="flex items-center justify-center text-[0.8rem] font-bold text-white rotate-[-30deg]">
                CAASTINGCALL
              </div>
            ))}
          </div>
        </div>
      )}
      
      {preventDownload && (
        <div 
          className="absolute inset-0 z-10" 
          aria-hidden="true" 
          onDragStart={(e) => e.preventDefault()}
        />
      )}
    </div>
  );
};

export default ImageWithProtection;
