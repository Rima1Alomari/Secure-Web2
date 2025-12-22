# Troubleshooting Guide - Connection Refused Error

## Step-by-Step Fix

### Step 1: Check if servers are already running

Open Terminal and run:
```bash
# Check if server is running on port 5001
lsof -i :5001

# Check if client is running on port 3000
lsof -i :3000
```

If you see processes, kill them:
```bash
# Kill server
lsof -ti:5001 | xargs kill -9

# Kill client
lsof -ti:3000 | xargs kill -9
```

### Step 2: Verify Node.js is installed

```bash
node --version
npm --version
```

Should show v18+ for Node.js. If not, install Node.js from nodejs.org

### Step 3: Check dependencies

```bash
cd /Users/rimaalomari/Desktop/Secure-Web2/server
ls node_modules | head -5
```

If node_modules is empty or missing, install:
```bash
cd /Users/rimaalomari/Desktop/Secure-Web2/server
npm install
```

### Step 4: Check MongoDB (Server needs this)

```bash
# Check if MongoDB is running
mongod --version

# Or check if MongoDB service is running
brew services list | grep mongodb
```

If MongoDB is not running:
```bash
# Start MongoDB (macOS with Homebrew)
brew services start mongodb-community

# Or start manually
mongod --dbpath ~/data/db
```

**Note:** The server will start even if MongoDB is not connected, but login won't work.

### Step 5: Start the Server

**Option A: Start both together (Recommended)**
```bash
cd /Users/rimaalomari/Desktop/Secure-Web2
npm run dev
```

**Option B: Start separately**

Terminal 1 - Server:
```bash
cd /Users/rimaalomari/Desktop/Secure-Web2/server
npm run dev
```

You should see:
```
🔧 Environment Configuration:
   - NODE_ENV: development
   - PORT: 5001
✅ MongoDB connected successfully
Secure Web server running on port 5001
```

Terminal 2 - Client:
```bash
cd /Users/rimaalomari/Desktop/Secure-Web2/client
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

### Step 6: Test the Connection

1. Wait 5-10 seconds for both servers to fully start
2. Open your browser
3. Go to: http://localhost:3000
4. You should see the login page

### Common Issues and Solutions

#### Issue 1: "Cannot find module"
**Solution:**
```bash
cd /Users/rimaalomari/Desktop/Secure-Web2
npm run install-all
```

#### Issue 2: "Port already in use"
**Solution:**
```bash
# Find and kill the process
lsof -ti:5001 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

#### Issue 3: "MongoDB connection error"
**Solution:**
- MongoDB is optional for the server to start
- But login/registration won't work without it
- Start MongoDB or ignore the error if you're just testing UI

#### Issue 4: "EADDRINUSE: address already in use"
**Solution:**
```bash
# Find what's using the port
lsof -i :5001
lsof -i :3000

# Kill it
kill -9 <PID>
```

#### Issue 5: Server starts but browser shows connection refused
**Solution:**
1. Make sure BOTH servers are running (check both terminals)
2. Wait a few more seconds
3. Try http://127.0.0.1:3000 instead of localhost:3000
4. Clear browser cache and try again

### Quick Test Commands

Test if server is responding:
```bash
curl http://localhost:5001/api/auth/users
```

Test if client is responding:
```bash
curl http://localhost:3000
```

### Still Not Working?

1. **Check server logs** - Look at the terminal where you ran `npm run dev`
   - Look for error messages
   - Check if it says "server running on port 5001"

2. **Check browser console** (F12 → Console tab)
   - Look for error messages
   - Check Network tab to see if requests are failing

3. **Verify .env file exists:**
   ```bash
   ls -la /Users/rimaalomari/Desktop/Secure-Web2/server/.env
   ```

4. **Try starting with verbose logging:**
   ```bash
   cd /Users/rimaalomari/Desktop/Secure-Web2/server
   NODE_ENV=development DEBUG=* node index.js
   ```

### Expected Output When Working

**Server Terminal:**
```
🔧 Environment Configuration:
   - NODE_ENV: development
   - PORT: 5001
   - OPENAI_API_KEY: ✅ Set
   - MONGODB_URI: ✅ Set
✅ MongoDB connected successfully
   Database: cybrany
Secure Web server running on port 5001
High Security Mode: enabled
```

**Client Terminal:**
```
VITE v5.x.x  ready in 1234 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

**Browser:**
- Should show login page at http://localhost:3000
- No connection errors
- Can see the login form

