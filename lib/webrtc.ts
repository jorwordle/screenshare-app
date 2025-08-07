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
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
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
      // Try high quality first, with fallback options
      const constraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 60, min: 30 },
          cursor: 'always' as const
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: { ideal: 48000, min: 44100 },
          channelCount: { ideal: 2, min: 1 },
          autoGainControl: false
        }
      };

      // @ts-ignore - getDisplayMedia types
      this.localStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      console.log('Got display media stream:', this.localStream.id);
      
      // Remove any existing senders first
      if (this.pc) {
        const senders = this.pc.getSenders();
        senders.forEach(sender => {
          if (sender.track) {
            this.pc!.removeTrack(sender);
          }
        });
        
        // Add video track with bitrate configuration
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          const sender = this.pc.addTrack(videoTrack, this.localStream);
          
          // Get actual video settings to determine appropriate bitrate
          const settings = videoTrack.getSettings();
          const width = settings.width || 1920;
          const height = settings.height || 1080;
          const frameRate = settings.frameRate || 30;
          
          // Calculate optimal bitrate based on actual resolution
          let targetBitrate = 8000000; // Default 8 Mbps for 1080p/60fps
          if (width <= 1280 && height <= 720) {
            targetBitrate = 3000000; // 3 Mbps for 720p
          } else if (width <= 1920 && height <= 1080 && frameRate <= 30) {
            targetBitrate = 5000000; // 5 Mbps for 1080p/30fps
          }
          
          // Configure bitrate for video
          const params = sender.getParameters();
          if (!params.encodings) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = targetBitrate;
          params.encodings[0].maxFramerate = frameRate;
          sender.setParameters(params);
          
          console.log(`Added video track: ${width}x${height}@${frameRate}fps, bitrate: ${targetBitrate/1000000}Mbps`);
          
          // Start monitoring for adaptive quality
          this.startAdaptiveQuality(sender);
        }
        
        // Add audio track if available
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          const audioSender = this.pc.addTrack(audioTrack, this.localStream);
          console.log('Added audio track:', audioTrack.id);
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
    
    // Remove all senders
    if (this.pc) {
      const senders = this.pc.getSenders();
      senders.forEach(sender => {
        if (sender.track) {
          this.pc!.removeTrack(sender);
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
    // Replace existing b=AS line or add one for video
    let modifiedSdp = sdp.replace(/b=AS:.*\r\n/g, '');
    modifiedSdp = modifiedSdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:8000\r\n');
    
    // Set specific bitrate for VP9/H264
    modifiedSdp = modifiedSdp.replace(/a=rtpmap:(\d+) VP9\/90000\r\n/g, 
      'a=rtpmap:$1 VP9/90000\r\na=fmtp:$1 max-fs=8160;max-fr=60\r\n');
    
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

        // Reduce bitrate if high packet loss
        if (packetLossRate > 5) {
          newBitrate = Math.max(1000000, currentMax * 0.7); // Reduce by 30%
          console.log(`High packet loss (${packetLossRate.toFixed(1)}%), reducing bitrate to ${newBitrate/1000000}Mbps`);
        } else if (packetLossRate < 1 && currentMax < 8000000) {
          // Try to increase bitrate if network is good
          newBitrate = Math.min(8000000, currentMax * 1.2); // Increase by 20%
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