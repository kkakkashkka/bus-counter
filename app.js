// ==================== 상태 관리 ====================
let count = parseInt(localStorage.getItem('counter_val') || '0', 10);
let step = parseInt(localStorage.getItem('counter_step') || '1', 10);
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

// 정류장 구간(Lap) 관리 상태
let currentStopIndex = parseInt(localStorage.getItem('counter_stop_idx') || '1', 10);
let currentStopBaseCount = parseInt(localStorage.getItem('counter_stop_base') || '0', 10);
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

// ==================== DOM 요소 ====================
const counterBox = document.getElementById('counterBox');
const counterValueEl = document.getElementById('counterValue');
const unitLabelEl = document.getElementById('unitLabel');
const tapAreaEl = document.getElementById('tapArea');
const btnPlus = document.getElementById('btnPlus');
const btnMinus = document.getElementById('btnMinus');
const btnReset = document.getElementById('btnReset');
const btnSound = document.getElementById('btnSound');
const btnVibrate = document.getElementById('btnVibrate');
const btnSaveTop = document.getElementById('btnSaveTop');

// 좌석 현황 관련 DOM
const capacityStatusCard = document.getElementById('capacityStatusCard');
const seatBadge = document.getElementById('seatBadge');
const progressFill = document.getElementById('progressFill');
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
const stepChips = document.querySelectorAll('#stepChips .chip-btn');
const inputCustomStopNames = document.getElementById('inputCustomStopNames');
const presetTagBtns = document.querySelectorAll('.preset-tag-btn');

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
    ctxConfetti.globalAlpha = Math.max(0, p.opacity);
    ctxConfetti.fillStyle = p.color;
    ctxConfetti.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.3);
    ctxConfetti.restore();
  }

  if (particles.length > 0) {
    confettiAnimationId = requestAnimationFrame(animateConfetti);
  } else {
    ctxConfetti.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// ==================== Web Audio API 사운드 ====================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
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
  toastEl.textContent = message;
  toastEl.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2200);
}

// ==================== 정류장 구간(Lap) 관리 ====================
function getStopName(idx) {
  if (customStopNames && customStopNames.length > 0 && idx <= customStopNames.length) {
    return customStopNames[idx - 1];
  }
  return `${idx}정류장`;
}

function saveStopsToStorage() {
  localStorage.setItem('counter_stop_idx', currentStopIndex.toString());
  localStorage.setItem('counter_stop_base', currentStopBaseCount.toString());
  localStorage.setItem('counter_stops', JSON.stringify(stopsHistory));
}

function updateStopsUI() {
  const curStopPassengers = Math.max(0, count - currentStopBaseCount);
  const curName = getStopName(currentStopIndex);
  currentStopName.textContent = curName;
  currentStopCount.textContent = `+${curStopPassengers}${unit} 탑승 중`;
  nextStopBtnText.textContent = `[${curName} 완료] 다음 정류장 ➔`;

  if (stopsHistory.length === 0) {
    stopsChipList.innerHTML = `<div class="stop-chip empty-placeholder">정류장별 인원이 여기에 순서대로 누적됩니다</div>`;
    return;
  }

  stopsChipList.innerHTML = stopsHistory.map(item => `
    <div class="stop-chip highlight">
      <span>${item.stopName}:</span>
      <span class="chip-count">+${item.count}${unit}</span>
    </div>
  `).join('');

  stopsChipList.scrollLeft = stopsChipList.scrollWidth;
}

// 다음 정류장으로 넘어가기 (Lap 확정)
function nextStop() {
  const stopCount = Math.max(0, count - currentStopBaseCount);
  const recordedStopName = getStopName(currentStopIndex);

  stopsHistory.push({
    stopIndex: currentStopIndex,
    stopName: recordedStopName,
    count: stopCount,
    cumulativeCount: count
  });

  currentStopIndex++;
  currentStopBaseCount = count;
  saveStopsToStorage();

  playTone('save');
  triggerVibrate('save');
  updateStopsUI();

  showToast(`${recordedStopName}: ${stopCount}${unit} 탑승 완료!`);
}

