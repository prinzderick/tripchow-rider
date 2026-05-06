# TripChow Rider App

> Accept deliveries, track your earnings, and manage your availability — built for TripChow riders in Yenagoa.

---

## What it does

The TripChow rider app is the operations tool for delivery riders on the TripChow platform. Go online, receive job offers, confirm pickups, complete deliveries, and get paid — all from your phone. Job offer notifications bypass Do Not Disturb so you never miss an opportunity.

**Core features**

- Toggle online/offline with one tap
- Real-time job offers with accept/reject
- Confirm pickup and delivery at each stage
- Live GPS location broadcasting to customers
- Earnings dashboard — today, this week, this month
- Incentive targets with progress tracking (bonus on completion)
- Wallet and bank account management for withdrawals
- KYC document upload
- In-app notification inbox + FCM push for job offers
- Support ticket system

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | React Native CLI 0.76.3 (no Expo) |
| Language | TypeScript |
| Navigation | React Navigation 6 (bottom tabs + screen state) |
| State | Zustand + React Query |
| Auth storage | react-native-keychain |
| Push | @react-native-firebase/messaging + @notifee/react-native |
| HTTP | Axios |
| Location | react-native-geolocation-service |
| Fonts | Manrope (ExtraBold, Bold, SemiBold, Regular) |

---

## Project structure

```
src/
├── api/
│   ├── client.ts           # Axios instance with JWT interceptor
│   └── endpoints.ts        # All API call definitions
├── screens/
│   ├── HomeScreen.tsx          # Dashboard — status toggle, active delivery, incentives
│   ├── DeliveriesScreen.tsx    # Delivery history filtered by period
│   ├── WalletScreen.tsx        # Earnings breakdown, withdrawal request
│   ├── MoreScreen.tsx          # Profile, documents, bank accounts, support
│   ├── NotificationsScreen.tsx # In-app notification inbox
│   └── SupportScreen.tsx       # Support ticket list, detail, reply
├── hooks/
│   └── usePushNotifications.ts # FCM registration + job offer alerts
├── store/
│   └── auth.ts             # Zustand auth store + Keychain tokens
└── App.tsx                 # Splash → onboarding → navigation
```

---

## Getting started

### Prerequisites

- Node.js 18+
- React Native CLI environment ([guide](https://reactnative.dev/docs/environment-setup))
- Android Studio (for Android) or Xcode 15+ (for iOS)
- Firebase project with rider app added

### 1. Clone and install

```bash
git clone https://github.com/YOUR_ORG/tripchow-rider-app.git
cd tripchow-rider-app
npm install
```

### 2. Add secret files

Get these from the project lead:

```
android/app/google-services.json
ios/TripChowRider/GoogleService-Info.plist
.env
```

### 3. iOS — install pods

```bash
cd ios && pod install && cd ..
```

### 4. Run

```bash
npx react-native run-android
npx react-native run-ios
```

---

## Environment variables

```
API_BASE_URL=https://app.tripli.ng/test/tripchow-backend/public/api/v1
```

---

## Fonts

Manrope font files must be in `assets/fonts/`:

```
Manrope-Regular.ttf
Manrope-SemiBold.ttf
Manrope-Bold.ttf
Manrope-ExtraBold.ttf
```

Run `npx react-native-asset` after adding fonts.

---

## Push notifications

Job offer alerts use the `tripchow_jobs` Android channel with `bypassDnd: true` and max importance — this wakes the device even in Doze mode so riders never miss a job.

FCM data payload on job offer: `{ type: "job.offered", order_ref, restaurant_name }`

---

## Live delivery flow

```
Rider goes online (PATCH /rider/status)
  ↓
Job offer arrives via FCM push
  ↓
Rider taps Accept (POST /rider/jobs/{id}/accept)
  ↓
Rider drives to restaurant
  ↓
Rider confirms pickup (POST /rider/deliveries/{id}/pickup)
  → Customer gets "Food picked up" notification
  ↓
Rider drives to customer
  ↓
Rider confirms delivery (POST /rider/deliveries/{id}/deliver)
  → Customer gets "Delivered" notification
  → Live Activity / persistent notification ends
  → Delivery fee credited to rider wallet
```

---

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready. Protected — PRs only |
| `develop` | Integration branch |
| `feature/*` | New features |
| `fix/*` | Bug fixes |

---

## API

Base URL: `https://app.tripli.ng/test/tripchow-backend/public/api/v1`

Key rider routes:

```
PATCH  /rider/status                          # online/offline
PATCH  /rider/location                        # GPS update
GET    /rider/jobs/available                  # job offers
POST   /rider/jobs/{assignment_id}/accept     # accept job
POST   /rider/jobs/{assignment_id}/reject     # decline job
POST   /rider/deliveries/{order_id}/pickup    # confirm collected
POST   /rider/deliveries/{order_id}/deliver   # confirm delivered
GET    /rider/earnings/breakdown?period=today  # earnings
GET    /rider/incentives                       # incentive targets
```

See the full API Reference document for all endpoints.

---

## Related repositories

- [`tripchow-customer-app`](https://github.com/YOUR_ORG/tripchow-customer-app) — Customer ordering app
- [`tripchow-vendor-app`](https://github.com/YOUR_ORG/tripchow-vendor-app) — Vendor kitchen management
