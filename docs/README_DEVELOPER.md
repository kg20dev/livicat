<p align="center">
  <img src="../livicat-icon.png" alt="Livicat Icon" width="128" height="128">
</p>

# 🛠️ Livicat — Developer Guide

> **Technical documentation for contributors and developers**  
 Architecture, API reference, build process, and development workflow

---

## 📋 Project Overview

### **What is Livicat?**

Livicat is a **cross-platform desktop application** built with **Tauri 2** that customizes YouTube Live Chat appearance for OBS browser source overlays.

### **Tech Stack**

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.2+ | UI framework |
| **Frontend** | TypeScript | 5.2+ | Type safety |
| **Frontend** | TailwindCSS | 4.3+ | Styling |
| **Frontend** | Vite | 5.0+ | Build tool |
| **Desktop** | Tauri | 2.11+ | Desktop framework |
| **Desktop** | Rust | 1.77+ | Backend logic |
| **Testing** | Vitest | 4.1+ | Unit tests |
| **Testing** | React Testing Library | 16.3+ | Component tests |
| **Analytics** | Aptabase | 1.0+ | Usage tracking |
| **Error Tracking** | Sentry | 0.48+ | Crash reporting |

### **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                         Livicat App                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   React Frontend │ ◄──────► │  Tauri IPC Layer │         │
│  │                  │  JSON   │                  │         │
│  │  • UI Components │         │  • invoke()      │         │
│  │  • CSS Generator │         │  • Commands      │         │
│  │  • State Mgmt    │         │  • Events        │         │
│  └──────────────────┘         └──────────────────┘         │
│                                         │                    │
│                                         ▼                    │
│                    ┌──────────────────────────────┐         │
│                    │      Rust Backend            │         │
│                    │                              │         │
│                    │  • WebView Management       │         │
│                    │  • CSS Injection            │         │
│                    │  • Window Control           │         │
│                    │  • Analytics (Aptabase)     │         │
│                    │  • Error Tracking (Sentry)  │         │
│                    └──────────────────────────────┘         │
│                                │                             │
└────────────────────────────────┼─────────────────────────────┘
                                 ▼
                    ┌──────────────────────┐
                    │   OS WebView         │
                    │                      │
                    │ • macOS: WKWebView   │
                    │ • Windows: WebView2 │
                    └──────────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────┐
                    │  YouTube Live Chat   │
                    │  (live_chat iframe)  │
                    └──────────────────────┘
```

---

## 🚀 Development Setup

### **Prerequisites**

#### **Required**
- **Node.js** 20+ — https://nodejs.org/
- **npm** — Comes with Node.js
- **Rust** (stable) — https://rustup.rs/

#### **Platform-Specific**

**macOS:**
```bash
xcode-select --install
```

**Windows:**
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) with C++ workload



### **Setup Steps**

```bash
# 1. Clone repository
git clone https://github.com/kg20dev/livicat.git
cd livicat

# 2. Install dependencies
npm install

# 3. Verify setup
npm run type-check  # TypeScript check
npm run lint        # ESLint check

# 4. Run development server
npm run tauri:dev
```

---

## 📁 Project Structure

```
livicat/
├── src/                          # React frontend (Vite + TypeScript)
│   ├── components/
│   │   ├── layout/              # Layout components
│   │   │   ├── TopBar.tsx       # Header with settings
│   │   │   ├── StylingPanel.tsx # CSS customization panel
│   │   │   ├── PreviewArea.tsx  # Chat preview area
│   │   │   ├── Settings.tsx     # Settings modal
│   │   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   │   └── AssetsPage.tsx   # Assets management
│   │   ├── chat/                # Chat components
│   │   │   ├── ChatMessage.tsx  # Individual message
│   │   │   ├── ChatPreview.tsx  # Preview container
│   │   │   └── ChatIframe.tsx   # YouTube iframe
│   │   ├── analytics/           # Analytics components
│   │   │   └── AnalyticsConsent.tsx  # Consent modal
│   │   ├── loading/             # Loading components
│   │   │   └── LoadingScreen.tsx
│   │   └── ui/                  # UI components
│   │       ├── ErrorBoundary.tsx
│   │       └── UrlInputBar.tsx
│   ├── utils/                   # Utility functions
│   ├── main.tsx                 # React entry point
│   └── App.tsx                  # Root component
│
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── lib.rs               # Main Tauri logic
│   │   ├── main.rs              # Entry point
│   │   ├── sentry.rs            # Sentry integration
│   │   └── *.rs                 # Test modules
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Tauri configuration
│   └── capabilities/            # Tauri permissions
│
├── .github/                     # GitHub workflows
│   ├── workflows/
│   │   ├── ci.yml               # CI pipeline
│   │   └── build-tauri.yml      # Release builds
│   └── ISSUE_TEMPLATE/          # Issue templates
│
├── docs/                        # Documentation (if any)
├── package.json                 # Node.js dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.js           # TailwindCSS configuration
└── README.md                    # Main README
```

---

## 🔧 How It Works

### **Data Flow**

```
User Interaction
       │
       ▼
