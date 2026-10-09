// ==================== 상태 관리 ====================
// 탑승 및 하차 상태 분리 관리 (차내 인원 = 총 탑승 - 총 하차)
let totalBoarding = parseInt(localStorage.getItem('counter_boarding') || localStorage.getItem('counter_val') || '0', 10);
let totalAlighting = parseInt(localStorage.getItem('counter_alighting') || '0', 10);
const step = 1; // 터치 증감 단위는 1로 고정
let unit = localStorage.getItem('counter_unit') || '명';
let capacity = parseInt(localStorage.getItem('counter_capacity') || '44', 10); // 기본 44석, 0이면 제한없음
let soundEnabled = localStorage.getItem('counter_sound') !== 'false';
let vibrateEnabled = localStorage.getItem('counter_vibrate') !== 'false';

// 노선 정류장명 목록 (사전 등록된 정류장 이름 배열)
let customStopNames = [];
try {
  customStopNames = JSON.parse(localStorage.getItem('counter_route_stops') || '[]');
  if (!Array.isArray(customStopNames)) customStopNames = [];
} catch (e) {
  customStopNames = [];
}

// 저장된 노선 목록 (localStorage 영구 저장)
let savedRoutes = [];
try {
  savedRoutes = JSON.parse(localStorage.getItem('counter_saved_routes') || '[]');
  if (!Array.isArray(savedRoutes)) savedRoutes = [];
} catch (e) {
  savedRoutes = [];
}

// 기본 노선 ID (localStorage)
let defaultRouteId = localStorage.getItem('counter_default_route') || '';
// 현재 선택된 노선 ID
let activeRouteId = localStorage.getItem('counter_active_route') || '';

// 정류장 구간(Lap) 관리 상태
let currentStopIndex = parseInt(localStorage.getItem('counter_stop_idx') || '1', 10);
let currentStopBaseBoarding = parseInt(localStorage.getItem('counter_stop_base_boarding') || localStorage.getItem('counter_stop_base') || '0', 10);
let currentStopBaseAlighting = parseInt(localStorage.getItem('counter_stop_base_alighting') || '0', 10);

let stopsHistory = [];
try {
  stopsHistory = JSON.parse(localStorage.getItem('counter_stops') || '[]');
  if (!Array.isArray(stopsHistory)) stopsHistory = [];
} catch (e) {
  stopsHistory = [];
}

let historyList = [];
try {
  historyList = JSON.parse(localStorage.getItem('counter_history') || '[]');
  if (!Array.isArray(historyList)) historyList = [];
} catch (e) {
  historyList = [];
}

// 실행 취소 (Undo) 스택 (최대 30개 행동 기억)
const undoStack = [];

// 화면 꺼짐 방지 (Wake Lock) 상태
let wakeLock = null;
let isWakeLockRequested = localStorage.getItem('counter_wakelock') === 'true';

// ==================== DOM 요소 ====================
const counterBox = document.getElementById('counterBox');
const counterValueEl = document.getElementById('counterValue');
const unitLabelEl = document.getElementById('unitLabel');
const tapAreaEl = document.getElementById('tapArea');
const totalBoardingText = document.getElementById('totalBoardingText');
const totalAlightingText = document.getElementById('totalAlightingText');

const btnPlus = document.getElementById('btnPlus');
const btnAlight = document.getElementById('btnAlight');
const btnMinus = document.getElementById('btnMinus');
const btnUndo = document.getElementById('btnUndo');
const btnReset = document.getElementById('btnReset');
const btnSound = document.getElementById('btnSound');
const btnVibrate = document.getElementById('btnVibrate');
const btnWakeLock = document.getElementById('btnWakeLock');
const btnSaveTop = document.getElementById('btnSaveTop');

// 좌석 현황 관련 DOM
const capacityStatusCard = document.getElementById('capacityStatusCard');
const seatBadge = document.getElementById('seatBadge');
const statusBanner = document.getElementById('statusBanner');

// 정류장 타임라인 관련 DOM
const stopsTimelineCard = document.getElementById('stopsTimelineCard');
const currentStopName = document.getElementById('currentStopName');
const currentStopCount = document.getElementById('currentStopCount');
const stopsChipList = document.getElementById('stopsChipList');
const btnQuickCopy = document.getElementById('btnQuickCopy');
const btnNextStop = document.getElementById('btnNextStop');
const nextStopBtnText = document.getElementById('nextStopBtnText');

// 히스토리 & 리셋 관련 DOM
const btnHistory = document.getElementById('btnHistory');
const historyBadge = document.getElementById('historyBadge');
const historyModal = document.getElementById('historyModal');
const historyListEl = document.getElementById('historyList');
const historySummaryEl = document.getElementById('historySummary');
const btnHistoryClose = document.getElementById('btnHistoryClose');
const btnHistoryDone = document.getElementById('btnHistoryDone');
const btnClearHistory = document.getElementById('btnClearHistory');

const resetModal = document.getElementById('resetModal');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const modalSaveAndReset = document.getElementById('modalSaveAndReset');

// 설정 모달 관련 DOM
const btnSettings = document.getElementById('btnSettings');
const settingsModal = document.getElementById('settingsModal');
const btnSettingsClose = document.getElementById('btnSettingsClose');
const btnSettingsSave = document.getElementById('btnSettingsSave');
const capacityChips = document.querySelectorAll('#capacityChips .chip-btn');
const customCapacityRow = document.getElementById('customCapacityRow');
const inputCustomCapacity = document.getElementById('inputCustomCapacity');
const unitChips = document.querySelectorAll('#unitChips .chip-btn');
const customUnitRow = document.getElementById('customUnitRow');
const inputCustomUnit = document.getElementById('inputCustomUnit');
const routeListEl = document.getElementById('routeList');
const inputRouteStops = document.getElementById('inputRouteStops');
const btnAddRoute = document.getElementById('btnAddRoute');

// 토스트 및 캔버스
const toastEl = document.getElementById('toast');
const confettiCanvas = document.getElementById('confettiCanvas');
let toastTimer = null;

// ==================== 폭죽 파티클 엔진 ====================
const ctxConfetti = confettiCanvas ? confettiCanvas.getContext('2d') : null;
let particles = [];
let confettiAnimationId = null;

