# 🎯 Complete GitHub Actions Workflow - Build Tauri App

## Overview

This workflow builds and releases Livicat (Tauri desktop app) for macOS and Windows when code is pushed to `release/app` branch.

---

## Workflow Structure (v2.0)

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions Build Pipeline                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📋 SETUP & VALIDATION (ubuntu-latest)                        │
│ ├─ Checkout code                                            │
│ ├─ Get version from package.json                           │
│ ├─ Check if should create release                           │
│ └─ 🔑 VALIDATE APTABASE_APP_KEY (fails if missing)            │
│                                                              │
│ 🌐 BUILD FRONTEND (ubuntu-latest)                             │
│ ├─ Checkout code                                            │
│ ├─ Setup Node.js 20 + cache npm                             │
│ ├─ Install dependencies (npm ci)                             │
│ ├─ Build production bundle (npm run build)                   │
│ └─ Upload frontend artifacts (dist/)                         │
│                                                              │
│ 🍎 BUILD MACOS (macos-latest)                                │
│ ├─ needs: [setup, build-app]                               │
│ ├─ Checkout code                                            │
│ ├─ Download frontend artifacts                             │
│ ├─ Setup Node.js 20 + Rust toolchain                       │
│ ├─ Cache Rust dependencies                                 │
│ ├─ Install dependencies                                     │
│ ├─ cargo clean (ensure fresh artifacts)                     │
│ ├─ Build macOS app with analytics                           │
│ └─ Upload macOS artifacts (.dmg, .app)                        │
│                                                              │
│ 🪟 BUILD WINDOWS (windows-latest)                            │
│ ├─ needs: [setup, build-app]                               │
│ ├─ Checkout code                                            │
│ ├─ Download frontend artifacts                             │
│ ├─ Setup Node.js 20 + Rust toolchain                       │
│ ├─ Cache Rust dependencies                                 │
│ ├─ Cache WiX binaries (installer tool)                    │
│ ├─ Install dependencies                                     │
│ ├─ cargo clean (ensure fresh artifacts)                     │
│ ├─ Build Windows app with analytics                         │
│ └─ Upload Windows artifacts (.exe, .msi)                    │
│                                                              │
│ 🚀 CREATE RELEASE (ubuntu-latest)                            │
│ ├─ needs: [setup, build-mac, build-windows]                │
│ ├─ Download macOS artifacts (ZIP)                           │
│ ├─ Download Windows artifacts (ZIP)                          │
│ ├─ Extract ZIPs to get actual binaries                        │
│ ├─ Create GitHub Release with tag                            │
│ └─ Attach DMG, EXE, MSI files                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Total Time: ~8-10 minutes (parallel builds)
```

---

## Triggering the Workflow

The workflow triggers on:

1. **Push to `release/**` branch** (automatic after PR merge)
2. **Tag push** (manual: `git push origin v1.0.0`)
3. **Manual dispatch** (via GitHub UI)

### New Workflow Structure (v2.1)

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions Build Pipeline                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📋 SETUP & VALIDATION (ubuntu-latest)                        │
│     ✓ Checkout code                                          │
│     ✓ Get version from package.json                           │
│     ✓ Check if should create release                           │
│     ✓ 🔑 VALIDATE APTABASE_APP_KEY (fails if missing)            │
│                                                              │
│ 🌐 BUILD FRONTEND (ubuntu-latest)                             │
│     ✓ Checkout code                                            │
│     ✓ Setup Node.js 20 + cache npm                             │
│     ✓ Install dependencies (npm ci)                             │
│     ✓ Build production bundle (npm run build) → dist/           │
│     ✓ Upload frontend artifacts (dist/)                         │
│                                                              │
│ 🍎 BUILD MACOS (macos-latest)                                │
│     ✓ needs: [setup, build-app]                               │
│     ✓ Checkout code                                            │
│     ✓ Download frontend artifacts (dist/) ← REUSES BUILD-APP     │
│     ✓ Verify dist/ exists (validation step)                     │
│     ✓ Setup Node.js 20 + Rust toolchain                       │
│     ✓ Install dependencies                                     │
│     ✓ cargo clean (ensure fresh artifacts)                     │
│     ✓ Build macOS app (uses existing dist/) ← NO REBUILD        │
│     ✓ Upload macOS artifacts (.dmg, .app)                        │
│                                                              │
│ 🪟 BUILD WINDOWS (windows-latest)                             │
│     ✓ needs: [setup, build-app]                               │
│     ✓ Checkout code                                            │
│     ✓ Download frontend artifacts (dist/) ← REUSES BUILD-APP     │
│     ✓ Verify dist/ exists (validation step)                     │
│     ✓ Setup Node.js 20 + Rust toolchain                       │
│     ✓ Cache Rust dependencies + WiX                             │
│     ✓ Install dependencies                                     │
│     ✓ cargo clean (ensure fresh artifacts)                     │
│     ✓ Build Windows app (uses existing dist/) ← NO REBUILD       │
│     ✓ Upload Windows artifacts (.exe, .msi)                      │
│                                                              │
│ 🚀 CREATE RELEASE (ubuntu-latest)                            │
│     ✓ needs: [setup, build-mac, build-windows]                │
│     ✓ Download macOS artifacts (ZIP)                           │
│     ✓ Download Windows artifacts (ZIP)                          │
│     ✓ Extract ZIPs to get actual binaries                        │
│     ✓ Create GitHub Release with tag                            │
│     ✓ Attach DMG, EXE, MSI files                               │
│     ✓ Generate release notes                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Total Time: ~7-8 minutes (parallel builds, frontend built once)
```

### Key Optimization: Build Once, Use Twice

**Before (v2.0):**
```
build-mac:  npm ci → npm run build → npm run tauri:build (rebuilds frontend ❌)
build-windows: npm ci → npm run build → npm run tauri build (rebuilds frontend ❌)
```

**After (v2.1):**
```
build-app: npm ci → npm run build (builds once) ✅
build-mac:  downloads dist/ → cargo tauri build (uses pre-built dist/) ✅
build-windows: downloads dist/ → cargo tauri build (uses pre-built dist/) ✅
```

---

## Environment Variables

### Required Variables

| Variable | Source | Purpose | Where to Set |
|----------|--------|---------|--------------|
| `APTABASE_APP_KEY` | GitHub Environment Variables | Analytics tracking | https://github.com/kg20dev/livicat/settings/variables |

### Automatic Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `GITHUB_TOKEN` | GitHub (automatic) | Tauri build permissions |
| `RELEASE_BRANCH_PREFIX` | Workflow config | Detects release branches |

---

## Build Outputs

### macOS Artifacts
```
src-tauri/target/aarch64-apple-darwin/release/bundle/
├── dmg/
│   └── Livicat_0.7.2_aarch64.dmg        # ~5 MB installer
└── macos/
    └── Livicat.app                      # macOS app bundle
        └── Contents/
            ├── MacOS/
            │   └── app                    # Rust binary
            ├── Resources/
            │   ├── index.html            # Frontend
            │   ├── assets/               # JS, CSS, images
            │   └── ...                   # Other assets
            └── Info.plist              # App metadata
```

### Windows Artifacts
```
src-tauri/target/release/bundle/
├── msi/
│   └── Livicat_0.7.2_x64_en-US.msi     # ~4 MB MSI installer
└── nsis/
    └── Livicat_0.7.2_x64-setup.exe    # ~3 MB EXE installer
```

---

## Key Features

### 1. **Frontend Build Once**
- Single `build-app` job builds frontend
- Both macOS and Windows download the same artifacts
- **Saves ~2 minutes** vs building twice

### 2. **Aptabase Validation**
- Fails early if `APTABASE_APP_KEY` is not set
- Prevents broken analytics in production builds
- Clear error message with setup instructions

### 3. **Fresh Artifacts**
- `cargo clean` before each build
- Prevents stale Rust binaries
- Ensures reproducible builds

### 4. **WiX Caching**
- Windows installer tool cached
- Prevents 504 timeout errors
- **Saves ~5 minutes** on Windows builds

### 5. **Artifact Extraction**
- Downloads ZIP archives from GitHub Actions
- Extracts before creating release
- Ensures binaries are properly attached

---

## Setting Up Aptabase Analytics

### Step 1: Get App Key
1. Go to https://us.aptabase.com
2. Create account/login
3. Create new project: "Livicat"
4. Copy your **App Key** (e.g., `A-US-xxxxxxxxx`)

### Step 2: Add to GitHub Environment Variables
1. Go to: https://github.com/kg20dev/livicat/settings/variables
2. Click **"New repository variable"**
3. **Name**: `APTABASE_APP_KEY`
4. **Value**: `A-US-xxxxxxxxx` (your key)
5. **Environment**: `release/**` (or "All" for all branches)
6. Click **"Add variable"**

### Step 3: Verify
- Next build to `release/app` will validate the key
- If missing, build fails with instructions

---

## Troubleshooting

### Build Fails: "APTABASE_APP_KEY not set"

**Error:**
```
❌ ERROR: APTABASE_APP_KEY environment variable not set!
```

**Fix:**
1. Go to: https://github.com/kg20dev/livicat/settings/variables
2. Add `APTABASE_APP_KEY` variable
3. Re-run the workflow

### Build Fails: WiX Download Timeout

**Error:**
```
failed to bundle project `http status: 504`
```

**Status:** ✅ Fixed by WiX caching (v0.7.2+)

### Release Created But No Artifacts

**Status:** ✅ Fixed in v0.7.2

Artifacts are now extracted from ZIPs before attaching to release.

### Version Shows Wrong Number

**Check:**
- `package.json` version (npm version)
- `src-tauri/Cargo.toml` version
- `src-tauri/tauri.conf.json` version
- Run `npm run version` to sync all files

---

## How Tauri Build Uses Frontend

### Production (CI with pre-built frontend)

In the CI workflow, the build process is:

1. **build-app job**: 
   - Runs `npm run build` → creates `dist/`
   - Uploads `dist/` as "livicat-frontend" artifact

2. **build-mac/build-windows jobs**:
   - Download `livicat-frontend` artifact → extracts to `dist/`
   - Verify `dist/` exists (validation)
   - Run `cargo tauri build` → **uses existing `dist/`** (no rebuild)

3. **Tauri configuration** (`tauri.conf.json`):
   ```json
   "build": {
     "frontendDist": "../dist",
     "beforeDevCommand": "npm run dev",
     "beforeBuildCommand": ""  ← Empty = don't rebuild in production
   }
   ```
   - `beforeDevCommand`: Starts dev server for local development with HMR
   - `beforeBuildCommand`: Empty → Uses pre-built `dist/` for production

### Local Development (manual frontend build)

For local builds, you have two options:

**Option 1: Build frontend separately**
```bash
# Build frontend once
npm run build

# Build Tauri app (uses existing dist/)
npm run tauri:build
```

**Option 2: Full build (rebuilds frontend)**
```bash
# Remove old frontend
rm -rf dist/

# Tauri will fail (no dist/), so:
npm run build
npm run tauri:build
```

**For development with HMR:**
```bash
npm run tauri:dev  # Uses beforeDevCommand (starts dev server automatically)
```

---

## Workflow Best Practices

### For Release Managers

1. **Always test locally first**
   ```bash
   npm run tauri:build  # or tauri:dev for testing
   ```

2. **Verify version sync**
   ```bash
   npm run version  # syncs package.json, Cargo.toml, tauri.conf.json
   ```

3. **Create GitHub Issue** for each release
   - Track changes
   - Use issue-based branches

4. **Merge PR to `release/app`**
   - CI builds automatically
   - Release created with artifacts

### For Developers

1. **Feature workflow**
   - Create issue
   - Branch from issue
   - PR to `main`
   - After merge, create release issue
   - Release PR to `release/app`

2. **Never commit directly to `main`**
   - Always use PRs
   - Protect `main` branch

3. **Test on your platform**
   - Local builds save CI time
   - Verify before pushing

---

## GitHub Actions Run Details

### Job Dependencies

```
setup (must succeed)
  ↓
build-app (must succeed)
  ↓
  ├─ build-mac (parallel)
  └─ build-windows (parallel)
        ↓
    release (requires all)
```

### Build Times

| Job | Time | Notes |
|-----|------|-------|
| Setup | ~30s | Validation, version check |
| Build App | ~1m | Frontend build (Node.js) |
| Build macOS | ~5-6m | Rust compilation + bundling |
| Build Windows | ~10-12m | Rust + WiX + NSIS |
| Release | ~30s | Download + upload artifacts |

**Total:** ~7-9 minutes (parallel macOS + Windows)

---

## Checking Build Status

### View Latest Run
```bash
gh run list --branch release/app --limit 3
```

### View Specific Run
```bash
gh run view <run-id>
```

### Watch Build in Real-time
```bash
gh run watch <run-id> --exit-status
```

---

## Release Checklist

Before merging release PR to `release/app`:

- [ ] Version synced across all files
- [ ] `npm run version` executed
- [ ] Changelog updated (automatic)
- [ ] Aptabase key configured
- [ ] Local build tested
- [ ] Release issue created
- [ ] PR description complete
- [ ] Ready to merge

After build completes:

- [ ] CI shows "success" status
- [ ] Release created on GitHub
- [ ] Artifacts attached (DMG, EXE, MSI)
- [ ] Download and test installer
- [ ] Version displayed correctly in app
- [ ] Analytics working (check dashboard)

---

**Last Updated:** v0.7.2  
**Workflow Version:** 2.0  
**Maintained By:** @migorengx
