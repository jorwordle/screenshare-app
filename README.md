# ScreenShare Pro - P2P Screen Sharing & Chat Application

A production-ready, browser-based screen sharing application with real-time chat, built with Next.js, WebRTC, and Socket.io. Supports 1080p/60FPS screen sharing with pure peer-to-peer connectivity.

## Features

- 🖥️ **High-Quality Screen Sharing**: Up to 1080p resolution at 60 FPS
- 🔒 **P2P Connection**: Direct peer-to-peer video streaming (no server relay)
- 💬 **Real-time Chat**: Integrated chat alongside screen sharing
- 🚀 **Low Latency**: Optimized for minimal delay
- 📱 **Responsive Design**: Works on desktop and mobile browsers
- 🔐 **Secure**: WebRTC encryption with DTLS-SRTP
- 🎯 **Simple Auth**: Just enter name and room code
- 🖼️ **Fullscreen Mode**: Immersive viewing experience

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **WebRTC**: Native browser APIs with STUN/TURN support
- **Deployment**: Railway, Render, or any Node.js hosting

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/screenshare-app.git
cd screenshare-app
```

2. Install dependencies for both frontend and backend:
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```

### Development

Run both servers concurrently:

```bash
# Terminal 1 - Start the signaling server
cd server
npm run dev

# Terminal 2 - Start the Next.js app
npm run dev
```

- Frontend: http://localhost:3000
- Signaling Server: http://localhost:3001

## Usage

1. **Create a Room**: 
   - Enter your name
   - Click "Create New Room"
   - Share the room code with another person

2. **Join a Room**:
   - Enter your name
   - Enter the room code
   - Click "Join Existing Room"

3. **Share Screen**:
   - Once both users are connected
   - Click the "Share Screen" button
   - Select the screen/window to share
   - The other user will see your screen automatically

4. **Chat**:
   - Use the chat panel on the right
   - Messages are synced in real-time

## Production Deployment

### Deploy to Railway

1. Install Railway CLI and login
2. Run deployment:
```bash
railway up
```

### Deploy to Render

1. Connect your GitHub repository
2. Use the `render.yaml` blueprint
3. Deploy with one click

### Manual Deployment

1. Build the applications:
```bash
# Build frontend
npm run build

# No build needed for backend (plain Node.js)
```

2. Set production environment variables
3. Start the services:
```bash
# Frontend
npm start

# Backend
cd server && npm start
```

## TURN/STUN Configuration

The app includes free STUN servers by default. For production, add TURN servers:

### Option 1: Metered (Recommended for start)
- Sign up at https://www.metered.ca/stun-turn
- Add credentials to `.env.local`

### Option 2: Self-hosted Coturn
```bash
# Install on Ubuntu/Debian
sudo apt-get install coturn

# Configure and run
turnserver -a -v -n --no-dtls --no-tls -u username:password -r yourdomain.com
```

### Option 3: Twilio or Xirsys
- Create account and get credentials
- Update WebRTC configuration in `lib/webrtc.ts`

## Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Browser   │◄──────────────────►│  Signaling  │
│   Client A  │                    │   Server    │
└──────┬──────┘                    └──────┬──────┘
       │                                   │
       │         WebRTC P2P               │
       │         Connection               │
       │                                   │
       ▼                                   ▼
┌─────────────┐                    ┌─────────────┐
│   Browser   │◄──────────────────►│   Browser   │
│   Client B  │    Video/Audio     │   Client A  │
└─────────────┘      Direct        └─────────────┘
```

## Performance Optimization

- **Adaptive Bitrate**: Automatically adjusts quality based on connection
- **Connection Monitoring**: Real-time stats display
- **Efficient Codec**: VP9/H.264 with hardware acceleration
- **Network Resilience**: Automatic reconnection on failure

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14.1+
- Edge 80+

## Security Considerations

- All WebRTC traffic is encrypted (DTLS-SRTP)
- No video data passes through the server
- Room codes are randomly generated
- Optional: Add authentication layer
- Configure CSP headers for production

## Troubleshooting

### Connection Issues
- Check firewall settings (allow UDP ports)
- Verify STUN/TURN server configuration
- Test with `chrome://webrtc-internals/`

### Video Quality Issues
- Check bandwidth (minimum 2 Mbps recommended)
- Reduce resolution in poor network conditions
- Enable hardware acceleration in browser

### Cannot Share Screen
- Ensure browser permissions are granted
- Some browsers require HTTPS in production
- Check for browser extensions blocking screen capture

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/screenshare-app/issues)
- Email: support@yourapp.com

## Acknowledgments

- WebRTC community for excellent documentation
- Socket.io team for real-time capabilities
- Next.js team for the amazing framework