function resizeConfettiCanvas() {
  if (!confettiCanvas) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfettiCanvas);
resizeConfettiCanvas();

function launchConfettiExplosion() {
  if (!ctxConfetti) return;
  particles = [];
  const colors = ['#f43f5e', '#fb7185', '#38bdf8', '#fbbf24', '#34d399', '#a855f7', '#ffffff'];
  const centerX = confettiCanvas.width / 2;
  const centerY = confettiCanvas.height * 0.45;

  for (let i = 0; i < 110; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 4;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 15,
      gravity: 0.28,
      opacity: 1,
      decay: Math.random() * 0.015 + 0.012
    });
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  animateConfetti();
}

function animateConfetti() {
  if (!ctxConfetti) return;
  ctxConfetti.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.98;
    p.rotation += p.rotationSpeed;
    p.opacity -= p.decay;

    if (p.opacity <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctxConfetti.save();
    ctxConfetti.translate(p.x, p.y);
    ctxConfetti.rotate((p.rotation * Math.PI) / 180);
    ctxConfetti.fillStyle = p.color;
    ctxConfetti.globalAlpha = Math.max(0, p.opacity);
    ctxConfetti.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctxConfetti.restore();
  }

  if (particles.length > 0) {
    confettiAnimationId = requestAnimationFrame(animateConfetti);
  } else {
    ctxConfetti.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// ==================== 오디오 / 진동 시스템 ====================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(type) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'plus') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'alight') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'minus') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'fanfare') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const startTime = now + idx * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } else if (type === 'warning') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(260, now + 0.07);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'save') {
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const startTime = now + idx * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

        osc.start(startTime);
        osc.stop(startTime + 0.18);
      });
    } else if (type === 'reset') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

function triggerVibrate(type) {
  if (!vibrateEnabled || !('vibrate' in navigator)) return;
  try {
    if (type === 'plus') {
      navigator.vibrate(18);
    } else if (type === 'alight') {
      navigator.vibrate(22);
    } else if (type === 'minus') {
      navigator.vibrate(28);
    } else if (type === 'overflow') {
      navigator.vibrate([40, 50, 40]);
    } else if (type === 'fanfare') {
      navigator.vibrate([60, 40, 80, 40, 100]);
    } else if (type === 'save') {
      navigator.vibrate([25, 30, 40]);
    } else if (type === 'reset') {
      navigator.vibrate([30, 40, 40]);
    }
  } catch (e) {
    console.error('Vibration error:', e);
  }
}

function showToast(message) {
  if (!toastEl) return;
  toastEl.className = 'toast';
  toastEl.textContent = message;
  toastEl.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2200);
}

function showToastWithAction(message, actionText, actionCallback) {
  if (!toastEl) return;
  toastEl.className = 'toast has-action';
  toastEl.innerHTML = `<span>${message}</span><button class="toast-action-btn" id="toastActionBtn">${actionText}</button>`;
  toastEl.classList.add('show');

  const actionBtn = document.getElementById('toastActionBtn');
  if (actionBtn) {
    actionBtn.onclick = (e) => {
      e.stopPropagation();
      toastEl.classList.remove('show');
      if (actionCallback) actionCallback();
    };
  }

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 4000);
}

// ==================== 실행 취소 (Undo) 시스템 ====================
function pushUndoState(actionType) {
  undoStack.push({
    actionType: actionType || 'action',
    totalBoarding,
    totalAlighting,
    currentStopIndex,
    currentStopBaseBoarding,
    currentStopBaseAlighting,
    stopsHistory: JSON.parse(JSON.stringify(stopsHistory))
  });
  if (undoStack.length > 100) undoStack.shift();
  updateUndoBtnUI();
}

function updateUndoBtnUI() {
  if (!btnUndo) return;
  if (undoStack.length > 0) {
    btnUndo.style.opacity = '1';
    btnUndo.style.pointerEvents = 'auto';
  } else {
    btnUndo.style.opacity = '0.5';
    btnUndo.style.pointerEvents = 'none';
  }
}

function undo() {
  if (undoStack.length === 0) {
    showToast('되돌릴 이전 행동이 없습니다.');
    return;
  }

  const prev = undoStack.pop();
  const wasNextStop = prev.actionType === 'next_stop';

  totalBoarding = prev.totalBoarding;
  totalAlighting = prev.totalAlighting;
  currentStopIndex = prev.currentStopIndex;
  currentStopBaseBoarding = prev.currentStopBaseBoarding;
  currentStopBaseAlighting = prev.currentStopBaseAlighting;
  stopsHistory = prev.stopsHistory;

  saveStopsToStorage();
  updateDisplay('minus');
  updateStopsUI();
  updateUndoBtnUI();

  playTone('minus');
  triggerVibrate('minus');

  if (wasNextStop) {
    showToast(`↶ 직전 정류장(${getStopName(currentStopIndex)})으로 복원되었습니다!`);
  } else {
    showToast('↶ 직전 행동을 되돌렸습니다.');
  }
}

// ==================== 화면 꺼짐 방지 (Wake Lock) 시스템 ====================
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      btnWakeLock.classList.add('wake-active');
      isWakeLockRequested = true;
      localStorage.setItem('counter_wakelock', 'true');
      wakeLock.addEventListener('release', () => {
        if (!isWakeLockRequested) {
          btnWakeLock.classList.remove('wake-active');
        }
      });
      return true;
    } catch (err) {
      console.log('Wake Lock request error:', err);
      btnWakeLock.classList.remove('wake-active');
      return false;
    }
  }
  return false;
}

async function releaseWakeLock() {
  isWakeLockRequested = false;
  localStorage.setItem('counter_wakelock', 'false');
  if (wakeLock !== null) {
    try {
      await wakeLock.release();
    } catch (e) {}
    wakeLock = null;
  }
  btnWakeLock.classList.remove('wake-active');
}

async function toggleWakeLock() {
  if (!('wakeLock' in navigator)) {
    showToast('현재 브라우저에서는 화면 꺼짐 방지 API를 지원하지 않습니다.');
    return;
  }

  if (isWakeLockRequested) {
    await releaseWakeLock();
    showToast('🌙 화면 꺼짐 방지가 해제되었습니다.');
  } else {
    const success = await requestWakeLock();
    if (success) {
      playTone('save');
      showToast('☀️ 화면 켜짐이 유지됩니다 (운행 중 절전 방지)');
    } else {
      showToast('화면 켜짐 유지를 활성화할 수 없습니다.');
    }
  }
}

