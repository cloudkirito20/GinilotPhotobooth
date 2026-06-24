# Snap It Up Browser Photobooth - WebRTC v14 Capture Unlock

This version fixes the Start Session / capture lock issue.

## What changed in v14

- The Viewer **Start Session** button no longer depends on the WebRTC live preview being connected.
- WebRTC is now treated as preview-only.
- The Operator camera remains the source of truth for all captures.
- Viewer can start the automated 3-photo session even while live preview is reconnecting.
- Automated sequence remains:
  1. Get ready → Photo 1 → 3...2...1...Smile
  2. Again → Photo 2 → 3...2...1...Smile
  3. Last na → Photo 3 → 3...2...1...Smile
  4. Preview → Retake / Done → QR → Print

## Correct workflow

1. Open Operator tab/device.
2. Upload the template.
3. Click **Start Camera** on Operator.
4. Open Viewer tab/device.
5. Choose **Viewer**.
6. Click **Start Session** on Viewer.

If the live preview says it is still connecting, Start Session can still run. The operator device will capture from its own local camera.

## Important

For live sync across different devices, configure the Supabase anon key in `app.js`:

```js
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Without Supabase, same-browser/same-computer testing can still use local tab sync, but separate devices need Supabase Realtime.


## v15 capture reliability fix

- The viewer can now complete the automated 3-photo session even if the operator tab misses a capture request.
- If the live camera is visible on the viewer, the app captures from that visible WebRTC video as a fallback and syncs the photo back to the operator preview.
- The normal operator-camera capture path still runs first. The fallback only activates when no operator photo is received quickly.

## v19 QR fix
The QR code no longer points to a local `blob:` URL. A `blob:` URL only works inside the browser tab that created it, so phones commonly show “No usable data found.”

For a working guest QR download on another device, configure Supabase Storage:
1. Create a public bucket named `snapitup-photos`.
2. Add your Supabase anon key in `app.js`.
3. Allow authenticated/anon upload/select for the bucket according to your deployment needs.

If storage is not configured, the app will show a clear message and still allow local Save PNG instead of generating a broken QR.

## v20 tablet stability fix
- Keeps the WebRTC live preview from renegotiating while a capture is in progress.
- Re-sends capture requests during auto mode so tablets do not get stuck after Photo 1 if a realtime message is dropped.
- Reduces synced photo payload size for more reliable tablet/mobile realtime sync.
- Capture automation is independent from the live preview; if the preview reconnects, the 3-photo flow continues using operator sync.
