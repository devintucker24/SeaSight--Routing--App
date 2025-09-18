#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Emscripten is available
check_emsdk() {
    if ! command -v emcmake &> /dev/null; then
        print_warning "Emscripten SDK not found in PATH. Sourcing environment..."
        if [ -f "./emsdk/emsdk_env.sh" ]; then
            source ./emsdk/emsdk_env.sh
            print_success "Emscripten SDK environment sourced"
        else
            print_error "Emscripten SDK not found. Run: ./tools/ci/setup-emsdk.sh"
            exit 1
        fi
    else
        print_success "Emscripten SDK found in PATH"
    fi
}

# Clean build artifacts
clean_build() {
    print_status "Cleaning build artifacts..."
    rm -rf packages/router-core/build
    rm -rf packages/router-wasm/dist
    print_success "Build artifacts cleaned"
}

# Build the WASM router
build_router() {
    print_status "Building WASM router..."
    
    # Create build directory
    mkdir -p packages/router-core/build
    
    # Configure with CMake
    emcmake cmake -S packages/router-core/src -B packages/router-core/build
    
    # Build
    cmake --build packages/router-core/build
    
    print_success "WASM router built successfully"
}

# Copy artifacts to router-wasm package
copy_artifacts() {
    print_status "Copying WASM artifacts..."
    
    # Create dist directory
    mkdir -p packages/router-wasm/dist
    
    # Copy built files
    cp packages/router-core/build/SeaSightRouter.js packages/router-wasm/dist/
    cp packages/router-core/build/SeaSightRouter.wasm packages/router-wasm/dist/
    cp packages/router-wasm/src/SeaSightRouter.d.ts packages/router-wasm/dist/
    
    print_success "WASM artifacts copied to router-wasm package"
}

# Install dependencies
install_deps() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Main build function
main() {
    local clean=false
    local router_only=false
    local install=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean)
                clean=true
                shift
                ;;
            --router-only)
                router_only=true
                shift
                ;;
            --install)
                install=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --clean        Clean build artifacts before building"
                echo "  --router-only  Only build the WASM router (skip npm install)"
                echo "  --install      Install dependencies before building"
                echo "  -h, --help     Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    print_status "Starting SeaSight build process..."
    
    # Check Emscripten SDK
    check_emsdk
    
    # Clean if requested
    if [ "$clean" = true ]; then
        clean_build
    fi
    
    # Install dependencies if requested
    if [ "$install" = true ] && [ "$router_only" = false ]; then
        install_deps
    fi
    
    # Build router
    build_router
    copy_artifacts
    
    print_success "Build completed successfully! 🚀"
    
    if [ "$router_only" = false ]; then
        print_status "You can now run: npm run dev"
    fi
}

# Run main function with all arguments
main "$@"
