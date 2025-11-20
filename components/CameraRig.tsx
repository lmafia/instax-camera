import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraRigProps {
  onTakePhoto: (imageData: string) => void;
  isProcessing: boolean;
}

export const CameraRig: React.FC<CameraRigProps> = ({ onTakePhoto, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [flash, setFlash] = useState(false);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        // Use ideal constraints for better mobile support
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 1280 },
            facingMode: "user" 
          } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Play Shutter Sound
  const playShutterSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const handleShutter = () => {
    if (isProcessing || !videoRef.current || !canvasRef.current) return;

    playShutterSound();
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Capture a 3:4 aspect ratio from the video feed
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const targetRatio = 3 / 4;
      
      let drawWidth, drawHeight;

      // Calculate crop dimensions to maintain aspect ratio while filling area
      if (videoWidth / videoHeight > targetRatio) {
        // Video is wider than target (e.g. landscape or square vs portrait target)
        drawHeight = videoHeight;
        drawWidth = videoHeight * targetRatio;
      } else {
        // Video is taller/narrower than target
        drawWidth = videoWidth;
        drawHeight = videoWidth / targetRatio;
      }

      const startX = (videoWidth - drawWidth) / 2;
      const startY = (videoHeight - drawHeight) / 2;

      canvas.width = drawWidth;
      canvas.height = drawHeight;
      
      // Flip horizontally to mirror user
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      
      context.drawImage(video, startX, startY, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      onTakePhoto(imageData);
    }
  };

  return (
    <div 
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[340px] h-[340px] md:bottom-16 md:left-16 md:translate-x-0 md:w-[450px] md:h-[450px] select-none z-50 transition-all duration-300 ease-out" 
    >
      
      {/* Hidden Canvas for Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Base Camera Image */}
      <img 
        src="https://image-s3.kylegeeks.com/data/2025/11/cf13016b057680c304224e9618a4e561.png" 
        alt="Retro Camera Body"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
      />

      {/* Live Viewfinder */}
      {/* CSS: bottom: 35%; left: 62%; width: 26%; height: 26%; */}
      <div className="absolute z-30 overflow-hidden rounded-full bg-black border-4 border-gray-800/50 shadow-inner"
           style={{
             bottom: '35%',
             left: '62%',
             transform: 'translateX(-50%)',
             width: '26%',
             height: '26%'
           }}>
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover transform scale-x-[-1]" 
        />
        {/* Viewfinder Glare/Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20 pointer-events-none rounded-full"></div>
      </div>

      {/* Shutter Button (Invisible Click Area) */}
      {/* CSS: bottom: 40%; left: 18%; width: 11%; height: 11%; */}
      <div 
        onClick={handleShutter}
        className={`absolute z-50 rounded-full cursor-pointer transition-transform active:scale-95 ${isProcessing ? 'cursor-wait' : 'hover:bg-white/10'}`}
        style={{
          bottom: '40%',
          left: '18%',
          width: '11%',
          height: '11%'
        }}
        title="Take Photo"
      />

      {/* Flash Overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[100] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Visual Feedback for No Camera */}
      {!stream && (
        <div className="absolute z-40 text-white text-xs font-bold text-center w-full top-1/2 pointer-events-none">
          <span className="bg-black/50 px-2 py-1 rounded">Enable Camera</span>
        </div>
      )}
    </div>
  );
};