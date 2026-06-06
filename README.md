# Livicat — YouTube Live Chat Styling Editor

A desktop Electron app for customizing YouTube Live Chat appearance for OBS browser source overlays.

![Version](https://img.shields.io/badge/version-0.5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What It Does

Livicat is a **CSS styling tool** for YouTube Live Chat. It lets you:

- 🎨 **Customize chat appearance** — Colors, fonts, spacing, opacity, animations
- 🖥️ **Preview in real-time** — Electron popup with always-on-top window
- 📤 **Export CSS for OBS** — Download ready-to-use CSS for browser source
- ✨ **Add message animations** — 6 styles (blink, glowing, fade, slide, bounce, default)
- 🎯 **Choose from presets** — 7 themes (Default, Minimal, Compact, Large, Stream, Neon, Light, Retro)

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm

### Option 1: Download Pre-built Apps

**macOS (Intel & Apple Silicon):**
- Download the latest `.dmg` from [GitHub Releases](https://github.com/kg20dev/livicat/releases)
- Open and drag Livicat to Applications

**Windows:**
- Download the latest `.exe` from [GitHub Releases](https://github.com/kg20dev/livicat/releases)
- Run the installer

### Option 2: Build from Source

```bash
# Clone the repo
git clone https://github.com/kg20dev/livicat.git
cd livicat

# Install dependencies
npm install

# Start development server
npm run dev

# Or run Electron desktop app
npm run electron

# Build for production
npm run build
```

---

## How It Works

### Web Mode (`npm run dev`)

1. Open `http://localhost:3000`
2. **Testing Mode**: Preview your custom CSS with demo chat messages
3. **Live/Past Video**: Paste a YouTube URL to see video info and preview
4. **Export CSS**: Click "Export CSS" to download OBS-ready stylesheet

### Electron Mode (`npm run electron`)

1. The Livicat editor window opens
2. Enter a YouTube video URL and click "Open Preview"
3. A popup window appears with YouTube's live chat + your custom CSS
4. The popup stays **always-on-top** for OBS convenience
5. Use OBS **Window Capture** to capture the popup

---

## Usage

### 1. Customize Appearance

Use the **Styling Panel** (right sidebar) to adjust:

| Setting | Options |
|---------|---------|
| Preset Themes | Default, Minimal, Compact, Large, Stream, Neon, Light, Retro |
| Message Animation | Default, Blink, Glowing, Fade, Slide, Bounce |
| Animation Speed | None, Slow, Normal |
| Colors | Background, username, message, accent, scrollbar |
| Typography | 12 Google Fonts, sizes 12-24px |
| Spacing | Compact, Normal, Comfortable |
| Opacity | Message and container opacity 0-100% |
| Toggles | Avatars, timestamps, header, scroll button |

All settings auto-save to your browser.

### 2. Preview Your Chat

**Testing Mode** (no URL needed):
- See demo messages with your custom CSS
- Perfect for quick styling iterations

**Live/Past Video Mode**:
- Paste any YouTube URL
- App fetches video title, author, thumbnail
- Preview with demo messages + your CSS

**Electron Popup**:
- Opens YouTube's actual live chat in a popup
- Your CSS is injected automatically
- Always-on-top for OBS window capture

### 3. Export for OBS

1. Customize your chat appearance
2. Click **"Export CSS"** in sidebar (or press `Ctrl+Shift+E`)
3. CSS file downloads automatically

**In OBS:**
- Add **Browser Source** → URL: `https://www.youtube.com/live_chat?v=VIDEO_ID`
- Paste downloaded CSS into **"Custom CSS"** field
- Set dimensions (recommend: 400×600)

---

## Development

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run electron     # Run Electron desktop app
npm run build        # Build for production
npm test             # Run 157+ tests
npm run type-check   # TypeScript check
npm run lint         # ESLint
npm run format       # Prettier
./scripts/release.sh # Create release (builds + GitHub Release)
```

## Release Workflow

### Option 1: Using Release Script (Recommended)
```bash
./scripts/release.sh
```
The script will:
- Check git status (must be clean)
- Create `release/app` branch
- Push to GitHub
- Monitor GitHub Actions build
- Auto-create GitHub Release with installers

### Option 2: Manual Release
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
2. Builds macOS (Intel + ARM64) and Windows (x64) apps
3. Creates GitHub Release with version tag
4. Attaches DMG and EXE installers
5. Generates release notes from commits

### Downloading Releases
Visit [GitHub Releases](https://github.com/kg20dev/livicat/releases) to download:
- **macOS Intel**: `Livicat-x.x.x.dmg`
- **macOS Apple Silicon**: `Livicat-x.x.x-arm64.dmg`
- **Windows**: `Livicat Setup x.x.x.exe`

## Building Electron Apps

### Automated Releases (Recommended)

**Quick Release:**
```bash
# Run the release helper script
./scripts/release.sh
```

This will:
1. Create a `release/app` branch
2. Push to GitHub
3. Trigger automated builds for macOS + Windows
4. Create a GitHub Release with installers

**Manual Release:**
```bash
# Create and push release branch
git checkout -b release/app
git push -u origin release/app
```

GitHub Actions will automatically:
- Build macOS DMG (Intel + Apple Silicon)
- Build Windows EXE installer
- Create GitHub Release with installers attached

### Local Testing

```bash
# Build for macOS (Intel + Apple Silicon)
npm run electron:build:mac

# Build for Windows
npm run electron:build:win

# Build for current platform only
npm run electron:build
```

Builds appear in the `release/` folder.

---

## Project Structure

```
src/
├── components/
│   ├── chat/               # Chat preview components
│   ├── layout/             # Sidebar, styling panel, preview area
│   └── ui/                 # Reusable UI components
├── hooks/
│   ├── useChatSettings.ts  # Settings persistence + CSS generation
│   └── useElectronPreview.ts # Electron window management
├── utils/
│   ├── cssGenerator.ts     # Converts settings to CSS
│   ├── cssExport.ts        # OBS export utilities
│   ├── fonts.ts            # Google Fonts integration
│   └── youtubeMetadata.ts  # Video metadata (oEmbed API)
electron/
├── main.cjs                # Electron main process
└── preload.cjs             # IPC bridge
```

---

## How It Works (Technical)

- **CSS Generation**: Your settings → CSS variables → YouTube chat selectors
- **Electron Injection**: Popup loads YouTube chat → CSS injected via `executeJavaScript`
- **oEmbed API**: Fetches video metadata without API key (public endpoint)
- **No YouTube Data API**: Uses native YouTube chat, not custom message polling

---

## Features

### ✅ Implemented (v0.5.0)

- ✅ Electron desktop app with always-on-top popup
- ✅ 7 preset themes + full customization
- ✅ 6 message animation styles
- ✅ CSS export for OBS browser source
- ✅ Google Fonts integration (12 fonts)
- ✅ Real-time preview (demo + Electron)
- ✅ Video metadata fetch (oEmbed API)
- ✅ Settings persistence (localStorage)
- ✅ Keyboard shortcut (`Ctrl+Shift+E` to export)

### 🚧 Planned

- [ ] Custom theme import/export
- [ ] Dark/light mode toggle
- [ ] More animation styles
- [ ] Chat replay support for VODs

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Electron won't open** | Run `npm install` to ensure dependencies |
| **Popup missing** | Check Electron is running, look for popup in taskbar |
| **CSS not applying in OBS** | Clear OBS browser cache, refresh source |
| **Export not working** | Check browser downloads, ensure popups allowed |
| **Video not found** | Verify YouTube URL is public and not deleted |

---

## License

[MIT](LICENSE)

---

**Made with ❤️ for streamers** | [kg20dev](https://github.com/kg20dev)
