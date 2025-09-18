# SeaSight Quick Reference

## 🚀 Essential Commands

### Daily Development
```bash
npm run dev                    # Start development server
npm run build:router          # Rebuild WASM router (after C++ changes)
```

### When Things Break
```bash
npm run build:clean           # Clean build + fresh dependencies
npm run clean                 # Remove all build artifacts
```

### First Time Setup
```bash
npm run setup:emsdk          # Install Emscripten SDK
npm run build:full           # Complete clean build
```

## 🔧 Build System

| What Changed | Command | Frequency |
|--------------|---------|-----------|
| React/TypeScript/CSS | Nothing needed | Never |
| Router C++ code | `npm run build:router` | Every time |
| Dependencies | `npm run build:clean` | When needed |
| First setup | `npm run build:full` | Once |

## 🐛 Common Issues

| Error | Solution |
|-------|----------|
| `emcmake: command not found` | `source ./emsdk/emsdk_env.sh` |
| CSS import errors | `npm run build:clean` |
| Router not updating | `npm run build:router` |
| Build fails | `npm run clean && npm run build:full` |

## 📁 Key Files

| File | Purpose |
|------|---------|
| `scripts/build.sh` | Automated build script |
| `apps/web/src/App.tsx` | Main React application |
| `packages/router-core/src/` | C++ router source |
| `packages/router-wasm/dist/` | Built WASM artifacts |
| `docs/DEVELOPER_GUIDE.md` | Complete developer guide |

## 🎯 Development Workflow

1. **Start development**: `npm run dev`
2. **Make changes**: Edit React/TypeScript files
3. **Test changes**: Browser auto-reloads
4. **C++ changes**: Run `npm run build:router`
5. **Refresh browser**: See C++ changes

## 📞 Need Help?

- **Check**: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
- **Search**: Existing GitHub issues
- **Ask**: Team chat for quick questions
- **Report**: Create issue for bugs

---

**Happy coding! 🚀**
