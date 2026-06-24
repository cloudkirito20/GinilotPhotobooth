const canvas = document.getElementById('boothCanvas');
const ctx = canvas.getContext('2d');
const templateUpload = document.getElementById('templateUpload');
const cameraFeed = document.getElementById('cameraFeed');
const startCameraBtn = document.getElementById('startCameraBtn');
const captureBtn = document.getElementById('captureBtn');
const printBtn = document.getElementById('printBtn');
const saveBtn = document.getElementById('saveBtn');
const newSessionBtn = document.getElementById('newSessionBtn');
const resetTemplateBtn = document.getElementById('resetTemplateBtn');
const paperSize = document.getElementById('paperSize');
const orientation = document.getElementById('orientation');
const paperBadge = document.getElementById('paperBadge');
const captureStatus = document.getElementById('captureStatus');
const emptyState = document.getElementById('emptyState');

let templateImage = null;
let capturedPhotos = [];
let stream = null;
let selectedSlotIndex = 0;
let dragState = null;

const paperSizes = {
  '4x6': { label: '4 x 6 in', width: 1200, height: 1800 },
  '5x7': { label: '5 x 7 in', width: 1500, height: 2100 },
  '6x8': { label: '6 x 8 in', width: 1800, height: 2400 },
  'a4': { label: 'A4', width: 2480, height: 3508 }
};

// Slot values are percentages, so they remain usable when switching paper size/orientation.
let photoSlots = [
  { x: 0.12, y: 0.12, w: 0.76, h: 0.20 },
  { x: 0.12, y: 0.39, w: 0.76, h: 0.20 },
  { x: 0.12, y: 0.66, w: 0.76, h: 0.20 }
];

function setPaper() {
  const selected = paperSizes[paperSize.value];
  const isLandscape = orientation.value === 'landscape';
  canvas.width = isLandscape ? selected.height : selected.width;
  canvas.height = isLandscape ? selected.width : selected.height;
  paperBadge.textContent = `${selected.label} • ${isLandscape ? 'Landscape' : 'Portrait'}`;
  drawCanvas();
}

function getPhotoSlots() {
  return photoSlots.map(slot => ({
    x: slot.x * canvas.width,
    y: slot.y * canvas.height,
    w: slot.w * canvas.width,
    h: slot.h * canvas.height
  }));
}

function saveSlot(index, slot) {
  const minW = 0.08 * canvas.width;
  const minH = 0.08 * canvas.height;
  const w = Math.max(minW, Math.min(slot.w, canvas.width - slot.x));
  const h = Math.max(minH, Math.min(slot.h, canvas.height - slot.y));
  const x = Math.max(0, Math.min(slot.x, canvas.width - w));
  const y = Math.max(0, Math.min(slot.y, canvas.height - h));
  photoSlots[index] = { x: x / canvas.width, y: y / canvas.height, w: w / canvas.width, h: h / canvas.height };
}

function drawCoverImage(img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (templateImage) {
    drawCoverImage(templateImage, 0, 0, canvas.width, canvas.height);
    emptyState.classList.add('hidden');
  } else {
    emptyState.classList.remove('hidden');
  }

  const slots = getPhotoSlots();
  slots.forEach((slot, index) => {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.10)';
    ctx.strokeStyle = index === selectedSlotIndex ? 'rgba(96,165,250,.98)' : 'rgba(255,255,255,.9)';
    ctx.lineWidth = Math.max(8, canvas.width * 0.006);
    ctx.beginPath();
    ctx.roundRect(slot.x, slot.y, slot.w, slot.h, 28);
    ctx.fill();
    ctx.stroke();
    ctx.clip();

    if (capturedPhotos[index]) {
      drawCoverImage(capturedPhotos[index], slot.x, slot.y, slot.w, slot.h);
    }
    ctx.restore();

    drawSlotControls(slot, index);
  });

  captureStatus.textContent = `${capturedPhotos.length} of 3 photos captured.`;
  const ready = templateImage && capturedPhotos.length === 3;
  printBtn.disabled = !ready;
  saveBtn.disabled = !ready;
  resetTemplateBtn.disabled = !templateImage;
  captureBtn.disabled = !templateImage || !stream || capturedPhotos.length >= 3;
}

