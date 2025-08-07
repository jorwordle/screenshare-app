import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private static instance: SocketManager;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  connect(serverUrl: string = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'): Socket {
    if (!this.socket) {
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      this.socket.on('connect', () => {
        console.log('Connected to signaling server');
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from signaling server:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
      });
    }
    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, handler: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  off(event: string, handler?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }
}

export default SocketManager.getInstance();