# TURN/STUN Infrastructure Guide

## Overview
WebRTC requires STUN/TURN servers to establish peer-to-peer connections, especially when users are behind NATs or firewalls.

## STUN Servers (Free)
STUN servers are used to discover public IP addresses. The application is configured with multiple free STUN servers:
- Google: `stun:stun.l.google.com:19302`
- Mozilla: `stun:stun.services.mozilla.com`
- Stunprotocol: `stun:stun.stunprotocol.org:3478`

## TURN Servers (Required for ~15-20% of connections)
TURN servers relay traffic when direct P2P connection fails. Options:

### 1. Metered TURN Servers (Recommended for Starting)
- **Free Tier**: 50GB/month
- **Setup**: Sign up at https://www.metered.ca/stun-turn
- **Configuration**:
```javascript
{
  urls: 'turn:a.relay.metered.ca:80',
  username: 'YOUR_USERNAME',
  credential: 'YOUR_CREDENTIAL'
}
```

### 2. Twilio TURN Servers
- **Cost**: $0.40 per GB
- **Setup**: 
  1. Sign up at https://www.twilio.com
  2. Create Network Traversal Service
  3. Generate tokens via API
- **Benefits**: Global infrastructure, reliable

### 3. Self-Hosted TURN Server (Cost-Effective for Scale)
- **Software**: Coturn
- **Hosting**: DigitalOcean, AWS EC2, or Vultr
- **Cost**: ~$5-20/month for VPS
- **Setup**:
```bash
# Install coturn
sudo apt-get install coturn

# Configure /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
relay-threads=50
min-port=49152
max-port=65535
user=username:password
realm=yourdomain.com
cert=/path/to/cert.pem
pkey=/path/to/privkey.pem
```

### 4. Xirsys (Premium Option)
- **Free Tier**: 100MB/month
- **Paid**: Starting at $25/month
- **Benefits**: Global infrastructure, analytics dashboard

## Production Recommendations

### For MVP/Testing:
- Use free STUN servers + Metered free tier
- Cost: $0

### For Small-Scale Production (< 100 concurrent users):
- Use free STUN servers + Metered paid tier ($10/month for 500GB)
- Alternative: Self-hosted Coturn on $10/month VPS

### For Large-Scale Production:
- Use Twilio or Xirsys for reliability
- Or deploy multiple self-hosted Coturn servers with GeoDNS

## Bandwidth Calculations
- 1080p/60fps screen share: ~2-4 Mbps
- Average session: 30 minutes
- Data per session: ~900MB-1.8GB
- TURN usage (20% of connections): ~180-360MB per session

## Security Considerations
1. Always use TLS for TURN servers
2. Implement authentication (long-term credentials)
3. Rate limit connections per IP
4. Monitor for abuse
5. Rotate credentials regularly

## Environment Variables
Add to `.env.local`:
```
NEXT_PUBLIC_TURN_SERVER_URL=turn:your-server.com:3478
NEXT_PUBLIC_TURN_USERNAME=username
NEXT_PUBLIC_TURN_CREDENTIAL=password
```

## Testing TURN Servers
Test your TURN configuration at:
- https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
- Enter your TURN server details and check connectivity

## Monitoring
Track these metrics:
- TURN server bandwidth usage
- Connection success rate
- Average latency
- Failed connection reasons

## Fallback Strategy
1. Try direct P2P connection first
2. Fall back to TURN if P2P fails
3. Show error message if TURN also fails
4. Log failures for debugging