// 화면으로 돌아왔을 때 Wake Lock 자동 복원
document.addEventListener('visibilitychange', async () => {
  if (isWakeLockRequested && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

// ==================== 정류장 구간(Lap) 관리 ====================
function getStopName(idx) {
  if (customStopNames && customStopNames.length > 0 && idx <= customStopNames.length) {
    return customStopNames[idx - 1];
  }
  return `${idx}정류장`;
}

function saveStopsToStorage() {
  localStorage.setItem('counter_stop_idx', currentStopIndex.toString());
  localStorage.setItem('counter_stop_base_boarding', currentStopBaseBoarding.toString());
  localStorage.setItem('counter_stop_base_alighting', currentStopBaseAlighting.toString());
  localStorage.setItem('counter_stops', JSON.stringify(stopsHistory));
}

function updateStopsUI() {
  const curStopBoarding = Math.max(0, totalBoarding - currentStopBaseBoarding);
  const curStopAlighting = Math.max(0, totalAlighting - currentStopBaseAlighting);
  const curName = getStopName(currentStopIndex);

  currentStopName.textContent = curName;
  let stopCountText = `+${curStopBoarding}명`;
  if (curStopAlighting > 0) {
    stopCountText += ` / -${curStopAlighting}명`;
  }
  currentStopCount.textContent = stopCountText;
  nextStopBtnText.textContent = `[${curName} 완료] 다음 정류장 ➔`;

  if (stopsHistory.length === 0) {
    stopsChipList.innerHTML = `<div class="stop-chip empty-placeholder">정류장별 인원이 여기에 순서대로 누적됩니다</div>`;
    return;
  }

  stopsChipList.innerHTML = stopsHistory.map(item => {
    let chipDetail = `+${item.boarding || item.count || 0}${unit}`;
    if (item.alighting && item.alighting > 0) {
      chipDetail += ` (-${item.alighting})`;
    }
    return `
      <div class="stop-chip highlight">
        <span>${item.stopName}:</span>
        <span class="chip-count">${chipDetail}</span>
      </div>
    `;
  }).join('');

  stopsChipList.scrollLeft = stopsChipList.scrollWidth;
}

// 다음 정류장으로 넘어가기 (Lap 확정)
function nextStop() {
  pushUndoState('next_stop');

  const curStopBoarding = Math.max(0, totalBoarding - currentStopBaseBoarding);
  const curStopAlighting = Math.max(0, totalAlighting - currentStopBaseAlighting);
  const currentOnboard = Math.max(0, totalBoarding - totalAlighting);
  const recordedStopName = getStopName(currentStopIndex);

  stopsHistory.push({
    stopIndex: currentStopIndex,
    stopName: recordedStopName,
    boarding: curStopBoarding,
    alighting: curStopAlighting,
    count: curStopBoarding,
    onboard: currentOnboard
  });

  currentStopIndex++;
  currentStopBaseBoarding = totalBoarding;
  currentStopBaseAlighting = totalAlighting;
  saveStopsToStorage();

  playTone('save');
  triggerVibrate('save');
  updateStopsUI();

  let toastMsg = `${recordedStopName} 완료 ➔ ${getStopName(currentStopIndex)}`;
  showToastWithAction(toastMsg, '↶ 되돌리기', () => undo());
}

// 현재 활성 노선명 가져오기
function getActiveRouteName() {
  if (!activeRouteId) return '';
  const route = savedRoutes.find(r => r.id === activeRouteId);
  return route ? (route.name || '').trim() : '';
}

// 탑승 보고서 텍스트 생성 (노선 있을 시: [🚌 (노선명) 인원보고 / 총 탑승 : N명])
function generateReportText(stopsData, boardingCount, alightingCount, capVal, unitStr, routeNameOpt) {
  const stops = stopsData || stopsHistory;
  const totBoard = typeof boardingCount === 'number' ? boardingCount : totalBoarding;
  const totAlight = typeof alightingCount === 'number' ? alightingCount : totalAlighting;
  const u = unitStr || unit;
  const rName = typeof routeNameOpt === 'string' ? routeNameOpt.trim() : getActiveRouteName();

  let report = '';
  const hasRoute = Boolean(rName);

  if (hasRoute) {
    // 노선명이 있는 경우: [🚌 (노선명) 인원보고 / 총 탑승 : 44명] (하차 있을 시 (하차 N명) 병기)
    const formattedRouteName = rName.startsWith('(') && rName.endsWith(')') ? rName : `(${rName})`;
    let header = `[🚌 ${formattedRouteName} 인원보고 / 총 탑승 : ${totBoard}${u}`;
    if (totAlight > 0) {
      header += ` (하차 ${totAlight}${u})`;
    }
    header += `]\n`;
    report += header;
  } else {
    // 노선이 없는 경우: 기존 형식 유지
    report += `[🚌 버스 탑승 보고]\n`;
  }

  if (stops.length > 0) {
    stops.forEach(s => {
      const b = s.boarding !== undefined ? s.boarding : (s.count || 0);
      const a = s.alighting || 0;
      if (a > 0) {
        report += `• ${s.stopName}: 탑승 ${b}${u}, 하차 ${a}${u}\n`;
      } else {
        report += `• ${s.stopName}: ${b}${u}\n`;
      }
    });
  }

  // 현재 정류장 인원도 깔끔하게 표기 (진행 중 문구 제외)
  const currentOngoingBoard = Math.max(0, totBoard - currentStopBaseBoarding);
  const currentOngoingAlight = Math.max(0, totAlight - currentStopBaseAlighting);
  if (currentOngoingBoard > 0 || currentOngoingAlight > 0 || stops.length === 0) {
    if (currentOngoingAlight > 0) {
      report += `• ${getStopName(currentStopIndex)}: 탑승 ${currentOngoingBoard}${u}, 하차 ${currentOngoingAlight}${u}\n`;
    } else {
      report += `• ${getStopName(currentStopIndex)}: ${currentOngoingBoard}${u}\n`;
    }
  }

  // 노선이 없는 경우에만 하단 구분선과 총 탑승 요약 표시
  if (!hasRoute) {
    report += `--------------------\n`;
    if (totAlight > 0) {
      report += `총 탑승: ${totBoard}${u} (하차 ${totAlight}${u})`;
    } else {
      report += `총 탑승: ${totBoard}${u}`;
    }
  }

  return report.trimEnd();
}

// 클립보드에 복사하기
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    playTone('save');
    triggerVibrate('plus');
    showToast('📋 탑승 보고서가 복사되었습니다!');
  } catch (err) {
    console.error('Clipboard copy error:', err);
    showToast('복사 권한이 거부되었거나 지원되지 않습니다.');
  }
}

// ==================== UI 업데이트 & 테마 전환 ====================
function updateDisplay(animationType, prevOnboard) {
  const currentOnboard = Math.max(0, totalBoarding - totalAlighting);

  counterValueEl.textContent = currentOnboard.toLocaleString();
  unitLabelEl.textContent = unit;

  if (totalBoardingText) totalBoardingText.textContent = totalBoarding.toLocaleString();
  if (totalAlightingText) totalAlightingText.textContent = totalAlighting.toLocaleString();

  localStorage.setItem('counter_boarding', totalBoarding.toString());
  localStorage.setItem('counter_alighting', totalAlighting.toString());
  localStorage.setItem('counter_val', currentOnboard.toString());

  counterValueEl.classList.remove('pulse-up', 'pulse-down');
  void counterValueEl.offsetWidth;
  if (animationType === 'plus') {
    counterValueEl.classList.add('pulse-up');
  } else if (animationType === 'minus') {
    counterValueEl.classList.add('pulse-down');
  }

  document.body.classList.remove('theme-warning', 'theme-danger', 'theme-full', 'theme-overflow');

  if (capacity > 0) {
    capacityStatusCard.style.display = 'block';
    const remaining = capacity - currentOnboard;

    if (currentOnboard === 0) {
      seatBadge.textContent = `잔여 ${capacity}석 (차내 0명 / 정원 ${capacity}명)`;
      statusBanner.textContent = `화면을 탭하여 탑승 추가`;
    } else if (currentOnboard < capacity) {
      const ratio = currentOnboard / capacity;
      seatBadge.textContent = `잔여 ${remaining}석 (차내 ${currentOnboard}명 / 정원 ${capacity}명)`;
      statusBanner.textContent = `만석까지 ${remaining}${unit} 남음`;

      if (ratio >= 0.75) {
        document.body.classList.add('theme-danger');
      } else if (ratio >= 0.5) {
        document.body.classList.add('theme-warning');
      }
    } else if (currentOnboard === capacity) {
      document.body.classList.add('theme-full');
      seatBadge.textContent = `만석 (차내 ${currentOnboard}명 / 정원 ${capacity}명)`;
      statusBanner.textContent = `🎉 만석 달성! (${currentOnboard}${unit} 탑승)`;

      if (typeof prevOnboard === 'number' && prevOnboard < capacity) {
        launchConfettiExplosion();
        playTone('fanfare');
        triggerVibrate('fanfare');
        showToast(`🎉 만석 달성! (${capacity}${unit} 탑승 완료)`);
      }
    } else {
      document.body.classList.add('theme-overflow');
      const overflowCount = currentOnboard - capacity;
      seatBadge.textContent = `⚠️ 초과 +${overflowCount}${unit} (차내 ${currentOnboard}명 / 정원 ${capacity}명)`;
      statusBanner.textContent = `⚠️ 정원 초과 탑승 (+${overflowCount}${unit})`;
    }
  } else {
    capacityStatusCard.style.display = 'block';
    seatBadge.textContent = `차내 ${currentOnboard}${unit} (정원 무제한)`;
    statusBanner.textContent = `현재 차내 인원: ${currentOnboard.toLocaleString()}${unit}`;
  }

  updateStopsUI();
  updateUndoBtnUI();
}

// 1. 탑승 인원 추가 (+1)
function addBoarding(e) {
  pushUndoState('boarding');

  const prevOnboard = Math.max(0, totalBoarding - totalAlighting);
  totalBoarding += step;
  const newOnboard = Math.max(0, totalBoarding - totalAlighting);

  if (capacity > 0 && newOnboard > capacity) {
    playTone('warning');
    triggerVibrate('overflow');
  } else if (capacity > 0 && newOnboard === capacity && prevOnboard < capacity) {
    // 만석 도달 시 updateDisplay 내부에서 폭죽 실행
  } else {
    playTone('plus');
    triggerVibrate('plus');
  }

  updateDisplay('plus', prevOnboard);

  if (e && e.clientX && e.clientY) {
    createRipple(e);
  }
}

// 2. 하차 인원 추가 (+1)
function addAlighting() {
  const prevOnboard = Math.max(0, totalBoarding - totalAlighting);
  if (prevOnboard <= 0) {
    showToast('현재 차내에 탑승 인원이 없습니다 (0명).');
    playTone('warning');
    triggerVibrate('minus');
    return;
  }

  pushUndoState('alighting');
  totalAlighting += step;
  playTone('alight');
  triggerVibrate('alight');
  updateDisplay('minus', prevOnboard);
  showToast(`하차 1명 추가 (현재 차내: ${Math.max(0, totalBoarding - totalAlighting)}명)`);
}

// 3. 탑승 정정 감소 (-1)
function decrementBoarding() {
  if (totalBoarding <= 0) {
    showToast('정정할 탑승 내역이 없습니다.');
    return;
  }
  pushUndoState('decrement');
  const prevOnboard = Math.max(0, totalBoarding - totalAlighting);
  totalBoarding = Math.max(0, totalBoarding - step);
  playTone('minus');
  triggerVibrate('minus');
  updateDisplay('minus', prevOnboard);
}

// 리플 효과
function createRipple(e) {
  const rect = tapAreaEl.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');

  const size = Math.max(rect.width, rect.height) * 0.7;
  ripple.style.width = ripple.style.height = `${size}px`;

  const x = (e.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
  const y = (e.clientY || rect.top + rect.height / 2) - rect.top - size / 2;

  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  tapAreaEl.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// ==================== 설정 모달 로직 ====================
let tempCapacity = capacity;
let tempUnit = unit;

function openSettingsModal() {
  tempCapacity = capacity;
  tempUnit = unit;

  // 1. 노선 목록 렌더링
  renderRouteList();

  // 2. 좌석 칩 동기화
  let capFound = false;
  capacityChips.forEach(chip => {
    const chipCapVal = chip.dataset.capacity;
    if (chipCapVal !== 'custom') {
      const chipCap = parseInt(chipCapVal, 10);
      const isAct = chipCap === capacity;
      chip.classList.toggle('active', isAct);
      if (isAct) capFound = true;
    } else {
      chip.classList.remove('active');
    }
  });

  if (!capFound && capacity > 0) {
    document.querySelector('#capacityChips [data-capacity="custom"]')?.classList.add('active');
    customCapacityRow.style.display = 'block';
    inputCustomCapacity.value = capacity.toString();
  } else {
    customCapacityRow.style.display = 'none';
    inputCustomCapacity.value = '';
  }

  // 3. 단위 칩 동기화
  let unitFound = false;
  unitChips.forEach(chip => {
    const isAct = chip.dataset.unit === unit;
    chip.classList.toggle('active', isAct);
    if (isAct) unitFound = true;
  });

  if (!unitFound) {
    document.querySelector('#unitChips [data-unit="custom"]')?.classList.add('active');
    customUnitRow.style.display = 'block';
    inputCustomUnit.value = unit;
  } else {
    customUnitRow.style.display = 'none';
    inputCustomUnit.value = '';
  }

  settingsModal.classList.add('show');
}

function closeSettingsModal() {
  settingsModal.classList.remove('show');
}

function saveSettings() {
  // 좌석 수 저장
  const customChip = document.querySelector('#capacityChips [data-capacity="custom"]');
  if (customChip && customChip.classList.contains('active')) {
    const val = parseInt(inputCustomCapacity.value.trim(), 10);
    tempCapacity = (!isNaN(val) && val > 0) ? val : 44;
  }
  capacity = tempCapacity;
  localStorage.setItem('counter_capacity', capacity.toString());

  // 단위 저장
  const customUnitChip = document.querySelector('#unitChips [data-unit="custom"]');
  if (customUnitChip && customUnitChip.classList.contains('active')) {
    const uVal = inputCustomUnit.value.trim();
    tempUnit = uVal ? uVal : '명';
  }
  unit = tempUnit;
  localStorage.setItem('counter_unit', unit);

  // 노선 & 정류장명은 이미 실시간 저장되므로 여기서는 추가 작업 불필요

  updateDisplay();
  closeSettingsModal();
  showToast('설정이 저장되었습니다.');
}

// 칩 선택 이벤트
capacityChips.forEach(chip => {
  chip.addEventListener('click', (e) => {
    e.stopPropagation();
    capacityChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const capVal = chip.dataset.capacity;
    if (capVal === 'custom') {
      customCapacityRow.style.display = 'block';
      inputCustomCapacity.focus();
    } else {
      customCapacityRow.style.display = 'none';
      tempCapacity = parseInt(capVal, 10);
    }
  });
});

unitChips.forEach(chip => {
  chip.addEventListener('click', (e) => {
    e.stopPropagation();
    unitChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const uVal = chip.dataset.unit;
    if (uVal === 'custom') {
      customUnitRow.style.display = 'block';
      inputCustomUnit.focus();
    } else {
      customUnitRow.style.display = 'none';
      tempUnit = uVal;
    }
  });
});

// ==================== 노선 관리 시스템 ====================
function generateRouteId() {
  return 'route_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

function saveRoutesToStorage() {
  localStorage.setItem('counter_saved_routes', JSON.stringify(savedRoutes));
}

function renderRouteList() {
  if (!routeListEl) return;

  if (savedRoutes.length === 0) {
    routeListEl.innerHTML = '<span class="route-empty-msg">등록된 노선이 없습니다. 아래에서 노선을 등록해보세요.</span>';
    return;
  }

  routeListEl.innerHTML = savedRoutes.map(route => {
    const isActive = route.id === activeRouteId;
    const isDefault = route.id === defaultRouteId;
    let classes = 'route-chip';
    if (isActive) classes += ' active';
    if (isDefault) classes += ' default-route';

    return `
      <div class="${classes}" data-route-id="${route.id}">
        ${isDefault ? '<span class="route-default-star">★</span>' : ''}
        <span class="route-name">${route.name}</span>
        <span class="route-stop-count">(${route.stops.length})</span>
        <button type="button" class="route-delete-btn" data-route-id="${route.id}" title="노선 삭제">✕</button>
      </div>
    `;
  }).join('');

  // 클릭 이벤트: 노선 선택 (칩 클릭)
  routeListEl.querySelectorAll('.route-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.classList.contains('route-delete-btn')) return; // 삭제 버튼은 별도 처리
      const routeId = chip.dataset.routeId;
      selectRoute(routeId);
    });
  });

  // 삭제 버튼 이벤트
  routeListEl.querySelectorAll('.route-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const routeId = btn.dataset.routeId;
      deleteRoute(routeId);
    });
  });

  // 길게 누르기: 기본 노선 설정
  routeListEl.querySelectorAll('.route-chip').forEach(chip => {
    let pressTimer = null;
    chip.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('route-delete-btn')) return;
      pressTimer = setTimeout(() => {
        const routeId = chip.dataset.routeId;
        toggleDefaultRoute(routeId);
      }, 600);
    });
    chip.addEventListener('pointerup', () => clearTimeout(pressTimer));
    chip.addEventListener('pointerleave', () => clearTimeout(pressTimer));
    chip.addEventListener('pointercancel', () => clearTimeout(pressTimer));
  });
}

