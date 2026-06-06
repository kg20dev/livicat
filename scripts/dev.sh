#!/bin/bash

# Development Runner Script for Livicat Electron App

set -e

echo -e "\033[0;34m========================================\033[0m"
echo -e "\033[0;34m  Livicat Development Mode\033[0m"
echo -e "\033[0;34m========================================\033[0m"
echo ""

# Check if dev server is needed
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "\033[0;33mStarting dev server...\033[0m"
    npm run dev &
    DEV_SERVER_PID=$!
    
    echo -e "\033[0;32mWaiting for dev server to start...\033[0m"
    
    # Wait for server to be ready
    MAX_WAIT=30
    WAIT_TIME=0
    while ! curl -s http://localhost:3000 > /dev/null; do
        if [ $WAIT_TIME -ge $MAX_WAIT ]; then
            echo -e "\033[0;31mError: Dev server failed to start\033[0m"
            exit 1
        fi
        sleep 1
        WAIT_TIME=$((WAIT_TIME + 1))
        echo -n "."
    done
    echo ""
    
    echo -e "\033[0;32m✓ Dev server ready!\033[0m"
else
    echo -e "\033[0;32m✓ Dev server already running\033[0m"
fi

echo ""
echo -e "\033[0;34mStarting Electron app...\033[0m"
npm run electron

# Cleanup
if [ ! -z "$DEV_SERVER_PID" ]; then
    echo ""
    echo -e "\033[0;33mStopping dev server...\033[0m"
    kill $DEV_SERVER_PID 2>/dev/null || true
fi
