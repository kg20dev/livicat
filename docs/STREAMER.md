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
- 🎨 **2 theme packages** — Colour Bubble, Neon Sticker with unique visual styles
- ⚡ **Real-time preview** — See changes instantly as you customize
- 📤 **One-click OBS setup** — No complex configuration needed
- 🪟 **Live Preview popup** — Simple OBS Window Capture setup

---

## 🆚 Why use Livicat?

### **Problem:** YouTube's default chat is boring
- 📺 Plain white background with black text
- 🚫 No customization options
- 😴 Looks the same as everyone else

### **Solution:** Livicat makes it unique
- 🎨 Match your brand colors and style
- ✨ Add smooth animations to new messages
- 🎯 Choose from theme packages
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

> **⚠️ macOS Gatekeeper:** If you see "Livicat is damaged and can't be opened" or the app won't launch, run this in Terminal to bypass Gatekeeper:
> ```bash
> sudo xattr -rd com.apple.quarantine /Applications/Livicat.app
> ```
> This removes the quarantine flag from the downloaded app. You only need to do this once after installation.

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
- **Pick a theme** — Choose between Colour Bubble or Neon Sticker
- **Adjust colors** — Change background, username, message, border, and role colors
- **Choose fonts** — Pick from 15+ Google Fonts
- **Add animations** — Add entrance animations to usernames and messages
- **Fine-tune spacing** — Adjust padding, border radius, avatar offset, and message spacing

### **Step 4: Preview Your Changes**
- Changes appear instantly in the preview area
- Use demo messages to test without waiting for real chat
- Switch to "Live Chat" to see actual YouTube chat

### **Step 5: Add to OBS via Live Preview**

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
>
> <img src="yurisi-doc.png" alt="OBS Capture Method setting" width="300">

---

## 🎨 Customization Options

### **Theme Packages**

#### **Colour Bubble** — Classic IM-style chat
| Section | Settings |
|---------|----------|
| **OBS** | Chroma Key toggle |
| **Bubble** | Background, Text Color, Border Color/Width, Corner Radius, Padding, Tail Offset, Avatar Offset, Max Width |
| **Username** | Color, Size, Bold, Vertical Offset |
| **Message** | Content Font Size |
| **Avatar** | Size, Vertical Offset |
| **Common** | Container/Message Opacity, Spacing (Compact/Normal/Comfortable), Animation Speed |
| **Animation** | Username Entrance (Slide/Wiggle/Pop/Fade), Message Entrance (Slide/Bounce/Pop/Fade) |
| **YouTube** | Hide Generic Messages, Hide Header/Footer |
| **Visibility** | Show Avatars |
| **Role Colors** | Owner/Mod/Member background, text, username colors |

#### **Neon Sticker** — Vibrant sticker-style chat
| Section | Settings |
|---------|----------|
| **OBS** | Chroma Key toggle |
| **Colors** | Background, Text Color, Username Color |
| **Typography** | Name Size, Content Size, Avatar Size, Avatar Offset |
| **Effects** | Skew Angle, Shadow Offset/Color, Stroke Width/Color, Glow Spread, Max Width, Corner Radius |
| **Frame** | Include Frame toggle, Frame Margin |
| **Common** | Container/Message Opacity, Animation Speed, Screen Margin, Font Family |
| **YouTube** | Hide Generic Messages, Hide Header/Footer |
| **Role Colors** | Owner/Mod/Member background, text colors |

### **Typography (15+ Google Fonts)**
- **Sans-serif:** Inter, Roboto, Open Sans, Lato, Source Sans 3, Ubuntu
- **Display:** Montserrat, Poppins, Oswald, Raleway, Quicksand, Playfair Display
- **Monospace:** Fira Code, JetBrains Mono
- **More:** Nunito

---

## 🔧 Common Issues & Solutions

### **❌ "Live Chat button doesn't work"**
**Solution:**
- Make sure you've entered a YouTube URL and clicked "Fetch"
- Check that the URL is a valid YouTube video or stream
- Try refreshing the page and entering the URL again

### **❌ "Window not showing in OBS"**
**Solution:**
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
- Using theme packages
- Using the theme system

---

### **OBS Integration Tutorial**
[![Watch the tutorial](https://img.youtube.com/vi/pmZq-mYhObc/0.jpg)](https://www.youtube.com/watch?v=pmZq-mYhObc)

**Learn:**
- Using Window Capture for the Livicat preview
- Positioning and sizing your chat overlay
---

## 💡 Pro Tips

1. **Match your brand** — Use your stream's colors in Livicat
2. **Test before going live** — Use demo messages to preview
3. **Keep it readable** — Don't make font too small or text too transparent
4. **Use animations sparingly** — Too much motion can distract viewers
5. **Save your favorites** — Screenshots of settings you like for future streams

---

## 🆘 Need Help?

### **🐛 Found a Bug?**
[Open a bug report](https://github.com/kg20dev/livicat/issues/new?template=bug_report.yml)

### **✨ Feature Request?**
[Open an issue](https://github.com/kg20dev/livicat/issues/new) and tell us what you'd like!

### **💬 Have Questions?**
Check [existing discussions](https://github.com/kg20dev/livicat/discussions) or start a new one.

### **📖 Developer Docs**
See [README_DEVELOPER.md](README_DEVELOPER.md) for technical details.

---

## 📝 What's Next?

**Coming soon:**
- 🎯 More theme packages
- 🌊 More animation styles

---

## 🙏 Thanks to Streamers

Livicat is made better by streamers like you who use it, report bugs, and suggest features. Thank you for helping us improve! 🙌

---

**Made with ❤️ for streamers** | [kg20dev](https://github.com/kg20dev)

**[⬆ Back to main README](../README.md)**
