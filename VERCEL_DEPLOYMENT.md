# Vercel Deployment Guide for Sally Dashboard

## 🚀 Quick Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from your project directory**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? **Yes**
   - Which scope? **Your account**
   - Link to existing project? **No**
   - Project name: **sally-dashboard** (or your preferred name)
   - In which directory is your code located? **./** (current directory)

### Option 2: Deploy via Vercel Dashboard

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign in

3. **Click "New Project"**

4. **Import your GitHub repository**

5. **Configure the project**:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

## 🔧 Environment Variables Setup

### Required Environment Variables in Vercel Dashboard:

1. Go to your project settings in Vercel
2. Navigate to **Environment Variables**
3. Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://fjxfsaookhadepmcuzok.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeGZzYW9va2hhZGVwbWN1em9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTM1MDgsImV4cCI6MjA3MjgyOTUwOH0.RrUyUkTNhgF13pTL5orFxQvUsOgdq9s9MXLrkxXpFlk
NEXT_PUBLIC_DISCO_API_URL = https://sallydisco-1027340211739.asia-southeast1.run.app
```

## 📋 Pre-Deployment Checklist

- ✅ Next.js config fixed for Vercel (no static export)
- ✅ All DISCO endpoints updated to use deployed API
- ✅ Build tested locally and successful
- ✅ Environment variables configured
- ✅ Vercel configuration file created

## 🌐 What Will Work After Deployment

- ✅ **Main Dashboard** - Full functionality
- ✅ **Call Management** - Create, edit, delete calls
- ✅ **DISCO Analysis** - Real-time analysis via deployed API
- ✅ **File Management** - Upload and manage documents
- ✅ **User Authentication** - Supabase integration
- ✅ **Responsive Design** - Works on all devices

## ⚠️ What Won't Work (Expected Limitations)

- ❌ **Real-time Transcription** - Requires local transcription server
- ❌ **Electron Features** - Desktop-specific functionality
- ❌ **Local File System Access** - Browser security limitations

## 🔄 Deployment Commands

```bash
# Build for web deployment (Vercel)
npm run build

# Build for Electron (if needed later)
npm run build:electron

# Deploy to Vercel
vercel

# Deploy with production environment
vercel --prod
```

## 📊 Post-Deployment

1. **Test your deployed application**:
   - Visit the Vercel URL provided after deployment
   - Test DISCO analysis functionality
   - Verify Supabase integration
   - Check responsive design

2. **Monitor performance**:
   - Check Vercel dashboard for build logs
   - Monitor function execution times
   - Review any error logs

## 🛠️ Troubleshooting

### Build Errors:
- Check that all environment variables are set
- Verify `next.config.mjs` doesn't have static export for web builds
- Ensure all dependencies are in `package.json`

### Runtime Errors:
- Check browser console for errors
- Verify DISCO API endpoint is accessible
- Confirm Supabase connection

### Performance Issues:
- Check Vercel function limits
- Monitor API response times
- Consider optimizing large components

## 📝 Notes

- Your DISCO analysis API is already deployed and working
- The web version will have full functionality except for real-time transcription
- For full functionality including transcription, users need the Electron desktop app
- Vercel provides automatic HTTPS and global CDN distribution
