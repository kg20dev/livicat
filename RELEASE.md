# Release Workflow

## Automated Releases (Recommended)

```bash
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Create release branch
git checkout -b release/app

# 3. Push to GitHub
git push -u origin release/app

# 4. Watch GitHub Actions build
# 5. Find release at: https://github.com/kg20dev/livicat/releases
```

### What Happens Automatically

1. GitHub Actions detects push to `release/**`
2. Builds macOS (Apple Silicon) Tauri app
3. Creates GitHub Release with version tag
4. Attaches DMG installer
5. Generates release notes from commits

### Downloading Releases

Visit [GitHub Releases](https://github.com/kg20dev/livicat/releases) to download:
- **macOS Apple Silicon**: `Livicat_<version>_aarch64.dmg` (~5 MB)
- **Windows x64**: `Livicat_<version>_x64-setup.exe` (~3 MB) or `Livicat_<version>_x64_en-US.msi` (~4 MB)

# Building Tauri Apps

### Local Testing

```bash
# Build for macOS Apple Silicon (current Mac)
npm run tauri:build:mac

# Build for current platform (auto-detected)
npm run tauri:build
```

Builds appear in `src-tauri/target/<arch>/release/bundle/`.

### Adding More Platforms

To build for additional platforms (e.g., x86_64 macOS, Windows):

```bash
# Add target
rustup target add x86_64-apple-darwin

# Build
npm run tauri:build -- --target x86_64-apple-darwin
```

See the [Tauri build docs](https://v2.tauri.app/distribute/) for more options.
