# Livicat — YouTube Live Chat Editor for OBS

A desktop Electron app for displaying YouTube Live Chat as an OBS browser source overlay. Built with React, TypeScript, and Tailwind CSS.

![Version](https://img.shields.io/badge/version-0.5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **🖥️ Desktop App** — Native Electron app with always-on-top popup preview
- **🔴 Live Chat Display** — Real-time YouTube chat messages with auto-scroll
- **🎨 Visual Customization** — Font sizes, colors, spacing, opacity, and 7 preset themes
- **✨ Message Animations** — 6 animation styles (blink, glowing, fade, slide, bounce, default)
- **🔑 API Key Persistence** — Save your YouTube API key securely in localStorage
- **🔗 Smart URL Parsing** — Paste full YouTube URLs or just video IDs
- **📡 Stream Validation** — Detects live, ended, private, or invalid streams
- **🎯 OBS Optimized** — Transparent background mode + CSS export for browser source overlay
- **⚡ Performance** — Lightweight DOM, efficient animations, requestAnimationFrame scrolling
- **♿ Accessible** — ARIA live regions, keyboard navigable controls

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **YouTube Data API v3 key** — [Get one from Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### Web App Setup

```bash
# Clone the repo
git clone https://github.com/kg20dev/livicat.git
cd livicat

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Desktop App (Electron)

```bash
# After installing dependencies
npm run electron

# The app will open with a live chat preview popup
# The popup window stays always-on-top for OBS convenience
```

### Using with OBS

**Option 1: Browser Source (Live Preview)**
1. Run `npm run electron` to start the desktop app
2. Open a live stream in the app
3. The popup preview will appear (always-on-top)
4. In OBS, add a **Window Capture** source and select the popup window
5. Resize and position as needed

**Option 2: Browser Source (CSS Export)**
1. Start the app (`npm run dev`)
2. Customize your chat appearance in the styling panel
3. Click **Export CSS** to download the OBS-ready CSS file
4. In OBS, add a **Browser Source** pointed to the YouTube live chat URL
5. Paste the exported CSS into the "Custom CSS" field
6. Set the browser source dimensions (e.g., 400×600)

---

## Usage

### 1. Get a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable **YouTube Data API v3**
4. Create an API key under **Credentials**
5. Copy the key (starts with `AIzaSy...`)

### 2. Connect to a Stream

1. Paste your API key into the **YouTube API Key** field
2. Enter a YouTube **Video ID or URL** (e.g., `https://youtube.com/watch?v=dQw4w9WgXcQ`)
3. The app validates the stream — you'll see live/ended/invalid status
4. Click **Connect to Chat** to start receiving messages

### 3. Customize Appearance

Use the **Styling Panel** to adjust:

| Setting | Options |
|---------|---------|
| Preset Themes | Default, Minimal, Compact, Large, Stream, Neon, Light, Retro |
| Font Size | 12px – 24px |
| Message Spacing | Compact, Normal, Comfortable |
| Background Opacity | 0% – 100% |
| Username Color | Any hex color |
| Show/Hide Avatars | Toggle |
| Show/Hide Timestamps | Toggle |
| Auto-scroll | Toggle |
| Animation Speed | None, Slow, Normal |
| **New Message Animation** | Default, Blink, Glowing, Fade, Slide, Bounce |

All settings persist automatically to localStorage.

### 4. Export CSS for OBS

1. Customize your chat appearance in the styling panel
2. Click the **Export CSS** button in the sidebar
3. The CSS file is automatically downloaded with OBS-ready formatting
4. Paste this CSS into OBS Browser Source's "Custom CSS" field

The exported CSS includes:
- All your visual customizations (colors, fonts, spacing)
- `@import` rules for any selected Google Fonts
- Optimized selectors for YouTube's chat DOM
- Comments for easy customization

---

## Preset Themes

| Theme | Use Case |
|-------|----------|
| **Default** | Balanced for most streams |
| **Minimal** | Clean, no avatars or timestamps |
| **Compact** | High-volume chats, dense layout |
| **Large** | Readable from a distance |
| **Stream** | Optimized OBS overlay with semi-transparent background |
| **Neon** | Vibrant colors with glow effects |
| **Light** | Clean light theme for daytime streams |
| **Retro** | CRT-inspired green-on-black terminal style |

## Message Animations

| Animation | Effect | Best For |
|-----------|--------|----------|
| **Default** | No animation | Minimal distractions |
| **Blink** | Messages flash when appearing | Highlighting new messages |
| **Glowing** | Pulsating glow effect | Drawing attention to chat |
| **Fade** | Smooth fade-in with upward slide | Professional transitions |
| **Slide** | Slide in from left | Modern, dynamic feel |
| **Bounce** | Subtle bounce effect | Fun, engaging streams |

---

## Development

```bash
# Start dev server with hot reload
npm run dev

# Run Electron desktop app
npm run electron

# TypeScript check
npm run type-check

# Lint
npm run lint

# Format code
npm run format

# Run tests
npm test

# Test in watch mode
npm run test:watch

# Build for production
npm run build

# Preview production build
npm run preview
```

### Test Suite

```bash
npm test
```

Runs 157+ tests across all components, hooks, and services using Vitest + React Testing Library.

### Project Structure

```
src/
├── components/
│   ├── chat/               # Chat components (ChatPreview, ChatMessage, ChatIframe)
│   ├── layout/             # Layout components (Sidebar, TopBar, StylingPanel, PreviewArea)
│   └── ui/                 # Reusable UI (ErrorBoundary, UrlInputBar)
├── hooks/
│   ├── useChatSettings.ts  # Chat settings persistence and CSS generation
│   ├── useApiKey.ts        # API key persistence
│   ├── useYouTubeChat.ts   # YouTube chat polling
│   └── useElectronPreview.ts # Electron popup window management
├── services/
│   ├── YouTubeService.ts   # YouTube Data API v3 client
│   └── ChatPollingService.ts # Polling loop with exponential backoff
├── types/
│   ├── app.ts              # App-specific types (ChatSettings, AnimationStyle, etc.)
│   ├── youtube.ts          # YouTube API types
│   └── electron.d.ts       # Electron type definitions
├── utils/
│   ├── cssGenerator.ts     # CSS generation from settings
│   ├── cssExport.ts        # OBS CSS export utilities
│   ├── fonts.ts            # Google Fonts integration
│   ├── youtubeMetadata.ts  # YouTube video metadata
│   ├── youtubeValidation.ts # YouTube URL validation
│   └── storage.ts          # localStorage wrappers
electron/
├── main.cjs                # Electron main process
└── preload.cjs             # Preload script for IPC
```

---

## Architecture

### Web App Flow

```
User Input → PreviewArea → App.tsx → YouTubeService (API calls)
                               ↓
                         ChatPollingService (polling loop)
                               ↓
                         useYouTubeChat (state management)
                               ↓
                         ChatPreview → ChatMessage
```

### Electron App Flow

```
User Input → PreviewArea → IPC (Inter-Process Communication)
                               ↓
                         Electron Main Process (BrowserWindow)
                               ↓
                         YouTube Live Chat Popup (always-on-top)
                               ↓
                         CSS Injection (custom styling)
```

### Key Components

- **YouTubeService** — Wraps the YouTube Data API v3 endpoints
- **ChatPollingService** — Polls for new messages with exponential backoff (1s → 60s), detects stream end
- **useYouTubeChat** — React hook bridging services to UI state
- **useElectronPreview** — Electron popup window management
- **ChatPreview** — Memoized message rendering with animations
- **cssGenerator** — Converts settings to CSS for YouTube chat injection

---

## API Reference

The app uses the **YouTube Data API v3** endpoints:

| Endpoint | Usage |
|----------|-------|
| `/videos?part=liveStreamingDetails` | Get live chat ID and check stream status |
| `/liveChat/messages` | Fetch chat messages with pagination |
| `/videos?part=snippet` | Validate API key and get video metadata |

---

## OBS Integration Tips

### Using the Desktop App (Recommended)

- **Always-on-Top Popup**: The Electron app's preview window stays above other windows
- **Window Capture**: Use OBS Window Capture source on the popup window
- **Real-Time Preview**: See your customized chat instantly in the popup
- **No Latency**: Direct window capture has minimal latency

### Using CSS Export

- **Custom CSS**: Export your styling and paste into OBS Browser Source
- **Google Fonts**: Exported CSS includes `@import` rules for selected fonts
- **Dimensions**: Recommended 350-400px wide, 500-700px tall
- **Performance**: Lightweight CSS, suitable for long streaming sessions
- **Refresh**: Use OBS browser source's refresh button if needed

### General Tips

- **Animations**: Use subtle animations (Fade, Slide) to avoid distractions
- **Contrast**: Ensure high contrast for readability on game footage
- **Font Size**: 14-16px works best for most overlays
- **Opacity**: 80-90% container opacity provides good background separation
- **Multiple Instances**: Run multiple Electron apps for different layouts

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Invalid API key"** | Verify your key starts with `AIzaSy`. Check Google Cloud Console quota. |
| **"Stream is not live"** | The video must be currently live streaming with chat enabled. |
| **No messages appearing** | Try disconnecting and reconnecting. Check API key has YouTube Data API enabled. |
| **Electron app won't open** | Ensure `npm install` completed successfully. Try `npm run electron` again. |
| **Popup window missing** | Check Electron is running. Look for the popup window on your taskbar/dock. |
| **CSS export not working** | Ensure you've customized settings before clicking Export. Check browser downloads. |
| **Animations too distracting** | Switch to "Default" or "Fade" animation style. Adjust speed to "Slow" or "None". |
| **API quota exceeded** | YouTube Data API has daily quota limits. Check your Google Cloud Console dashboard. |
| **Chat replay not available** | Some videos don't have chat replay enabled. Try a different live stream. |

---

## License

[MIT](LICENSE)

## Project Status

### ✅ Implemented Features (v0.5.0)

- ✅ Electron desktop app with always-on-top popup
- ✅ Real-time YouTube chat display with auto-scroll
- ✅ 7 preset themes (Default, Minimal, Compact, Large, Stream, Neon, Light, Retro)
- ✅ 6 message animation styles (Default, Blink, Glowing, Fade, Slide, Bounce)
- ✅ Visual customization (colors, fonts, spacing, opacity)
- ✅ API key persistence and validation
- ✅ Stream status detection (live, ended, private, invalid)
- ✅ CSS export for OBS browser source
- ✅ Google Fonts integration
- ✅ YouTube URL parsing and validation
- ✅ Error boundary and error handling
- ✅ 157+ comprehensive tests

### 🚧 Upcoming Features

- [ ] Chat filtering (by user, by keywords)
- [ ] Message highlighting and moderation tools
- [ ] Custom theme import/export
- [ ] Chat replay support for VODs
- [ ] Multiple chat windows
- [ ] Chat logging and analytics
- [ ] Twitch integration
- [ ] Keyboard shortcuts

### 🤝 Contributing

Open to contributions! See [open issues](https://github.com/kg20dev/livicat/issues) for enhancement ideas.

**Development Workflow:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`) and lint (`npm run lint`)
5. Commit changes (`git commit -m 'feat: add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### 📞 Support

- **Issues**: [GitHub Issues](https://github.com/kg20dev/livicat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kg20dev/livicat/discussions)
- **Email**: For API key or setup help, open an issue

---

**Made with ❤️ for streamers** | [kg20dev](https://github.com/kg20dev)
