# ⚡ QUICK START - Deploy in 10 Minutes!

## Option 1: One-Click Deploy (Easiest!)

### Deploy Frontend to Netlify:
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/screenshare-app)

### Deploy Backend to Railway:
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/YOUR_USERNAME/screenshare-app)

After deploying both:
1. Copy your Railway backend URL
2. In Netlify: Settings → Environment → Edit Variables
3. Set `NEXT_PUBLIC_SERVER_URL` = your Railway URL
4. Redeploy Netlify site

---

## Option 2: Step-by-Step (5 steps)

### 1️⃣ Fork This Repo
Click "Fork" button on GitHub

### 2️⃣ Deploy Backend to Railway
```
1. Go to: https://railway.app/new
2. Connect GitHub → Select your fork
3. Settings → Root Directory: /server
4. Settings → Generate Domain
5. Copy the URL!
```

### 3️⃣ Deploy Frontend to Netlify  
```
1. Go to: https://app.netlify.com/start
2. Import from Git → GitHub → Select your fork
3. Show advanced → Add variable:
   NEXT_PUBLIC_SERVER_URL = [Railway URL from step 2]
4. Deploy site
```

### 4️⃣ Final Setup
```
1. Go back to Railway
2. Variables → Add:
   CLIENT_URL = [Your Netlify URL]
```

### 5️⃣ Done! 
Visit your Netlify URL and start sharing!

---

## Test Links:
- Frontend: `https://[your-app].netlify.app`
- Backend Health: `https://[your-backend].up.railway.app/health`

---

## Costs:
- **First 2 months**: FREE
- **After that**: ~$5/month (Railway only, Netlify stays free)