React Component (State Update)
       │
       ▼
CSS Generator (Generate Custom CSS)
       │
       ▼
Tauri IPC (invoke() command)
       │
       ▼
Rust Backend (Process Command)
       │
       ▼
WebView Window (YouTube Live Chat)
       │
       ▼
CSS Injection (Inject into YouTube iframe)
       │
       ▼
Styled Chat Display
```

### **Key Components**

#### **1. CSS Generation** (Frontend)

**Location:** `src/components/layout/StylingPanel.tsx`

**Process:**
1. User adjusts settings in UI
2. React state updates with new values
3. `generateCSS()` function creates custom CSS string
4. CSS sent to Tauri backend via IPC

**Example CSS Output:**
```css
#livicat-css {
  --background-color: #1a1a2e;
  --username-color: #00d9ff;
  --message-color: #ffffff;
  --font-family: 'Inter';
  --font-size: 16px;
}

yt-live-chat-app {
  background-color: var(--background-color) !important;
}

yt-live-chat-text-message-renderer {
  font-family: var(--font-family);
  font-size: var(--font-size);
}

#author-name {
  color: var(--username-color) !important;
}

#message {
  color: var(--message-color) !important;
}
```

#### **2. IPC Communication** (Frontend ↔ Backend)

**Frontend (React):**
```typescript
import { invoke } from '@tauri-apps/api/core';

// Open preview window with CSS
await invoke('open_preview_window', {
  videoId: 'dQw4w9WgXcQ',
  css: generatedCSS
});

// Inject CSS into existing window
await invoke('inject_css', { css: updatedCSS });

// Close preview window
await invoke('close_preview_window');
```

**Backend (Rust):**
```rust
#[tauri::command]
async fn open_preview_window(
    video_id: String,
    css: String,
    app: AppHandle,
    state: tauri::State<'_, SharedPreviewState>,
) -> Result<(), String> {
    // Create webview window
    // Load YouTube live chat
    // Inject CSS
    Ok(())
}
```

#### **3. WebView Management** (Rust)

**Location:** `src-tauri/src/lib.rs`

**Process:**
1. Receive IPC command from frontend
2. Create or find webview window
3. Load YouTube live chat URL
4. Inject CSS when page loads
5. Keep window state (open/close)

**Platform-Specific WebViews:**
- **macOS:** WKWebView (system framework)
- **Windows:** WebView2 (Edge runtime)
#### **4. CSS Injection** (Rust)

**Method:** JavaScript injection via `eval()`

**Code:**
```rust
fn inject_css_to_window(window: &WebviewWindow, css: &str) -> Result<(), String> {
    let script = format!(
        r#"(function() {{
            try {{
                var existing = document.getElementById('livicat-css');
                if (existing) existing.remove();

                var style = document.createElement('style');
                style.id = 'livicat-css';
                style.textContent = {};
                document.head.appendChild(style);
                console.log('[Livicat] CSS injected successfully');
                return true;
            }} catch(e) {{
                console.error('[Livicat] CSS injection error:', e);
                return false;
            }}
        }})();"#,
        serde_json::to_string(css)?
    );

    window.eval(&script)?;
    Ok(())
}
```

---

## 🔌 API Reference

### **Tauri Commands (IPC)**

#### **`open_preview_window`**

Opens a new webview window with YouTube live chat and injects CSS.

**Parameters:**
```typescript
{
  videoId: string;  // YouTube video ID (e.g., "dQw4w9WgXcQ")
  css: string;      // CSS to inject
}
```

**Returns:** `Promise<void>`

**Example:**
```typescript
await invoke('open_preview_window', {
  videoId: 'dQw4w9WgXcQ',
  css: '#chat { background: red; }'
});
```

---

#### **`inject_css`**

Injects CSS into an existing preview window.

**Parameters:**
```typescript
{
  css: string;  // CSS to inject
}
```

**Returns:** `Promise<void>`

**Example:**
```typescript
await invoke('inject_css', {
  css: '#chat { background: blue; }'
});
```

---

#### **`close_preview_window`**

Closes the preview window.

**Parameters:** None

**Returns:** `Promise<void>`

**Example:**
```typescript
await invoke('close_preview_window');
```

---

#### **`get_app_version`**

Returns the app version from Cargo.toml.

**Parameters:** None

**Returns:** `Promise<string>` (e.g., `"0.7.7"`)

**Example:**
```typescript
const version = await invoke('get_app_version');
console.log(version); // "0.7.7"
```

---

#### **`trigger_crash_test`**

Triggers a test crash for Sentry verification (dev only).

**Parameters:**
```typescript
{
  crashType: 'panic' | 'fake_crash' | 'fake_error' | 'scenario'
}
```

**Returns:** `Promise<void>`

**Example:**
```typescript
// Send fake crash event
await invoke('trigger_crash_test', { crashType: 'fake_crash' });
```

---

### **Tauri Events**

#### **Analytics Events** (via Aptabase plugin)

```typescript
// Track event
app.track_event('css_exported', {
  format: 'css',
  method: 'download',
});

