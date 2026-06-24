
const SUPABASE_URL = "https://srpaeknnmdhafpkgdsih.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_A8DHki148lEPFb_qf6Qebw_pJJz0rH3sb_publishable_A8DHki148lEPFb_qf6Qebw_pJJz0rH3";

const canvas = document.getElementById('boothCanvas');
const ctx = canvas.getContext('2d');
const templateUpload = document.getElementById('templateUpload');
const cameraFeed = document.getElementById('cameraFeed');
const startCameraBtn = document.getElementById('startCameraBtn');
const captureBtn = document.getElementById('captureBtn');
const printBtn = document.getElementById('printBtn');
const saveBtn = document.getElementById('saveBtn');
const generateQrBtn = document.getElementById('generateQrBtn');
const newSessionBtn = document.getElementById('newSessionBtn');
const resetTemplateBtn = document.getElementById('resetTemplateBtn');
const paperSize = document.getElementById('paperSize');
const orientation = document.getElementById('orientation');
const paperBadge = document.getElementById('paperBadge');
const captureStatus = document.getElementById('captureStatus');
const emptyState = document.getElementById('emptyState');
const printOverlay = document.getElementById('printOverlay');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const countdownLabel = document.getElementById('countdownLabel');
const flashOverlay = document.getElementById('flashOverlay');
const finalActionsPanel = document.getElementById('finalActionsPanel');
const qrPanel = document.getElementById('qrPanel');
const qrCode = document.getElementById('qrCode');
const downloadLink = document.getElementById('downloadLink');
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');
const roleSelect = document.getElementById('roleSelect');
const appShell = document.getElementById('appShell');
const chooseViewerBtn = document.getElementById('chooseViewerBtn');
const chooseOperatorBtn = document.getElementById('chooseOperatorBtn');
const doneBtn = document.getElementById('doneBtn');

let templateImage = null;
let capturedPhotos = [];
let stream = null;
let selectedSlotIndex = 0;
let dragState = null;
let retakeIndex = null;
let requestedRetakeIndex = null;
let objectUrl = null;
let cameraReady = false;
let templateDataUrl = null;
let photoDataUrls = [];
let syncChannel = null;
let supabaseClient = null;
let supabaseChannel = null;
let supabaseReady = false;
let pendingSupabasePayload = null;
const SYNC_KEY = 'snap-it-up-live-session';
const LIVE_ROOM = 'snap-it-up-live-room';
const CLIENT_ID = (() => {
  try {
    const existing = sessionStorage.getItem('snap-it-up-client-id');
    if (existing) return existing;
    const next = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    sessionStorage.setItem('snap-it-up-client-id', next);
    return next;
  } catch (_) {
    return String(Date.now() + Math.random());
  }
})();

const paperSizes = {
  '4x6': { label: '4 x 6 in', width: 1200, height: 1800 },
  '5x7': { label: '5 x 7 in', width: 1500, height: 2100 },
  '6x8': { label: '6 x 8 in', width: 1800, height: 2400 },
  'a4': { label: 'A4', width: 2480, height: 3508 }
};

let photoSlots = [
  { x: 0.12, y: 0.12, w: 0.76, h: 0.20 },
  { x: 0.12, y: 0.39, w: 0.76, h: 0.20 },
  { x: 0.12, y: 0.66, w: 0.76, h: 0.20 }
];

let currentMode = null;
let viewerDone = false;

function setViewMode(mode) {
  currentMode = mode;
  document.body.classList.toggle('viewer-mode', mode === 'viewer');
  document.body.classList.toggle('operator-mode', mode === 'operator');
  roleSelect.classList.add('hidden');
  appShell.classList.remove('hidden');
  updateUi();
}
chooseOperatorBtn.addEventListener('click', () => setViewMode('operator'));
chooseViewerBtn.addEventListener('click', () => { setViewMode('viewer'); setTimeout(() => startCameraBtn.click(), 100); });

function setPaper() {
  const selected = paperSizes[paperSize.value];
  const isLandscape = orientation.value === 'landscape';
  canvas.width = isLandscape ? selected.height : selected.width;
  canvas.height = isLandscape ? selected.width : selected.height;
  paperBadge.textContent = `${selected.label} • ${isLandscape ? 'Landscape' : 'Portrait'}`;
  drawCanvas();
  broadcastState('layout-updated');
}

