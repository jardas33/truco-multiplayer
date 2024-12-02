#!/bin/bash
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la
echo "Starting server..."
node "$(pwd)/src/app.js" 