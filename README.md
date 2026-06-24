# SnapItUp Browser WebRTC v22 - Single Session Capture Fix

This build focuses on tablet stability and prevents the first captured photo from disappearing from the template.

## What changed

- Keeps the operator/viewer capture flow as one continuous session.
- Prevents blank sync states from deleting already captured photos.
- Caches the active session photos in `sessionStorage` during the capture flow.
- Uses a merge strategy for incoming photo updates, so Photo 1 stays on the template while Photo 2 and Photo 3 are being requested.
- Keeps WebRTC preview as preview-only. Capture sync continues even if the tablet preview briefly reconnects.
- Updates the viewer message from “waiting for operator capture” to same-session capture status.

## Important

Use the same deployed URL on the operator device and viewer tablet. For different devices, Supabase Realtime must be configured with the same anon key and room.