function getPhotoSlots() {
  return photoSlots.map(slot => ({ x: slot.x * canvas.width, y: slot.y * canvas.height, w: slot.w * canvas.width, h: slot.h * canvas.height }));
}
function saveSlot(index, slot) {
  const minW = 0.08 * canvas.width, minH = 0.08 * canvas.height;
  const w = Math.max(minW, Math.min(slot.w, canvas.width - slot.x));
  const h = Math.max(minH, Math.min(slot.h, canvas.height - slot.y));
  const x = Math.max(0, Math.min(slot.x, canvas.width - w));
  const y = Math.max(0, Math.min(slot.y, canvas.height - h));
  photoSlots[index] = { x: x / canvas.width, y: y / canvas.height, w: w / canvas.width, h: h / canvas.height };
}
function drawCoverImage(img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale, sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (templateImage) { drawCoverImage(templateImage, 0, 0, canvas.width, canvas.height); emptyState.classList.add('hidden'); }
  else { emptyState.classList.remove('hidden'); }
  getPhotoSlots().forEach((slot, index) => {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.10)';
    ctx.strokeStyle = index === selectedSlotIndex ? 'rgba(96,165,250,.98)' : 'rgba(255,255,255,.9)';
    ctx.lineWidth = Math.max(8, canvas.width * 0.006);
    ctx.beginPath(); ctx.roundRect(slot.x, slot.y, slot.w, slot.h, 28); ctx.fill(); ctx.stroke(); ctx.clip();
    if (capturedPhotos[index]) drawCoverImage(capturedPhotos[index], slot.x, slot.y, slot.w, slot.h);
    ctx.restore();
    drawSlotControls(slot, index);
  });
  updateUi();
}
function drawSlotControls(slot, index) {
  const handle = getHandleSize();
  ctx.save();
  ctx.fillStyle = index === selectedSlotIndex ? 'rgba(96,165,250,.98)' : 'rgba(255,255,255,.9)';
  ctx.strokeStyle = 'rgba(15,23,42,.65)';
  ctx.lineWidth = Math.max(2, canvas.width * 0.002);
  ctx.beginPath(); ctx.roundRect(slot.x + slot.w - handle, slot.y + slot.h - handle, handle, handle, 8); ctx.fill(); ctx.stroke();
  ctx.font = `${Math.max(24, canvas.width * 0.025)}px Inter, Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = 'rgba(15,23,42,.75)'; ctx.lineWidth = 4;
  const label = capturedPhotos[index] ? `Photo ${index + 1} ✓` : `Photo ${index + 1}`;
  ctx.strokeText(label, slot.x + 22, slot.y + 44); ctx.fillText(label, slot.x + 22, slot.y + 44);
  ctx.restore();
}
function getHandleSize() { return Math.max(36, Math.min(canvas.width, canvas.height) * 0.045); }
function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
}
function hitTest(point) {
  const slots = getPhotoSlots(), handle = getHandleSize();
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
  if (document.body.classList.contains('viewer-mode')) return;
  const hit = hitTest(getPointerPosition(event)); if (!hit) return;
  selectedSlotIndex = hit.index; dragState = { mode: hit.mode, start: getPointerPosition(event), original: { ...hit.slot }, index: hit.index };
  canvas.setPointerCapture(event.pointerId); drawCanvas();
});
canvas.addEventListener('pointermove', event => {
  if (document.body.classList.contains('viewer-mode')) return;
  const point = getPointerPosition(event);
  if (!dragState) { const hit = hitTest(point); canvas.style.cursor = hit ? (hit.mode === 'resize' ? 'nwse-resize' : 'move') : 'default'; return; }
  const dx = point.x - dragState.start.x, dy = point.y - dragState.start.y, next = { ...dragState.original };
  if (dragState.mode === 'move') { next.x += dx; next.y += dy; } else { next.w += dx; next.h += dy; }
  saveSlot(dragState.index, next); drawCanvas();
});
canvas.addEventListener('pointerup', event => { dragState = null; try { canvas.releasePointerCapture(event.pointerId); } catch (_) {} broadcastState('photo-slot-updated'); });
canvas.addEventListener('pointercancel', () => { dragState = null; });

function updateUi() {
  const count = capturedPhotos.filter(Boolean).length;
  const complete = capturedPhotos.length === 3 && capturedPhotos.every(Boolean);
  const isRetaking = retakeIndex !== null;
  const nextNumber = isRetaking ? retakeIndex + 1 : Math.min(count + 1, 3);
  captureStatus.textContent = complete && !isRetaking
    ? 'Final template is ready. Choose a photo to retake or tap Done.'
    : `Photo ${nextNumber} of 3. Click Capture Photo when ready.`;

  const videoReady = cameraReady || (!!stream && cameraFeed.readyState >= 1 && cameraFeed.videoWidth > 0);
  captureBtn.disabled = !videoReady || (!templateImage && currentMode === 'operator') || (complete && !isRetaking);
  if (currentMode === 'viewer') captureBtn.disabled = !videoReady || (complete && !isRetaking);

  resetTemplateBtn.disabled = !templateImage;
  finalActionsPanel.classList.toggle('hidden', !complete || isRetaking);
  generateQrBtn.classList.toggle('hidden', !viewerDone && currentMode === 'viewer');
  document.querySelectorAll('.operator-action').forEach(el => el.classList.toggle('hidden', currentMode === 'viewer'));
  document.querySelectorAll('.viewer-action').forEach(el => el.classList.toggle('hidden', currentMode !== 'viewer'));
  document.querySelector('.preview-area').classList.toggle('viewer-final-only', currentMode === 'viewer' && !complete);
  ['step1','step2','step3'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.toggle('done', !!capturedPhotos[i]);
    el.classList.toggle('active', !complete && i === count);
  });
  document.getElementById('stepFinal').classList.toggle('active', complete);
  document.getElementById('stepFinal').classList.toggle('done', complete);
}
function resetSession() {
  capturedPhotos = [];
  photoDataUrls = [];
  retakeIndex = null;
  viewerDone = false;
  qrPanel.classList.add('hidden');
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  drawCanvas();
  broadcastState('session-reset');
}
function resetTemplate() { templateImage = null; templateDataUrl = null; templateUpload.value = ''; resetSession(); broadcastState('template-reset'); }

paperSize.addEventListener('change', setPaper);
orientation.addEventListener('change', setPaper);
templateUpload.addEventListener('change', event => {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { const img = new Image(); img.onload = () => { templateImage = img; templateDataUrl = e.target.result; resetSession(); broadcastState('template-updated'); }; img.src = e.target.result; };
  reader.readAsDataURL(file);
});
startCameraBtn.addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' }, audio: false });
    cameraFeed.srcObject = stream;
    captureStatus.textContent = 'Camera started. Preparing capture...';
    const markReady = () => { cameraReady = true; cameraFeed.play().catch(() => {}); drawCanvas(); updateUi(); };
    cameraFeed.onloadedmetadata = markReady;
    cameraFeed.oncanplay = markReady;
    setTimeout(markReady, 500);
    setTimeout(markReady, 1200);
  } catch (error) { alert('Camera access failed. Please allow camera permission and connect your external camera.'); }
});

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function runCountdown() {
  captureBtn.disabled = true;
  countdownOverlay.classList.remove('hidden');
  for (const value of ['3','2','1']) { countdownNumber.textContent = value; countdownLabel.textContent = 'Get ready'; await sleep(850); }
  countdownNumber.textContent = '📸'; countdownLabel.textContent = 'Smile!'; await sleep(450);
  countdownOverlay.classList.add('hidden');
}
function showFlash() { flashOverlay.classList.remove('hidden'); setTimeout(() => flashOverlay.classList.add('hidden'), 340); }
function captureToTemplate() {
  const shotCanvas = document.createElement('canvas');
  shotCanvas.width = cameraFeed.videoWidth || 1280;
  shotCanvas.height = cameraFeed.videoHeight || 720;
  shotCanvas.getContext('2d').drawImage(cameraFeed, 0, 0, shotCanvas.width, shotCanvas.height);
  const img = new Image();
  const dataUrl = shotCanvas.toDataURL('image/jpeg', 0.78);
  img.onload = () => {
    if (retakeIndex !== null) {
      capturedPhotos[retakeIndex] = img;
      photoDataUrls[retakeIndex] = dataUrl;
      retakeIndex = null;
    } else if (capturedPhotos.length < 3) {
      capturedPhotos.push(img);
      photoDataUrls.push(dataUrl);
    }
    viewerDone = false;
    qrPanel.classList.add('hidden');
    drawCanvas();
    broadcastState('photo-captured');
  };
  img.src = dataUrl;
}
captureBtn.addEventListener('click', async () => { await runCountdown(); captureToTemplate(); showFlash(); });

document.querySelectorAll('.retake-btn').forEach(btn => btn.addEventListener('click', () => {
  requestedRetakeIndex = Number(btn.dataset.retake);
  confirmTitle.textContent = `Retake Photo ${requestedRetakeIndex + 1}?`;
  confirmModal.classList.remove('hidden');
}));
confirmNoBtn.addEventListener('click', () => { requestedRetakeIndex = null; confirmModal.classList.add('hidden'); });
confirmYesBtn.addEventListener('click', () => {
  retakeIndex = requestedRetakeIndex;
  requestedRetakeIndex = null;
  confirmModal.classList.add('hidden');
  captureBtn.disabled = false;
  captureStatus.textContent = `Retake Photo ${retakeIndex + 1}. Click Capture Photo when ready.`;
});

function showPrintLoading() { printOverlay.classList.remove('hidden'); }
function finishPrinting() { printOverlay.classList.add('hidden'); resetSession(); }
printBtn.addEventListener('click', () => { showPrintLoading(); setTimeout(() => window.print(), 150); });
window.addEventListener('afterprint', finishPrinting);
window.matchMedia('print').addEventListener?.('change', event => { if (!event.matches) finishPrinting(); });

function saveFinal() {
  const link = document.createElement('a');
  link.download = `snap-it-up-session-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
saveBtn.addEventListener('click', saveFinal);
generateQrBtn.addEventListener('click', () => {
  canvas.toBlob(blob => {
    if (!blob) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(blob);
    downloadLink.href = objectUrl;
    qrCode.innerHTML = '';
    if (window.QRCode) new QRCode(qrCode, { text: objectUrl, width: 196, height: 196 });
    else qrCode.textContent = 'QR library did not load. Use the download button below.';
    qrPanel.classList.remove('hidden');
  }, 'image/png');
});
doneBtn.addEventListener('click', () => { viewerDone = true; generateQrBtn.classList.remove('hidden'); captureStatus.textContent = 'Session done. Generate QR or start over.'; updateUi(); broadcastState('viewer-done'); });
newSessionBtn.addEventListener('click', resetSession);
resetTemplateBtn.addEventListener('click', resetTemplate);



function serializeState(reason = 'state-updated') {
  return {
    reason,
    timestamp: Date.now(),
    sourceMode: currentMode,
    clientId: CLIENT_ID,
    templateDataUrl,
    photoDataUrls: photoDataUrls.slice(0, 3),
    photoSlots,
    paperSize: paperSize.value,
    orientation: orientation.value,
    viewerDone
  };
}

function broadcastState(reason) {
  if (!currentMode) return;
  const payload = serializeState(reason);
  try { localStorage.setItem(SYNC_KEY, JSON.stringify(payload)); } catch (_) {}
  try { syncChannel?.postMessage(payload); } catch (_) {}
  sendSupabaseState(payload);
  updateLiveStatus(payload);
}

function isSupabaseConfigured() {
  return /^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL)
    && SUPABASE_PUBLISHABLE_KEY
    && !SUPABASE_PUBLISHABLE_KEY.includes('PASTE_')
    && SUPABASE_PUBLISHABLE_KEY !== 'CONFIGURED_IN_BUILD';
}

