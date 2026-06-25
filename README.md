# SnapItUp Browser WebRTC v31 Reset Stale Preview Fix

This version fixes the operator Reset Viewer Session flow so the viewer clears the previous template preview, captured photos, QR state, loading state, and cached session values. The reset creates a fresh session ID while keeping the camera connection available for the next customer.

## Main fixes

- Operator Reset Viewer Session now sends a full reset state.
- Viewer clears the last session preview and photo cache.
- Viewer returns to the start/login state for the next customer.
- QR and final preview data are removed on reset.
- Reset creates a new active session ID to avoid stale data carrying over.
- Camera/WebRTC connection can remain available without preserving old photos.