// 탑승 보고서 텍스트 생성 (진행 중 문구 제외)
function generateReportText(stopsData, totalCount, capVal, unitStr) {
  const stops = stopsData || stopsHistory;
  const total = typeof totalCount === 'number' ? totalCount : count;
  const cap = typeof capVal === 'number' ? capVal : capacity;
  const u = unitStr || unit;

  let report = `[🚌 버스 탑승 보고]\n`;
  if (stops.length > 0) {
    stops.forEach(s => {
      report += `• ${s.stopName}: ${s.count}${u}\n`;
    });
  }

  // 아직 정류장 전환 전인 현재 정류장 인원도 깔끔하게 표기
  const currentOngoing = Math.max(0, total - currentStopBaseCount);
  if (currentOngoing > 0 || stops.length === 0) {
    report += `• ${getStopName(currentStopIndex)}: ${currentOngoing}${u}\n`;
  }

  report += `--------------------\n`;
  if (cap > 0) {
    const rem = cap - total;
    if (rem > 0) {
      report += `총 탑승: ${total} / ${cap}${u} (잔여 ${rem}석)`;
    } else if (rem === 0) {
      report += `총 탑승: ${total} / ${cap}${u} (만석)`;
    } else {
      report += `총 탑승: ${total} / ${cap}${u} (⚠️ 초과 +${Math.abs(rem)}${u})`;
    }
  } else {
    report += `총 탑승: ${total}${u}`;
  }

  return report;
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
function updateDisplay(animationType, prevCount) {
  counterValueEl.textContent = count.toLocaleString();
  unitLabelEl.textContent = unit;
  localStorage.setItem('counter_val', count.toString());

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
    const percent = Math.min(100, Math.max(0, (count / capacity) * 100));
    progressFill.style.width = `${percent}%`;

    const remaining = capacity - count;

    if (count === 0) {
      seatBadge.textContent = `잔여 ${capacity}석 (0/${capacity})`;
      statusBanner.textContent = `화면을 탭하여 인원 추가`;
    } else if (count < capacity) {
      const ratio = count / capacity;
      seatBadge.textContent = `잔여 ${remaining}석 (${count}/${capacity})`;
      statusBanner.textContent = `만석까지 ${remaining}${unit} 남음`;

      if (ratio >= 0.75) {
        document.body.classList.add('theme-danger');
      } else if (ratio >= 0.5) {
        document.body.classList.add('theme-warning');
      }
    } else if (count === capacity) {
      document.body.classList.add('theme-full');
      seatBadge.textContent = `만석 (${count}/${capacity})`;
      statusBanner.textContent = `🎉 만석 달성! (${count}${unit} 탑승)`;

      if (typeof prevCount === 'number' && prevCount < capacity) {
        launchConfettiExplosion();
        playTone('fanfare');
        triggerVibrate('fanfare');
        showToast(`🎉 만석 달성! (${capacity}${unit} 탑승 완료)`);
      }
    } else {
      document.body.classList.add('theme-overflow');
      const overflowCount = count - capacity;
      seatBadge.textContent = `⚠️ 초과 +${overflowCount}${unit} (${count}/${capacity})`;
      statusBanner.textContent = `⚠️ 정원 초과 탑승 (+${overflowCount}${unit})`;
    }
  } else {
    capacityStatusCard.style.display = 'none';
    statusBanner.textContent = `현재 누적: ${count.toLocaleString()}${unit}`;
  }

  updateStopsUI();
}

// 카운트 증가
function increment(e) {
  const prevCount = count;
  count += step;

  if (capacity > 0 && count > capacity) {
    playTone('warning');
    triggerVibrate('overflow');
  } else if (capacity > 0 && count === capacity && prevCount < capacity) {
    // 만석 도달 처리
  } else {
    playTone('plus');
    triggerVibrate('plus');
  }

  updateDisplay('plus', prevCount);

  if (e && e.clientX && e.clientY) {
    createRipple(e);
  }
}

