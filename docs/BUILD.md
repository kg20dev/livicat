# Building Livicat for Production

This guide covers how to build Livicat locally for production deployment across all supported platforms (Windows, macOS, Linux).

## Prerequisites

### Required

- **Node.js** (v20+): https://nodejs.org/
- **npm** (comes with Node.js)
- **Rust**: https://rustup.rs/

### Platform-Specific Requirements

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`
- For Apple Silicon builds: macOS 11 (Big Sur) or later

**Windows:**
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) with C++ workload
- [WiX Toolset](https://wixtoolset.org/) (for MSI installer - optional, Tauri includes NSIS by default)

**Linux:**
- GTK3, libwebkit2gtk, and other build dependencies:
  ```bash
  sudo apt update
  sudo apt install -y libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
  ```

## Setup

```bash
# Clone the repository
git clone https://github.com/kg20dev/livicat.git
cd livicat

# Install dependencies
npm install
```

## Build Commands

### Quick Build (Your Current Platform)

```bash
npm run tauri:build
```

This creates a production-optimized build with the installer package for your current platform.

### Platform-Specific Builds

**macOS (Apple Silicon):**
```bash
npm run tauri:build:mac
```

**Cross-Platform Compilation:**
```bash
# Windows (from any platform)
npm run tauri:build -- --target x86_64-pc-windows-msvc

# macOS Intel (from macOS)
npm run tauri:build -- --target x86_64-apple-darwin

# macOS Apple Silicon (from macOS)
npm run tauri:build -- --target aarch64-apple-darwin

# Linux x64 (from Linux)
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```

> **Note**: Cross-platform compilation requires platform-specific toolchains. It's recommended to build on the target platform.

## Build Output

After running `npm run tauri:build`, the artifacts are located in:

```
src-tauri/target/release/bundle/
```

### Output by Platform

**macOS:**
```
src-tauri/target/release/bundle/
├── dmg/
│   └── Livicat_<version>_aarch64.dmg      # Disk image installer
└── macos/
    └── Livicat.app                         # Application bundle
```

**Windows:**
```
src-tauri/target/release/bundle/
├── msi/
│   └── Livicat_<version>_x64_en-US.msi     # MSI installer
└── nsis/
    └── Livicat_<version>_x64-setup.exe     # NSIS installer
```

**Linux:**
```
src-tauri/target/release/bundle/
├── deb/
│   └── livicat_<version>_amd64.deb         # Debian package
└── appimage/
    └── livicat_<version>_amd64.AppImage    # AppImage
```

## Complete Build Process

For a clean production build:

```bash
# 1. Clean previous builds
rm -rf dist/ src-tauri/target/release/

# 2. Type check TypeScript
npm run type-check

# 3. Lint code
npm run lint

# 4. Build frontend (production bundle)
npm run build

# 5. Build Tauri application
npm run tauri:build

# 6. Find your installer
ls -lh src-tauri/target/release/bundle/
```

## Development vs Production

**Development (with hot reload):**
```bash
npm run tauri:dev
```
- Uses Vite dev server
- Hot module replacement
- Fast iteration
- Not optimized

**Production (optimized build):**
```bash
npm run tauri:build
```
- Minified and optimized assets
- Single binary/installer
- Best performance
- Ready for distribution

## Testing the Build

Before distributing, test the built application:

**macOS:**
```bash
open src-tauri/target/release/bundle/macos/Livicat.app
```

**Windows:**
```bash
./src-tauri/target/release/Livicat.exe
# Or install and run the MSI/EXE
```

**Linux:**
```bash
./src-tauri/target/release/livicat
# Or install the DEB package
sudo dpkg -i src-tauri/target/release/bundle/deb/livicat_*.deb
```

## Building for Release

When preparing a release:

```bash
# 1. Bump version and update changelog
npm run release:patch  # or release:minor, release:major

# 2. Build production artifacts
npm run tauri:build

# 3. Test the installers
# Run the generated .dmg/.exe/.msi file

# 4. Commit and push
git add .
git commit -m "chore(release): vX.X.X"
git push
```

## CI/CD Builds

The project uses GitHub Actions for automated builds. See [`.github/workflows/build-tauri.yml`](.github/workflows/build-tauri.yml) for the complete CI/CD configuration.

**To trigger a release build:**
1. Push to the `release/app` branch
2. The workflow automatically:
   - Builds for macOS (Apple Silicon) and Windows (x64)
   - Runs tests and linting
   - Creates a GitHub release with installers attached

## Troubleshooting

### "Rust not found"

Install Rust: https://rustup.rs/

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### "cargo-tauri not found"

Install the Tauri CLI:

```bash
cargo install tauri-cli --version "^2"
```

### Build fails on macOS

Install Xcode Command Line Tools:

```bash
xcode-select --install
```

### Build fails on Windows

1. Install [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
2. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) with the "C++ build tools" workload

### Build fails on Linux

Install required dependencies:

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### "error: linker `aarch64-linux-gnu-gcc` not found"

When cross-compiling for Linux ARM64, install the cross-compiler:

```bash
sudo apt install gcc-aarch64-linux-gnu
```

## Environment Variables

For production builds with analytics:

```bash
# Set Aptabase analytics key (required for production builds)
export APTABASE_APP_KEY="your-app-key"

# Or create a .env file:
echo "APTABASE_APP_KEY=your-app-key" > .env

# Then build:
npm run tauri:build
```

> **Warning**: Never commit `.env` files to the repository. They are git-ignored.

## Build Optimization

The build process is already optimized for production:

- **Frontend**: Vite creates minified, tree-shaken bundles
- **Backend**: Rust is compiled with `--release` optimizations
- **Size**: Tauri produces ~8MB binaries (vs ~115MB Electron)

To reduce size further:

```bash
# Strip debug symbols (Cargo.toml)
[profile.release]
strip = true
```

## Further Reading

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [Rust Release Profiles](https://doc.rust-lang.org/cargo/reference/profiles.html)

## Support

If you encounter issues building Livicat:

1. Check [existing issues](https://github.com/kg20dev/livicat/issues)
2. Search [discussions](https://github.com/kg20dev/livicat/discussions)
3. [Open a new issue](https://github.com/kg20dev/livicat/issues/new) with:
   - Your platform and OS version
   - Build command used
   - Complete error message
