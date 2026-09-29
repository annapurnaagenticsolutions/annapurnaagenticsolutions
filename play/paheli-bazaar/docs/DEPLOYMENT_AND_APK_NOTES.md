# Deployment and APK Notes

## GitHub Pages deployment

1. Upload the folder contents to a GitHub repository.
2. Enable GitHub Pages from the repository settings.
3. Use the root folder as the published site source.
4. Open the published URL and verify that JSON files load correctly.

## Local testing

Run from the project root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Do not open `index.html` directly from the file system because browser security may block JSON loading.

## APK-readiness

The app is static and PWA-ready, which makes later APK conversion easier.

Possible packaging routes:

- Capacitor wrapper
- Cordova wrapper
- Trusted Web Activity
- PWA install flow

Before APK packaging, complete these checks:

- Replace placeholder icons with final brand icons.
- Test offline load after first visit.
- Validate Android Chrome behavior.
- Confirm all tap targets are comfortable on 360px width.
- Add privacy note: no login and local-only progress.
