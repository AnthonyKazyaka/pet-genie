import 'dotenv/config';
import type { ExpoConfig } from '@expo/config';

const baseConfig = require('./app.json');

// Google OAuth Client IDs from environment variables
const googleClientIdWeb = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? '';
const googleClientIdIos = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '';
const googleClientIdAndroid = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? '';

// Reverse client ID for iOS URL scheme (used by Google Sign-In)
const iosUrlScheme = googleClientIdIos
  ? `com.googleusercontent.apps.${googleClientIdIos.replace('.apps.googleusercontent.com', '')}`
  : '';

const appConfig: ExpoConfig = {
  ...baseConfig.expo,
  android: {
    ...baseConfig.expo?.android,
    // No intentFilters needed for OAuth - Google Sign-In handles this natively
  },
  ios: {
    ...baseConfig.expo?.ios,
    // Google Sign-In requires the reversed client ID as a URL scheme
    ...(iosUrlScheme && {
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [iosUrlScheme],
          },
        ],
      },
    }),
  },
  plugins: [
    ...(baseConfig.expo?.plugins ?? []),
    // Google Sign-In plugin configuration
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme,
      },
    ],
  ],
  extra: {
    ...baseConfig.expo?.extra,
    googleClientIds: {
      web: googleClientIdWeb,
      ios: googleClientIdIos,
      android: googleClientIdAndroid,
    },
  },
};

export default appConfig;
