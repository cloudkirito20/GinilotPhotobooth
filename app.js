
const SUPABASE_URL = "https://srpaeknnmdhafpkgdsih.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_A8DHki148lEPFb_qf6Qebw_pJJz0rH3";

const canvas = document.getElementById('boothCanvas');
const ctx = canvas.getContext('2d');
const templateUpload = document.getElementById('templateUpload');
const cameraFeed = document.getElementById('cameraFeed');
const livePreviewImage = document.getElementById('livePreviewImage');
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
let lastSyncError = '';
let lastCaptureRequestId = null;
let pendingCaptureRequest = null;
let peerConnection = null;
let remoteStream = null;
let viewerClientId = null;
let operatorCameraAnnounced = false;
let pendingIceCandidates = [];
let autoSessionActive = false;
let autoSessionAbort = false;
let viewerReadyTimer = null;
let liveOfferInProgress = false;
let lastLiveOfferAt = 0;
const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
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
chooseViewerBtn.addEventListener('click', () => {
  setViewMode('viewer');
  captureStatus.textContent = 'Connecting to operator camera...';
  cameraFeed.classList.remove('hidden');
  livePreviewImage?.classList.add('hidden');
  startViewerReadyLoop();
});

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
  if (!autoSessionActive) {
    captureStatus.textContent = complete && !isRetaking
      ? 'Final template is ready. Choose a photo to retake or tap Done.'
      : (currentMode === 'viewer'
        ? 'Tap Start Session. The app will capture all 3 photos automatically.'
        : `Photo ${nextNumber} of 3. Waiting for viewer session.`);
  }

  const videoReady = cameraReady || (!!stream && cameraFeed.readyState >= 1 && cameraFeed.videoWidth > 0);
  const viewerHasLiveOperatorCamera = currentMode === 'viewer' && hasViewerLiveVideo();
  const viewerCanRequest = currentMode === 'viewer' && viewerHasLiveOperatorCamera && !(complete && !isRetaking) && !pendingCaptureRequest && !autoSessionActive;
  captureBtn.disabled = currentMode === 'viewer' ? !viewerCanRequest : true;
  captureBtn.textContent = isRetaking ? `Retake Photo ${retakeIndex + 1}` : 'Start Session';

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
  autoSessionActive = false;
  autoSessionAbort = true;
  pendingCaptureRequest = null;
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
    const markReady = () => {
      cameraReady = true;
      cameraFeed.play().catch(() => {});
      drawCanvas();
      updateUi();
      announceOperatorCameraReady();
      maybeStartOperatorLiveStream();
    };
    cameraFeed.onloadedmetadata = markReady;
    cameraFeed.oncanplay = markReady;
    setTimeout(markReady, 500);
    setTimeout(markReady, 1200);
  } catch (error) { alert('Camera access failed. Please allow camera permission and connect your external camera.'); }
});



function sendLiveSignal(eventName, payload = {}) {
  const message = { ...payload, clientId: CLIENT_ID, sourceMode: currentMode, timestamp: Date.now() };
  try { syncChannel?.postMessage({ type: 'live-signal', eventName, payload: message }); } catch (_) {}
  try { localStorage.setItem(`${SYNC_KEY}-live-signal`, JSON.stringify({ eventName, payload: message })); } catch (_) {}
  if (supabaseChannel && supabaseReady) {
    supabaseChannel.send({ type: 'broadcast', event: eventName, payload: message }).catch(() => {});
  }
}

function closePeerConnection() {
  if (peerConnection) {
    try { peerConnection.ontrack = null; peerConnection.onicecandidate = null; peerConnection.close(); } catch (_) {}
  }
  peerConnection = null;
  pendingIceCandidates = [];
  if (currentMode === 'viewer') remoteStream = null;
}

