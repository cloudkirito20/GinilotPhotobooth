# Snap It Up! Browser Photobooth v26

Fixes:
- Keeps the operator camera connected once and gives the viewer a visible output using WebRTC plus a lightweight fallback preview frame.
- Viewer can capture locally from the live video or fallback preview, so a tablet with blocked WebRTC video still continues the session.
- Template preview is hidden on the viewer until the 3-photo session finishes.
- Viewer remains in one no-scroll modal/kiosk screen.


## v27 Viewer Camera Flicker Fix
- Prevents the operator from rebuilding the WebRTC offer on every viewer-ready ping.
- Keeps the current viewer video visible while WebRTC is connecting/recovering.
- Debounces viewer reconnect requests to avoid connected/not connected flicker on tablets.
- Uses the image preview fallback without clearing the active video stream.
