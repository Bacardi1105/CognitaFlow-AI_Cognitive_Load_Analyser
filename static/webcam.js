// ── webcam.js ─────────────────────────────────────────────────────────────
// Simulates eye-tracking metrics using the webcam feed.
// Real eye tracking would require a library like face-api.js or MediaPipe;
// here we derive plausible metrics from frame analysis and controlled
// simulation so the UI works end-to-end.

let videoStream = null;
let trackingInterval = null;
let countdownInterval = null;

// Accumulated metrics
let blinkCount = 0;
let frameCount = 0;
let prevLuma = null;
let gazeOffsets = [];
let totalSeconds = 0;
let eyeOpenValues = [];

const VIDEO   = () => document.getElementById('webcam-video');
const CANVAS  = () => document.getElementById('tracking-canvas');
const BLINK_D = () => document.getElementById('blink-display');
const OPEN_D  = () => document.getElementById('openness-display');
const GAZE_D  = () => document.getElementById('gaze-display');

async function startWebcam() {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }
    });
    VIDEO().srcObject = videoStream;
    document.getElementById('permission-prompt').style.display = 'none';
    document.getElementById('webcam-section').style.display = 'block';
  } catch (e) {
    alert('Camera access denied. Please allow camera and reload.');
  }
}

function startRecording() {
  // Reset
  blinkCount = 0;
  frameCount = 0;
  prevLuma = null;
  gazeOffsets = [];
  eyeOpenValues = [];
  totalSeconds = 0;

  document.getElementById('record-btn').disabled = true;
  document.getElementById('test-timer').style.display = 'block';

  const canvas = CANVAS();
  const ctx = canvas.getContext('2d');
  canvas.width  = 320;
  canvas.height = 240;

  // Analyse frames every ~250ms
  trackingInterval = setInterval(() => {
    analyseFrame(ctx);
    updateDisplays();
  }, 250);

  // Countdown
  let remaining = 30;
  document.getElementById('countdown').textContent = remaining;

  countdownInterval = setInterval(() => {
    remaining--;
    totalSeconds++;
    document.getElementById('countdown').textContent = remaining;
    if (remaining <= 0) finishRecording();
  }, 1000);
}

function analyseFrame(ctx) {
  const video = VIDEO();
  if (!video.videoWidth) return;

  ctx.drawImage(video, 0, 0, 320, 240);
  const frame = ctx.getImageData(0, 0, 320, 240);
  const data  = frame.data;

  // Compute average luminance of upper-middle region (eyes area)
  let luma = 0;
  const x0 = 80, x1 = 240, y0 = 60, y1 = 130;
  let px = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * 320 + x) * 4;
      luma += 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
      px++;
    }
  }
  luma /= px;

  // Detect blink: sudden drop in eye-region luminance
  if (prevLuma !== null && prevLuma - luma > 18) {
    blinkCount++;
  }
  prevLuma = luma;
  frameCount++;

  // Eye openness: simulated from luma variation (bright = more open)
  const openness = Math.min(1, Math.max(0, (luma / 255) * 0.8 + 0.1));
  eyeOpenValues.push(openness);

  // Gaze stability: track small luminance offsets left vs right half
  let lumaL = 0, lumaR = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < 160; x++) {
      const i = (y * 320 + x) * 4;
      lumaL += 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    }
    for (let x = 160; x < x1; x++) {
      const i = (y * 320 + x) * 4;
      lumaR += 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    }
  }
  gazeOffsets.push(Math.abs(lumaL - lumaR));
}

function updateDisplays() {
  const elapsed = Math.max(1, totalSeconds / 60);
  const bpm = (blinkCount / elapsed).toFixed(1);
  const avgOpen = eyeOpenValues.length
    ? (eyeOpenValues.reduce((a,b) => a+b, 0) / eyeOpenValues.length)
    : 0.4;
  const avgOffset = gazeOffsets.length
    ? gazeOffsets.reduce((a,b) => a+b, 0) / gazeOffsets.length
    : 0;
  const gazeStab = Math.min(100, 100 - (avgOffset / 10)).toFixed(0);

  BLINK_D().textContent = bpm;
  OPEN_D().textContent  = (avgOpen * 100).toFixed(0) + '%';
  GAZE_D().textContent  = gazeStab + '%';
}

async function finishRecording() {
  clearInterval(trackingInterval);
  clearInterval(countdownInterval);

  const elapsedMin = Math.max(1, totalSeconds / 60);
  const blinkRate  = blinkCount / elapsedMin;
  const avgOpen    = eyeOpenValues.length
    ? eyeOpenValues.reduce((a,b) => a+b, 0) / eyeOpenValues.length
    : 0.4;
  const avgOffset  = gazeOffsets.length
    ? gazeOffsets.reduce((a,b) => a+b, 0) / gazeOffsets.length
    : 0;
  const gazeInstability = Math.min(1, avgOffset / 1000);

  try {
    await fetch('/api/webcam/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blink_rate:     parseFloat(blinkRate.toFixed(2)),
        eye_openness:   parseFloat(avgOpen.toFixed(3)),
        gaze_stability: parseFloat(gazeInstability.toFixed(3)),
        session_id:     SESSION_ID
      })
    });
  } catch (e) {
    console.error('Failed to submit webcam data', e);
  }

  document.getElementById('test-timer').style.display = 'none';
  document.getElementById('webcam-controls').style.display = 'none';
  document.getElementById('webcam-done').style.display = 'block';

  // Stop stream
  if (videoStream) videoStream.getTracks().forEach(t => t.stop());

  setTimeout(() => {
    window.location.href = `/voice?session_id=${SESSION_ID}`;
  }, 2000);
}
