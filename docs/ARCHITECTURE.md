# Livicat Architecture & Code Structure

## 1. Technical Stack

Livicat is a cross-platform desktop application built with Tauri 2. It utilizes web technologies for the frontend and Rust for desktop integration.

*   **Frontend:** React 18.2+, TypeScript 5.2+, TailwindCSS 4.3+, Vite 5.0+
*   **Desktop Backend:** Tauri 2.11+, Rust 1.77+
*   **Testing:** Vitest 4.1+, React Testing Library 16.3+
*   **Analytics & Error Tracking:** Aptabase (usage), Sentry (crash reporting)

## 2. Component Structure and Hierarchy

The React frontend (located in `src/`) is structured by feature:

*   **`components/layout/`**: Core structural components.
    *   `Sidebar.tsx`, `TopBar.tsx`: Navigation.
    *   `PreviewArea.tsx`: Houses the YouTube iframe or test messages.
    *   `StylingPanel.tsx`: The primary interface for users to tweak CSS variables.
*   **`components/chat/`**: Components responsible for rendering the chat messages (used primarily in "Testing Mode").
*   **`theme/`**: The theme plugin system. Contains core defaults (`base/core.ts`), and individual theme directories (e.g., `im/`, `ink-sticker/`) containing manifests, schemes, and base CSS.

## 3. Data Flow (YouTube API → OBS)

1.  **URL Validation:** User inputs a YouTube URL. `utils/youtubeValidation.ts` extracts the Video ID.
2.  **Metadata Fetch:** `utils/youtubeMetadata.ts` fetches stream info via the public oEmbed API to verify the stream exists.
3.  **Connection:** `YouTubeService` authenticates with the API key and retrieves the `activeLiveChatId`.
4.  **Polling:** `ChatPollingService` continuously polls the YouTube Live Chat API (`youtube/v3/liveChat/messages`). It handles rate limiting, exponential backoff, and deduplication.
5.  **State Update:** New messages are pushed to React state, rendering them in the `PreviewArea`.
6.  **CSS Generation:** As the user adjusts settings in `StylingPanel`, React state updates trigger `generateChatCSS` (or variant). This maps UI settings (e.g., slider values) to `--chat-*` CSS variables and concatenates them with the selected theme's base CSS.
7.  **Injection:** `TauriService.injectCss()` sends the generated CSS string via IPC to the Rust backend.
8.  **Native Rendering:** Rust executes `window.eval()` to inject a `<style>` block containing the CSS directly into the running WebView (which is displaying the YouTube iframe).
9.  **OBS Export:** The user exports the CSS (`utils/cssExport.ts`), which is saved to disk with a header containing setup instructions for the OBS Browser Source.

## 4. Theme & Plugin System

Livicat uses a modular theme system defined in `src/theme/`.

*   **`CORE_SCHEME`**: Defines shared UI settings (e.g., global opacity, base font sizes) mapped to standard CSS variables.
*   **Theme Packages**: Each theme (e.g., `im`, `ink-sticker`) has:
    *   `manifest.ts`: Metadata (name, ID).
    *   `scheme.ts`: Theme-specific settings and a mapping of `CORE_SCHEME` variables to the theme's specific variable names if they differ.
    *   `theme.css`: The raw CSS utilizing `var(--chat-*)` placeholders.
*   **Registry**: `src/theme/registry.ts` merges the core scheme with theme-specific schemes. The `StylingPanel` reads this registry to dynamically generate the correct input controls (sliders, color pickers).

## 5. Build and CI/CD

*   **Local Dev:** `npm run tauri:dev` spins up the Vite dev server and the Tauri Rust backend concurrently.
*   **Build:** `npm run build` transpiles TypeScript and builds the Vite bundle. `npm run tauri:build` compiles the Rust binary and packages the app (.dmg for macOS, .exe for Windows).
*   **CI Pipeline (`.github/workflows/ci.yml`):** Triggers on PRs to `main`. Runs ESLint, Prettier formatting checks, TypeScript type-checking (`tsc --noEmit`), Vitest unit tests, and a `cargo check` on the Rust backend.
*   **Releases:** Uses `standard-version` to manage semantic versioning and changelog generation.

## 6. Key Services

*   **`YouTubeService.ts`**: Wrapper for the YouTube Data API v3. Handles connection status, API key validation, retrieving `liveChatId`, and fetching messages.
*   **`ChatPollingService.ts`**: Manages the lifecycle of polling. Includes logic for exponential backoff on transient errors, dropping connections on fatal errors (e.g., quota exceeded), and caching/deduplicating message IDs.
*   **`TauriService.ts`**: Centralized IPC wrapper. Abstracts `@tauri-apps/api/core/invoke` calls, providing a safe interface for the frontend to interact with the OS (opening windows, injecting CSS, triggering test crashes). Returns fallbacks if Tauri is unavailable (e.g., web-only testing).
