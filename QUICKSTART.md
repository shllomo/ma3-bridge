# MA3 Bridge - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### 1. Start MA3 onPC
- Launch GrandMA3 onPC
- Go to: **Menu → System → MA Network Control**
- Enable **"OSC"** checkbox
- Set OSC Port to **8000**
- Click **Apply**

### 2. Start the Bridge
**Option A: Double-click `start-bridge.bat`**

**Option B: Manual start**
```bash
cd ma3-bridge-local
npm start
```

You should see:
```
✅ Bridge running on http://localhost:3001
🎮 MA3 OSC target: 127.0.0.1:8000
```

### 3. Test in Vercel App
- Open your Vercel AI app (http://localhost:3000)
- Generate a Lua script
- Click **"Test on MA3"** button
- Check MA3's Command Line window for output

## 📊 Status Indicators

**In Vercel App (bottom right):**
- 🟢 **Bridge Connected** - Ready to test scripts
- 🔴 **Bridge Offline** - Start the bridge service

**In Script Code Blocks:**
- **Test on MA3** - Bridge is running, click to test
- **Bridge Offline** - Bridge needs to be started

## 🔧 Troubleshooting

### Bridge won't start
- Check if Node.js is installed: `node --version`
- Port 3001 might be in use

### Can't connect to MA3
- Verify MA3 onPC is running
- Check OSC is enabled (port 8000)
- Windows Firewall might be blocking

### Scripts not working
- Check MA3 Command Line window
- Look for syntax errors in the script

## 📝 Test Script
Try this simple test:
```lua
Printf("Hello from MA3 Bridge!")
Echo("Test successful")
```

## 🛠️ Configuration
Edit environment variables in `.env` file (copy from `env.example`)

## Need Help?
1. Check bridge console for errors
2. Verify MA3 settings
3. Test connection: `npm test`