function createPeerConnection(role) {
  closePeerConnection();
  peerConnection = new RTCPeerConnection(RTC_CONFIG);
  peerConnection.onicecandidate = event => {
    if (!event.candidate) return;
    const targetClientId = role === 'operator' ? viewerClientId : null;
    sendLiveSignal('webrtc-ice', { targetClientId, candidate: event.candidate });
  };
  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection?.connectionState || '';
    if (currentMode === 'viewer') {
      if (!autoSessionActive && !pendingCaptureRequest) captureStatus.textContent = state === 'connected' ? 'Live operator camera connected. Tap Start Session when ready.' : `Operator camera connection: ${state || 'starting'}...`;
    } else if (currentMode === 'operator' && state) {
      captureStatus.textContent = state === 'connected' ? 'Viewer is watching the operator camera live.' : `Live viewer connection: ${state}...`;
    }
    updateUi();
  };
  peerConnection.ontrack = event => {
    if (currentMode !== 'viewer') return;
    remoteStream = event.streams[0] || remoteStream || new MediaStream();
    if (!event.streams[0] && event.track) remoteStream.addTrack(event.track);
    cameraFeed.srcObject = remoteStream;
    cameraFeed.classList.remove('hidden');
    livePreviewImage?.classList.add('hidden');
    cameraFeed.muted = true;
    cameraFeed.play().catch(() => {});
    cameraReady = true;
    if (!autoSessionActive && !pendingCaptureRequest) captureStatus.textContent = 'Live operator camera connected. Tap Start Session when ready.';
    if (viewerReadyTimer) { clearInterval(viewerReadyTimer); viewerReadyTimer = null; }
    updateUi();
  };
  return peerConnection;
}

function hasViewerLiveVideo() {
  return currentMode === 'viewer'
    && !!remoteStream
    && cameraFeed.srcObject === remoteStream
    && cameraFeed.readyState >= 1;
}

function requestViewerLiveReconnect(message = 'Connecting to operator camera...') {
  if (currentMode !== 'viewer') return;
  captureStatus.textContent = message;
  announceViewerReady();
  startViewerReadyLoop();
  updateUi();
}

function announceViewerReady() {
  if (currentMode !== 'viewer') return;
  sendLiveSignal('viewer-ready', { wantsLivePreview: true });
}

function startViewerReadyLoop() {
  if (viewerReadyTimer) clearInterval(viewerReadyTimer);
  announceViewerReady();
  viewerReadyTimer = setInterval(() => {
    if (currentMode !== 'viewer') {
      clearInterval(viewerReadyTimer);
      viewerReadyTimer = null;
      return;
    }
    const state = peerConnection?.connectionState;
    const hasLiveVideo = hasViewerLiveVideo();
    if (state === 'connected' && hasLiveVideo) return;
    if (!autoSessionActive && !pendingCaptureRequest) captureStatus.textContent = 'Connecting to operator camera...';
    announceViewerReady();
  }, 2000);
}

function announceOperatorCameraReady(force = false) {
  if (currentMode !== 'operator' || !cameraReady) return;
  if (operatorCameraAnnounced && !force) return;
  operatorCameraAnnounced = true;
  sendLiveSignal('operator-camera-ready', { hasCamera: true });
}