function drawSlotControls(slot, index) {
  const handle = getHandleSize();
  ctx.save();
  ctx.fillStyle = index === selectedSlotIndex ? 'rgba(96,165,250,.98)' : 'rgba(255,255,255,.9)';
  ctx.strokeStyle = 'rgba(15,23,42,.65)';
  ctx.lineWidth = Math.max(2, canvas.width * 0.002);
  ctx.beginPath();
  ctx.roundRect(slot.x + slot.w - handle, slot.y + slot.h - handle, handle, handle, 8);
  ctx.fill();
  ctx.stroke();

  ctx.font = `${Math.max(24, canvas.width * 0.025)}px Inter, Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.strokeStyle = 'rgba(15,23,42,.75)';
  ctx.lineWidth = 4;
  const label = `Photo ${index + 1}`;
  ctx.strokeText(label, slot.x + 22, slot.y + 44);
  ctx.fillText(label, slot.x + 22, slot.y + 44);
  ctx.restore();
}

function getHandleSize() {
  return Math.max(36, Math.min(canvas.width, canvas.height) * 0.045);
}

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function hitTest(point) {
  const slots = getPhotoSlots();
  const handle = getHandleSize();
  for (let i = slots.length - 1; i >= 0; i--) {
    const s = slots[i];
    const inSlot = point.x >= s.x && point.x <= s.x + s.w && point.y >= s.y && point.y <= s.y + s.h;
    if (!inSlot) continue;
    const inHandle = point.x >= s.x + s.w - handle && point.y >= s.y + s.h - handle;
    return { index: i, mode: inHandle ? 'resize' : 'move', slot: s };
  }
  return null;
}

canvas.addEventListener('pointerdown', event => {
  const point = getPointerPosition(event);
  const hit = hitTest(point);
  if (!hit) return;
  selectedSlotIndex = hit.index;
  dragState = { mode: hit.mode, start: point, original: { ...hit.slot }, index: hit.index };
  canvas.setPointerCapture(event.pointerId);
  drawCanvas();
});

canvas.addEventListener('pointermove', event => {
  const point = getPointerPosition(event);
  if (!dragState) {
    const hit = hitTest(point);
    canvas.style.cursor = hit ? (hit.mode === 'resize' ? 'nwse-resize' : 'move') : 'default';
    return;
  }

  const dx = point.x - dragState.start.x;
  const dy = point.y - dragState.start.y;
  const next = { ...dragState.original };
  if (dragState.mode === 'move') {
    next.x += dx;
    next.y += dy;
  } else {
    next.w += dx;
    next.h += dy;
  }
  saveSlot(dragState.index, next);
  drawCanvas();
});

canvas.addEventListener('pointerup', event => {
  dragState = null;
  try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
});
canvas.addEventListener('pointercancel', () => { dragState = null; });

function resetSession() {
  capturedPhotos = [];
  drawCanvas();
}

function resetTemplate() {
  templateImage = null;
  capturedPhotos = [];
  templateUpload.value = '';
  drawCanvas();
}

paperSize.addEventListener('change', setPaper);
orientation.addEventListener('change', setPaper);

templateUpload.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      templateImage = img;
      resetSession();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

startCameraBtn.addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },
      audio: false
    });
    cameraFeed.srcObject = stream;
    captureBtn.disabled = !templateImage;
  } catch (error) {
    alert('Camera access failed. Please allow camera permission and connect your external camera.');
  }
});

captureBtn.addEventListener('click', () => {
  if (capturedPhotos.length >= 3) return;
  const shotCanvas = document.createElement('canvas');
  shotCanvas.width = cameraFeed.videoWidth || 1280;
  shotCanvas.height = cameraFeed.videoHeight || 720;
  const shotCtx = shotCanvas.getContext('2d');
  shotCtx.drawImage(cameraFeed, 0, 0, shotCanvas.width, shotCanvas.height);

  const img = new Image();
  img.onload = () => {
    capturedPhotos.push(img);
    drawCanvas();
  };
  img.src = shotCanvas.toDataURL('image/png');
});

printBtn.addEventListener('click', () => {
  window.print();
  setTimeout(resetSession, 500);
});

saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `photobooth-session-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

newSessionBtn.addEventListener('click', resetSession);
resetTemplateBtn.addEventListener('click', resetTemplate);

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-panel`).classList.add('active');
  });
});

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    return this;
  };
}

setPaper();
