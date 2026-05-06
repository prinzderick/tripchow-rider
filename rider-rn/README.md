# TripChow Rider App

React Native (Expo) app for TripChow delivery riders.

## Quick start

```bash
# Install dependencies
npm install

# Add Manrope font package
npx expo install @expo-google-fonts/manrope

# Start development server
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS) to run on your device immediately — no build required.

## Configuration

### 1. Set your API URL
Edit `src/api/client.ts`:
```ts
export const API_BASE = 'http://YOUR_SERVER_IP/tripchow-backend/public/api/v1';
```

For local AMPPS: `http://192.168.1.X/tripchow-backend/public/api/v1`

### 2. Push notifications (optional for dev)
Push notifications require a real device and EAS credentials. For local testing, notifications still work via Expo Go — no extra setup needed.

### 3. Google Maps (required for production)
Add your Google Maps API keys to `app.json`:
```json
"ios":     { "config": { "googleMapsApiKey": "YOUR_IOS_KEY" } },
"android": { "config": { "googleMaps": { "apiKey": "YOUR_ANDROID_KEY" } } }
```

## Project structure

```
rider-app/
  App.tsx                    # Root: fonts, navigation, auth gate
  src/
    api/
      client.ts              # Axios + JWT interceptor + auto-refresh
      endpoints.ts           # All API functions (typed)
    components/
      index.ts               # Button, Card, Badge, Money, EmptyState, etc.
    hooks/
      usePushNotifications.ts # Expo push registration + FCM/APNs
    screens/
      LoginScreen.tsx        # Phone + password, OTP verify
      HomeScreen.tsx         # Dashboard, online toggle, job cards, active delivery
      DeliveriesScreen.tsx   # Delivery history with filter chips
      WalletScreen.tsx       # Balance, earnings summary, transaction ledger, payout
      MoreScreen.tsx         # Profile, vehicle, bank account, support, logout
    store/
      auth.ts                # Zustand + SecureStore token persistence
    theme/
      index.ts               # Colors, Typography, Spacing, Radius, Shadow
```

## Building for production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure project
eas build:configure

# Build Android APK (for testing)
eas build --platform android --profile preview

# Build for app stores
eas build --platform all
```

## Backend changes needed for native push

The backend already supports device registration via `POST /api/v1/devices/register`.
The rider app sends the **Expo Push Token** (format: `ExponentPushToken[xxxx]`) as the `push_token`.

To send push notifications from your backend to the Expo Push Service, use:
```
POST https://exp.host/--/api/v2/push/send
{
  "to": "ExponentPushToken[xxxx]",
  "title": "New job offer!",
  "body": "Pickup from Chicken Republic, Lekki",
  "data": { "type": "new_job_offer", "order_id": "..." }
}
```

You can add an `ExpoNotificationChannel` to your existing `NotificationService.php` 
alongside the existing web push channel.
