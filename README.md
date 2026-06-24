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
