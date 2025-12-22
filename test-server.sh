#!/bin/bash

echo "=== Testing Server Startup ==="
cd /Users/rimaalomari/Desktop/Secure-Web2/server

echo "Checking Node.js..."
node --version

echo "Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
    if [ -f "node_modules/express/package.json" ]; then
        echo "✅ Express installed"
    else
        echo "❌ Express not found"
    fi
else
    echo "❌ node_modules missing"
fi

echo ""
echo "Attempting to start server..."
echo "Press Ctrl+C after 3 seconds to stop..."
node index.js &
SERVER_PID=$!
sleep 3
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "=== Server test complete ==="

