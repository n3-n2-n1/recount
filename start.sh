#!/bin/bash

# Script to ensure correct Node.js version for the project
echo "Setting up correct Node.js version..."

# Load nvm
source ~/.nvm/nvm.sh

# Use the specified Node.js version
nvm use

# Export the correct PATH
export PATH="$NVM_BIN:$PATH"

echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Change to frontend directory and install dependencies if needed
if [ -d "frontend" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    echo "Frontend dependencies installed successfully!"
fi

# Change to backend directory and install dependencies if needed
if [ -d "backend" ]; then
    echo "Installing backend dependencies..."
    cd ../backend
    npm install
    echo "Backend dependencies installed successfully!"
fi

echo "Setup complete! You can now run your project."