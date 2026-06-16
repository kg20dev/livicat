/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YOUTUBE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/* ── YouTube custom elements used in ThemePreview demo ─────────── */

declare namespace JSX {
  interface IntrinsicElements {
    'yt-live-chat-text-message-renderer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      'data-role'?: string
    }
    'yt-live-chat-author-chip': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    >
  }
}
