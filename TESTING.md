# 🧪 Testing Guide: Sentry + Aptabase Analytics

## Quick Test Commands

### 1. **Test Both Systems (Recommended)**
```bash
./test-all-analytics.sh
```
This runs a comprehensive test of both Sentry and Aptabase.

### 2. **Test Sentry Only**
```bash
cd src-tauri
SENTRY_DSN="https://your-dsn@sentry.io/project-id" cargo test test_sentry_live_delivery -- --nocapture
```

### 3. **Test with App Running**
```bash
cd src-tauri
cargo run
```
Watch for analytics logs in the console output.

---

## 🎯 Sentry Testing Features

### **Test Types Available:**

#### **1. Live Test (Default)**
- ✅ Error capture
- ✅ Message capture  
- ✅ Breadcrumb tracking
- ✅ Log integration

#### **2. Fake Crash Event**
Simulates a crash without actually crashing:
```
Events sent:
• Fake crash event
• Crash metadata (type, purpose, context)
• Fatal level breadcrumb
```

#### **3. Fake Error with Stack Trace**
Simulates an error with user journey:
```
Events sent:
• User action breadcrumb: "User clicked 'Open Preview'"
• Feature breadcrumb: "Preview functionality"
• Error breadcrumb: "Preview window creation failed"
• Error with full context and stack trace
```

#### **4. Complete Test Scenario**
Full user journey simulation:
```
User journey:
1. User opens YouTube live chat
2. CSS injection works
3. YouTube API timeout error
4. User retries operation
5. CSS parsing error
6. App crash simulation
```

---

## 🚀 Runtime Testing (From React)

You can trigger test crashes from your React app:

### **Add to your React component:**
```typescript
import { invoke } from '@tauri-apps/api/core';

// Test different crash types
async function testSentry() {
  // Option 1: Fake crash (recommended - won't crash app)
  await invoke('trigger_crash_test', { crashType: 'fake_crash' });
  
  // Option 2: Fake error with stack trace
  await invoke('trigger_crash_test', { crashType: 'fake_error' });
  
  // Option 3: Complete scenario
  await invoke('trigger_crash_test', { crashType: 'scenario' });
  
  // Option 4: Real panic (⚠️  will crash the app!)
  await invoke('trigger_crash_test', { crashType: 'panic' });
}

// Add test button to your UI
<button onClick={() => testSentry()}>Test Sentry</button>
```

---

## 🔍 Dashboard Verification

### **Sentry Dashboard: https://sentry.io/organizations/livicat/**

**What to look for:**
- 🎯 **Events Tab:**
  - Fake crash events
  - Fake errors with breadcrumbs
  - Complete user journey scenarios
  - Live test errors/messages

- 📍 **Breadcrumbs:**
  - User actions: "User clicked 'Open Preview'"
  - Feature usage: "Preview functionality"
  - Error context: "YouTube API timeout"

- 📊 **Context:**
  - Environment: `development`
  - Release: `livicat@0.7.6`
  - Platform: `rust`
  - App version and OS info

### **Aptabase Dashboard: https://us.aptabase.com/**

**What to look for:**
- 📈 **Live Events:** Recent `app_launched` events
- 🖥️ **Device Info:** OS, architecture, app version
- ⏰ **Timeline:** Real-time event ingestion
- 📍 **Activity:** Events from your development environment

---

## 🧪 Test Scenarios Explained

### **Scenario 1: Happy Path**
```rust
// User successfully uses preview feature
add_breadcrumb("user_action", "User opened YouTube live chat", Level::Info);
add_breadcrumb("css_injection", "CSS injected successfully", Level::Info);
```
**Sentry shows:** User journey with success breadcrumbs.

### **Scenario 2: API Failure**
```rust
// YouTube API fails
add_breadcrumb("api_request", "Fetching live chat data", Level::Info);
capture_error("YouTube API timeout");
add_breadcrumb("api_error", "Request failed", Level::Error);
```
**Sentry shows:** Error with full context and breadcrumbs leading to it.

### **Scenario 3: App Crash**
```rust
// Simulated crash
send_fake_crash_event();
```
**Sentry shows:** Fatal error with crash metadata and context.

---

## ⚡ Performance & Delivery

### **Event Delivery Times:**
- **Sentry:** Events appear within 1-5 seconds
- **Aptabase:** Events appear within 1-2 minutes

### **What Gets Captured:**
✅ **Sentry:** Panics, errors, logs, breadcrumbs
✅ **Aptabase:** User events, app launches, feature usage

### **What Gets Filtered:**
❌ **Sentry:** YouTube URLs, CSS content, PII
❌ **Both:** File paths, user data, sensitive information

---

## 🛠️ Troubleshooting

### **Events not appearing in Sentry?**
1. Check DSN is correct: `cat src-tauri/.env | grep SENTRY_DSN`
2. Check network connectivity
3. Refresh Sentry dashboard
4. Try running test again: `./test-all-analytics.sh`

### **Events not appearing in Aptabase?**
1. Check app key: `cat src-tauri/.env | grep APTABASE`
2. Check Aptabase dashboard for real-time events
3. Verify app is running (not just compiled)

### **Test warnings?**
- Warnings about unused functions are normal (test-only code)
- Compilation warnings are safe to ignore

---

## 📝 Quick Reference

```bash
# Full test suite
./test-all-analytics.sh

# Sentry only test
cd src-tauri && SENTRY_DSN="..." cargo test test_sentry_live_delivery

# Run app to see live analytics
cd src-tauri && cargo run

# Check configuration
cat src-tauri/.env | grep -E "(SENTRY|APTABASE)"
```

**Happy testing!** 🎯 All events should appear in your dashboards within seconds!