async function sendSupabaseState(payload) {
  if (!supabaseChannel) return;
  if (!supabaseReady) { pendingSupabasePayload = payload; return; }
  try {
    const result = await supabaseChannel.send({ type: 'broadcast', event: 'state', payload });
    if (result !== 'ok') updateLiveStatus(payload, `Supabase send returned: ${result}`);
  } catch (error) {
    updateLiveStatus(payload, `Supabase send failed: ${error.message}`);
  }
}

function applyRemoteState(payload) {
  if (!payload || payload.clientId === CLIENT_ID || payload.sourceMode === currentMode) return;
  if (payload.paperSize && paperSize.value !== payload.paperSize) paperSize.value = payload.paperSize;
  if (payload.orientation && orientation.value !== payload.orientation) orientation.value = payload.orientation;
  const selected = paperSizes[paperSize.value] || paperSizes['4x6'];
  const isLandscape = orientation.value === 'landscape';
  canvas.width = isLandscape ? selected.height : selected.width;
  canvas.height = isLandscape ? selected.width : selected.height;
  paperBadge.textContent = `${selected.label} • ${isLandscape ? 'Landscape' : 'Portrait'}`;
  if (Array.isArray(payload.photoSlots)) photoSlots = payload.photoSlots;
  viewerDone = !!payload.viewerDone;
  const imageLoads = [];
  if (payload.templateDataUrl && payload.templateDataUrl !== templateDataUrl) {
    templateDataUrl = payload.templateDataUrl;
    templateImage = new Image();
    imageLoads.push(new Promise(resolve => { templateImage.onload = resolve; templateImage.onerror = resolve; templateImage.src = templateDataUrl; }));
  }
  if (Array.isArray(payload.photoDataUrls)) {
    photoDataUrls = payload.photoDataUrls.slice(0, 3);
    capturedPhotos = photoDataUrls.map(src => {
      const img = new Image();
      imageLoads.push(new Promise(resolve => { img.onload = resolve; img.onerror = resolve; }));
      img.src = src;
      return img;
    });
  }
  Promise.all(imageLoads).then(() => { drawCanvas(); updateLiveStatus(payload); });
}

