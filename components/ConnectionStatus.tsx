'use client';

import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
  state: RTCPeerConnectionState;
}

export default function ConnectionStatus({ state }: ConnectionStatusProps) {
  const getStatusInfo = () => {
    switch (state) {
      case 'new':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'Initializing',
          color: 'text-gray-400'
        };
      case 'connecting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'Connecting',
          color: 'text-yellow-500'
        };
      case 'connected':
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: 'Connected',
          color: 'text-green-500'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Disconnected',
          color: 'text-red-500'
        };
      case 'failed':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Failed',
          color: 'text-red-600'
        };
      case 'closed':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Closed',
          color: 'text-gray-500'
        };
      default:
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: 'Unknown',
          color: 'text-gray-400'
        };
    }
  };

  const status = getStatusInfo();

  return (
    <div className={`flex items-center space-x-2 ${status.color}`}>
      {status.icon}
      <span className="text-sm font-medium">{status.text}</span>
    </div>
  );
}