'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Monitor, Loader2 } from 'lucide-react';

interface VideoDisplayProps {
  stream: MediaStream | null;
  isScreenSharing: boolean;
  userName: string;
}

export default function VideoDisplay({ stream, isScreenSharing, userName }: VideoDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoStats, setVideoStats] = useState({ width: 0, height: 0, fps: 0 });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      
      // Get video stats
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setVideoStats({
          width: settings.width || 0,
          height: settings.height || 0,
          fps: settings.frameRate || 0
        });
      }
    }
  }, [stream]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={containerRef} className="flex-1 bg-gray-950 relative group">
      {stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
          
          {/* Video Stats Overlay */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4" />
              <span>{userName}</span>
            </div>
            {videoStats.width > 0 && (
              <div className="text-xs text-gray-400 mt-1">
                {videoStats.width}x{videoStats.height} @ {Math.round(videoStats.fps)}fps
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          {isScreenSharing ? (
            <>
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p>Waiting for screen share...</p>
            </>
          ) : (
            <>
              <Monitor className="w-16 h-16 mb-4 text-gray-600" />
              <p className="text-lg">No screen share active</p>
              <p className="text-sm text-gray-600 mt-2">
                Click "Share Screen" to start sharing
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}