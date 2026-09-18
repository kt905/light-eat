/* ============ PROFILE ============ */
const MODE_ICONS = {
  loseWeight: 'scale',
  kidney: 'heart-pulse',
  diabetes: 'droplet',
  hypertension: 'activity',
  gout: 'bone',
  healthy: 'leaf'
};
const MODE_COLORS = {
  loseWeight: { from: '#D4A853', to: '#E8C77A' },
  kidney: { from: '#BF3B2A', to: '#E66B5A' },
  diabetes: { from: '#3A8FB7', to: '#6BB3D9' },
  hypertension: { from: '#C68E0E', to: '#E6B52E' },
  gout: { from: '#8B5CF6', to: '#A78BFA' },
  healthy: { from: '#1B6B4A', to: '#2A9D6A' }
};

function updateBMRDisplay() {
  const gender = document.querySelector('.gender-btn.active')?.dataset.val || state.profile.personal.gender;
  const age = Number(document.getElementById('input-age').value) || 0;
  const height = Number(document.getElementById('input-height').value) || 0;
  const weight = Number(document.getElementById('input-weight').value) || 0;
  const activity = document.getElementById('input-activity').value;
  const display = document.getElementById('bmr-display');
  if (!display) return;
  if (!age || !height || !weight) {
    display.innerHTML = '<span class="text-tertiary">请填写完整的年龄、身高、体重以计算BMR</span>';
    return;
  }
  const bmr = calcBMR(gender, weight, height, age);
  const tdee = calcTDEE(bmr, activity);
  const actLabel = (ACTIVITY_LEVELS[activity] || ACTIVITY_LEVELS.light).label;
  let calTip = tdee + ' kcal（维持体重）';
  if (state.profile.mode === 'loseWeight') calTip = Math.max(1200, tdee-500) + ' kcal（减肥：TDEE-500）';
  display.innerHTML = `
    <div class="flex items-start gap-2">
      <i data-lucide="calculator" class="w-4 h-4 mt-0.5 shrink-0 text-brand"></i>
      <div style="line-height:1.6;">
        <div class="font-semibold mb-1 text-brand">BMR <span class="font-normal">${bmr}</span> kcal · TDEE <span class="font-normal">${tdee}</span> kcal</div>
        <div class="text-secondary">基础代谢 ${bmr} kcal/天，${actLabel}（×${(ACTIVITY_LEVELS[activity]||ACTIVITY_LEVELS.light).factor}），推荐摄入 <strong>${calTip}</strong></div>
      </div>
    </div>
  `;
  refreshIcons();
}

function renderProfile() {
  const p = state.profile.personal;

  document.querySelectorAll('.gender-btn').forEach(btn => {
    const val = btn.dataset.val;
    const active = val === p.gender;
    btn.classList.toggle('active', active);
    btn.onclick = () => {
      document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateBMRDisplay();
    };
  });

  document.getElementById('input-age').value = p.age || '';
  document.getElementById('input-height').value = p.height || '';
  document.getElementById('input-weight').value = p.weight || '';

  const actSel = document.getElementById('input-activity');
  actSel.innerHTML = Object.entries(ACTIVITY_LEVELS).map(([k,v]) =>
    `<option value="${k}">${v.label}（×${v.factor}） - ${v.desc}</option>`
  ).join('');
  actSel.value = p.activity || 'light';

  ['input-age','input-height','input-weight'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = updateBMRDisplay;
  });
  actSel.onchange = updateBMRDisplay;

  const selector = document.getElementById('mode-selector');
  selector.innerHTML = Object.entries(MODES).map(([key,m]) => {
    const icon = MODE_ICONS[key] || 'circle';
    const colors = MODE_COLORS[key] || { from: '#1B6B4A', to: '#2A9D6A' };
    const isActive = state.profile.mode === key;
    return `
    <button onclick="setMode('${key}')" class="mode-btn ${isActive?'active':''}" data-mode="${key}">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 mode-icon-gradient" style="--mc-from:${colors.from};--mc-to:${colors.to};background:linear-gradient(135deg,${colors.from},${colors.to});box-shadow:0 2px 8px ${colors.from}33;">
        <i data-lucide="${icon}" class="w-5 h-5 text-white"></i>
      </div>
      <div class="font-bold text-sm text-primary">${m.label}</div>
      <div class="text-xs mt-1 text-tertiary">${m.desc}</div>
      ${isActive ? `<div class="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style="background:${colors.from};"><i data-lucide="check" class="w-3 h-3 text-white"></i></div>` : ''}
    </button>
  `}).join('');

  const inputs = document.getElementById('target-inputs');
  inputs.innerHTML = TARGET_FIELDS.map(f => {
    const val = state.profile.targets[f.key];
    const isAuto = f.key === 'cal' && MODES[state.profile.mode].autoCal;
    return `
      <div>
        <label class="form-sub-label">${f.label} (${f.unit})${isAuto?' <span class="text-brand">自动</span>':''}</label>
        <input type="number" data-key="${f.key}" value="${val===null?'':val}" placeholder="无限制" ${isAuto?'readonly':''} class="profile-input target-input ${isAuto?'target-auto':''}" />
      </div>
    `;
  }).join('');

  refreshIcons();
  updateBMRDisplay();
}

function setMode(key) {
  // 重复点击当前模式：仅刷新界面，避免覆盖已保存的目标值（尤其手动热量）
  if (key === state.profile.mode) { renderProfile(); return; }
  state.profile.mode = key;
  const mode = MODES[key];
  // Reset targets from mode template, then auto-calculate cal
  state.profile.targets = {};
  TARGET_FIELDS.forEach(f => {
    state.profile.targets[f.key] = mode[f.key] !== undefined ? mode[f.key] : null;
  });
  state.profile.targets.cal = calcTargetCal(state.profile);
  saveState();
  renderProfile();
}

function saveProfile() {
  // Save personal info
  const gender = document.querySelector('.gender-btn.active')?.dataset.val || 'male';
  const age = Number(document.getElementById('input-age').value) || 30;
  const height = Number(document.getElementById('input-height').value) || 170;
  const weight = Number(document.getElementById('input-weight').value) || 65;
  const activity = document.getElementById('input-activity').value || 'light';
  state.profile.personal = {gender, age, height, weight, activity};

  // Recalculate cal target based on new personal data
  if (MODES[state.profile.mode].autoCal) {
    state.profile.targets.cal = calcTargetCal(state.profile);
  }

  // Save manual target overrides
  document.querySelectorAll('.target-input').forEach(input => {
    if (input.readOnly) return;
    const k = input.dataset.key;
    const v = input.value.trim();
    state.profile.targets[k] = v === '' ? null : Number(v);
  });

  saveState();

  // Show toast instead of alert
  const btn = document.querySelector('button[onclick="saveProfile()"]');
  if (!btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i> 已保存';
  btn.style.background = 'linear-gradient(135deg, #2E7D32 0%, #43A047 100%)';
  refreshIcons();
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.style.background = 'linear-gradient(135deg, #1B6B4A 0%, #2A9D6A 100%)';
    refreshIcons();
  }, 1500);
}