function selectRoute(routeId) {
  if (activeRouteId === routeId) {
    // 이미 선택된 노선을 다시 클릭 → 해제
    activeRouteId = '';
    customStopNames = [];
  } else {
    activeRouteId = routeId;
    const route = savedRoutes.find(r => r.id === routeId);
    if (route) {
      customStopNames = [...route.stops];
    }
  }
  localStorage.setItem('counter_active_route', activeRouteId);
  localStorage.setItem('counter_route_stops', JSON.stringify(customStopNames));
  updateStopsUI();
  renderRouteList();
  if (activeRouteId) {
    const route = savedRoutes.find(r => r.id === activeRouteId);
    showToast(`🚏 노선 "${route?.name}" 적용됨`);
  } else {
    showToast('노선 선택이 해제되었습니다 (기본 번호 정류장)');
  }
}

function addNewRoute() {
  if (!inputRouteStops) return;
  const rawText = inputRouteStops.value.trim();
  if (!rawText) {
    showToast('정류장명을 입력해주세요.');
    return;
  }

  // 쉼표 또는 줄바꿈으로 분리
  const stops = rawText.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
  if (stops.length === 0) {
    showToast('유효한 정류장명을 입력해주세요.');
    return;
  }

  // 노선 이름 물어보기 (첫 번째 정류장명을 기본값으로 설정)
  const defaultName = stops[0] || '';
  const routeName = prompt('이 노선의 이름을 입력해주세요:', defaultName);
  if (!routeName || !routeName.trim()) {
    showToast('노선 등록이 취소되었습니다.');
    return;
  }

  const newRoute = {
    id: generateRouteId(),
    name: routeName.trim(),
    stops: stops,
    createdAt: Date.now()
  };

  savedRoutes.push(newRoute);
  saveRoutesToStorage();

  // 자동으로 새 노선을 선택
  activeRouteId = newRoute.id;
  customStopNames = [...newRoute.stops];
  localStorage.setItem('counter_active_route', activeRouteId);
  localStorage.setItem('counter_route_stops', JSON.stringify(customStopNames));

  // 만약 첫 번째 노선이면 기본값으로도 설정
  if (savedRoutes.length === 1) {
    defaultRouteId = newRoute.id;
    localStorage.setItem('counter_default_route', defaultRouteId);
  }

  inputRouteStops.value = '';
  updateStopsUI();
  renderRouteList();
  playTone('save');
  showToast(`✅ 노선 "${routeName.trim()}" (${stops.length}개 정류장)이 등록되었습니다!`);
}

