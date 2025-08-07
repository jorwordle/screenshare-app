// Performance monitoring and adaptive quality

export interface ConnectionQuality {
  latency: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export class PerformanceMonitor {
  private pc: RTCPeerConnection;
  private statsInterval: NodeJS.Timeout | null = null;
  private lastStats: any = {};

  constructor(peerConnection: RTCPeerConnection) {
    this.pc = peerConnection;
  }

  startMonitoring(callback: (quality: ConnectionQuality) => void, interval = 2000) {
    this.statsInterval = setInterval(async () => {
      const stats = await this.getConnectionQuality();
      callback(stats);
    }, interval);
  }

  stopMonitoring() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  async getConnectionQuality(): Promise<ConnectionQuality> {
    const stats = await this.pc.getStats();
    let latency = 0;
    let jitter = 0;
    let packetLoss = 0;
    let bandwidth = 0;

    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        latency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
      }

      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        jitter = report.jitter || 0;
        
        if (this.lastStats[report.id]) {
          const packetsLost = report.packetsLost - this.lastStats[report.id].packetsLost;
          const packetsReceived = report.packetsReceived - this.lastStats[report.id].packetsReceived;
          packetLoss = packetsLost / (packetsLost + packetsReceived) * 100;
          
          const bytesReceived = report.bytesReceived - this.lastStats[report.id].bytesReceived;
          const timeDiff = (report.timestamp - this.lastStats[report.id].timestamp) / 1000;
          bandwidth = (bytesReceived * 8) / timeDiff / 1000000; // Mbps
        }
        
        this.lastStats[report.id] = report;
      }
    });

    const quality = this.calculateQuality(latency, jitter, packetLoss, bandwidth);

    return {
      latency,
      jitter,
      packetLoss,
      bandwidth,
      quality
    };
  }

  private calculateQuality(
    latency: number, 
    jitter: number, 
    packetLoss: number, 
    bandwidth: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (latency < 50 && packetLoss < 0.5 && bandwidth > 4) {
      return 'excellent';
    } else if (latency < 150 && packetLoss < 2 && bandwidth > 2) {
      return 'good';
    } else if (latency < 300 && packetLoss < 5 && bandwidth > 1) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  async getDetailedStats() {
    const stats = await this.pc.getStats();
    const report: any = {
      audio: {},
      video: {},
      connection: {}
    };

    stats.forEach((stat) => {
      if (stat.type === 'inbound-rtp') {
        const mediaType = stat.kind as 'audio' | 'video';
        report[mediaType] = {
          bytesReceived: stat.bytesReceived,
          packetsReceived: stat.packetsReceived,
          packetsLost: stat.packetsLost,
          jitter: stat.jitter,
          frameRate: stat.framesPerSecond,
          frameWidth: stat.frameWidth,
          frameHeight: stat.frameHeight
        };
      } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
        report.connection = {
          rtt: stat.currentRoundTripTime,
          availableBandwidth: stat.availableOutgoingBitrate,
          bytesSent: stat.bytesSent,
          bytesReceived: stat.bytesReceived
        };
      }
    });

    return report;
  }
}

// Adaptive bitrate streaming
export class AdaptiveQuality {
  private constraints = {
    high: {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 60 }
      }
    },
    medium: {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }
    },
    low: {
      video: {
        width: { ideal: 854 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 }
      }
    }
  };

  getConstraintsForQuality(quality: ConnectionQuality['quality']) {
    switch (quality) {
      case 'excellent':
      case 'good':
        return this.constraints.high;
      case 'fair':
        return this.constraints.medium;
      case 'poor':
        return this.constraints.low;
      default:
        return this.constraints.medium;
    }
  }

  async applyConstraints(
    stream: MediaStream, 
    quality: ConnectionQuality['quality']
  ) {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const constraints = this.getConstraintsForQuality(quality);
    try {
      await videoTrack.applyConstraints(constraints.video);
      console.log(`Applied ${quality} quality constraints`);
    } catch (error) {
      console.error('Failed to apply constraints:', error);
    }
  }
}

// Network resilience
export class NetworkResilience {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async handleConnectionFailure(
    onReconnect: () => Promise<void>,
    onMaxAttemptsReached: () => void
  ) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      onMaxAttemptsReached();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await onReconnect();
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.handleConnectionFailure(onReconnect, onMaxAttemptsReached);
      }
    }, delay);
  }

  reset() {
    this.reconnectAttempts = 0;
  }
}