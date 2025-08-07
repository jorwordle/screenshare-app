# 🚀 SUPER SIMPLE DEPLOYMENT GUIDE

Deploy your app in 10 minutes with Netlify (frontend) + Railway (backend)!

---

## 📋 What You'll Need:
- GitHub account (free)
- Netlify account (free) - Sign up at https://netlify.com
- Railway account (free) - Sign up at https://railway.app

---

## STEP 1: Push Your Code to GitHub

### 1.1 Create a GitHub Repository
1. Go to https://github.com/new
2. Name it: `screenshare-app`
3. Make it **Public**
4. Click **"Create repository"**

### 1.2 Push Your Code
Open terminal in your project folder and run:
```bash
git remote add origin https://github.com/YOUR_USERNAME/screenshare-app.git
git branch -M main
git push -u origin main
```

✅ **Done!** Your code is now on GitHub.

---

## STEP 2: Deploy Backend to Railway (5 minutes)

### 2.1 Create Railway Project
1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select your `screenshare-app` repository

### 2.2 Configure the Backend Service
1. Railway will create a service automatically
2. Click on the service card
3. Go to **Settings** tab
4. Change these settings:
   - **Root Directory**: `/server` (type this in the field)
   - **Start Command**: `node index.js`
   
### 2.3 Get Your Backend URL
1. Go to **Settings** tab
2. Under **Domains**, click **"Generate Domain"**
3. Copy this URL! (It looks like: `https://something.up.railway.app`)
4. Save it in notepad - you'll need it soon!

✅ **Backend Deployed!** Test it by visiting: `https://YOUR-BACKEND-URL.up.railway.app/health`

---

## STEP 3: Deploy Frontend to Netlify (5 minutes)

### 3.1 Import Your Project
1. Go to https://app.netlify.com/start
2. Click **"Import from Git"**
3. Choose **GitHub**
4. Select your `screenshare-app` repository

### 3.2 Configure Build Settings
Netlify will auto-detect Next.js. Just verify these settings:
- **Build command**: `npm run build`
- **Publish directory**: `.next`

**DON'T CLICK DEPLOY YET!**

### 3.3 Add Environment Variable
1. Click **"Show advanced"**
2. Click **"New variable"**
3. Add:
   - **Key**: `NEXT_PUBLIC_SERVER_URL`
   - **Value**: Your Railway backend URL from Step 2.3
   
Example:
```
NEXT_PUBLIC_SERVER_URL = https://screenshare-app-production.up.railway.app
```

### 3.4 Deploy
Click **"Deploy site"**

Wait 2-3 minutes for deployment...

✅ **Frontend Deployed!** Netlify will give you a URL like: `https://amazing-app-123.netlify.app`

---

## STEP 4: Final Configuration (2 minutes)

### 4.1 Update Railway Backend
1. Go back to Railway
2. Click on your service
3. Go to **Variables** tab
4. Click **"New Variable"**
5. Add:
   - **Variable name**: `CLIENT_URL`
   - **Value**: Your Netlify URL (e.g., `https://amazing-app-123.netlify.app`)

Railway will automatically redeploy.

---

## 🎉 YOU'RE DONE!

### Test Your App:
1. Open your Netlify URL in Chrome
2. Enter your name and create a room
3. Open the same URL in another browser/tab
4. Enter a different name and join with the room code
5. Click "Share Screen" and start chatting!

### Your URLs:
- **Your App**: `https://your-app.netlify.app`
- **Backend Health Check**: `https://your-backend.up.railway.app/health`

---

## 🆓 Cost Breakdown:
- **Netlify**: FREE (100GB bandwidth/month)
- **Railway**: FREE ($5 credit, enough for ~2 months)
- **Total**: $0 for first 2 months!

---

## 🔧 Troubleshooting:

### "Cannot connect to server"
- Check that `NEXT_PUBLIC_SERVER_URL` in Netlify starts with `https://` not `http://`
- Make sure Railway backend is running (green status)

### "Screen share not working"
- Chrome/Edge work best
- Must be on HTTPS (which Netlify provides automatically)

### "Connection failed"
- Check Railway logs: Dashboard → Your Service → Logs
- Check browser console: F12 → Console tab

---

## 📱 Share With Friends:
Just share your Netlify URL! Anyone can join by:
1. Going to your URL
2. Entering their name
3. Creating or joining a room

---

## 🎨 Custom Domain (Optional):
Want `screenshare.com` instead of `app.netlify.app`?

**On Netlify:**
1. Go to **Domain Settings**
2. Click **"Add custom domain"**
3. Follow the DNS instructions

---

## 🚦 Quick Commands Cheatsheet:

### Check if everything is working:
```bash
# Test backend
curl https://YOUR-BACKEND.up.railway.app/health

# Should return: {"status":"ok","rooms":0}
```

### Update your code:
```bash
git add .
git commit -m "Update"
git push

# Both Netlify and Railway auto-deploy on push!
```

---

## 📞 Need Help?

1. **Netlify Support**: https://answers.netlify.com/
2. **Railway Support**: https://help.railway.app/
3. **Check logs**: 
   - Netlify: Deploys tab → Click on deploy → View logs
   - Railway: Dashboard → Your service → Logs tab

---

That's it! Your app is live and ready to use! 🎉