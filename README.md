# Snap It Up! Browser WebRTC Live Preview

This version uses WebRTC for the Viewer live camera preview. The old JPEG snapshot relay has been removed to reduce lag.

## Workflow

1. Add your Supabase URL and anon key in `app.js`.
2. Deploy or open the same app URL on both devices.
3. On the operator laptop, choose **Operator**.
4. Click **Start Camera** and allow camera permission.
5. Upload the photo template on the operator laptop.
6. On the tablet or second device, choose **Viewer**.
7. The viewer connects to the operator camera through WebRTC.
8. The viewer taps **Capture Photo**.
9. The operator browser captures from the operator camera and broadcasts the updated template state back to both screens.

## Important setup notes

- For two separate devices, Supabase Realtime must be configured because it carries the WebRTC offer, answer, ICE candidates, capture requests, and template/photo state.
- BroadcastChannel/localStorage sync only works reliably between tabs on the same browser/device.
- WebRTC needs HTTPS in production, except on `localhost` during local testing.
- A public STUN server is included. Some restrictive networks may require a TURN server.

## v8 WebRTC changes

- Removed `live-frame` JPEG relay.
- Removed Base64 live-preview frame sending.
- Viewer live preview now uses the remote WebRTC video stream.
- Capture requests still go Viewer → Operator.
- Captured photos now sync Operator → Viewer after the photo image has fully loaded.
- Remote photo loading now ignores empty slots instead of creating broken image entries.


## v10 Automatic viewer session

- The Viewer button now starts a full automated 3-photo sequence.
- Sequence: Start Session -> 3, 2, 1, Smile -> Again -> 3, 2, 1, Smile -> Last na -> 3, 2, 1, Smile.
- The operator camera remains the source of truth. The viewer only sends capture requests; the operator captures the photos and broadcasts the updated template state back to both screens.
- Captured photo payloads are resized/compressed more aggressively so Photo 2 and Photo 3 sync more reliably through Supabase Realtime.
- After all 3 photos are captured, the viewer can retake a selected photo or tap Done. Done automatically generates the QR panel for download, while the operator can print the final template.

## v11 WebRTC reconnect fix

This build retries the viewer-ready signal until the WebRTC video track is actually received. The operator will now resend the camera-ready signal and create a fresh WebRTC offer when a new viewer connects, even if the operator camera was already started before the viewer opened the page.

Recommended order:
1. Open Operator and click Start Camera.
2. Open Viewer and choose Viewer.
3. Wait for “Live operator camera connected.”
4. Tap Start Session.

If using two separate devices, make sure the Supabase URL and anon key are configured and both devices open the same deployed URL. Local tab sync only works on the same browser/device.