// Built-in events
app.track_event('app_launched', null);
app.track_event('preview_opened', { videoId: '...' });
```

**Available Events:**
- `app_launched` — App starts
- `css_exported` — CSS exported
- `youtube_fetched` — Video metadata fetched
- `preview_opened` — Preview window opened
- `preview_duration` — Time preview was open
- `preset_selected` — Theme preset applied
- `customization_changed` — Any setting changed
- `session_duration` — Total app session time

---

### **Rust Modules**

#### **`lib.rs`** — Main Tauri logic

**Key Functions:**
- `run()` — App entry point, initializes plugins and commands
- `open_preview_window()` — Creates webview window
- `inject_css_to_window()` — Injects CSS into webview
- `inject_css()` — Re-injects CSS into existing window

**State Management:**
```rust
struct PreviewState {
    window_label: Option<String>,
}

type SharedPreviewState = Arc<Mutex<PreviewState>>;
```

---

#### **`sentry.rs`** — Error tracking

**Key Functions:**
- `init_sentry()` — Initialize Sentry client
- `capture_error()` — Send error to Sentry
- `add_breadcrumb()` — Add breadcrumb for context
- `trigger_test_panic()` — Test panic handling

**Usage:**
```rust
// Capture error
sentry::capture_error("Failed to open preview");

// Add breadcrumb
sentry::add_breadcrumb("user_action", "User clicked preview", Level::Info);

// Trigger test panic
sentry::trigger_test_panic();
```

---

## 🧪 Testing

### **Test Suite**

**Framework:** Vitest + React Testing Library

**Total Tests:** 170+ frontend + 13 Rust = 183 tests

**Coverage Areas:**
- Component rendering
- User interactions (clicks, inputs)
- CSS generation logic
- Error boundary behavior
- Rust IPC commands
- Analytics events

### **Run Tests**

```bash
# Run all tests
npm test

# Watch mode (development)
npm run test:watch

# Run specific test file
npm test -- ChatMessage.test.tsx
```

### **Test Structure**

**Frontend Tests:**
```typescript
// src/components/chat/__tests__/ChatMessage.test.tsx
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';

describe('ChatMessage', () => {
  it('renders message text', () => {
    render(<ChatMessage message="Hello!" author="User" />);
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });
});
```

**Rust Tests:**
```rust
// src-tauri/src/lib.rs
#[cfg(test)]
mod tests {
    #[test]
    fn test_track_event_serialization() {
        let event_name = "test_event";
        let serialized = serde_json::to_string(&event_name).unwrap();
        assert!(serialized.contains("test_event"));
    }
}
```

### **Test Dashboard**

**Sentry Testing:** See [TESTING.md](TESTING.md)

---

## 📦 Build & Release

### **Build Commands**

```bash
# Development build (with hot reload)
npm run tauri:dev