function updateLiveStatus(payload, syncMessage) {
  const status = document.getElementById('liveSyncStatus');
  const photoStatus = document.getElementById('operatorPhotoStatus');
  if (status) {
    const syncLabel = supabaseReady ? 'Supabase live sync connected' : (isSupabaseConfigured() ? 'Connecting to Supabase live sync...' : 'Local tab sync only - add anon key in app.js');
    const reason = payload?.reason ? `Live update: ${payload.reason.replaceAll('-', ' ')}` : 'Live sync ready.';
    status.textContent = syncMessage ? `${reason} • ${syncMessage}` : `${reason} • ${syncLabel}`;
  }
  if (photoStatus) {
    const list = (payload?.photoDataUrls || photoDataUrls).map((src, i) => `Photo ${i + 1}: ${src ? 'received' : 'waiting'}`);
    photoStatus.innerHTML = list.length ? list.map(item => `<span>${item}</span>`).join('') : '<span>Waiting for viewer captures...</span>';
  }
}

function initSupabaseSync() {
  if (!isSupabaseConfigured()) return;
  if (!window.supabase?.createClient) {
    updateLiveStatus(null, 'Supabase library did not load.');
    return;
  }
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    supabaseChannel = supabaseClient.channel(LIVE_ROOM, {
      config: { broadcast: { self: false, ack: true } }
    });
    supabaseChannel
      .on('broadcast', { event: 'state' }, event => applyRemoteState(event.payload))
      .subscribe(status => {
        supabaseReady = status === 'SUBSCRIBED';
        updateLiveStatus(null, supabaseReady ? 'Supabase live sync connected.' : `Supabase status: ${status}`);
        if (supabaseReady && pendingSupabasePayload) {
          const payload = pendingSupabasePayload;
          pendingSupabasePayload = null;
          sendSupabaseState(payload);
        }
      });
  } catch (error) {
    updateLiveStatus(null, `Supabase setup failed: ${error.message}`);
  }
}

function initSync() {
  initSupabaseSync();
  if ('BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('snap-it-up-live-room');
    syncChannel.onmessage = event => applyRemoteState(event.data);
  }
  window.addEventListener('storage', event => {
    if (event.key === SYNC_KEY && event.newValue) {
      try { applyRemoteState(JSON.parse(event.newValue)); } catch (_) {}
    }
  });
  try {
    const existing = JSON.parse(localStorage.getItem(SYNC_KEY) || 'null');
    if (existing) applyRemoteState(existing);
  } catch (_) {}
  updateLiveStatus();
}


document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  tab.classList.add('active'); document.getElementById(`${tab.dataset.tab}-panel`).classList.add('active');
}));
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); return this;
  };
}
initSync();
setPaper();
updateUi();