function deleteRoute(routeId) {
  const route = savedRoutes.find(r => r.id === routeId);
  if (!route) return;
  if (!confirm(`"${route.name}" 노선을 삭제하시겠습니까?`)) return;

  savedRoutes = savedRoutes.filter(r => r.id !== routeId);
  saveRoutesToStorage();

  if (activeRouteId === routeId) {
    activeRouteId = '';
    customStopNames = [];
    localStorage.setItem('counter_active_route', '');
    localStorage.setItem('counter_route_stops', JSON.stringify([]));
    updateStopsUI();
  }

  if (defaultRouteId === routeId) {
    defaultRouteId = '';
    localStorage.setItem('counter_default_route', '');
  }

  renderRouteList();
  showToast(`노선 "${route.name}"이 삭제되었습니다.`);
}

function toggleDefaultRoute(routeId) {
  if (defaultRouteId === routeId) {
    defaultRouteId = '';
    localStorage.setItem('counter_default_route', '');
    showToast('기본 노선이 해제되었습니다.');
  } else {
    defaultRouteId = routeId;
    localStorage.setItem('counter_default_route', routeId);
    const route = savedRoutes.find(r => r.id === routeId);
    showToast(`★ "${route?.name}" 노선이 기본 노선으로 설정되었습니다!`);
  }
  renderRouteList();
}