# Production build (optimized)
npm run tauri:build

# Platform-specific builds
npm run tauri:build:mac                    # macOS Apple Silicon
npm run tauri:build -- --target x86_64-pc-windows-msvc  # Windows
```

### **Build Output**

**Location:** `src-tauri/target/release/bundle/`

**Artifacts:**
- **macOS:** `.dmg` (disk image), `.app` (application bundle)
- **Windows:** `.msi` (installer), `.exe` (NSIS installer)

### **Release Workflow**

**GitHub Actions:** `.github/workflows/build-tauri.yml`

**Process:**
1. Trigger: Push to `main` or release branch
2. Run: Lint → Type check → Tests → Build
3. Upload: Artifacts to GitHub Releases
4. Sign: Code signing (macOS/Windows)

**Manual Release:**
```bash
# 1. Bump version
npm run release:patch  # or release:minor, release:major

# 2. Build
npm run tauri:build

# 3. Test
# Run the generated installer

# 4. Commit and push
git add .
git commit -m "chore(release): vX.X.X"
git push
```

**See Also:** [BUILD.md](BUILD.md), [RELEASE.md](RELEASE.md)

---

## 🔐 Security & Privacy

### **Analytics (Aptabase)**

**Privacy-First Design:**
- ✅ User consent required
- ✅ No YouTube URLs tracked
- ✅ No CSS content tracked
- ✅ No PII collected
- ✅ Opt-out anytime

**Events Tracked:**
- App launches
- Feature usage (themes, animations)
- CSS exports
- Preview opens
- Session duration

**Configuration:**
```bash
# Set app key (never commit to git)
export APTABASE_APP_KEY="your-app-key"

# Or use .env file (git-ignored)
echo "APTABASE_APP_KEY=your-app-key" > src-tauri/.env
```

### **Error Tracking (Sentry)**

**What's Captured:**
- ✅ Stack traces
- ✅ Error messages
- ✅ OS and app version
- ✅ Breadcrumbs (user actions)

**What's Filtered:**
- ❌ YouTube URLs
- ❌ CSS content
- ❌ User data
- ❌ File paths

**Configuration:**
```bash
# Set DSN (never commit to git)
export SENTRY_DSN="https://your-dsn@sentry.io/project-id"

