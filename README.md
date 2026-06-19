<p align="center">
  <img src="livicat-icon.png" alt="Livicat Icon" width="128" height="128">
</p>

# Livicat — YouTube Live Chat Styling Editor for OBS

A desktop app for customizing YouTube Live Chat appearance for OBS overlays.

![Release](https://img.shields.io/github/v/release/kg20dev/livicat)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)
![Size](https://img.shields.io/badge/binary%20size-~8%20MB-brightgreen)
![macOS](https://img.shields.io/badge/macOS-supported-brightgreen?logo=apple&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-supported-brightgreen?logo=windows&logoColor=white)

<p align="center">
  <img src="Screenshot 2026-06-20 at 00.09.25.png" alt="Livicat Demo" width="720">
</p>

---

## 📚 Documentation

### 🎯 [For Streamers → docs/STREAMER.md](docs/STREAMER.md)
*Installation • Quick Start • OBS Setup • Customization • Troubleshooting*

### 🛠️ [For Developers → docs/README_DEVELOPER.md](docs/README_DEVELOPER.md)
*Architecture • Setup • API Reference • Testing • Contributing*

---

## ✨ Features

- 🎨 **Theme Packages** — Colour Bubble (IM-style) and Neon Sticker (vibrant sticker-style)
- ✨ **Message Animations** — Entrance animations for usernames and messages
- 🪟 **Live Preview** — Real-time chat popup for OBS Window Capture
- ⚡ **Real-Time Preview** — Popup window with gallery mode
- 📱 **Responsive Portrait Layout** — Floating sidebar, collapsible panels
- 🎯 **Username Vertical Offset** — Fine-tune username position (-20px to +20px)

---

## 🎥 Demo Videos

**Fast Live Chat Styling:**

<a href="https://www.youtube.com/watch?v=8rsJAPWoyW4" target="_blank">
  <img src="https://img.youtube.com/vi/8rsJAPWoyW4/maxresdefault.jpg" alt="Fast Live Chat Styling" width="480" style="border-radius: 8px;">
</a>

**OBS Integration Tutorial:**

<a href="https://www.youtube.com/watch?v=pmZq-mYhObc" target="_blank">
  <img src="https://img.youtube.com/vi/pmZq-mYhObc/maxresdefault.jpg" alt="OBS Integration Tutorial" width="480" style="border-radius: 8px;">
</a>

---

## 📥 Download

🎉 **[Latest Release: v0.9.3](https://github.com/kg20dev/livicat/releases)**

- **macOS (Apple Silicon):** `.dmg` installer
- **Windows:** `.exe` installer

> **⚠️ macOS Gatekeeper:** If the app shows "damaged and can't be opened," run this in Terminal:
> ```bash
> sudo xattr -rd com.apple.quarantine /Applications/Livicat.app
> ```

---

## 🚀 Quick Start

**Streamers:** 2 minutes to custom chat → [docs/STREAMER.md](docs/STREAMER.md)

**Developers:** `git clone && npm install` → [docs/README_DEVELOPER.md](docs/README_DEVELOPER.md)

> **⚠️ Windows + OBS Live Preview (Window Capture):**  
> In OBS, open the Window Capture source properties and set **Capture Method** to **"Windows 10 (1903 and up)"** — do not leave it on "Automatic". The preview window won't update without this setting.
>
> <img src="docs/yurisi-doc.png" alt="OBS Capture Method setting" width="300">

---

## 📊 Stats

- **Size:** ~8MB (93% smaller than Electron)
- **Tests:** 295+ tests
- **Languages:** TypeScript, Rust, React
- **Platforms:** macOS, Windows
- **License:** GPL-3.0

---

## 🤝 Contributing

- [Report a Bug](https://github.com/kg20dev/livicat/issues/new?template=bug_report.yml)
- [Feature Request](https://github.com/kg20dev/livicat/issues/new)
- [Contributing Guide](docs/README_DEVELOPER.md#contributing)

---

## 👥 Team

**Thanks to our contributors who make Livicat better!**

<p align="center">
  <a href="https://github.com/migorengx">
    <img src="https://github.com/migorengx.png" width="80" height="80" alt="migorengx" style="border-radius: 50%; border: 3px solid #a855f7; box-shadow: 0 0 12px rgba(168,85,247,0.4);">
  </a>
  <br>
  <strong>migorengx</strong>
  <br>
  <span style="display: inline-block; background: linear-gradient(135deg, #a855f7, #eab308); color: #fff; padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">🧙 Sage</span>
  <br><br>
</p>

<p align="center">
  <a href="https://github.com/sutoberiii"><img src="https://github.com/sutoberiii.png" width="72" height="72" alt="sutoberiii" style="border-radius: 50%; border: 2px solid #3b82f6; box-shadow: 0 0 8px rgba(59,130,246,0.3);"></a>
  <a href="https://github.com/Necromanchi"><img src="https://github.com/Necromanchi.png" width="72" height="72" alt="Necromanchi" style="border-radius: 50%; border: 2px solid #14b8a6; box-shadow: 0 0 8px rgba(20,184,166,0.3);"></a>
  <a href="https://github.com/yurisien"><img src="https://github.com/yurisien.png" width="72" height="72" alt="yurisien" style="border-radius: 50%; border: 2px solid #3b82f6; box-shadow: 0 0 8px rgba(59,130,246,0.3);"></a>
  <a href="https://github.com/asahoy"><img src="https://github.com/asahoy.png" width="72" height="72" alt="asahoy" style="border-radius: 50%; border: 2px solid #3b82f6; box-shadow: 0 0 8px rgba(59,130,246,0.3);"></a>
  <a href="https://github.com/yamuyamcik"><img src="https://github.com/yamuyamcik.png" width="72" height="72" alt="yamuyamcik" style="border-radius: 50%; border: 2px solid #3b82f6; box-shadow: 0 0 8px rgba(59,130,246,0.3);"></a>
  <a href="https://github.com/arale-afk"><img src="https://github.com/arale-afk.png" width="72" height="72" alt="arale-afk" style="border-radius: 50%; border: 2px solid #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.3);"></a>
</p>

<p align="center">
  <span style="display: inline-block; background: #3b82f6; color: #fff; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; margin: 0 2px;">🛡️ sutoberiii</span>
  <span style="display: inline-block; background: #14b8a6; color: #fff; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; margin: 0 2px;">🎵 Necromanchi</span>
  <span style="display: inline-block; background: #3b82f6; color: #fff; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; margin: 0 2px;">🛡️ yurisien</span>
  <span style="display: inline-block; background: #3b82f6; color: #fff; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; margin: 0 2px;">🛡️ asahoy</span>
  <span style="display: inline-block; background: #3b82f6; color: #fff; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; margin: 0 2px;">🛡️ yamuyamcik</span>
  <span style="display: inline-block; background: #ef4444; color: #fff; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; margin: 0 2px;">⚔️ arale-afk</span>
</p>

<table align="center">
  <tr>
    <td align="center" width="140">
      <strong>🧙 Sage</strong><br><span style="font-size:12px;color:#a855f7;">migorengx</span><br><small>Creator & Lead</small>
    </td>
    <td align="center" width="140">
      <strong>🎵 Bard</strong><br><span style="font-size:12px;color:#14b8a6;">Necromanchi</span><br><small>Storyteller</small>
    </td>
    <td align="center" width="140">
      <strong>⚔️ Warrior</strong><br><span style="font-size:12px;color:#ef4444;">arale-afk</span><br><small>Frontline</small>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="3">
      <strong>🛡️ Defenders</strong><br>
      <span style="font-size:12px;color:#3b82f6;">sutoberiii · yurisien · asahoy · yamuyamcik</span><br>
      <small>Guardians of the stream</small>
    </td>
  </tr>
</table>

**Thank you to:**

- All streamers and developers who use Livicat
- Contributors who report bugs and suggest features
- Community members who test and provide feedback
- Everyone who helps improve Livicat! 🙌

---

**Made with ❤️ for streamers** | [kg20dev](https://github.com/kg20dev)
