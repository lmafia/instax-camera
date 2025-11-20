import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, Edit2, RefreshCw } from 'lucide-react';

export interface PhotoData {
  id: string;
  imageData: string; // Data URI
  caption: string;
  timestamp: string;
  x: number;
  y: number;
  rotation: number;
  isDeveloped: boolean;
  zIndex: number;
}

interface PolaroidProps {
  photo: PhotoData;
  onUpdate: (id: string, updates: Partial<PhotoData>) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onRegenerate: (id: string) => void;
}

export const Polaroid: React.FC<PolaroidProps> = ({ photo, onUpdate, onDelete, onDragStart, onRegenerate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(photo.caption);
  const [isHovered, setIsHovered] = useState(false);
  
  // Developing effect state
  const [developmentStage, setDevelopmentStage] = useState(0);

  useEffect(() => {
    if (!photo.isDeveloped) {
      // Simulate developing process over 5 seconds
      const interval = setInterval(() => {
        setDevelopmentStage(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            onUpdate(photo.id, { isDeveloped: true });
            return 100;
          }
          return prev + 2; // Increment 2% every 100ms = 5 seconds total
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setDevelopmentStage(100);
    }
  }, [photo.isDeveloped, photo.id, onUpdate]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration (Scale 2x for better quality)
    const scale = 2;
    const padding = 12 * scale;
    const width = 240 * scale;
    const photoAspect = 3/4;
    const innerWidth = width - (padding * 2);
    const photoHeight = innerWidth / photoAspect;
    
    // Calculate text height to determine canvas height
    ctx.font = `${20 * scale}px 'Caveat', cursive`;
    const text = photo.caption || " ";
    const lineHeight = 24 * scale;
    const textMetrics = measureTextHeight(ctx, text, innerWidth, lineHeight);
    const textBlockHeight = Math.max(80 * scale, textMetrics + (40 * scale)); // Min height or text + spacing

    const height = padding + photoHeight + textBlockHeight + padding;

    canvas.width = width;
    canvas.height = height;

    // 1. Draw Background
    ctx.fillStyle = '#fdfbf7';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Photo
    const img = new Image();
    img.src = photo.imageData;
    await new Promise((resolve) => { img.onload = resolve; });

    ctx.drawImage(img, padding, padding, innerWidth, photoHeight);
    
    // 3. Draw Text
    ctx.textAlign = 'center';
    
    // Timestamp
    ctx.fillStyle = '#9ca3af'; // gray-400
    ctx.font = `${10 * scale}px sans-serif`;
    // Use simple spacing simulation if letterSpacing not supported
    if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '2px'; 
    }
    const timestampY = padding + photoHeight + (24 * scale);
    ctx.fillText(photo.timestamp.toUpperCase(), width / 2, timestampY);

    // Caption
    if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '0px';
    }
    ctx.fillStyle = '#1f2937'; // gray-800
    ctx.font = `${20 * scale}px 'Caveat', cursive`;
    
    const captionY = timestampY + (30 * scale);
    wrapText(ctx, text, width / 2, captionY, innerWidth, lineHeight);

    // Trigger Download
    const link = document.createElement('a');
    link.download = `instax-${photo.timestamp}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Measure text height
  function measureTextHeight(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    let lines = 1;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        line = words[n] + ' ';
        lines++;
      } else {
        line = testLine;
      }
    }
    return lines * lineHeight;
  }

  // Helper: Wrap and draw text
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  const handleSaveEdit = () => {
    setIsEditing(false);
    onUpdate(photo.id, { caption: editText });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditText(photo.caption);
      setIsEditing(false);
    }
  };

  // Calculate filters based on development stage
  const blur = Math.max(0, 10 - (developmentStage / 10)); // 10px to 0px
  const grayscale = Math.max(0, 100 - developmentStage); // 100% to 0%
  const brightness = 100 + Math.max(0, (100 - developmentStage) / 2); // 150% to 100%
  const contrast = 80 + (developmentStage * 0.2); // 80% to 100%

  const filterString = `blur(${blur}px) grayscale(${grayscale}%) brightness(${brightness}%) contrast(${contrast}%)`;

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={() => onDragStart(photo.id)}
      initial={{ 
        x: photo.x, 
        y: photo.y, 
        rotate: photo.rotation, 
        scale: 0.8, 
        opacity: 0 
      }}
      animate={{ 
        x: photo.x, 
        y: photo.y, 
        rotate: photo.rotation, 
        scale: 1, 
        opacity: 1 
      }}
      style={{ zIndex: photo.zIndex }}
      className="absolute w-[240px] bg-[#fdfbf7] p-3 shadow-xl cursor-grab active:cursor-grabbing group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover Controls */}
      <div className={`absolute -top-10 left-0 w-full flex justify-center gap-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={handleDownload}
          className="bg-white/90 p-2 rounded-full shadow-sm hover:bg-blue-50 text-gray-700 transition-colors"
          title="Download Photo"
        >
          <Download size={16} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(photo.id); }}
          className="bg-white/90 p-2 rounded-full shadow-sm hover:bg-red-50 text-red-600 transition-colors"
          title="Delete Photo"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Photo Area (3:4 Aspect Ratio) */}
      <div className="w-full aspect-[3/4] bg-black mb-4 overflow-hidden relative">
        <img 
          src={photo.imageData} 
          alt="Retro capture" 
          className="w-full h-full object-cover transition-all duration-1000 ease-out"
          style={{ filter: filterString }}
          draggable={false}
        />
        
        {/* Glossy overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none mix-blend-overlay" />
      </div>

      {/* Caption Area */}
      <div className="font-handwritten text-center min-h-[60px] flex flex-col justify-between relative group/caption">
        <div className="text-gray-400 text-xs tracking-widest uppercase mb-1">
          {photo.timestamp}
        </div>
        
        {isEditing ? (
          <div className="flex flex-col gap-1" onPointerDown={(e) => e.stopPropagation()}>
            <input 
              autoFocus
              type="text" 
              value={editText} 
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-b border-gray-300 outline-none text-center text-gray-800 text-xl"
            />
          </div>
        ) : (
          <>
            <div 
              onDoubleClick={() => setIsEditing(true)}
              className="text-gray-800 text-xl leading-6 px-1 cursor-text"
            >
               {photo.caption || (developmentStage < 100 ? "Developing..." : "...")}
            </div>
            
            {/* Text Interaction Icons */}
            {photo.isDeveloped && (
              <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover/caption:opacity-100 transition-opacity duration-200 bg-white/80 p-1 rounded-lg shadow-sm">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit Text"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRegenerate(photo.id); }}
                  className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Regenerate Caption"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};