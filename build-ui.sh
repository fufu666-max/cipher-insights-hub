#!/bin/bash
echo "Starting UI build process..."
cd ui || exit 1
echo "Installing dependencies..."
npm install || exit 1
echo "Building UI..."
npm run build || exit 1
echo "Build completed successfully"
