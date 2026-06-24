# Snap It Up! Photobooth Web App

Updated version with a cleaner Operator / Viewer flow.

## What changed

- Initial landing page asks the user to choose **Viewer** or **Operator**.
- **Operator View** keeps the full photobooth controls, including template upload, paper size, orientation, print, save, QR, and draggable photo slots.
- **Viewer View** is minimized for guests: camera and capture only during the session.
- The old **Use Photo** step was removed.
- Captured photos automatically go directly into the template.
- A 3-second countdown runs before every capture.
- After Photo 3, the Viewer sees the final template preview.
- Viewer can choose Photo 1, Photo 2, or Photo 3 to retake.
- Retake asks for Yes / No confirmation.
- Viewer can tap **Done**, then generate a QR code or download the final image.
- Capture button readiness was improved for browsers where camera-ready events are delayed.

## Local Testing

Open `index.html` in a modern browser, or run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

For deployed use, host the folder on Cloudflare Pages.
