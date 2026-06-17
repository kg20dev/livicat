# GitHub Release Artifact Freshness

## Problem
Rust's cargo cache in GitHub Actions can cause stale build artifacts to be reused, resulting in releases that contain outdated code despite having fresh source commits.

## Solution Implemented

### 1. Fixed Rust Cache Configuration

**Before:**
```yaml
- name: Cache Rust dependencies
  uses: Swatinem/rust-cache@v2
  with:
    workspaces: src-tauri -> target  # ⚠️ Caches target directory
```

**After:**
```yaml
- name: Cache Rust dependencies
  uses: Swatinem/rust-cache@v2
  with:
    workspaces: src-tauri              # ✅ Cache workspace, not target
    cache-on-failure: true              # ✅ Cache even if build fails
    cache-hit-env-var: RUST_CACHE_HIT   # ✅ Track cache hits in logs
```

**Why this matters:**
- `workspaces: src-tauri -> target` caches the **compiled output** (target directory)
- `workspaces: src-tauri` caches only **dependencies** (Cargo.toml, Cargo.lock)
- This forces recompilation of source code on every build

### 2. Added Explicit Clean Step

**Added to both macOS and Windows builds:**
```yaml
- name: Clean Rust build cache (ensure fresh artifacts)
  run: cd src-tauri && cargo clean
```

**Why this matters:**
- `cargo clean` removes all compiled artifacts (target directory)
- Ensures no stale `.rlib`, `.rmeta`, or binary files are reused
- Forces complete rebuild from source
- Only dependencies are cached (via rust-cache), not compiled code

### 3. Cache Invalidation Strategy

The cache now works like this:

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions Run                                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Checkout source (always fresh)                          │
│ 2. Restore Rust cache (dependencies only, not compiled)    │
│ 3. cargo clean (remove any stale compiled artifacts)        │
│ 4. npm ci (install frontend dependencies)                   │
│ 5. npm run build (build frontend)                           │
│ 6. cargo build (rebuild Rust from source) ✅ FRESH         │
└─────────────────────────────────────────────────────────────┘
```

### 4. Why This Ensures Fresh Artifacts

| Component | Cached? | Rebuilt Every Release? |
|-----------|---------|------------------------|
| **Source code** | ❌ No (checkout) | ✅ Always fresh |
| **Rust dependencies** (crates.io) | ✅ Yes | ❌ No (unchanged) |
| **Compiled Rust code** | ❌ No (cargo clean) | ✅ Always fresh |
| **Frontend dependencies** (node_modules) | ✅ Yes | ❌ No (unchanged) |
| **Frontend build** (dist/) | ❌ No | ✅ Always fresh |
| **Tauri bundle** (.dmg, .exe) | ❌ No | ✅ Always fresh |

## Verification

After these changes, every release build will:

1. ✅ Use fresh source code from git
2. ✅ Recompile all Rust code from source
3. ✅ Rebuild all frontend bundles
4. ✅ Generate fresh installers (DMG, MSI, EXE)

You can verify freshness by checking build logs:

```bash
# Check GitHub Actions logs for:
Compiling app v0.7.0 (/path/to/src-tauri)
# ^ This means it's compiling, not using cache

# NOT:
Finished dev profile [unoptimized] checkout-cache
# ^ This would mean cache hit (won't happen with cargo clean)
```

## Trade-offs

**Pro:** Guaranteed fresh artifacts, no stale code
**Con:** Builds take 2-3 minutes longer (recompilation time)

This is acceptable for release builds where correctness > speed.
