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
      const constraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60, max: 60 },
          cursor: 'always' as const
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      // @ts-ignore - getDisplayMedia types
      this.localStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      // Add tracks to peer connection
      if (this.pc && this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.pc!.addTrack(track, this.localStream!);
        });
      }

      // Handle screen share ending
      this.localStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

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
    
    const offer = await this.pc.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true
    });
    
    await this.pc.setLocalDescription(offer);
    return offer;
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
}