# Quick Start Guide - Fix Connection Refused Error

## The Problem
You're seeing `ERR_CONNECTION_REFUSED` because the servers aren't running.

## Solution: Start Both Servers

### Option 1: Start Both at Once (Recommended)

Open a terminal in the project root and run:
```bash
cd /Users/rimaalomari/Desktop/Secure-Web2
npm run dev
```

This will start both the server (port 5001) and client (port 3000) simultaneously.

### Option 2: Start Separately

**Terminal 1 - Start Backend Server:**
```bash
cd /Users/rimaalomari/Desktop/Secure-Web2/server
npm run dev
```

You should see:
```
Secure Web server running on port 5001
```

**Terminal 2 - Start Frontend Client:**
```bash
cd /Users/rimaalomari/Desktop/Secure-Web2/client
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

## Verify Servers Are Running

1. **Check Server (Port 5001):**
   ```bash
   lsof -i :5001
   ```
   Should show a node process

2. **Check Client (Port 3000):**
   ```bash
   lsof -i :3000
   ```
   Should show a node process

## Access the Application

Once both servers are running:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5001/api

## Troubleshooting

### If MongoDB connection fails:
- Make sure MongoDB is running:
  ```bash
  mongod --version
  ```
- Or start MongoDB:
  ```bash
  brew services start mongodb-community  # macOS
  # or
  sudo systemctl start mongod  # Linux
  ```

### If ports are already in use:
- Kill the process using the port:
  ```bash
  lsof -ti:5001 | xargs kill -9  # Kill server
  lsof -ti:3000 | xargs kill -9  # Kill client
  ```

### If you see dependency errors:
```bash
cd /Users/rimaalomari/Desktop/Secure-Web2
npm run install-all
```

## What to Expect

After starting, you should be able to:
1. Open http://localhost:3000 in your browser
2. See the login page
3. Log in or register a new account
4. Use all features without connection errors

