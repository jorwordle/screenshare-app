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
      // High quality 1080p/60fps constraints
      const constraints = {
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 60, max: 60 },
          cursor: 'always' as const,
          displaySurface: 'monitor' as const
        },
        audio: false
      };

      // @ts-ignore - getDisplayMedia types
      this.localStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      console.log('Got display media stream:', this.localStream.id);
      
      // Remove any existing senders first
      if (this.pc) {
        const senders = this.pc.getSenders();
        senders.forEach(sender => {
          if (sender.track?.kind === 'video') {
            this.pc!.removeTrack(sender);
          }
        });
        
        // Add new video track
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          const sender = this.pc.addTrack(videoTrack, this.localStream);
          console.log('Added video track to peer connection:', videoTrack.id);
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
      offerToReceiveAudio: false
    });
    
    await this.pc.setLocalDescription(offer);
    return offer;
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
}