'use client';

import { Monitor, MonitorOff, PhoneOff, Settings, Info } from 'lucide-react';
import { useState } from 'react';

interface ControlBarProps {
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
  onLeaveRoom: () => void;
  disabled?: boolean;
}

export default function ControlBar({
  isScreenSharing,
  onToggleScreenShare,
  onLeaveRoom,
  disabled = false
}: ControlBarProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  return (
    <div className="bg-gray-900 border-t border-gray-700 px-4 py-3">
      <div className="flex items-center justify-center space-x-4">
        {/* Screen Share Button */}
        <div className="relative">
          <button
            onClick={onToggleScreenShare}
            disabled={disabled}
            onMouseEnter={() => setShowTooltip('screen')}
            onMouseLeave={() => setShowTooltip(null)}
            className={`p-3 rounded-full transition-all ${
              isScreenSharing
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isScreenSharing ? (
              <Monitor className="w-6 h-6" />
            ) : (
              <MonitorOff className="w-6 h-6" />
            )}
          </button>
          {showTooltip === 'screen' && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            </div>
          )}
        </div>

        {/* Settings Button */}
        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip('settings')}
            onMouseLeave={() => setShowTooltip(null)}
            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all"
          >
            <Settings className="w-6 h-6" />
          </button>
          {showTooltip === 'settings' && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
              Settings
            </div>
          )}
        </div>

        {/* Info Button */}
        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip('info')}
            onMouseLeave={() => setShowTooltip(null)}
            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all"
          >
            <Info className="w-6 h-6" />
          </button>
          {showTooltip === 'info' && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
              Connection Info
            </div>
          )}
        </div>

        {/* Leave Room Button */}
        <div className="relative">
          <button
            onClick={onLeaveRoom}
            onMouseEnter={() => setShowTooltip('leave')}
            onMouseLeave={() => setShowTooltip(null)}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
          {showTooltip === 'leave' && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
              Leave Room
            </div>
          )}
        </div>
      </div>

      {/* Status Text */}
      {disabled && (
        <div className="text-center mt-3 text-sm text-gray-500">
          Waiting for another user to join...
        </div>
      )}
    </div>
  );
}