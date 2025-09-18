#!/bin/bash

# SeaSight Emscripten SDK Setup Script
# This script downloads and installs a specific version of the Emscripten SDK

set -e

EMSDK_VERSION="3.1.50"
EMSDK_DIR="emsdk"
INSTALL_DIR="$(pwd)/$EMSDK_DIR"

echo "🌊 SeaSight Emscripten SDK Setup"
echo "================================="
echo "Installing Emscripten SDK version $EMSDK_VERSION"

# Check if emsdk directory already exists
if [ -d "$EMSDK_DIR" ]; then
    echo "⚠️  Emscripten SDK directory already exists at $EMSDK_DIR"
    echo "   Removing existing installation..."
    rm -rf "$EMSDK_DIR"
fi

# Clone emsdk repository
echo "📥 Cloning emsdk repository..."
git clone https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"

# Navigate to emsdk directory
cd "$EMSDK_DIR"

# Install specific version
echo "🔧 Installing Emscripten SDK $EMSDK_VERSION..."
./emsdk install $EMSDK_VERSION
./emsdk activate $EMSDK_VERSION

# Set up environment
echo "⚙️  Setting up environment..."
source ./emsdk_env.sh

echo "✅ Emscripten SDK installation complete!"
echo "📁 Installation directory: $INSTALL_DIR"
echo ""
echo "🔧 To use the SDK in your current shell, run:"
echo "   source $INSTALL_DIR/emsdk_env.sh"
echo ""
echo "🚀 You can now build the router with:"
echo "   cd packages/router-core/src"
echo "   emcmake cmake ."
echo "   emmake make"
