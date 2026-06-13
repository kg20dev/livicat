<p align="center">
  <img src="../livicat-icon.png" alt="Livicat Icon" width="128" height="128">
</p>

# 🎨 Livicat — Streamer Guide

> **Make your YouTube Live Chat look amazing in OBS**  
> Customize colors, fonts, animations — then display it professionally in your stream

---

## 🎯 What is Livicat?

**Livicat** is a desktop app that lets you customize how your YouTube Live Chat looks and displays it in OBS.

**In simple terms:**
- ✨ You pick colors, fonts, and styles
- 🪹 Livicat creates a beautiful chat overlay
- 📺 You add it to OBS with one click
- 🎉 Your stream looks more professional

**Why streamers love it:**
- 🎨 **7 preset themes** — Default, Minimal, Compact, Large, Stream, Neon, Light, Retro
- ⚡ **Real-time preview** — See changes instantly as you customize
- 🪟 **Always-on-top window** — Stays visible while you work in OBS
- 📤 **One-click OBS setup** — No complex configuration needed
- 🪞 **Works in two ways** — Browser source OR window capture

---

## 🆚 Why use Livicat?

### **Problem:** YouTube's default chat is boring
- 📺 Plain white background with black text
- 🚫 No customization options
- 😴 Looks the same as everyone else

### **Solution:** Livicat makes it unique
- 🎨 Match your brand colors and style
- ✨ Add smooth animations to new messages
- 🎯 Choose from professional presets
- 🪟 Preview changes in real-time
- 📺 Perfect for any stream size

**Result:** Your stream stands out and looks more professional!

---

## 📥 Installation

### **🍎 macOS (Apple Silicon)**