async function maybeStartOperatorLiveStream(force = false) {
  if (currentMode !== 'operator' || !stream || !cameraReady || !viewerClientId) return;
  const state = peerConnection?.connectionState;
  const now = Date.now();
  if (!force && liveOfferInProgress) return;
  if (!force && peerConnection && ['new', 'connecting', 'connected'].includes(state) && now - lastLiveOfferAt < 6000) return;
  liveOfferInProgress = true;
  lastLiveOfferAt = now;
  try {
    const pc = createPeerConnection('operator');
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    const offer = await pc.createOffer({ offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    sendLiveSignal('webrtc-offer', { targetClientId: viewerClientId, description: pc.localDescription });
    captureStatus.textContent = 'Sending live camera preview to viewer...';
  } catch (error) {
    captureStatus.textContent = `Could not start live preview: ${error.message}`;
  } finally {
    setTimeout(() => { liveOfferInProgress = false; }, 1200);
  }
}

async function handleLiveSignal(eventName, payload) {
  if (!payload || payload.clientId === CLIENT_ID) return;
  if (payload.targetClientId && payload.targetClientId !== CLIENT_ID) return;


  if (eventName === 'viewer-ready') {
    if (currentMode !== 'operator') return;
    const isNewViewer = viewerClientId !== payload.clientId;
    viewerClientId = payload.clientId;
    captureStatus.textContent = cameraReady ? 'Viewer connected. Sending live camera preview...' : 'Viewer connected. Start Camera to send live preview.';
    updateUi();
    if (cameraReady) announceOperatorCameraReady(true);
    maybeStartOperatorLiveStream(isNewViewer);
    return;
  }

  if (eventName === 'operator-camera-ready') {
    if (currentMode !== 'viewer') return;
    if (!autoSessionActive && !pendingCaptureRequest) captureStatus.textContent = 'Operator camera is ready. Waiting for live preview...';
    announceViewerReady();
    return;
  }

  if (eventName === 'webrtc-offer') {
    if (currentMode !== 'viewer' || !payload.description) return;
    try {
      const pc = createPeerConnection('viewer');
      await pc.setRemoteDescription(new RTCSessionDescription(payload.description));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendLiveSignal('webrtc-answer', { targetClientId: payload.clientId, description: pc.localDescription });
      for (const candidate of pendingIceCandidates.splice(0)) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      captureStatus.textContent = 'Connecting live operator camera...';
    } catch (error) {
      captureStatus.textContent = `Live preview failed: ${error.message}`;
    }
    return;
  }

  if (eventName === 'webrtc-answer') {
    if (currentMode !== 'operator' || !peerConnection || !payload.description) return;
    try { await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.description)); }
    catch (error) { captureStatus.textContent = `Viewer answer failed: ${error.message}`; }
    return;
  }

  if (eventName === 'webrtc-ice') {
    if (!payload.candidate) return;
    if (!peerConnection || !peerConnection.remoteDescription) {
      pendingIceCandidates.push(payload.candidate);
      return;
    }
    try { await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (_) {}
  }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function showSessionCue(message, detail = '') {
  captureBtn.disabled = true;
  countdownOverlay.classList.remove('hidden');
  countdownNumber.textContent = message;
  countdownLabel.textContent = detail;
  await sleep(1250);
}

async function runCountdown(message = 'Get ready') {
  captureBtn.disabled = true;
  countdownOverlay.classList.remove('hidden');
  for (const value of ['3','2','1']) {
    countdownNumber.textContent = value;
    countdownLabel.textContent = message;
    await sleep(850);
  }
  countdownNumber.textContent = '📸';
  countdownLabel.textContent = 'Smile!';
  await sleep(650);
  countdownOverlay.classList.add('hidden');
}
function showFlash() { flashOverlay.classList.remove('hidden'); setTimeout(() => flashOverlay.classList.add('hidden'), 340); }
function captureToTemplate() {
  const sourceWidth = cameraFeed.videoWidth || 1280;
  const sourceHeight = cameraFeed.videoHeight || 720;
  const maxSyncWidth = 480;
  const scale = Math.min(1, maxSyncWidth / sourceWidth);
  const shotCanvas = document.createElement('canvas');
  shotCanvas.width = Math.round(sourceWidth * scale);
  shotCanvas.height = Math.round(sourceHeight * scale);
  const shotCtx = shotCanvas.getContext('2d');
  shotCtx.imageSmoothingEnabled = true;
  shotCtx.imageSmoothingQuality = 'high';
  shotCtx.drawImage(cameraFeed, 0, 0, sourceWidth, sourceHeight, 0, 0, shotCanvas.width, shotCanvas.height);
  const img = new Image();
  // Keep the payload small enough for Supabase Realtime broadcast. Large camera frames can silently fail to sync.
  const dataUrl = shotCanvas.toDataURL('image/jpeg', 0.42);
  img.onload = () => {
    const slotIndex = retakeIndex !== null ? retakeIndex : getNextCaptureSlotIndex();
    capturedPhotos[slotIndex] = img;
    photoDataUrls[slotIndex] = dataUrl;
    retakeIndex = null;
    viewerDone = false;
    qrPanel.classList.add('hidden');
    drawCanvas();
    broadcastState('photo-captured');
  };
  img.src = dataUrl;
}

async function performOperatorCapture(source = 'operator') {
  if (!templateImage) {
    captureStatus.textContent = 'Upload a template before capturing.';
    return;
  }
  const videoReady = cameraReady || (!!stream && cameraFeed.readyState >= 1 && cameraFeed.videoWidth > 0);
  if (!videoReady) {
    captureStatus.textContent = source === 'remote' ? 'Viewer requested a capture, but the operator camera is not started.' : 'Start the camera before capturing.';
    updateLiveStatus(serializeState(source === 'remote' ? 'remote-capture-failed-camera-not-ready' : 'camera-not-ready'));
    return;
  }
  if (source !== 'remote') await runCountdown();
  captureToTemplate();
  showFlash();
}

function getNextCaptureSlotIndex() {
  if (retakeIndex !== null) return retakeIndex;
  const next = photoDataUrls.findIndex(src => !src);
  return next === -1 ? Math.min(capturedPhotos.length, 2) : next;
}


function sendCaptureRequest(slotOverride = null) {
  const complete = capturedPhotos.length === 3 && capturedPhotos.every(Boolean);
  const viewerHasLiveOperatorCamera = hasViewerLiveVideo();
  if ((complete && retakeIndex === null) || pendingCaptureRequest) return null;
  if (!viewerHasLiveOperatorCamera) {
    requestViewerLiveReconnect('Live preview is not ready yet. Reconnecting to operator camera...');
    return null;
  }
  const requestedSlot = Number.isInteger(slotOverride) ? slotOverride : getNextCaptureSlotIndex();
  const request = {
    requestId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    timestamp: Date.now(),
    clientId: CLIENT_ID,
    sourceMode: currentMode,
    slotIndex: requestedSlot,
    retakeIndex: retakeIndex
  };
  pendingCaptureRequest = request.requestId;
  captureStatus.textContent = `Capture request sent for Photo ${requestedSlot + 1}. Waiting for operator camera...`;
  setTimeout(() => {
    if (pendingCaptureRequest === request.requestId) {
      pendingCaptureRequest = null;
      autoSessionActive = false;
      captureStatus.textContent = 'No operator photo received yet. Confirm the operator laptop camera is started, then try again.';
      updateUi();
    }
  }, 18000);
  updateUi();
  try { localStorage.setItem(`${SYNC_KEY}-capture-request`, JSON.stringify(request)); } catch (_) {}
  try { syncChannel?.postMessage({ type: 'capture-request', payload: request }); } catch (_) {}
  sendSupabaseCaptureRequest(request);
  return request.requestId;
}

function waitForPhoto(slotIndex, previousSrc, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise(resolve => {
    const timer = setInterval(() => {
      const received = !!photoDataUrls[slotIndex] && photoDataUrls[slotIndex] !== previousSrc;
      if (received) { clearInterval(timer); resolve(true); }
      else if (Date.now() - start > timeoutMs || autoSessionAbort) { clearInterval(timer); resolve(false); }
    }, 200);
  });
}

async function runViewerAutoSession() {
  if (autoSessionActive) return;
  const complete = capturedPhotos.length === 3 && capturedPhotos.every(Boolean);
  if (complete && retakeIndex === null) return;
  if (!hasViewerLiveVideo()) {
    requestViewerLiveReconnect('Live preview is not ready yet. Please wait for the operator camera to appear, then tap Start Session again.');
    return;
  }

  if (retakeIndex !== null) {
    autoSessionActive = true;
    autoSessionAbort = false;
    const slot = retakeIndex;
    const previous = photoDataUrls[slot] || null;
    captureStatus.textContent = `Retaking Photo ${slot + 1}.`;
    await runCountdown('Retake');
    const requestId = sendCaptureRequest(slot);
    if (!requestId) {
      autoSessionActive = false;
      requestViewerLiveReconnect('Retake did not start because the live preview is not ready. Reconnecting to operator camera...');
      updateUi();
      return;
    }
    const ok = await waitForPhoto(slot, previous);
    autoSessionActive = false;
    if (ok) captureStatus.textContent = 'Retake received. Review the final template.';
    updateUi();
    return;
  }

  autoSessionActive = true;
  autoSessionAbort = false;
  pendingCaptureRequest = null;
  captureStatus.textContent = 'Session started. Capturing 3 photos automatically.';
  updateUi();

  for (let slot = 0; slot < 3; slot++) {
    if (autoSessionAbort) break;
    const cue = slot === 0 ? 'Get ready' : (slot === 1 ? 'Again' : 'Last na');
    const countdownPrompt = `Photo ${slot + 1} of 3`;
    const previous = photoDataUrls[slot] || null;
    captureStatus.textContent = `Photo ${slot + 1} of 3: ${cue}.`;
    await showSessionCue(cue, slot === 0 ? 'Starting session' : 'Next photo');
    await runCountdown(countdownPrompt);
    const requestId = sendCaptureRequest(slot);
    if (!requestId) {
      captureStatus.textContent = 'Capture did not start because the live preview is not ready. Reconnecting to operator camera...';
      autoSessionActive = false;
      requestViewerLiveReconnect(captureStatus.textContent);
      updateUi();
      return;
    }
    const ok = await waitForPhoto(slot, previous);
    pendingCaptureRequest = null;
    if (!ok) {
      captureStatus.textContent = `Photo ${slot + 1} was not received. Please check the operator camera and live sync, then start again.`;
      autoSessionActive = false;
      updateUi();
      return;
    }
    if (slot < 2) await sleep(850);
  }

  autoSessionActive = false;
  captureStatus.textContent = 'All 3 photos captured. Review the template, retake a photo, or tap Done.';
  drawCanvas();
  updateUi();
}

function handleCaptureRequest(request) {
  if (!request || request.clientId === CLIENT_ID || request.requestId === lastCaptureRequestId) return;
  lastCaptureRequestId = request.requestId;
  if (currentMode !== 'operator') return;
  const slotIndex = Number.isInteger(request.retakeIndex) ? request.retakeIndex : request.slotIndex;
  if (Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < 3) retakeIndex = slotIndex;
  captureStatus.textContent = `Viewer requested Photo ${(Number.isInteger(slotIndex) ? slotIndex : 0) + 1}. Capturing from operator camera...`;
  performOperatorCapture('remote');
}

captureBtn.addEventListener('click', async () => {
  if (currentMode === 'viewer') runViewerAutoSession();
});

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
  captureStatus.textContent = `Retake Photo ${retakeIndex + 1}. Tap Retake Photo to capture again.`;
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
function generateFinalQr() {
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
}
generateQrBtn.addEventListener('click', generateFinalQr);
doneBtn.addEventListener('click', () => {
  viewerDone = true;
  generateQrBtn.classList.remove('hidden');
  captureStatus.textContent = 'Session done. QR is ready for download. Operator may print the final photo.';
  generateFinalQr();
  updateUi();
  broadcastState('viewer-done');
});
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

async function sendSupabaseCaptureRequest(request) {
  if (!supabaseChannel) return;
  if (!supabaseReady) {
    captureStatus.textContent = 'Capture request is waiting for Supabase live sync to connect.';
    return;
  }
  try {
    const result = await supabaseChannel.send({ type: 'broadcast', event: 'capture-request', payload: request });
    if (result !== 'ok') captureStatus.textContent = `Capture request could not be sent: ${result}`;
  } catch (error) {
    captureStatus.textContent = `Capture request failed: ${error.message}`;
  }
}

async function sendSupabaseState(payload) {
  if (!supabaseChannel) return;
  if (!supabaseReady) { pendingSupabasePayload = payload; return; }
  try {
    const payloadSizeKb = Math.round(new Blob([JSON.stringify(payload)]).size / 1024);
    const result = await supabaseChannel.send({ type: 'broadcast', event: 'state', payload });
    if (result === 'ok') {
      updateLiveStatus(payload, `Supabase live sync connected. Sent ${payloadSizeKb} KB.`);
    } else {
      updateLiveStatus(payload, `Supabase send returned: ${result}. Payload ${payloadSizeKb} KB.`);
    }
  } catch (error) {
    updateLiveStatus(payload, `Supabase send failed: ${error.message}`);
  }
}

function applyRemoteState(payload) {
  if (!payload || payload.clientId === CLIENT_ID) return;
  if (pendingCaptureRequest && payload.reason === 'photo-captured') {
    pendingCaptureRequest = null;
    captureStatus.textContent = 'Photo received from operator camera.';
  }
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
    capturedPhotos = [];
    photoDataUrls.forEach((src, index) => {
      if (!src) return;
      const img = new Image();
      capturedPhotos[index] = img;
      imageLoads.push(new Promise(resolve => { img.onload = resolve; img.onerror = resolve; }));
      img.src = src;
    });
  }
  Promise.all(imageLoads).then(() => { drawCanvas(); updateLiveStatus(payload); updateUi(); });
}

function updateLiveStatus(payload, syncMessage) {
  if (syncMessage && !syncMessage.includes('connected')) lastSyncError = syncMessage;
  if (syncMessage && syncMessage.includes('connected')) lastSyncError = '';
  const status = document.getElementById('liveSyncStatus');
  const photoStatus = document.getElementById('operatorPhotoStatus');
  if (status) {
    const syncLabel = supabaseReady ? 'Supabase live sync connected' : (lastSyncError || (isSupabaseConfigured() ? 'Connecting to Supabase live sync...' : 'Local tab sync only - add anon key in app.js'));
    const reason = payload?.reason ? `Live update: ${payload.reason.replaceAll('-', ' ')}` : 'Live sync ready.';
    status.textContent = `${reason} • ${syncLabel}`;
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
      config: { broadcast: { self: false, ack: false } }
    });
    supabaseChannel
      .on('broadcast', { event: 'state' }, event => applyRemoteState(event.payload))
      .on('broadcast', { event: 'capture-request' }, event => handleCaptureRequest(event.payload))
      .on('broadcast', { event: 'viewer-ready' }, event => handleLiveSignal('viewer-ready', event.payload))
      .on('broadcast', { event: 'operator-camera-ready' }, event => handleLiveSignal('operator-camera-ready', event.payload))
      .on('broadcast', { event: 'webrtc-offer' }, event => handleLiveSignal('webrtc-offer', event.payload))
      .on('broadcast', { event: 'webrtc-answer' }, event => handleLiveSignal('webrtc-answer', event.payload))
      .on('broadcast', { event: 'webrtc-ice' }, event => handleLiveSignal('webrtc-ice', event.payload))
      .subscribe(status => {
        supabaseReady = status === 'SUBSCRIBED';
        const statusText = status === 'CHANNEL_ERROR' ? 'Supabase channel error. Check anon key, Realtime access, and that both devices use the same deployed URL.' : (supabaseReady ? 'Supabase live sync connected.' : `Supabase status: ${status}`);
        updateLiveStatus(null, statusText);
        if (supabaseReady && pendingSupabasePayload) {
          const payload = pendingSupabasePayload;
          pendingSupabasePayload = null;
          sendSupabaseState(payload);
        }
        if (supabaseReady && currentMode === 'viewer') startViewerReadyLoop();
        if (supabaseReady && currentMode === 'operator' && cameraReady) { operatorCameraAnnounced = false; announceOperatorCameraReady(true); maybeStartOperatorLiveStream(true); }
      });
  } catch (error) {
    updateLiveStatus(null, `Supabase setup failed: ${error.message}`);
  }
}

function initSync() {
  initSupabaseSync();
  if ('BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('snap-it-up-live-room');
    syncChannel.onmessage = event => {
      if (event.data?.type === 'capture-request') handleCaptureRequest(event.data.payload);
      else if (event.data?.type === 'live-signal') handleLiveSignal(event.data.eventName, event.data.payload);
      else applyRemoteState(event.data);
    };
  }
  window.addEventListener('storage', event => {
    if (event.key === SYNC_KEY && event.newValue) {
      try { applyRemoteState(JSON.parse(event.newValue)); } catch (_) {}
    }
    if (event.key === `${SYNC_KEY}-capture-request` && event.newValue) {
      try { handleCaptureRequest(JSON.parse(event.newValue)); } catch (_) {}
    }
    if (event.key === `${SYNC_KEY}-live-signal` && event.newValue) {
      try { const signal = JSON.parse(event.newValue); handleLiveSignal(signal.eventName, signal.payload); } catch (_) {}
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
