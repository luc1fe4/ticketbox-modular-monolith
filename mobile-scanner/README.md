# TicketBox Mobile Scanner

Expo React Native app for STAFF gate check-in. The app supports:

- STAFF login with JWT.
- Check-in dataset download.
- Local SQLite ticket snapshots.
- Manual QR input and camera QR scan.
- Offline pending check-in logs.
- Batch sync when network is restored.

## Install Dependencies

From this folder:

```bash
npm install
```

If native Expo packages are missing, install them with Expo-compatible versions:

```bash
npx expo install expo-secure-store expo-sqlite expo-camera @react-native-community/netinfo
```

Web support also needs:

```bash
npx expo install react-native-web react-dom @expo/metro-runtime
```

## Backend Base URL

The mobile app reads the API base URL from:

```text
src/api/config.ts
```

Default:

```ts
http://localhost:8080/api
```

Use this for `npm run web` when backend runs on the same computer.

For Android emulator, use:

```ts
http://10.0.2.2:8080/api
```

For a physical phone, use your computer LAN IP:

```ts
http://192.168.x.x:8080/api
```

The backend must be running and reachable from the device. Test from the device browser:

```text
http://YOUR_BACKEND_HOST:8080/api/health
```

## Run Expo App

From `mobile-scanner`:

```bash
npm run start
```

Then choose a target in Expo:

```text
a  Android emulator/device
w  Web browser
```

Direct commands:

```bash
npm run android
npm run web
```

## Typecheck

```bash
npm run typecheck
```
