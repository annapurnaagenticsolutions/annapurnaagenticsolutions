# APK Handoff — v1.3

The build remains suitable for later APK wrapping because it is static and self-contained.

## Structure

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `service-worker.js`
- `icons/`
- `data/`

## Wrapper notes

Use Capacitor or Cordova later if an Android APK is required. The current build avoids external CDNs and uses localStorage for saved gallery data.

## Important

v1.3 is a stable showcase prototype, not a production Android app. Before APK release, test on real Android devices for viewport safe area, sharing behavior, file download behavior, and service-worker caching.
