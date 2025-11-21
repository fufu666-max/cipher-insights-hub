#!/bin/bash
echo "Installing UI dependencies..."
cd ui || exit 1
npm install || exit 1
echo "Dependencies installed successfully"
