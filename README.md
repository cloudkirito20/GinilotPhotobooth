# Snap It Up! Browser WebRTC v24 - Viewer Local Capture Modal

## What changed
- Viewer now captures Photo 1, Photo 2, and Photo 3 locally from the existing live WebRTC video preview.
- The viewer no longer sends a capture request to the operator after each countdown, so it should not get stuck on “waiting for operator capture” after Photo 1.
- Operator camera connects once and remains only the live video source.
- Final template syncs back to operator after each local viewer capture and again when the final preview is ready.
- Viewer runs inside one kiosk-style modal with page scrolling disabled.
- Viewer flow: Start Session → live preview → 3 local captures → animated loading preview → Retake Photos or Done → QR.

## Important
The operator must still start the camera first and keep the operator tab open. The viewer needs the live preview visible before starting the session.
