'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { WebRTCConnection } from '@/lib/webrtc';
import socketManager from '@/lib/socket';
import ChatPanel from '@/components/ChatPanel';
import VideoDisplay from '@/components/VideoDisplay';
import ControlBar from '@/components/ControlBar';
import ConnectionStatus from '@/components/ConnectionStatus';
import StreamStats from '@/components/StreamStats';
import { 
  Monitor, 
  MonitorOff, 
  Users, 
  Copy, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  joinedAt: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const roomId = params.roomId as string;
  const userName = searchParams.get('name') || 'Anonymous';
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [copied, setCopied] = useState(false);
  const [roomFull, setRoomFull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const webrtcRef = useRef<WebRTCConnection | null>(null);
  const partnerId = useRef<string | null>(null);

  // Initialize socket and WebRTC
  useEffect(() => {
    const socket = socketManager.connect();
    
    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('join-room', { roomId, userName });
    });

    socket.on('room-joined', ({ users: roomUsers, messages: roomMessages }) => {
      setIsConnected(true);
      setUsers(roomUsers);
      setMessages(roomMessages);
      // First user in room is the host
      setIsHost(roomUsers.length === 1);
      console.log(`Joined as ${roomUsers.length === 1 ? 'HOST' : 'VIEWER'}`);
    });

    socket.on('room-full', () => {
      setRoomFull(true);
      setError('Room is full. Maximum 2 users allowed.');
    });

    socket.on('user-joined', ({ userId, userName: newUserName }) => {
      setUsers(prev => [...prev, { id: userId, name: newUserName, joinedAt: Date.now() }]);
      
      // Initialize WebRTC for the second user
      if (!webrtcRef.current) {
        initializeWebRTC(userId);
      }
    });

    socket.on('user-left', ({ userId }) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setPeerScreenSharing(false);
      setRemoteStream(null);
      if (webrtcRef.current) {
        webrtcRef.current.close();
        webrtcRef.current = null;
      }
    });

    socket.on('ready-to-connect', async ({ initiator, partnerId: pId, partnerName }) => {
      partnerId.current = pId;
      await initializeWebRTC(pId);
      
      if (initiator && webrtcRef.current) {
        const offer = await webrtcRef.current.createOffer();
        socket.emit('offer', { offer, to: pId });
      }
    });

    socket.on('offer', async ({ offer, from }) => {
      if (!webrtcRef.current) {
        partnerId.current = from;
        await initializeWebRTC(from);
      }
      
      if (webrtcRef.current) {
        const answer = await webrtcRef.current.createAnswer(offer);
        socket.emit('answer', { answer, to: from });
      }
    });

    socket.on('answer', async ({ answer, from }) => {
      if (webrtcRef.current) {
        await webrtcRef.current.setRemoteDescription(answer);
      }
    });

    socket.on('ice-candidate', async ({ candidate, from }) => {
      if (webrtcRef.current) {
        await webrtcRef.current.addIceCandidate(candidate);
      }
    });

    socket.on('chat-message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('peer-screen-share-started', ({ userId }) => {
      console.log('Host started screen sharing');
      setPeerScreenSharing(true);
      // Viewer should not be sharing
      if (!isHost) {
        setIsScreenSharing(false);
        setLocalStream(null);
      }
    });

    socket.on('peer-screen-share-stopped', ({ userId }) => {
      console.log('Host stopped screen sharing');
      setPeerScreenSharing(false);
      // Clear remote stream display for viewer
      if (!isHost) {
        console.log('Host stopped sharing, clearing display');
      }
    });

    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.close();
      }
      socketManager.disconnect();
    };
  }, [roomId, userName]);

  const initializeWebRTC = async (peerId: string) => {
    webrtcRef.current = new WebRTCConnection();
    
    webrtcRef.current.onRemoteStreamReceived((stream) => {
      console.log('🎥 Received remote stream:', stream.id, 'Tracks:', stream.getTracks().length);
      setRemoteStream(stream);
      // If we're not the host, this is the stream we should display
      if (!isHost) {
        console.log('Viewer received host stream!');
      }
    });

    webrtcRef.current.onConnectionStateChanged((state) => {
      setConnectionState(state);
    });

    webrtcRef.current.onIceCandidateGenerated((candidate) => {
      socketManager.emit('ice-candidate', { candidate, to: peerId });
    });

    // Create data channel for additional communication
    webrtcRef.current.createDataChannel('app-data');
  };

  const toggleScreenShare = async () => {
    // Only host can share
    if (!isHost) {
      setError('Only the room host can share their screen');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!webrtcRef.current) {
      console.error('WebRTC not initialized');
      setError('Connection not established. Please wait and try again.');
      return;
    }

    if (connectionState !== 'connected') {
      setError('Please wait for peer connection to establish');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (isScreenSharing) {
      webrtcRef.current.stopScreenShare();
      setIsScreenSharing(false);
      setLocalStream(null);
      socketManager.emit('screen-share-stopped', { roomId });
    } else {
      try {
        console.log('Starting screen share...');
        const stream = await webrtcRef.current.startScreenShare();
        setLocalStream(stream);
        setIsScreenSharing(true);
        
        // Need to renegotiate the connection after adding stream
        if (partnerId.current && connectionState === 'connected') {
          console.log('Renegotiating connection with new stream...');
          const offer = await webrtcRef.current.createOffer();
          socketManager.emit('offer', { offer, to: partnerId.current });
        }
        
        socketManager.emit('screen-share-started', { roomId });
        console.log('Screen share started successfully');
      } catch (error: any) {
        console.error('Failed to start screen share:', error);
        if (error.name === 'NotAllowedError') {
          setError('Screen sharing permission denied. Please allow screen sharing and try again.');
        } else if (error.name === 'NotFoundError') {
          setError('No screen sharing source available.');
        } else {
          setError(`Failed to start screen sharing: ${error.message || 'Unknown error'}`);
        }
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  const sendMessage = (message: string) => {
    socketManager.emit('chat-message', { roomId, message, userName });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    if (webrtcRef.current) {
      webrtcRef.current.close();
    }
    socketManager.disconnect();
    router.push('/');
  };

  if (roomFull) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Room Full</h2>
          <p className="text-gray-400 mb-6">This room already has 2 participants.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-white">ScreenShare Pro</h1>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Room:</span>
              <code className="bg-gray-700 px-3 py-1 rounded text-white font-mono">
                {roomId}
              </code>
              <button
                onClick={copyRoomCode}
                className="p-1 hover:bg-gray-700 rounded transition"
              >
                {copied ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <ConnectionStatus state={connectionState} />
            <div className="flex items-center space-x-2 text-gray-400">
              <Users className="w-5 h-5" />
              <span>{users.length}/2</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 flex flex-col relative">
          <VideoDisplay 
            stream={isHost ? localStream : remoteStream}
            isScreenSharing={isScreenSharing || peerScreenSharing}
            userName={isHost && isScreenSharing ? 'Your Screen (Host)' : (!isHost && remoteStream ? `Host's Screen` : '')}
          />
          
          {/* Stream Stats Overlay - show on both screens */}
          <StreamStats 
            webrtc={webrtcRef.current}
            isActive={isScreenSharing || peerScreenSharing}
          />
          
          <ControlBar
            isScreenSharing={isScreenSharing}
            onToggleScreenShare={toggleScreenShare}
            onLeaveRoom={leaveRoom}
            disabled={!isHost || users.length < 2 || connectionState !== 'connected'}
            peerScreenSharing={peerScreenSharing}
            isHost={isHost}
          />
        </div>

        {/* Chat Panel */}
        <ChatPanel
          messages={messages}
          onSendMessage={sendMessage}
          currentUserId={socketManager.getSocket()?.id || ''}
          currentUserName={userName}
        />
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}