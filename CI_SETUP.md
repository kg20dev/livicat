# GitHub Actions Setup for Livicat

## Aptabase Analytics Key Configuration

### Why Aptabase is Required

Production builds of Livicat include Aptabase analytics for:
- User adoption tracking
- Performance monitoring  
- Crash detection
- Feature usage insights

The CI workflow now **validates** that the Aptabase key is configured before building.

### Setting Up APTABASE_APP_KEY Secret

1. **Get your Aptabase App Key**
   - Go to https://us.aptabase.com
   - Sign in or create account
   - Create a new project: "Livicat"
   - Copy your **App Key** (looks like `A-US-xxxxxxxxx`)

2. **Add to GitHub Secrets**
   - Go to: https://github.com/kg20dev/livicat/settings/secrets/actions
   - Click **"New repository secret"**
   - **Name**: `APTABASE_APP_KEY`
   - **Value**: Your Aptabase App Key (e.g., `A-US-xxxxxxxxx`)
   - Click **"Add secret"**

3. **Verify Configuration**
   - The next build to `release/app` will check for this key
   - If missing, the build will fail with instructions

### Local Development (Optional)

For local development with analytics, create a `.env` file:

```bash
# In project root
APTABASE_APP_KEY=A-US-xxxxxxxxx
```

Note: `.env` is in `.gitignore`, so your key won't be committed.

## New Workflow Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Improved GitHub Actions Workflow                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. SETUP & VALIDATION (ubuntu-latest)                      │
│     ✓ Checkout code                                          │
│     ✓ Get version from package.json                          │
│     ✓ Check if should create release                         │
│     ✓ 🔑 VALIDATE APTABASE_APP_KEY (fails if missing)         │
│                                                              │
│  2. BUILD FRONTEND (ubuntu-latest)                           │
│     ✓ Checkout code                                          │
│     ✓ Setup Node.js + cache npm                             │
│     ✓ Install dependencies                                  │
│     ✓ Build production bundle (npm run build)               │
│     ✓ Upload frontend artifacts (dist/)                     │
│                                                              │
│  3. BUILD MACOS (macos-latest)                               │
│     needs: [setup, build-app]                                │
│     ✓ Download frontend artifacts                           │
│     ✓ Setup Node.js + Rust                                  │
│     ✓ Install dependencies                                  │
│     ✓ cargo clean (fresh artifacts)                           │
│     ✓ Build macOS app with analytics                         │
│     ✓ Upload macOS artifacts (.dmg, .app)                    │
│                                                              │
│  4. BUILD WINDOWS (windows-latest)                           │
│     needs: [setup, build-app]                                │
│     ✓ Download frontend artifacts                           │
│     ✓ Setup Node.js + Rust                                  │
│     ✓ Cache WiX binaries                                    │
│     ✓ Install dependencies                                  │
│     ✓ cargo clean (fresh artifacts)                           │
│     ✓ Build Windows app with analytics                       │
│     ✓ Upload Windows artifacts (.exe, .msi)                 │
│                                                              │
│  5. CREATE RELEASE (ubuntu-latest)                           │
│     needs: [setup, build-mac, build-windows]                │
│     ✓ Download macOS artifacts (ZIP)                        │
│     ✓ Download Windows artifacts (ZIP)                       │
│     ✓ Extract ZIPs to get actual binaries                    │
│     ✓ Create GitHub Release with tag                         │
│     ✓ Attach DMG, EXE, MSI files                            │
│     ✓ Generate release notes                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Total time: ~8-10 minutes (parallel builds)
```

## Environment Variables Passed to Builds

| Variable | Purpose | Source |
|----------|---------|--------|
| `APTABASE_APP_KEY` | Analytics tracking | GitHub Secrets |
| `GH_TOKEN` | Tauri build permissions | GitHub (automatic) |

## Build Output

### macOS
```
src-tauri/target/aarch64-apple-darwin/release/bundle/
├── dmg/Livicat_0.7.2_aarch64.dmg    # ~5 MB installer
└── macos/Livicat.app                 # macOS app bundle
```

### Windows
```
src-tauri/target/release/bundle/
├── msi/Livicat_0.7.2_x64_en-US.msi    # ~4 MB MSI installer
└── nsis/Livicat_0.7.2_x64-setup.exe  # ~3 MB EXE installer
```

## Troubleshooting

### Build Fails: "APTABASE_APP_KEY secret not set"

**Error:**
```
❌ ERROR: APTABASE_APP_KEY secret not set!
Analytics is required for production builds.
```

**Solution:**
1. Go to: https://github.com/kg20dev/livicat/settings/secrets/actions
2. Add `APTABASE_APP_KEY` secret
3. Re-run the workflow

### Build Fails: WiX Download Timeout

**Error:**
```
failed to bundle project `http status: 504`
```

**Solution:** This is now cached. Re-run the workflow.

### Release Created But No Artifacts

**Old Issue** (Fixed in v0.7.2):
Artifacts were downloaded as ZIPs but not extracted.

**Solution:** Workflow now extracts artifacts before attaching to release.

## Local vs CI Builds

| Aspect | Local Build | CI Build |
|-------|-------------|-----------|
| **Aptabase** | Uses `.env` file or disabled | Uses GitHub Secret |
| **Cache** | Local Rust/npm cache | GitHub Actions cache |
| **Speed** | Same (full recompile) | Same (cargo clean) |
| **Artifacts** | Local `src-tauri/target/` | Uploaded to GitHub Release |

## Verification

After each release, verify:

1. ✅ **Release page shows artifacts**
   - https://github.com/kg20dev/livicat/releases

2. ✅ **DMG installs and runs**
   - Check version in app: `vX.Y.Z` (should match release)

3. ✅ **Analytics working** (optional)
   - Check Aptabase dashboard for events

---

**Last Updated:** v0.7.2  
**Workflow Version:** 2.0