// 앱 시작 시 기본 노선 자동 적용
function applyDefaultRoute() {
  if (activeRouteId && savedRoutes.find(r => r.id === activeRouteId)) {
    // 이미 선택된 노선이 있고 유효하면 유지
    const route = savedRoutes.find(r => r.id === activeRouteId);
    if (route) {
      customStopNames = [...route.stops];
      localStorage.setItem('counter_route_stops', JSON.stringify(customStopNames));
    }
    return;
  }

  if (defaultRouteId) {
    const route = savedRoutes.find(r => r.id === defaultRouteId);
    if (route) {
      activeRouteId = defaultRouteId;
      customStopNames = [...route.stops];
      localStorage.setItem('counter_active_route', activeRouteId);
      localStorage.setItem('counter_route_stops', JSON.stringify(customStopNames));
    }
  }
}

// 노선 등록 버튼 이벤트
if (btnAddRoute) {
  btnAddRoute.addEventListener('click', (e) => {
    e.stopPropagation();
    addNewRoute();
  });
}

// ==================== 히스토리 기록 관리 ====================
function formatTimestamp(d) {
  const dateObj = d || new Date();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const seconds = dateObj.getSeconds().toString().padStart(2, '0');
  return `${dateObj.getFullYear()}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}

// 상단 [저장] 버튼: 리셋 없이 현재 운행 내역을 즉시 히스토리에 보존!
function saveTripWithoutReset() {
  const currentOnboard = Math.max(0, totalBoarding - totalAlighting);
  if (totalBoarding === 0 && stopsHistory.length === 0) {
    showToast('저장할 탑승 내역이 없습니다 (0명).');
    return;
  }

  const curStopBoard = Math.max(0, totalBoarding - currentStopBaseBoarding);
  const curStopAlight = Math.max(0, totalAlighting - currentStopBaseAlighting);
  const finalStops = [...stopsHistory];

  if (curStopBoard > 0 || curStopAlight > 0 || finalStops.length === 0) {
    finalStops.push({
      stopIndex: currentStopIndex,
      stopName: getStopName(currentStopIndex),
      boarding: curStopBoard,
      alighting: curStopAlight,
      count: curStopBoard,
      onboard: currentOnboard
    });
  }

  let noteText = `운행 #${historyList.length + 1} (${finalStops.length}개 정류장, 탑승 ${totalBoarding}${unit})`;

  const newRecord = {
    id: Date.now(),
    routeName: getActiveRouteName(),
    boarding: totalBoarding,
    alighting: totalAlighting,
    count: currentOnboard,
    unit: unit,
    capacity: capacity,
    timestamp: formatTimestamp(new Date()),
    note: noteText,
    stops: finalStops
  };

  historyList.unshift(newRecord);
  localStorage.setItem('counter_history', JSON.stringify(historyList));
  updateHistoryUI();

  playTone('save');
  triggerVibrate('save');
  showToast(`💾 현재 운행 내역이 히스토리에 저장되었습니다! (총 탑승: ${totalBoarding}${unit})`);
}

