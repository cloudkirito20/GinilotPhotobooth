# PhotoBooth Studio - Phase 1

A browser-based photobooth prototype for a 3-photo session workflow.

## Features

- Modern UI with File, Edit, and About tabs
- Upload a picture/template before the session
- Select paper size at the start of the photobooth session
- Use browser camera access for an external webcam/camera
- Capture 3 photos and automatically place them on the template
- Print the completed layout
- Save the final layout as PNG
- After clicking Print, captured photos are cleared and a new session starts

## How to run

Open `index.html` in a browser. For best camera support, run from localhost:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Notes

Browsers require camera permission. External cameras usually appear automatically as the selected webcam. A future phase can add camera-device selection, drag-and-drop photo slot positioning, admin settings, event branding, gallery storage, and payment support.


Update: Use **Reset Template** to clear the currently loaded template and begin with a new template upload.


## Latest Update
- Added Portrait/Landscape orientation selection.
- Photo containers/slots can now be dragged directly on the template preview.
- Each slot has a bottom-right resize handle.
- Slot positions are saved as percentages, so layouts remain proportional when changing paper size or orientation.
