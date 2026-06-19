/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LIQUID GLASS RED COMPONENT EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file demonstrates how to apply the liquid glass red theme to Livicat's
 * main UI components. Use these patterns to update existing components.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/* ─── USAGE EXAMPLES ───────────────────────────────────────────────────────────

  1. SIDEBAR (src/components/layout/Sidebar.tsx):
     Replace `.glass-heavy` with `.glass-liquid-heavy`
     Replace `.glass-accent` with `.glass-liquid-accent`

  2. TOPBAR (src/components/layout/TopBar.tsx):
     Replace `.glass-medium` with `.glass-liquid-medium`

  3. SETTINGS PANELS (src/components/layout/Settings.tsx):
     Replace `.glass-card` with `.glass-liquid-card`
     Replace `.glass-input` with `.glass-liquid-input`

  4. BUTTONS:
     Replace `.glass-accent` with `.glass-liquid-accent`
     Replace `.glass-accent-primary` with `.glass-liquid-accent-primary`

  5. STYLING PANEL (src/components/layout/StylingPanel.tsx):
     Replace `.glass-heavy` with `.glass-liquid-heavy`
     Replace `.glass-medium` with `.glass-liquid-medium`

───────────────────────────────────────────────────────────────────────────────────*/

/* ═══════════════════════════════════════════════════════════════════════════════
   MIGRATION GUIDE - CLASS REPLACEMENTS
   ═══════════════════════════════════════════════════════════════════════════════

   OLD CLASS                    →  NEW LIQUID GLASS CLASS
   ──────────────────────────────────────────────────────────────────────────────
   .glass-heavy                 →  .glass-liquid-heavy
   .glass-medium                →  .glass-liquid-medium
   .glass-light                 →  .glass-liquid-light
   .glass-accent                →  .glass-liquid-accent
   .glass-accent-primary        →  .glass-liquid-accent-primary
   .glass-heavy-seamless        →  .glass-liquid-seamless
   .glass-input                 →  .glass-liquid-input
   .glass-card                  →  .glass-liquid-card

   ═══════════════════════════════════════════════════════════════════════════════
   COLOR VARIABLES (for inline styles or CSS)
   ═══════════════════════════════════════════════════════════════════════════════

   --glass-accent-red              →  #ff4444
   --glass-accent-red-bright       →  #ff6666
   --glass-accent-red-glow         →  rgba(255, 68, 68, 0.4)
   --glass-accent-red-subtle       →  rgba(255, 68, 68, 0.25)
   --glass-accent-red-faint        →  rgba(255, 68, 68, 0.12)

   --glass-base-black-ultra        →  rgba(0, 0, 0, 0.15)
   --glass-base-black-light        →  rgba(0, 0, 0, 0.22)
   --glass-base-black-medium       →  rgba(0, 0, 0, 0.28)
   --glass-base-black-heavy        →  rgba(0, 0, 0, 0.35)

   --glass-edge-white              →  rgba(255, 255, 255, 0.18)
   --glass-edge-subtle             →  rgba(255, 255, 255, 0.1)
   --glass-edge-faint              →  rgba(255, 255, 255, 0.05)

   ═══════════════════════════════════════════════════════════════════════════════
   EXAMPLE: BUTTON COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════

   <button className="glass-liquid-accent px-4 py-2">
     Click Me
   </button>

   ═══════════════════════════════════════════════════════════════════════════════
   EXAMPLE: INPUT FIELD
   ═══════════════════════════════════════════════════════════════════════════════

   <input
     type="text"
     className="glass-liquid-input px-3 py-2"
     placeholder="Enter text..."
   />

   ═══════════════════════════════════════════════════════════════════════════════
   EXAMPLE: CARD/PANEL
   ═══════════════════════════════════════════════════════════════════════════════

   <div className="glass-liquid-card p-4">
     <h2>Panel Title</h2>
     <p>Panel content goes here...</p>
   </div>

   ═══════════════════════════════════════════════════════════════════════════════
   EXAMPLE: SIDEBAR
   ═══════════════════════════════════════════════════════════════════════════════

   <aside className="glass-liquid-heavy w-64 h-full">
     <nav>
       <a className="glass-liquid-accent">Active Link</a>
       <a className="glass-liquid-light">Inactive Link</a>
     </nav>
   </aside>

   ═══════════════════════════════════════════════════════════════════════════════
   EXAMPLE: TOPBAR
   ═══════════════════════════════════════════════════════════════════════════════

   <header className="glass-liquid-medium h-16">
     <div className="flex items-center justify-between px-4">
       <h1 className="text-white">Livicat</h1>
       <button className="glass-liquid-accent">Settings</button>
     </div>
   </header>

   ═══════════════════════════════════════════════════════════════════════════════
   THEME SWITCHER (OPTIONAL)
   ═══════════════════════════════════════════════════════════════════════════════

   To add a theme switcher in Settings:

   <select
     value={theme}
     onChange={(e) => setTheme(e.target.value)}
     className="glass-liquid-input px-3 py-2"
   >
     <option value="liquid-red">Liquid Glass Red</option>
     <option value="original">Original Dark</option>
   </select>

   Then conditionally apply classes:
   <div className={theme === 'liquid-red' ? 'glass-liquid-heavy' : 'glass-heavy'}>

   ═══════════════════════════════════════════════════════════════════════════════
   CUSTOM COLOR OVERRIDES
   ═══════════════════════════════════════════════════════════════════════════════

   To customize the red accent color, override CSS variables in your component:

   <div style={{
     '--glass-accent-red': '#ff3b3b',
     '--glass-accent-red-glow': 'rgba(255, 59, 59, 0.4)',
   } as React.CSSProperties}>
     <button className="glass-liquid-accent">Custom Red Button</button>
   </div>

   ═══════════════════════════════════════════════════════════════════════════════
*/

export {}; // This file is for documentation purposes only