// 전체 운행 저장 후 초기화
function saveTripAndReset() {
  const currentOnboard = Math.max(0, totalBoarding - totalAlighting);
  if (totalBoarding === 0 && stopsHistory.length === 0) {
    confirmResetOnly();
    return;
  }

  const curStopBoard = Math.max(0, totalBoarding - currentStopBaseBoarding);
  const curStopAlight = Math.max(0, totalAlighting - currentStopBaseAlighting);
  const finalStops = [...stopsHistory];

  if (curStopBoard > 0 || curStopAlight > 0 || finalStops.length === 0) {
    finalStops.push({
      stopIndex: currentStopIndex,
      stopName: getStopName(currentStopIndex),
      boarding: curStopBoard,
      alighting: curStopAlight,
      count: curStopBoard,
      onboard: currentOnboard
    });
  }

  let noteText = `운행 #${historyList.length + 1} (${finalStops.length}개 정류장, 탑승 ${totalBoarding}${unit})`;

  const newRecord = {
    id: Date.now(),
    routeName: getActiveRouteName(),
    boarding: totalBoarding,
    alighting: totalAlighting,
    count: currentOnboard,
    unit: unit,
    capacity: capacity,
    timestamp: formatTimestamp(new Date()),
    note: noteText,
    stops: finalStops
  };

  historyList.unshift(newRecord);
  localStorage.setItem('counter_history', JSON.stringify(historyList));
  updateHistoryUI();

  // 리셋
  undoStack.length = 0;
  totalBoarding = 0;
  totalAlighting = 0;
  currentStopIndex = 1;
  currentStopBaseBoarding = 0;
  currentStopBaseAlighting = 0;
  stopsHistory = [];
  saveStopsToStorage();

  playTone('reset');
  triggerVibrate('reset');
  updateDisplay();
  closeResetModal();

  showToast('🚌 이번 운행 기록이 저장되고 0으로 리셋되었습니다!');
}

function updateHistoryUI() {
  const countLen = historyList.length;
  if (countLen > 0) {
    historyBadge.style.display = 'inline-block';
    historyBadge.textContent = countLen > 99 ? '99+' : countLen.toString();
  } else {
    historyBadge.style.display = 'none';
  }

  const totalBoardSum = historyList.reduce((acc, cur) => acc + (cur.boarding !== undefined ? cur.boarding : (cur.count || 0)), 0);
  historySummaryEl.textContent = `총 ${countLen}회 운행 (누적 탑승: ${totalBoardSum.toLocaleString()}${unit})`;

  if (countLen === 0) {
    historyListEl.innerHTML = `
      <div class="history-empty">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <p>아직 저장된 운행 기록이 없습니다.</p>
        <span>정류장을 순회한 후 상단 [💾 저장]을 눌러보세요.</span>
      </div>
    `;
    return;
  }

  historyListEl.innerHTML = historyList.map((item, idx) => {
    const tripNum = countLen - idx;
    const itemUnit = item.unit || unit;
    const stopsArray = Array.isArray(item.stops) ? item.stops : [];
    const itemBoard = item.boarding !== undefined ? item.boarding : (item.count || 0);
    const itemAlight = item.alighting || 0;

    const stopsDetailHtml = stopsArray.length > 0 ? `
      <div class="card-stops-detail">
        ${stopsArray.map(s => {
          const b = s.boarding !== undefined ? s.boarding : (s.count || 0);
          const a = s.alighting || 0;
          let txt = `${s.stopName}: +${b}`;
          if (a > 0) txt += `, -${a}`;
          return `<span class="card-stop-badge">${txt}</span>`;
        }).join('')}
      </div>
    ` : '';

    return `
      <div class="history-card" data-id="${item.id}">
        <div class="card-main-row">
          <div class="card-left">
            <span class="session-index">#${tripNum}</span>
            <div class="session-info">
              <span class="session-note">${item.note || '운행 기록'}</span>
              <span class="session-time">${item.timestamp}</span>
            </div>
          </div>
          <div class="card-right">
            <span class="session-count">탑승 ${itemBoard.toLocaleString()}<span class="session-unit">${itemUnit}</span></span>
            <button class="item-action-btn copy-item-btn" data-id="${item.id}" title="탑승 보고서 복사" aria-label="보고서 복사">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="item-action-btn delete delete-item-btn" data-id="${item.id}" title="기록 삭제" aria-label="기록 삭제">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        ${stopsDetailHtml}
      </div>
    `;
  }).join('');
}

function deleteHistoryItem(id) {
  historyList = historyList.filter(item => item.id !== id);
  localStorage.setItem('counter_history', JSON.stringify(historyList));
  updateHistoryUI();
  showToast('기록이 삭제되었습니다.');
}

function clearAllHistory() {
  if (historyList.length === 0) return;
  if (!confirm('저장된 모든 운행 기록을 삭제하시겠습니까?')) return;
  historyList = [];
  localStorage.setItem('counter_history', JSON.stringify(historyList));
  updateHistoryUI();
  showToast('모든 기록이 삭제되었습니다.');
}

function openHistoryModal() {
  updateHistoryUI();
  historyModal.classList.add('show');
}

function closeHistoryModal() {
  historyModal.classList.remove('show');
}

// ==================== 리셋 모달 ====================
function openResetModal() {
  resetModal.classList.add('show');
}

function closeResetModal() {
  resetModal.classList.remove('show');
}

function confirmResetOnly() {
  undoStack.length = 0;
  totalBoarding = 0;
  totalAlighting = 0;
  currentStopIndex = 1;
  currentStopBaseBoarding = 0;
  currentStopBaseAlighting = 0;
  stopsHistory = [];
  saveStopsToStorage();

  playTone('reset');
  triggerVibrate('reset');
  updateDisplay();
  closeResetModal();
  showToast('카운터 및 정류장이 초기화되었습니다.');
}

// ==================== 소리 / 진동 토글 ====================
function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('counter_sound', soundEnabled.toString());
  btnSound.classList.toggle('active', soundEnabled);
  if (soundEnabled) {
    playTone('plus');
    showToast('소리가 켜졌습니다');
  } else {
    showToast('소리가 꺼졌습니다');
  }
}

