# One-Click Railway Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/deploy?template=https://github.com/YOUR_USERNAME/screenshare-app)

## Manual Setup After Deploy:

1. **After clicking deploy**, Railway will create two services automatically
2. **Configure URLs**: 
   - Wait for both services to deploy
   - Copy the signaling server URL
   - Go to frontend service → Variables
   - Update `NEXT_PUBLIC_SERVER_URL` with signaling server URL
   - Copy the frontend URL  
   - Go to signaling service → Variables
   - Update `CLIENT_URL` with frontend URL

3. **Redeploy both services** to apply the new environment variables

## Service URLs Format:
- Frontend: `https://[project-name]-frontend.up.railway.app`
- Signaling: `https://[project-name]-signaling.up.railway.app`