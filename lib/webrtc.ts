export class WebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onDataChannel: ((channel: RTCDataChannel) => void) | null = null;
  private onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null;
  private onIceCandidate: ((candidate: RTCIceCandidate) => void) | null = null;

  constructor() {
    this.initializePeerConnection();
  }

  private initializePeerConnection() {
    const configuration: RTCConfiguration = {
      iceServers: [
        // Google's free STUN servers
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Additional STUN servers for redundancy
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:stun.stunprotocol.org:3478' },
        // TURN servers - Replace with your own in production
        // Metered TURN servers (free tier available)
        {
          urls: 'turn:a.relay.metered.ca:80',
          username: 'free',
          credential: 'free'
        },
        {
          urls: 'turn:a.relay.metered.ca:443',
          username: 'free',
          credential: 'free'
        }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    this.pc = new RTCPeerConnection(configuration);

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    // Handle remote stream
    this.pc.ontrack = (event) => {
      console.log('📡 ontrack event fired!', {
        track: event.track.kind,
        streams: event.streams.length,
        trackId: event.track.id
      });
      
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.log('🎬 Remote stream set:', this.remoteStream.id);
        if (this.onRemoteStream) {
          this.onRemoteStream(event.streams[0]);
        }
      }
    };

    // Monitor connection state
    this.pc.onconnectionstatechange = () => {
      if (this.pc && this.onConnectionStateChange) {
        this.onConnectionStateChange(this.pc.connectionState);
      }
    };

    // Handle data channel
    this.pc.ondatachannel = (event) => {
      const channel = event.channel;
      if (this.onDataChannel) {
        this.onDataChannel(channel);
      }
    };
  }

  async startScreenShare(): Promise<MediaStream> {
    try {
      // Force maximum quality - no compromises!
      const constraints = {
        video: {
          width: { exact: 1920 },
          height: { exact: 1080 },
          frameRate: { exact: 60 }, // Force 60fps!
          cursor: 'always' as const,
          displaySurface: 'monitor' as const
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 48000,
          channelCount: 2,
          autoGainControl: false,
          sampleSize: 16
        }
      };

      // @ts-ignore - getDisplayMedia types
      this.localStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      console.log('Got display media stream:', this.localStream.id);
      
      // Don't remove tracks - just add/replace them
      if (this.pc) {
        const senders = this.pc.getSenders();
        let videoSender = senders.find(s => s.track?.kind === 'video');
        let audioSender = senders.find(s => s.track?.kind === 'audio');
        
        // Add or replace video track with bitrate configuration
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          let sender;
          if (videoSender && videoSender.track) {
            // Replace existing video track
            await videoSender.replaceTrack(videoTrack);
            sender = videoSender;
            console.log('Replaced existing video track');
          } else {
            // Add new video track
            sender = this.pc.addTrack(videoTrack, this.localStream);
            console.log('Added new video track');
          }
          
          // Get actual video settings to determine appropriate bitrate
          const settings = videoTrack.getSettings();
          const width = settings.width || 1920;
          const height = settings.height || 1080;
          const frameRate = settings.frameRate || 30;
          
          // Maximum quality settings - push it to the limit!
          let targetBitrate = 12000000; // 12 Mbps for insane quality
          
          // Configure maximum quality parameters
          const params = sender.getParameters();
          if (!params.encodings) {
            params.encodings = [{}];
          }
          
          // Force maximum quality settings
          params.encodings[0] = {
            ...params.encodings[0],
            maxBitrate: targetBitrate,        // 12 Mbps
            minBitrate: 8000000,               // Minimum 8 Mbps
            maxFramerate: 60,                  // Force 60 FPS
            scaleResolutionDownBy: 1,          // No downscaling
            scalabilityMode: 'L1T1',           // Single layer for max quality
            priority: 'very-high' as RTCPriorityType,
            networkPriority: 'very-high' as RTCPriorityType
          };
          
          await sender.setParameters(params);
          
          console.log(`Added video track: ${width}x${height}@${frameRate}fps, bitrate: ${targetBitrate/1000000}Mbps`);
          
          // Start monitoring for adaptive quality
          this.startAdaptiveQuality(sender);
        }
        
        // Add or replace audio track if available
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          if (audioSender && audioSender.track) {
            // Replace existing audio track
            await audioSender.replaceTrack(audioTrack);
            console.log('Replaced existing audio track');
          } else {
            // Add new audio track
            this.pc.addTrack(audioTrack, this.localStream);
            console.log('Added new audio track');
          }
        }
      }

      // Handle screen share ending
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.log('Screen share ended by user');
          this.stopScreenShare();
        };
      }

      return this.localStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  stopScreenShare() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Stop adaptive quality monitoring
    if (this.adaptiveQualityInterval) {
      clearInterval(this.adaptiveQualityInterval);
      this.adaptiveQualityInterval = null;
    }
    
    // Replace tracks with null instead of removing senders
    if (this.pc) {
      const senders = this.pc.getSenders();
      senders.forEach(async (sender) => {
        if (sender.track) {
          try {
            await sender.replaceTrack(null);
            console.log('Replaced track with null for:', sender.track.kind);
          } catch (err) {
            console.error('Error replacing track:', err);
          }
        }
      });
    }
  }

  createDataChannel(label: string = 'chat'): RTCDataChannel {
    if (!this.pc) throw new Error('Peer connection not initialized');
    
    this.dataChannel = this.pc.createDataChannel(label, {
      ordered: true,
      maxRetransmits: 3
    });

    this.setupDataChannelHandlers(this.dataChannel);
    return this.dataChannel;
  }

  private setupDataChannelHandlers(channel: RTCDataChannel) {
    channel.onopen = () => console.log('Data channel opened');
    channel.onclose = () => console.log('Data channel closed');
    channel.onerror = (error) => console.error('Data channel error:', error);
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('Peer connection not initialized');
    
    const transceivers = this.pc.getTransceivers();
    transceivers.forEach(transceiver => {
      if (transceiver.receiver.track?.kind === 'video') {
        transceiver.setCodecPreferences(this.getHighQualityCodecs());
      }
    });
    
    const offer = await this.pc.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true
    });
    
    // Modify SDP to increase bitrate
    offer.sdp = this.increaseBitrate(offer.sdp!);
    
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  private increaseBitrate(sdp: string): string {
    // Force maximum bitrate in SDP
    let modifiedSdp = sdp;
    
    // Remove any existing bandwidth restrictions
    modifiedSdp = modifiedSdp.replace(/b=AS:.*\r\n/g, '');
    modifiedSdp = modifiedSdp.replace(/b=CT:.*\r\n/g, '');
    
    // Add 12 Mbps bandwidth for video
    modifiedSdp = modifiedSdp.replace(/a=mid:video\r\n/g, 
      'a=mid:video\r\nb=AS:12000\r\nb=CT:12000\r\n');
    
    // Force 60fps and max quality for VP9
    modifiedSdp = modifiedSdp.replace(/a=rtpmap:(\d+) VP9\/90000\r\n/g, 
      'a=rtpmap:$1 VP9/90000\r\na=fmtp:$1 max-fs=8160;max-fr=60;profile-id=0\r\n');
    
    // Force 60fps and max quality for H264
    modifiedSdp = modifiedSdp.replace(/a=rtpmap:(\d+) H264\/90000\r\n/g,
      'a=rtpmap:$1 H264/90000\r\na=fmtp:$1 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f;max-fs=8160;max-fps=3600\r\n');
    
    // Add x-google bandwidth parameters for Chrome
    modifiedSdp = modifiedSdp.replace(/a=ssrc:(\d+) cname:(.*)\r\n/g,
      'a=ssrc:$1 cname:$2\r\nx-google-min-bitrate:8000\r\nx-google-max-bitrate:12000\r\nx-google-start-bitrate:10000\r\n');
    
    return modifiedSdp;
  }

  private getHighQualityCodecs(): RTCRtpCodecCapability[] {
    const codecs = RTCRtpReceiver.getCapabilities('video')?.codecs || [];
    // Prefer VP9 or H264 for better quality
    return codecs.filter(codec => 
      codec.mimeType.includes('VP9') || 
      codec.mimeType.includes('H264')
    );
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('Peer connection not initialized');
    
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    if (!this.pc) throw new Error('Peer connection not initialized');
    await this.pc.setRemoteDescription(description);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) throw new Error('Peer connection not initialized');
    await this.pc.addIceCandidate(candidate);
  }

  // Event handlers
  onRemoteStreamReceived(handler: (stream: MediaStream) => void) {
    this.onRemoteStream = handler;
  }

  onDataChannelReceived(handler: (channel: RTCDataChannel) => void) {
    this.onDataChannel = handler;
  }

  onConnectionStateChanged(handler: (state: RTCPeerConnectionState) => void) {
    this.onConnectionStateChange = handler;
  }

  onIceCandidateGenerated(handler: (candidate: RTCIceCandidate) => void) {
    this.onIceCandidate = handler;
  }

  getStats(): Promise<RTCStatsReport> {
    if (!this.pc) throw new Error('Peer connection not initialized');
    return this.pc.getStats();
  }

  close() {
    this.stopScreenShare();
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.pc) {
      this.pc.close();
    }
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc ? this.pc.connectionState : null;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  private adaptiveQualityInterval: NodeJS.Timeout | null = null;

  private startAdaptiveQuality(sender: RTCRtpSender) {
    if (this.adaptiveQualityInterval) {
      clearInterval(this.adaptiveQualityInterval);
    }

    this.adaptiveQualityInterval = setInterval(async () => {
      if (!this.pc || this.pc.connectionState !== 'connected') return;

      const stats = await sender.getStats();
      let currentBitrate = 0;
      let packetLossRate = 0;

      stats.forEach((report) => {
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
          // Calculate packet loss rate
          const packetsLost = report.packetsLost || 0;
          const packetsSent = report.packetsSent || 1;
          packetLossRate = (packetsLost / packetsSent) * 100;
          
          // Get current bitrate
          if (report.bytesSent && report.timestamp) {
            currentBitrate = report.bytesSent * 8 / (report.timestamp / 1000);
          }
        }
      });

      // Adjust quality based on network conditions
      const params = sender.getParameters();
      if (params.encodings && params.encodings[0]) {
        const currentMax = params.encodings[0].maxBitrate || 8000000;
        let newBitrate = currentMax;

        // Only reduce if REALLY bad packet loss
        if (packetLossRate > 10) {
          newBitrate = Math.max(6000000, currentMax * 0.8); // Only reduce by 20%, min 6Mbps
          console.log(`High packet loss (${packetLossRate.toFixed(1)}%), slightly reducing bitrate to ${newBitrate/1000000}Mbps`);
        } else if (packetLossRate < 2 && currentMax < 12000000) {
          // Aggressively increase bitrate if network is good
          newBitrate = Math.min(12000000, currentMax * 1.3); // Increase by 30%
          console.log(`Good network conditions, increasing bitrate to ${newBitrate/1000000}Mbps`);
        }

        if (newBitrate !== currentMax) {
          params.encodings[0].maxBitrate = Math.round(newBitrate);
          sender.setParameters(params);
        }
      }
    }, 3000); // Check every 3 seconds
  }

  async getStreamStats(): Promise<{
    video: { width: number; height: number; fps: number; bitrate: number };
    audio: { bitrate: number };
    connection: { rtt: number; packetLoss: number };
  } | null> {
    if (!this.pc) return null;
    
    const stats = await this.pc.getStats();
    const result = {
      video: { width: 0, height: 0, fps: 0, bitrate: 0 },
      audio: { bitrate: 0 },
      connection: { rtt: 0, packetLoss: 0 }
    };
    
    let lastBytes = 0;
    let lastTimestamp = 0;
    
    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        result.video.width = report.frameWidth || 0;
        result.video.height = report.frameHeight || 0;
        result.video.fps = report.framesPerSecond || 0;
        
        if (lastTimestamp && report.timestamp > lastTimestamp) {
          const bitrate = 8 * (report.bytesReceived - lastBytes) / (report.timestamp - lastTimestamp);
          result.video.bitrate = Math.round(bitrate);
        }
      } else if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        if (lastTimestamp && report.timestamp > lastTimestamp) {
          const bitrate = 8 * (report.bytesReceived - lastBytes) / (report.timestamp - lastTimestamp);
          result.audio.bitrate = Math.round(bitrate);
        }
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        result.connection.rtt = Math.round((report.currentRoundTripTime || 0) * 1000);
      }
    });
    
    return result;
  }
}