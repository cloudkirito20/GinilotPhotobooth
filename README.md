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

## v29 Operator Final Preview Photo Sync Fix
- Sends one flattened final template preview from the viewer after Photo 3.
- Operator renders the flattened final preview directly during review/done state.
- Prevents blank operator template slots when individual captured photo data URLs arrive late or are dropped on separate tablet/mobile devices.
- Retake regenerates and resyncs the flattened final preview.


## v29 update
- Viewer capture screen is centered in the modal.
- Live preview is on the left and viewer controls/status are on the right.
- Pre-session viewer screen hides the template area until the capture session is complete.


## v30 - Operator Reset Viewer Session

- Added an Operator-only **Reset Viewer Session** button.
- Clears the viewer's captured photos, final preview, QR panel, countdown/session state, and retake state.
- Keeps the live camera/WebRTC connection alive so the next session can start without reconnecting.
- Remote reset now returns the viewer to the ready/start state instead of a capture/waiting state.
