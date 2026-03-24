// ── voice.js ──────────────────────────────────────────────────────────────
// Records 30 seconds of audio, analyses speech rate, pauses, and duration.

let audioCtx = null;
let analyser = null;
let micStream = null;
let waveformInterval = null;
let recordingInterval = null;

// Metrics
let startTime = null;
let silenceStart = null;
let pauseCount = 0;
let speakingMs = 0;
let totalMs = 0;
let energyLog = [];
const SILENCE_THRESHOLD = 0.01;
const PAUSE_MIN_MS = 400;

const TOTAL_DURATION = 30; // seconds

async function requestMic() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    document.getElementById('voice-permission').style.display = 'none';
    document.getElementById('voice-controls').style.display  = 'block';
    setupAudio();
    drawWaveform();
  } catch (e) {
    alert('Microphone access denied. Please allow microphone and reload.');
  }
}

function setupAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(micStream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
}

function drawWaveform() {
  const canvas = document.getElementById('waveform-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.clientWidth || 600;
  const H = canvas.clientHeight || 80;
  canvas.width  = W;
  canvas.height = H;

  const bufLen = analyser.frequencyBinCount;
  const dataArr = new Uint8Array(bufLen);

  function draw() {
    waveformInterval = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArr);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth   = 2;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#00e5c3';
    ctx.beginPath();

    const sliceW = W / bufLen;
    let x = 0;
    for (let i = 0; i < bufLen; i++) {
      const v = dataArr[i] / 128.0;
      const y = (v * H) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceW;
    }
    ctx.lineTo(W, H / 2);
    ctx.stroke();
  }
  draw();
}

function startVoice() {
  document.getElementById('voice-btn').disabled = true;
  document.getElementById('voice-status').textContent = '⏺ Recording…';
  document.getElementById('voice-status').className = 'status-pill recording';

  startTime   = Date.now();
  silenceStart = null;
  pauseCount  = 0;
  speakingMs  = 0;
  energyLog   = [];

  let remaining = TOTAL_DURATION;
  document.getElementById('voice-timer').textContent = remaining;

  // Word count simulation via SpeechRecognition (if available)
  let wordCount = 0;
  let recognition = null;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          wordCount += e.results[i][0].transcript.trim().split(/\s+/).length;
        }
      }
    };
    try { recognition.start(); } catch(e) {}
  }

  // Analyse audio energy every 100ms for silence/speech detection
  const energyInterval = setInterval(() => {
    const bufLen = analyser.frequencyBinCount;
    const data = new Float32Array(bufLen);
    analyser.getFloatTimeDomainData(data);
    let rms = 0;
    for (let d of data) rms += d * d;
    rms = Math.sqrt(rms / bufLen);
    energyLog.push(rms);

    const now = Date.now();
    if (rms < SILENCE_THRESHOLD) {
      if (silenceStart === null) silenceStart = now;
    } else {
      if (silenceStart !== null) {
        const silenceLen = now - silenceStart;
        if (silenceLen >= PAUSE_MIN_MS) pauseCount++;
        silenceStart = null;
      }
      speakingMs += 100;
    }
  }, 100);

  // Countdown
  recordingInterval = setInterval(() => {
    remaining--;
    totalMs = (TOTAL_DURATION - remaining) * 1000;
    document.getElementById('voice-timer').textContent = remaining;

    // Update displays live
    const elapsedSec = TOTAL_DURATION - remaining;
    const wpm = elapsedSec > 0 ? Math.round((wordCount / elapsedSec) * 60) : 0;
    document.getElementById('wpm-display').textContent = wpm || '—';
    document.getElementById('pause-display').textContent = pauseCount;
    document.getElementById('duration-display').textContent = (speakingMs / 1000).toFixed(1);

    if (remaining <= 0) {
      clearInterval(recordingInterval);
      clearInterval(energyInterval);
      if (recognition) try { recognition.stop(); } catch(e) {}

      totalMs = TOTAL_DURATION * 1000;
      const finalWpm = wordCount > 0 ? Math.round((wordCount / TOTAL_DURATION) * 60) : estimateWpm();
      finishVoice(finalWpm);
    }
  }, 1000);
}

function estimateWpm() {
  // Estimate based on energy log (active vs silent frames)
  const activeFrames = energyLog.filter(e => e >= SILENCE_THRESHOLD).length;
  const activeSeconds = (activeFrames * 0.1);
  // Average speaking rate assumption: ~2.5 words per second
  return Math.round((activeSeconds * 2.5 / TOTAL_DURATION) * 60);
}

async function finishVoice(wpm) {
  document.getElementById('voice-status').textContent = '✓ Done';
  document.getElementById('voice-status').className = 'status-pill done';
  document.getElementById('voice-timer').textContent = '0';

  // Final metric display
  document.getElementById('wpm-display').textContent = wpm;

  try {
    await fetch('/api/voice/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speech_rate:       wpm,
        pause_count:       pauseCount,
        speaking_duration: parseFloat((speakingMs / 1000).toFixed(2)),
        total_duration:    TOTAL_DURATION,
        session_id:        SESSION_ID
      })
    });
  } catch (e) {
    console.error('Failed to submit voice data', e);
  }

  document.getElementById('voice-controls').style.display = 'none';
  document.getElementById('voice-done').style.display     = 'block';
}

function proceedToQuestionnaire() {
  window.location.href = `/questionnaire?session_id=${SESSION_ID}`;
}
