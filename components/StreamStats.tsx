'use client';

import { useEffect, useState } from 'react';
import { Activity, Wifi, Monitor, Volume2 } from 'lucide-react';

interface StreamStatsProps {
  webrtc: any;
  isActive: boolean;
}

export default function StreamStats({ webrtc, isActive }: StreamStatsProps) {
  const [stats, setStats] = useState({
    video: { width: 0, height: 0, fps: 0, bitrate: 0 },
    audio: { bitrate: 0 },
    connection: { rtt: 0, packetLoss: 0 }
  });

  useEffect(() => {
    if (!webrtc || !isActive) return;

    const interval = setInterval(async () => {
      const newStats = await webrtc.getStreamStats();
      if (newStats) {
        setStats(newStats);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [webrtc, isActive]);

  if (!isActive) return null;

  const formatBitrate = (bitrate: number) => {
    if (bitrate > 1000000) return `${(bitrate / 1000000).toFixed(1)} Mbps`;
    if (bitrate > 1000) return `${(bitrate / 1000).toFixed(0)} Kbps`;
    return `${bitrate} bps`;
  };

  const getQualityColor = () => {
    if (stats.video.width >= 1920 && stats.video.fps >= 50) return 'text-green-400';
    if (stats.video.width >= 1280 && stats.video.fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white text-sm space-y-2 min-w-[250px]">
      <div className="font-semibold mb-2 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Stream Quality
      </div>
      
      {/* Video Stats */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-gray-400">
          <Monitor className="w-3 h-3" />
          Resolution
        </span>
        <span className={getQualityColor()}>
          {stats.video.width}x{stats.video.height}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-gray-400">FPS</span>
        <span className={stats.video.fps >= 50 ? 'text-green-400' : stats.video.fps >= 30 ? 'text-yellow-400' : 'text-red-400'}>
          {Math.round(stats.video.fps)}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-gray-400">Video Bitrate</span>
        <span className={stats.video.bitrate > 5000000 ? 'text-green-400' : stats.video.bitrate > 2000000 ? 'text-yellow-400' : 'text-red-400'}>
          {formatBitrate(stats.video.bitrate)}
        </span>
      </div>
      
      {/* Audio Stats */}
      {stats.audio.bitrate > 0 && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-gray-400">
            <Volume2 className="w-3 h-3" />
            Audio
          </span>
          <span>{formatBitrate(stats.audio.bitrate)}</span>
        </div>
      )}
      
      {/* Connection Stats */}
      <div className="border-t border-gray-600 pt-2 mt-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-gray-400">
            <Wifi className="w-3 h-3" />
            Latency
          </span>
          <span className={stats.connection.rtt < 50 ? 'text-green-400' : stats.connection.rtt < 150 ? 'text-yellow-400' : 'text-red-400'}>
            {stats.connection.rtt}ms
          </span>
        </div>
      </div>

      {/* Quality Indicator */}
      <div className="border-t border-gray-600 pt-2 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Quality</span>
          <span className={getQualityColor()}>
            {stats.video.width >= 1920 && stats.video.fps >= 50 ? 'Excellent (1080p/60fps)' :
             stats.video.width >= 1280 && stats.video.fps >= 30 ? 'Good (720p+)' :
             stats.video.width > 0 ? 'Poor' : 'Connecting...'}
          </span>
        </div>
      </div>
    </div>
  );
}