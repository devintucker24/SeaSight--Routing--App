# SeaSight Developer Guide

This guide provides comprehensive instructions for developers working on the SeaSight Routing Application.

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Build System](#build-system)
- [When to Rebuild](#when-to-rebuild)
- [Troubleshooting](#troubleshooting)
- [Environment Setup](#environment-setup)

## Quick Start

### First Time Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SeaSight-Routing-App
   ```

2. **Set up Emscripten SDK**
   ```bash
   npm run setup:emsdk
   ```

3. **Install dependencies and build**
   ```bash
   npm run build:full
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Daily Development

For most development work, you only need:

```bash
# Start the development server
npm run dev

# If you change router C++ code, rebuild:
npm run build:router
```

## Project Structure

```
SeaSight-Routing-App/
├── apps/
│   └── web/                    # React PWA frontend
│       ├── src/
│       │   ├── features/       # Feature-based components
│       │   ├── shared/         # Shared utilities and components
│       │   └── lib/           # Library code
│       └── package.json
├── packages/
│   └── router-wasm/           # WebAssembly router package
│       ├── dist/              # Built WASM artifacts
│       └── src/               # TypeScript definitions
├── packages/router-core/       # C++ router source code
│   └── src/                   # C++ implementation
├── scripts/
│   └── build.sh               # Automated build script
├── tools/ci/
│   └── setup-emsdk.sh         # Emscripten SDK setup
└── docs/                      # Documentation
```

## Development Workflow

### Frontend Development

1. **Make changes** to React components, TypeScript, or CSS
2. **No rebuild needed** - Vite hot reloads automatically
3. **Test in browser** at `http://localhost:5173`

### Router Development

1. **Make changes** to C++ files in `packages/router-core/src/`
2. **Rebuild the router**:
   ```bash
   npm run build:router
   ```
3. **Refresh browser** to see changes

### Full Stack Development

1. **Make changes** to both frontend and router
2. **Use the development server** (auto-reloads frontend)
3. **Rebuild router when needed**:
   ```bash
   npm run build:router
   ```

## Build System

### Available Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run dev` | Start development server | Daily development |
| `npm run build:router` | Build WASM router only | After C++ changes |
| `npm run build:clean` | Clean build + dependencies | When things break |
| `npm run build:full` | Complete clean build | First setup |
| `npm run clean` | Remove all build artifacts | Manual cleanup |
| `npm run setup:emsdk` | Install Emscripten SDK | First time only |

### Build Script Options

The `scripts/build.sh` script supports several options:

```bash
# Build router only (most common)
./scripts/build.sh --router-only

# Clean build with fresh dependencies
./scripts/build.sh --clean --install

# Show help
./scripts/build.sh --help
```

## When to Rebuild

### Always Rebuild

- **Router C++ code changes** (`packages/router-core/src/*.cpp`, `*.hpp`)
- **CMakeLists.txt changes** in router-core
- **Emscripten SDK updates**
- **First time setup** or after `npm run clean`

### Sometimes Rebuild

- **Dependency changes** that affect the router (rare)
- **Environment changes** (new machine, different OS)

### Never Rebuild

- **Frontend-only changes** (React components, CSS, TypeScript)
- **Configuration changes** (Vite config, package.json scripts)
- **Documentation changes**

## Troubleshooting

### Common Issues

#### "emcmake: command not found"

**Problem**: Emscripten SDK not in PATH

**Solution**:
```bash
# Option 1: Source the environment
source ./emsdk/emsdk_env.sh

# Option 2: Add to your shell profile (~/.zshrc)
echo 'source "/Users/devintucker/SeaSight-Routing-App/emsdk/emsdk_env.sh"' >> ~/.zshrc
```

#### "maplibregl/dist/maplibregl.css" not found

**Problem**: Dependencies not properly installed

**Solution**:
```bash
npm run build:clean
```

#### Router not updating after C++ changes

**Problem**: WASM artifacts not rebuilt

**Solution**:
```bash
npm run build:router
```

#### Build fails with CMake errors

**Problem**: Corrupted build artifacts

**Solution**:
```bash
npm run clean
npm run build:full
```

### Debug Mode

Enable verbose output for debugging:

```bash
# Verbose build
./scripts/build.sh --router-only --verbose

# Check Emscripten version
emcc --version

# Check if WASM files exist
ls -la packages/router-wasm/dist/
```

## Environment Setup

### Required Tools

- **Node.js** (v18+)
- **npm** (v8+)
- **Emscripten SDK** (v3.1.50+)
- **CMake** (v3.20+)
- **Git LFS** (for large files)

### IDE Setup

#### VS Code

Recommended extensions:
- **ES7+ React/Redux/React-Native snippets**
- **TypeScript Importer**
- **Prettier**
- **ESLint**
- **C/C++** (for router development)

#### WebStorm

- Enable TypeScript support
- Configure ESLint
- Set up file watchers for C++ files

### Shell Configuration

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# SeaSight Emscripten SDK
source "/Users/devintucker/SeaSight-Routing-App/emsdk/emsdk_env.sh"

# Optional: Add project root to PATH
export PATH="$PATH:/Users/devintucker/SeaSight-Routing-App/scripts"
```

## Performance Tips

### Development

- **Use `npm run build:router`** for quick rebuilds
- **Keep dev server running** - it hot-reloads frontend changes
- **Use browser dev tools** for debugging

### Build Optimization

- **Clean builds** when switching branches
- **Use `--router-only`** for C++ changes only
- **Monitor build times** - full builds take ~2-3 minutes

## Contributing

### Code Style

- **TypeScript**: Use strict mode, prefer interfaces over types
- **React**: Use functional components with hooks
- **C++**: Follow Google C++ style guide
- **Commits**: Use conventional commit messages

### Testing

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Pull Requests

1. **Create feature branch** from `main`
2. **Make changes** following code style
3. **Test thoroughly** - both frontend and router
4. **Update documentation** if needed
5. **Submit PR** with clear description

## Support

### Getting Help

- **Check this guide** first
- **Search existing issues** on GitHub
- **Ask in team chat** for quick questions
- **Create issue** for bugs or feature requests

### Useful Resources

- [Emscripten Documentation](https://emscripten.org/docs/)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Happy coding! 🚀**
