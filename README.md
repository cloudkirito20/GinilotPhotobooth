# SnapItUp Browser WebRTC v23

Fixes the post-Photo-1 stall where the viewer returned to an operator-ready / waiting-for-capture message.

Changes:
- Locks viewer capture status during the active 3-photo session so WebRTC preview events cannot overwrite it.
- Operator no longer marks capture requests as processed until the camera is actually ready and the capture starts.
- If Photo 2 or Photo 3 command arrives while the operator is still finishing the previous photo, it is queued and retried instead of being dropped.
- Viewer retries each photo request inside the same session without clearing already captured template photos.
- Keeps Photo 1 preserved on the template while continuing to Photo 2 and Photo 3.
