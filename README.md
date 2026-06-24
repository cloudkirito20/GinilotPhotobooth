# Snap It Up! Browser Remote Live Preview

This version supports browser-based Viewer-to-Operator camera preview and capture.

## Workflow

1. Put your Supabase URL and anon key in `app.js`.
2. Open the app on the operator laptop and choose **Operator**.
3. Click **Start Camera** and allow camera permission. The laptop webcam or HDMI capture card/DSLR webcam source will be used.
4. Upload the template on the operator laptop.
5. Open the same app URL on the tablet and choose **Viewer**.
6. The viewer should see the operator camera live in real time.
7. The viewer taps **Capture Photo**. The operator browser captures the current camera frame and syncs the photo into the template.

## Notes

- This is fully browser-based and uses WebRTC for live video preview.
- Supabase Realtime is used for signaling and photo/template sync.
- For DSLR use, connect the DSLR to the operator laptop as a webcam source using HDMI capture card or webcam utility.
- Browser-only mode captures a frame from the live video feed. True DSLR shutter control still requires a local camera-control app/service.
