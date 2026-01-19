import React, { useState, useEffect } from 'react';

interface VehicleImageProps {
  imageUrl?: string;
  name: string;
  accentColor?: string;
}

export const VehicleImage: React.FC<VehicleImageProps> = ({ imageUrl, name }) => {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(imageUrl);
  const [attemptedFallback, setAttemptedFallback] = useState(false);

  useEffect(() => {
    setCurrentSrc(imageUrl);
    setAttemptedFallback(false);
  }, [imageUrl]);

  const handleError = () => {
    if (!attemptedFallback) {
      const encodedName = encodeURIComponent(name.length > 25 ? name.substring(0, 22) + '...' : name);
      setCurrentSrc(`https://placehold.co/250x180/eeeeee/666666?text=${encodedName}`);
      setAttemptedFallback(true);
    }
  };

  if (!imageUrl && !currentSrc) {
     return (
        <div style={{ padding: '2px', border: '1px solid #ccc', backgroundColor: '#fff', display: 'inline-block' }}>
           <div style={{ width: '250px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', flexDirection: 'column' }}>
              <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full mb-2"></div>
              <span className="text-[10px] text-[#666]">Finding Image...</span>
           </div>
        </div>
     );
  }

  return (
    <div style={{ padding: '2px', border: '1px solid #ccc', backgroundColor: '#fff', display: 'inline-block' }}>
      <img 
        src={currentSrc} 
        alt={name} 
        style={{ width: '250px', height: '180px', objectFit: 'cover', border: '1px solid #000' }}
        onError={handleError}
      />
    </div>
  );
};