1. Download the latest `.dmg` from [GitHub Releases](https://github.com/kg20dev/livicat/releases)
2. Open the downloaded file
3. Drag Livicat to your Applications folder
4. Open Launchpad and click Livicat

### **🪟 Windows**

1. Download the latest `.exe` or `.msi` from [GitHub Releases](https://github.com/kg20dev/livicat/releases)
2. Run the installer
3. Open Livicat from your Start menu

**💡 Tip:** Livicat is only ~8MB — it downloads in seconds!

---

## 🚀 Quick Start (5-Minute Setup)

### **Step 1: Open Livicat**
Launch the app from your Applications folder or Start menu.

### **Step 2: Enter Your Stream URL**
- Copy your YouTube stream URL
- Paste it into the URL bar
- Click **"Fetch"**

**Example URLs:**
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtu.be/dQw4w9WgXcQ
```

### **Step 3: Customize Your Chat**
- **Pick a preset** — Click "Preset" and choose a theme
- **Adjust colors** — Change background, username, message colors
- **Choose fonts** — Pick from 12 Google Fonts
- **Add animations** — Make new messages glow, slide, or bounce
- **Toggle elements** — Show/hide avatars, timestamps, badges

### **Step 4: Preview Your Changes**
- Changes appear instantly in the preview area
- Use demo messages to test without waiting for real chat
- Switch to "Live Chat" to see actual YouTube chat

### **Step 5: Add to OBS**
Choose **Method 1** or **Method 2** below (Method 2 is easier!)

---

## 🪟 Two Methods to Use with OBS

### **Method 1: CSS Export (Browser Source)**

**Best for:** Testing, web-based workflows

#### **Step-by-Step:**

1. **Customize your chat** in Livicat
2. Click **"Export CSS"** in the sidebar (or press `Ctrl+Shift+E`)
3. CSS file downloads to your Downloads folder

**In OBS:**

4. In OBS, go to **Sources** → **+** → **Browser**
5. Paste this URL:
   ```
   https://www.youtube.com/live_chat?v=YOUR_VIDEO_ID
   ```
6. Click the folder icon to upload the CSS file you downloaded
7. Set **Width** to `400` and **Height** to `600`
8. Click **OK**

**✅ Pros:** Works in web mode, no Tauri needed
**❌ Cons:** Manual setup, can't use always-on-top window

---

### **Method 2: Live Preview (Window Capture)** ⭐

**Best for:** Streamers, always-on-top overlay, easier setup

#### **Step-by-Step:**

1. **Customize your chat** in Livicat
2. Enter your YouTube stream URL and click **"Fetch"**
3. Click the **"Live Chat"** button
4. A popup window opens showing your actual YouTube live chat
5. Your custom CSS is applied automatically!

**In OBS:**

6. In OBS, go to **Sources** → **+** → **Window Capture**
7. Select **"Livicat — Live Chat Preview"** from the dropdown
8. Click **OK**
9. Resize and position the chat overlay on your stream

> **⚠️ Windows Users — Critical OBS Setting:**  
> In the Window Capture properties, set **Capture Method** to **"Windows 10 (1903 and up)"** — do NOT leave it on "Automatic". This is required for WebView2-based windows (like Livicat's preview) to capture reliably on Windows.

**✅ Pros:** One-click setup, always-on-top, easier workflow
**❌ Cons:** Requires Livicat desktop app

---

## 📊 Method Comparison

| Feature | Method 1 (CSS Export) | Method 2 (Live Preview) |
|---------|---------------------|------------------------|
| **OBS Source Type** | Browser Source | Window Capture |
| **Setup Complexity** | Medium (manual CSS) | Easy (one click) |
| **Always-on-Top** | ❌ No | ✅ Yes |
| **Requirements** | Web browser only | Livicat desktop app |
| **CSS Updates** | Manual re-export | Instant (automatic) |
| **Best For** | Testing, web users | **Streamers, production** |

**💡 Recommendation:** Use **Method 2 (Live Preview)** for streaming — it's easier and faster!

---

## 🎨 Customization Options

### **Preset Themes**
- **Default** — Classic YouTube look
- **Minimal** — Clean and simple
- **Compact** — More messages on screen
- **Large** — Big, readable text
- **Stream** — Optimized for gaming streams
- **Neon** — Dark mode with glowing accents
- **Light** — Bright and clean
- **Retro** — Nostalgic pixel-style look

### **Message Animations**
- **Default** — No animation
- **Blink** — Flash when new message arrives
- **Glowing** — Subtle glow effect
- **Fade** — Smooth fade-in
- **Slide** — Slide in from side
- **Bounce** — Bouncy arrival animation

### **Typography (12 Google Fonts)**
- **Sans-serif:** Inter, Roboto, Open Sans, Lato
- **Display:** Montserrat, Poppins, Bebas Neue
- **Monospace:** Fira Code, JetBrains Mono
- **More:** Nunito, Raleway, Oswald

### **Visual Settings**
| Setting | Options |
|---------|---------|
| **Colors** | Background, username, message, accent, scrollbar |
| **Sizes** | Font size: 12-24px |
| **Spacing** | Compact, Normal, Comfortable |
| **Opacity** | Message and container: 0-100% |
| **Toggles** | Avatars, timestamps, header, scroll button |

---

## 🔧 Common Issues & Solutions

### **❌ "Live Chat button doesn't work"**
**Solution:**
- Make sure you've entered a YouTube URL and clicked "Fetch"
- Check that the URL is a valid YouTube video or stream
- Try refreshing the page and entering the URL again

### **❌ "CSS not applying in OBS"**
**Solution (Method 1):**
- Make sure you uploaded the CSS file to the Browser Source
- Try refreshing the browser source in OBS (right-click → Refresh)
- Clear OBS browser cache: File → Settings → Advanced → Clear Cache

### **❌ "Window not showing in OBS"**
**Solution (Method 2):**
- Make sure the Live Preview popup is open in Livicat
- In OBS, make sure you selected "Livicat — Live Chat Preview"
- Try re-adding the Window Capture source

### **❌ "Chat shows outdated messages"**
**Solution:**
- Refresh the YouTube chat by closing and reopening the Live Preview
- Make sure you're using the correct video URL
- Check if the stream is currently live

### **❌ "Text is hard to read"**
**Solution:**
- Increase font size (try 18-24px)
- Adjust message opacity to 100%
- Choose a darker background color
- Enable the "Compact" spacing option

### **❌ "App won't open"**
**Solution:**
- Make sure you downloaded the correct version for your OS
- On macOS: If you see "unidentified developer," right-click → Open
- On Windows: Try running as administrator
- Reinstall the app from [GitHub Releases](https://github.com/kg20dev/livicat/releases)

---

## 📺 Video Tutorials

### **Fast Live Chat Styling**
[![Watch the tutorial](https://img.youtube.com/vi/8rsJAPWoyW4/0.jpg)](https://www.youtube.com/watch?v=8rsJAPWoyW4)

**Learn:**
- How to customize colors and fonts
- Using preset themes
- Exporting CSS for OBS

---

### **OBS Integration Tutorial**
[![Watch the tutorial](https://img.youtube.com/vi/pmZq-mYhObc/0.jpg)](https://www.youtube.com/watch?v=pmZq-mYhObc)

**Learn:**
- Setting up Browser Source (Method 1)
- Using Window Capture (Method 2)
- Positioning and sizing your chat overlay

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+E` | Export CSS (Method 1) |
| `Ctrl+Shift+P` | Open Live Preview (Method 2) |

---

## 💡 Pro Tips

1. **Match your brand** — Use your stream's colors in Livicat
2. **Test before going live** — Use demo messages to preview
3. **Keep it readable** — Don't make font too small or text too transparent
4. **Use animations sparingly** — Too much motion can distract viewers
5. **Save your favorites** — Screenshots of settings you like for future streams
6. **Always-on-top is your friend** — Keeps chat visible while you work

---

## 🆘 Need Help?

### **🐛 Found a Bug?**
[Open a bug report](https://github.com/kg20dev/livicat/issues/new?template=bug_report.yml)

### **✨ Feature Request?**
[Open an issue](https://github.com/kg20dev/livicat/issues/new) and tell us what you'd like!

### **💬 Have Questions?**
Check [existing discussions](https://github.com/kg20dev/livicat/discussions) or start a new one.

### **📖 Developer Docs**
See [docs/README_DEVELOPER.md](docs/README_DEVELOPER.md) for technical details.

---

## 📝 What's Next?

**Coming soon:**
- 🔔 Sound notifications for new messages
- 🎯 More preset themes
- 🌊 More animation styles
- 📊 Chat statistics dashboard
- 🪟 Multi-window support for multiple chats

---

## 🙏 Thanks to Streamers

Livicat is made better by streamers like you who use it, report bugs, and suggest features. Thank you for helping us improve! 🙌

**Featured Contributors:**
- [@migorengx](https://github.com/migorengx) — Creator & Maintainer
- [@sutoberiii](https://github.com/sutoberiii) — Collaborator
- [@Necromanchi](https://github.com/Necromanchi) — Collaborator

---

**Made with ❤️ for streamers** | [kg20dev](https://github.com/kg20dev)

**[⬆ Back to main README](../README.md)**
