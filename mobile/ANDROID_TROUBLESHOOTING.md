# Android Black Screen Troubleshooting

## Problem
Expo app shows black screen on Android emulator but works correctly in web browser.

## What We've Tried

### Attempt 1: Clear Expo Go app cache
- Command: `adb shell pm clear host.exp.exponent`
- Result: ❌ Still black screen

### Attempt 2: Disable newArchEnabled
- Changed `app.json`: `"newArchEnabled": false`
- Result: ❌ Still black screen (Expo Go ignores this setting anyway)

### Attempt 3: Disable edgeToEdgeEnabled
- Changed `app.json`: `"edgeToEdgeEnabled": false`
- Result: ❌ Still black screen

### Attempt 4: Fresh project from template
- Created new project with `npx create-expo-app@latest mobile --template tabs`
- Result: ❌ Still black screen - even official template doesn't work

### Attempt 5: Offline mode
- Command: `npx expo start --offline --android`
- Result: ❌ Still black screen

### Attempt 6: ADB reverse port forwarding
- Commands:
  ```bash
  adb reverse tcp:8081 tcp:8081
  ```
- Result: ❌ Still black screen - Metro shows no bundling activity

### Attempt 7: Restart ADB server
- Commands:
  ```bash
  adb kill-server
  adb start-server
  adb devices  # Shows emulator-5554
  ```
- Result: ❌ Emulator connected but still black screen

## Root Cause Analysis

### Observation 1: No Metro Bundling
When the app loads on Android, Metro should show:
```
Android Bundled XXXms node_modules\expo-router\entry.js (XXXX modules)
```
But we're NOT seeing this - which means:
- The app is NOT requesting the JavaScript bundle from Metro
- Expo Go might be stuck or failing silently

### Observation 2: Web Works Fine
Web bundling works correctly:
```
Web Bundled 40893ms node_modules\expo-router\entry.js (1112 modules)
```

### Observation 3: API Level
Using Android API 36 (Android 15+) which has known issues with expo-splash-screen in debug builds.

## Next Steps To Try

### 1. ⭐ Use Development Build (Recommended)
Instead of Expo Go, compile a native debug build:
```bash
npx expo run:android
```
This creates a custom build with expo-dev-client and bypasses Expo Go entirely.

### 2. Try Lower API Level Emulator
Create a new AVD with API 33 or 34 instead of API 36.

### 3. Check Logcat for errors
```bash
adb logcat *:E | findstr -i expo
```

### 4. Manually launch the URL in Expo Go
Open Expo Go on emulator and manually enter:
```
exp://192.168.1.254:8081
```

### 5. Wipe emulator completely
In Android Studio AVD Manager, wipe the emulator data and reinstall Expo Go.

## Research Findings

### From GitHub Issue #35205
- Black screen is a **known issue** on Android 14/15 with expo-splash-screen
- Only affects **debug builds**, not production
- Related to upstream Android bug Google hasn't fixed
- The splash screen should eventually timeout, but the app should load

### Key Insight
Since Metro shows NO bundling activity for Android:
1. **Expo Go is not connecting to Metro** - could be network issue
2. **Expo Go might be crashing** silently before it can request the bundle
3. **Development build bypasses Expo Go** entirely and should work

## Environment Details
- Windows OS
- API Level: 36 (Android 15+)  
- Expo SDK: ~52 (tabs template)
- Node: Check with `node -v`
- Expo Go: Latest from Play Store