# Or use .env file
echo "SENTRY_DSN=..." > src-tauri/.env
```

**See Also:** [SENTRY_TROUBLESHOOT.md](SENTRY_TROUBLESHOOT.md), [APTABASE_SETUP_SUMMARY.md](APTABASE_SETUP_SUMMARY.md)

---

## 🤝 Contributing

### **Workflow**

1. **Read Guidelines**
   - [AGENTS.md](AGENTS.md) — Project context
   - [CODING_RULES.md](CODING_RULES.md) — Code standards

2. **Create Issue**
   - Use [feature_request.md](../.github/ISSUE_TEMPLATE/feature_request.md) or [bug_report.md](../.github/ISSUE_TEMPLATE/bug_report.md)
   - Get approval before starting work

3. **Create Branch**
   ```bash
   gh issue develop 42  # Creates feature/42-branch-name
   ```

4. **Make Changes**
   - Follow coding standards
   - Write/update tests
   - Run `npm run lint` and `npm run type-check`

5. **Commit**
   ```bash
   git commit -m "feat: add dark mode (Refs #42)"
   ```

6. **Push & Create PR**
   ```bash
   git push -u origin feature/42-add-dark-mode
   gh pr create --title "[#42] Add dark mode" --body "Closes #42"
   ```

7. **Address Review**
   - Fix feedback
   - Ensure CI passes

8. **Merge**
   - Squash merge to main
   - Branch deleted

### **Commit Conventions**

**Format:** `TYPE(scope): description (Refs #ISSUE-NUMBER)`

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `refactor` — Code refactoring
- `test` — Test updates
- `chore` — Maintenance

**Examples:**
```bash
feat(styling): add dark mode theme (Refs #42)
fix(preview): resolve crash on Windows (Refs #13)
docs(readme): update installation instructions (Refs #28)
```

### **Code Review Checklist**

- [ ] Tests pass locally
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run type-check`)
- [ ] New tests added for changes
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] PR template filled out

---

## 🐛 Troubleshooting

### **Development Issues**

**`tauri:dev` fails to start:**
```bash
# Check Rust toolchain
rustup default stable

# Check Tauri CLI
cargo install tauri-cli --version "^2"

# Clear cache
rm -rf node_modules src-tauri/target
npm install
```

**Tests fail:**
```bash
# Run specific test for details
npm test -- ChatMessage.test.tsx

# Check console output
npm test -- --reporter=verbose
```

**TypeScript errors:**
```bash
# Check types
npm run type-check

# Update types
npm update
```

### **Build Issues**

**Build fails on macOS:**
```bash
# Install Xcode tools
xcode-select --install

# Try again
npm run tauri:build
```

**Build fails on Windows:**
```bash
# Install WebView2 Runtime
# https://developer.microsoft.com/en-us/microsoft-edge/webview2/

# Install Visual Studio Build Tools (C++ workload)
# https://visualstudio.microsoft.com/downloads/
```

### **WebView Issues**

**CSS not injecting:**
- Check browser console for errors
- Verify YouTube chat URL is correct
- Check `window.eval()` script for syntax errors

**Preview window freezes in OBS Window Capture (Windows):**
- In OBS Window Capture properties, set **Capture Method** to **"Windows 10 (1903 and up)"** — not "Automatic" (required for WebView2 windows)
- If still frozen, try re-adding the Window Capture source

  <img src="yurisi-doc.png" alt="OBS Capture Method setting" width="300">

**Preview window crashes (Windows):**
- Update WebView2 Runtime
- Check Sentry for crash reports

---

## 📚 Additional Resources

### **Documentation**

- [STREAMER.md](STREAMER.md) — End-user guide
- [BUILD.md](BUILD.md) — Build instructions
- [TESTING.md](TESTING.md) — Testing guide
- [RELEASE.md](RELEASE.md) — Release workflow
- [CHANGELOG.md](CHANGELOG.md) — Version history

### **External Docs**

- [Tauri Documentation](https://tauri.app/v2/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/guide/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

### **Community**

- [GitHub Issues](https://github.com/kg20dev/livicat/issues)
- [GitHub Discussions](https://github.com/kg20dev/livicat/discussions)
- [YouTube Demos](https://www.youtube.com/watch?v=8rsJAPWoyW4)

---

## 🏗️ Architecture Diagrams

### **Component Hierarchy**

```
App.tsx
├── ErrorBoundary
│   └── TopBar
├── Sidebar
│   └── Navigation
├── PreviewArea
│   ├── UrlInputBar
│   ├── ChatPreview
│   │   └── ChatMessage[]
│   └── LoadingScreen
└── StylingPanel
    ├── Theme Selector
    ├── Color Pickers
    ├── Font Selector
    ├── Animation Selector
    └── Toggle Switches
```

### **Data Flow (CSS Generation)**

```
User Action
    ↓
React State Update
    ↓
generateCSS() [Utility Function]
    ↓
CSS String
    ↓
invoke('open_preview_window') [Tauri IPC]
    ↓
Rust Backend (lib.rs)
    ↓
WebView Window Creation
    ↓
YouTube Chat URL Load
    ↓
on_page_load Event
    ↓
inject_css_to_window() [JavaScript Injection]
    ↓
<style id="livicat-css"> Element
    ↓
Styled YouTube Chat
```

---

## 🔮 Future Architecture

### **Planned Improvements**

1. **State Management**
   - Consider Zustand for complex state
   - Reduce prop drilling

2. **Component Library**
   - Extract reusable UI components
   - Create Storybook for component docs

3. **Testing**
   - Increase test coverage to 90%+
   - Add E2E tests with Playwright

4. **Performance**
   - Implement virtual scrolling for chat
   - Optimize CSS generation
   - Reduce bundle size

5. **Multi-Platform**
   - Optimize for older Windows versions

---

**Made with ❤️ for developers** | [kg20dev](https://github.com/kg20dev)

**[⬆ Back to main README](../README.md)**