function toggleVibrate() {
  vibrateEnabled = !vibrateEnabled;
  localStorage.setItem('counter_vibrate', vibrateEnabled.toString());
  btnVibrate.classList.toggle('active', vibrateEnabled);
  if (vibrateEnabled) {
    triggerVibrate('plus');
    showToast('진동이 켜졌습니다');
  } else {
    showToast('진동이 꺼졌습니다');
  }
}

// ==================== 이벤트 리스너 ====================
tapAreaEl.addEventListener('click', (e) => {
  if (e.target.closest('.session-bar') || e.target.closest('.capacity-status-card') || e.target.closest('.stops-timeline-card')) return;
  addBoarding(e);
});

btnPlus.addEventListener('click', (e) => {
  e.stopPropagation();
  addBoarding();
});

btnAlight.addEventListener('click', (e) => {
  e.stopPropagation();
  addAlighting();
});

btnMinus.addEventListener('click', (e) => {
  e.stopPropagation();
  decrementBoarding();
});

// 상단 되돌리기 버튼
btnUndo.addEventListener('click', (e) => {
  e.stopPropagation();
  undo();
});

btnReset.addEventListener('click', (e) => {
  e.stopPropagation();
  if (totalBoarding === 0 && totalAlighting === 0 && stopsHistory.length === 0 && historyList.length === 0) return;
  openResetModal();
});

modalCancel.addEventListener('click', closeResetModal);
modalConfirm.addEventListener('click', confirmResetOnly);
modalSaveAndReset.addEventListener('click', saveTripAndReset);

resetModal.addEventListener('click', (e) => {
  if (e.target === resetModal) closeResetModal();
});

btnSound.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleSound();
});

btnVibrate.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleVibrate();
});

btnWakeLock.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleWakeLock();
});

// 상단 즉시 저장 버튼
btnSaveTop.addEventListener('click', (e) => {
  e.stopPropagation();
  saveTripWithoutReset();
});

// 정류장 다음 버튼
btnNextStop.addEventListener('click', (e) => {
  e.stopPropagation();
  nextStop();
});

// 상단 퀵 복사 버튼
btnQuickCopy.addEventListener('click', (e) => {
  e.stopPropagation();
  const reportText = generateReportText();
  copyToClipboard(reportText);
});

// 현재 정류장 이름 클릭 시 즉석 변경
currentStopName.addEventListener('click', (e) => {
  e.stopPropagation();
  const curName = getStopName(currentStopIndex);
  const newName = prompt('현재 정류장 이름을 변경하시겠습니까?', curName);
  if (newName && newName.trim()) {
    if (customStopNames && customStopNames.length >= currentStopIndex) {
      customStopNames[currentStopIndex - 1] = newName.trim();
    } else {
      while (customStopNames.length < currentStopIndex - 1) {
        customStopNames.push(`${customStopNames.length + 1}정류장`);
      }
      customStopNames.push(newName.trim());
    }
    localStorage.setItem('counter_route_stops', JSON.stringify(customStopNames));
    updateStopsUI();
    showToast(`정류장명이 '${newName.trim()}'(으)로 변경되었습니다.`);
  }
});

// 히스토리 모달
btnHistory.addEventListener('click', (e) => {
  e.stopPropagation();
  openHistoryModal();
});

btnHistoryClose.addEventListener('click', closeHistoryModal);
btnHistoryDone.addEventListener('click', closeHistoryModal);
btnClearHistory.addEventListener('click', clearAllHistory);

historyModal.addEventListener('click', (e) => {
  if (e.target === historyModal) closeHistoryModal();
});

// 히스토리 목록 내 복사 & 삭제 이벤트 위임
historyListEl.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.copy-item-btn');
  if (copyBtn) {
    e.stopPropagation();
    const id = parseInt(copyBtn.dataset.id, 10);
    const item = historyList.find(h => h.id === id);
    if (item) {
      const reportText = generateReportText(item.stops, item.boarding, item.alighting, item.capacity, item.unit, item.routeName);
      copyToClipboard(reportText);
    }
    return;
  }

  const deleteBtn = e.target.closest('.delete-item-btn');
  if (deleteBtn) {
    e.stopPropagation();
    const id = parseInt(deleteBtn.dataset.id, 10);
    deleteHistoryItem(id);
  }
});

// 설정 이벤트
btnSettings.addEventListener('click', (e) => {
  e.stopPropagation();
  openSettingsModal();
});

btnSettingsClose.addEventListener('click', closeSettingsModal);
btnSettingsSave.addEventListener('click', saveSettings);

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettingsModal();
});

// 키보드 단축키
window.addEventListener('keydown', (e) => {
  if (resetModal.classList.contains('show')) {
    if (e.key === 'Escape') closeResetModal();
    return;
  }
  if (historyModal.classList.contains('show')) {
    if (e.key === 'Escape') closeHistoryModal();
    return;
  }
  if (settingsModal.classList.contains('show')) {
    if (e.key === 'Escape') closeSettingsModal();
    return;
  }

  if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === '+') {
    e.preventDefault();
    addBoarding();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    addAlighting();
  } else if (e.key === '-') {
    e.preventDefault();
    decrementBoarding();
  } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    undo();
  } else if (e.key === 'u' || e.key === 'U') {
    e.preventDefault();
    undo();
  } else if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    nextStop();
  } else if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    saveTripWithoutReset();
  } else if (e.key === 'c' || e.key === 'C') {
    e.preventDefault();
    copyToClipboard(generateReportText());
  } else if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    openResetModal();
  } else if (e.key === 'h' || e.key === 'H') {
    e.preventDefault();
    openHistoryModal();
  }
});

// 초기화
(async function init() {
  // 기본 노선 자동 적용
  applyDefaultRoute();

  updateDisplay();
  btnSound.classList.toggle('active', soundEnabled);
  btnVibrate.classList.toggle('active', vibrateEnabled);
  updateHistoryUI();
  updateStopsUI();
  updateUndoBtnUI();

  // 이전 세션에서 Wake Lock을 켜두었다면 자동 시도
  if (isWakeLockRequested) {
    await requestWakeLock();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.update();
      }).catch(err => {
        console.log('SW registration error:', err);
      });
    });
  }
})();
