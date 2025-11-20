import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CameraRig } from './components/CameraRig';
import { Polaroid, PhotoData } from './components/Polaroid';
import { generatePhotoCaption } from './services/geminiService';

const App: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [topZIndex, setTopZIndex] = useState(60); // Start above camera (50) when dragged

  const handleTakePhoto = useCallback(async (imageData: string) => {
    setIsProcessing(true);
    
    const newId = uuidv4();
    const timestamp = new Date().toLocaleDateString(navigator.language, {
      year: '2-digit',
      month: 'short',
      day: 'numeric'
    });

    // Calculate start position based on viewport width
    const isMobile = window.innerWidth < 768;
    let startX, startY;

    if (isMobile) {
      // Eject from center bottom on mobile
      startX = window.innerWidth / 2 - 120; // Center the 240px wide polaroid
      startY = window.innerHeight - 380; // Just above the mobile camera rig
    } else {
      // Eject from the camera slot on desktop
      startX = 220; 
      startY = window.innerHeight - 400;
    }

    // Add some randomness to the rotation and final position
    const randomRotation = (Math.random() * 20) - 10;
    
    const newPhoto: PhotoData = {
      id: newId,
      imageData,
      caption: "", // Start empty, AI will fill
      timestamp,
      x: startX,
      y: startY,
      rotation: 0,
      isDeveloped: false,
      zIndex: topZIndex
    };

    setTopZIndex(prev => prev + 1);
    setPhotos(prev => [...prev, newPhoto]);

    // Animate to a "table" position
    setTimeout(() => {
      setPhotos(prev => prev.map(p => {
        if (p.id === newId) {
            // Random scatter position
            const scatterX = isMobile 
                ? (window.innerWidth / 2 - 120) + (Math.random() * 40 - 20)
                : 400 + Math.random() * (window.innerWidth - 700);
            
            const scatterY = isMobile
                ? (window.innerHeight / 2 - 200) + (Math.random() * 40 - 20)
                : 100 + Math.random() * (window.innerHeight - 500);

            return {
                ...p,
                x: scatterX,
                y: scatterY,
                rotation: randomRotation
            };
        }
        return p;
      }));
      setIsProcessing(false);
    }, 100);

    // Generate AI Caption
    try {
      const caption = await generatePhotoCaption(imageData, navigator.language);
      setPhotos(prev => prev.map(p => 
        p.id === newId ? { ...p, caption } : p
      ));
    } catch (error) {
      console.error("Caption generation failed:", error);
    }

  }, [topZIndex]);

  const handleUpdatePhoto = (id: string, updates: Partial<PhotoData>) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleDragStart = (id: string) => {
    setTopZIndex(prev => {
      const newZ = prev + 1;
      setPhotos(currentPhotos => 
        currentPhotos.map(p => p.id === id ? { ...p, zIndex: newZ } : p)
      );
      return newZ;
    });
  };

  const handleRegenerate = async (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;
    
    handleUpdatePhoto(id, { caption: "" }); // Clear to show loading

    try {
      const newCaption = await generatePhotoCaption(photo.imageData, navigator.language);
      handleUpdatePhoto(id, { caption: newCaption });
    } catch (error) {
      console.error("Regeneration failed:", error);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Header Title */}
      <div className="absolute top-8 left-8 md:left-12 z-0 pointer-events-none">
        <h1 className="font-handwritten text-4xl md:text-6xl text-gray-800 -rotate-6 opacity-80">
          Instax Mini
        </h1>
      </div>

      {/* Instructions */}
      <div className="absolute top-20 right-8 md:top-auto md:bottom-12 md:right-12 text-right pointer-events-none z-0 max-w-[200px]">
        <p className="font-handwritten text-xl md:text-2xl text-gray-500">
          Click the shutter button to capture a memory. Drag photos to rearrange.
        </p>
      </div>

      {/* Photos */}
      {photos.map(photo => (
        <Polaroid
          key={photo.id}
          photo={photo}
          onUpdate={handleUpdatePhoto}
          onDelete={handleDeletePhoto}
          onDragStart={handleDragStart}
          onRegenerate={handleRegenerate}
        />
      ))}

      {/* Camera Rig */}
      <CameraRig onTakePhoto={handleTakePhoto} isProcessing={isProcessing} />
    </div>
  );
};

export default App;