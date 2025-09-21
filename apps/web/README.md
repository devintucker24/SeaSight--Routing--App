# SeaSight Web Application

A professional-grade maritime routing Progressive Web App built with React, TypeScript, and WebAssembly. This is the frontend application for the SeaSight Maritime Routing System.

For comprehensive information about the project, including architecture, development guide, and router details, please refer to the main [project documentation](../../docs/README.md).

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git LFS (for large data files)
- Emscripten SDK (for building router)

### First Time Setup

1. **From project root, set up everything:**
   ```bash
   npm run setup:emsdk
   npm run build:full
   ```

2. **Start development:**
   ```bash
   npm run dev
   ```

### Daily Development

```bash
# Start development server (most common)
npm run dev

# Rebuild router after C++ changes
npm run build:router

# Clean build when things break
npm run build:clean
```

> **📖 For detailed development instructions, see [DEVELOPER_GUIDE.md](../../docs/DEVELOPER_GUIDE.md)**