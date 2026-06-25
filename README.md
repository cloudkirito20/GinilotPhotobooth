# Snap It Up! Browser WebRTC v31 - No Login Build

Built from the uploaded v30 ship package.

Updates:
- Login/sign-in screen removed.
- App opens directly to the Viewer / Operator role selection screen.
- Operator and Viewer workflow remains unchanged from the uploaded build.
- Operator can still reset the viewer session.
- Camera/WebRTC behavior is preserved.

Notes:
- This build does not require username, password, or authentication before using the photobooth.
- Supabase configuration is still used only for realtime/photo sync and storage if configured in `app.js`.