// 카운트 감소
function decrement() {
  if (count <= 0) return;
  const prevCount = count;
  count = Math.max(0, count - step);
  playTone('minus');
  triggerVibrate('minus');
  updateDisplay('minus', prevCount);
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
let tempStep = step;

function openSettingsModal() {
  tempCapacity = capacity;
  tempUnit = unit;
  tempStep = step;

  // 1. 좌석 칩 동기화
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

  // 2. 단위 칩 동기화
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

  // 3. 증감 칩 동기화
  stepChips.forEach(chip => {
    chip.classList.toggle('active', parseInt(chip.dataset.step, 10) === step);
  });

  // 4. 노선 정류장명 동기화
  if (inputCustomStopNames) {
    inputCustomStopNames.value = customStopNames.join(', ');
  }

  settingsModal.classList.add('show');
}

function closeSettingsModal() {
  settingsModal.classList.remove('show');
}

function saveSettings() {
  // 좌석 수 직접 입력 반영
  if (customCapacityRow.style.display !== 'none' && inputCustomCapacity.value) {
    const customVal = parseInt(inputCustomCapacity.value, 10);
    if (!isNaN(customVal) && customVal > 0) {
      tempCapacity = customVal;
    }
  }
  capacity = tempCapacity;
  localStorage.setItem('counter_capacity', capacity.toString());

  // 단위 직접 입력 반영
  if (customUnitRow.style.display !== 'none' && inputCustomUnit.value.trim()) {
    tempUnit = inputCustomUnit.value.trim();
  }
  unit = tempUnit;
  localStorage.setItem('counter_unit', unit);

  // 증감 반영
  step = tempStep;
  localStorage.setItem('counter_step', step.toString());

  // 노선 정류장명 반영
  if (inputCustomStopNames) {
    const rawStops = inputCustomStopNames.value.split(',').map(s => s.trim()).filter(Boolean);
    customStopNames = rawStops;
    localStorage.setItem('counter_route_stops', JSON.stringify(customStopNames));
  }

  updateDisplay();
  closeSettingsModal();
  showToast(`설정 저장 완료 (정원: ${capacity > 0 ? capacity + '석' : '제한 없음'})`);
}

// 좌석 칩 클릭
capacityChips.forEach(chip => {
  chip.addEventListener('click', (e) => {
    e.stopPropagation();
    capacityChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const capVal = chip.dataset.capacity;
    if (capVal === 'custom') {
      customCapacityRow.style.display = 'block';
      if (!inputCustomCapacity.value && capacity > 0) {
        inputCustomCapacity.value = capacity.toString();
      }
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

stepChips.forEach(chip => {
  chip.addEventListener('click', (e) => {
    e.stopPropagation();
    stepChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    tempStep = parseInt(chip.dataset.step, 10);
  });
});

// 정류장명 프리셋 태그 클릭
presetTagBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (inputCustomStopNames) {
      inputCustomStopNames.value = btn.dataset.preset;
      inputCustomStopNames.focus();
    }
  });
});

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
  if (count === 0 && stopsHistory.length === 0) {
    showToast('저장할 탑승 내역이 없습니다 (0명).');
    return;
  }

  const ongoingCount = Math.max(0, count - currentStopBaseCount);
  const finalStops = [...stopsHistory];
  if (ongoingCount > 0 || finalStops.length === 0) {
    finalStops.push({
      stopIndex: currentStopIndex,
      stopName: getStopName(currentStopIndex),
      count: ongoingCount,
      cumulativeCount: count
    });
  }

  let noteText = `운행 #${historyList.length + 1} (${finalStops.length}개 정류장)`;
  if (capacity > 0) {
    if (count === capacity) noteText += ' [만석]';
    else if (count > capacity) noteText += ` [초과 +${count - capacity}]`;
    else noteText += ` [잔여 ${capacity - count}석]`;
  }

  const newRecord = {
    id: Date.now(),
    count: count,
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
  showToast(`💾 현재 운행 내역이 히스토리에 저장되었습니다! (총 ${count}${unit})`);
}

// 전체 운행 저장 후 초기화
function saveTripAndReset() {
  if (count === 0 && stopsHistory.length === 0) {
    confirmResetOnly();
    return;
  }

  const ongoingCount = Math.max(0, count - currentStopBaseCount);
  const finalStops = [...stopsHistory];
  if (ongoingCount > 0 || finalStops.length === 0) {
    finalStops.push({
      stopIndex: currentStopIndex,
      stopName: getStopName(currentStopIndex),
      count: ongoingCount,
      cumulativeCount: count
    });
  }

  let noteText = `운행 #${historyList.length + 1} (${finalStops.length}개 정류장)`;
  if (capacity > 0) {
    if (count === capacity) noteText += ' [만석]';
    else if (count > capacity) noteText += ` [초과 +${count - capacity}]`;
    else noteText += ` [잔여 ${capacity - count}석]`;
  }

  const newRecord = {
    id: Date.now(),
    count: count,
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
  count = 0;
  currentStopIndex = 1;
  currentStopBaseCount = 0;
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

  const totalSum = historyList.reduce((acc, cur) => acc + (cur.count || 0), 0);
  historySummaryEl.textContent = `총 ${countLen}회 운행 (누적 탑승: ${totalSum.toLocaleString()}${unit})`;

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

    const stopsDetailHtml = stopsArray.length > 0 ? `
      <div class="card-stops-detail">
        ${stopsArray.map(s => `
          <span class="card-stop-badge">${s.stopName}: <strong>+${s.count}${itemUnit}</strong></span>
        `).join('')}
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
            <span class="session-count">${(item.count || 0).toLocaleString()}<span class="session-unit">${itemUnit}</span></span>
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
  count = 0;
  currentStopIndex = 1;
  currentStopBaseCount = 0;
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
  increment(e);
});

btnPlus.addEventListener('click', (e) => {
  e.stopPropagation();
  increment();
});

btnMinus.addEventListener('click', (e) => {
  e.stopPropagation();
  decrement();
});

btnReset.addEventListener('click', (e) => {
  e.stopPropagation();
  if (count === 0 && stopsHistory.length === 0 && historyList.length === 0) return;
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
      const reportText = generateReportText(item.stops, item.count, item.capacity, item.unit);
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
    increment();
  } else if (e.key === 'ArrowDown' || e.key === '-') {
    e.preventDefault();
    decrement();
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
(function init() {
  updateDisplay();
  btnSound.classList.toggle('active', soundEnabled);
  btnVibrate.classList.toggle('active', vibrateEnabled);
  updateHistoryUI();
  updateStopsUI();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('SW registration error:', err);
      });
    });
  }
})();
