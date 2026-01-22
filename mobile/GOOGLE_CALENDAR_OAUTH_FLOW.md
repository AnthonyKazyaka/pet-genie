# Google Calendar OAuth Flow (Mobile)

## Summary
This document captures the OAuth 2.0 flow used by the mobile app when the user taps **Connect to Google Calendar**.

## Prerequisites
- Google Cloud project created
- **Google Calendar API** enabled
- OAuth 2.0 client IDs created for:
  - Web
  - Android
  - iOS

## OAuth Client Setup
1. Create OAuth client IDs in Google Cloud Console:
   - **Android client**
       - Package name: `com.petgenie.mobile`
       - SHA-1: from Gradle `signingReport`
   - **iOS client**
   - **Web client**
     - Add redirect URI: `https://auth.expo.io/@<expo-username>/pet-genie`
2. Set the client IDs as environment variables (used via [mobile/app.config.ts](mobile/app.config.ts)):
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB`
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS`
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`

## Android OAuth Client (Step-by-Step)
1. Open Google Cloud Console and select your project.
2. Go to **APIs & Services → Credentials**.
3. Click **Create Credentials → OAuth client ID**.
4. Choose **Application type: Android**.
5. Enter a name (e.g., “Pet Genie Android”).
6. Set **Package name** to `com.petgenie.mobile`.
7. Get the **SHA-1** fingerprint:
    - Android Studio: **Gradle** tool window → `android` → `Tasks` → `android` → `signingReport`.
    - Or terminal (from [mobile/android](mobile/android) folder):
       - `./gradlew signingReport`
8. Paste the **SHA-1** value into the form and click **Create**.
9. Copy the generated **Android client ID** and set `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` in your environment.

## Runtime Flow (App)
1. User taps **Connect to Google Calendar**.
2. App creates an auth request with:
   - `responseType = code`
   - `usePKCE = true`
   - scopes: `https://www.googleapis.com/auth/calendar.readonly`
   - `access_type = offline`
   - `prompt = consent`
3. App opens the Google OAuth consent screen.
4. Google redirects to the app’s redirect URI (`petgenie://oauth/callback`).
5. App exchanges the auth code for tokens using the OAuth token endpoint.
6. App stores:
   - Access token
   - Refresh token
   - Token expiry
7. App fetches the user’s email.
8. App is now authorized to access Google Calendar APIs.

## Common 400 Error Cause
If the OAuth request returns **400: malformed**, the client IDs are likely still placeholders or the redirect URI is not registered for the Web client.

## Files Involved
- [mobile/services/google-calendar.service.ts](mobile/services/google-calendar.service.ts)
- [mobile/app.json](mobile/app.json)
