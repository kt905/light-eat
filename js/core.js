const KCAL_PER_KG_FAT = 7700;
const KCAL_PER_GRAM_FAT = 9;
const STEPS_PER_MIN_WALK = 110;
const MET_OXYGEN_FACTOR = 3.5;
const MET_DIVISOR = 200;
const MIN_CALORIE_LOSE_WEIGHT = 1200;
const LOSE_WEIGHT_DEFICIT = 500;
const DEFAULT_TARGET_CAL = 1800;
const DEFAULT_WEIGHT_KG = 65;

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

let state = loadState();
let currentAnalysis = null;
let chartMacros = null;
let chartLimits = null;
let chartTrend = null;

function calcBMR(gender, weight, height, age) {
  if (!weight || !height || !age) return null;
  const w = Number(weight), h = Number(height), a = Number(age);
  // Mifflin-St Jeor 公式（目前临床最常用的BMR估算公式）
  const bmr = gender === 'male'
    ? 10*w + 6.25*h - 5*a + 5
    : 10*w + 6.25*h - 5*a - 161;
  return Math.round(bmr);
}

function calcTDEE(bmr, activity) {
  if (!bmr || !activity) return null;
  const factor = (ACTIVITY_LEVELS[activity] || ACTIVITY_LEVELS.moderate).factor;
  return Math.round(bmr * factor);
}

function calcTargetCal(profile) {
  const mode = MODES[profile.mode];
  if (!mode.autoCal) return mode.cal;
  const p = profile.personal || {};
  const bmr = calcBMR(p.gender, p.weight, p.height, p.age);
  const tdee = calcTDEE(bmr, p.activity);
  if (!tdee) return DEFAULT_TARGET_CAL;
  if (profile.mode === 'loseWeight') return Math.max(MIN_CALORIE_LOSE_WEIGHT, tdee - LOSE_WEIGHT_DEFICIT);
  return tdee;
}

function defaultState() {
  const defaultProfile = {
    mode: 'healthy',
    personal: {gender:'male',age:30,height:170,weight:65,activity:'light'},
    targets: {...MODES.healthy},
  };
  defaultProfile.targets.cal = calcTargetCal(defaultProfile);
  return { profile: defaultProfile, logs: [] };
}

function loadState() {
  let s = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) s = JSON.parse(raw);
  } catch (e) { s = null; }

  // 任何解析失败或结构不完整都不能清空用户数据：逐字段补齐，保留已有 logs/profile
  if (!s || typeof s !== 'object' || Array.isArray(s)) return defaultState();

  if (!s.profile || typeof s.profile !== 'object' || Array.isArray(s.profile)) s.profile = {};
  if (!MODES[s.profile.mode]) s.profile.mode = 'healthy';
  if (!s.profile.personal || typeof s.profile.personal !== 'object') {
    s.profile.personal = {gender:'male',age:30,height:170,weight:65,activity:'light'};
  }
  if (!s.profile.targets || typeof s.profile.targets !== 'object' || Array.isArray(s.profile.targets)) {
    s.profile.targets = {...MODES[s.profile.mode]};
  }
  if (s.profile.targets.cal === undefined || s.profile.targets.cal === null) {
    s.profile.targets.cal = calcTargetCal(s.profile) || DEFAULT_TARGET_CAL;
  }
  if (!Array.isArray(s.logs)) s.logs = [];
  // 逐条校验历史记录：缺失/损坏的 totals 补零，grams 兜底，不丢任何记录（避免 sumLogs 抛错）
  s.logs = s.logs.filter(l => l && typeof l === 'object' && !Array.isArray(l)).map(l => {
    if (!l.totals || typeof l.totals !== 'object' || Array.isArray(l.totals)) l.totals = {};
    const base = {cal:0, protein:0, fat:0, carbs:0, k:0, na:0, p:0, purine:0};
    Object.keys(base).forEach(k => {
      const v = Number(l.totals[k]);
      l.totals[k] = Number.isFinite(v) ? v : 0;
    });
    if (typeof l.grams !== 'number' || !Number.isFinite(l.grams)) l.grams = 100;
    return l;
  });

  return s;
}
function saveState() {
  try {
    const data = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      showToast('存储空间不足，旧记录可能无法保存，建议导出备份后清理');
    } else {
      throw e;
    }
  }
}

// 本地日期字符串（YYYY-MM-DD）。不能用 toISOString()，它是 UTC，会让凌晨/晚间记录归属错日
function localDateStr(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function todayStr() { return localDateStr(); }
function getLogsByDate(dateStr) { return state.logs.filter(l => l.date === dateStr); }
function getTodayLogs() { return getLogsByDate(todayStr()); }
function sumLogsByDate(dateStr) { return sumLogs(getLogsByDate(dateStr)); }
function sumLogs(logs) {
  const s = {cal:0, protein:0, fat:0, carbs:0, k:0, na:0, p:0, purine:0};
  logs.forEach(l => {
    s.cal += l.totals.cal; s.protein += l.totals.protein; s.fat += l.totals.fat; s.carbs += l.totals.carbs;
    s.k += l.totals.k; s.na += l.totals.na; s.p += l.totals.p; s.purine += l.totals.purine;
  });
  return s;
}

const RISK_THRESHOLD_K = 250;
const RISK_THRESHOLD_NA = 400;
const RISK_THRESHOLD_P = 150;
const RISK_THRESHOLD_PURINE = 150;

function foodTags(food) {
  const tags = [];
  if (food.k >= RISK_THRESHOLD_K) tags.push({t:'高钾', bg:'rgba(191,59,42,0.08)', color:'#BF3B2A'});
  if (food.na >= RISK_THRESHOLD_NA) tags.push({t:'高钠', bg:'rgba(230,168,23,0.1)', color:'#C68E0E'});
  if (food.p >= RISK_THRESHOLD_P) tags.push({t:'高磷', bg:'rgba(191,59,42,0.08)', color:'#BF3B2A'});
  if (food.purine >= RISK_THRESHOLD_PURINE) tags.push({t:'高嘌呤', bg:'rgba(61,186,165,0.1)', color:'#2A917F'});
  if (tags.length === 0) tags.push({t:'安全', bg:'rgba(27,107,74,0.08)', color:'#1B6B4A'});
  return tags;
}

function computeTotals(food, grams) {
  const r = grams/100;
  return {
    cal: Math.round(food.kcal*r),
    protein: Math.round(food.protein*r*10)/10,
    fat: Math.round(food.fat*r*10)/10,
    carbs: Math.round(food.carbs*r*10)/10,
    k: Math.round(food.k*r),
    na: Math.round(food.na*r),
    p: Math.round(food.p*r),
    purine: Math.round(food.purine*r*10)/10,
  };
}

// ── 能量平衡与运动消耗估算（只读建议，不做运动打卡） ──

function burnKcalPerMin(met, weightKg) {
  return met * MET_OXYGEN_FACTOR * (weightKg || DEFAULT_WEIGHT_KG) / MET_DIVISOR;
}

function kcalPerStep(weightKg) {
  return burnKcalPerMin(EXERCISES.walk.met, weightKg) / STEPS_PER_MIN_WALK;
}

function stepsToBurn(kcal, weightKg) {
  return Math.max(0, Math.round((kcal || 0) / kcalPerStep(weightKg)));
}

function minutesToBurn(kcal, met, weightKg) {
  return Math.max(1, Math.round((kcal || 0) / burnKcalPerMin(met, weightKg)));
}

// 当日净余热量 = 摄入 − 目标（正=盈余，负=缺口）
function netCalories(dateStr) {
  const s = sumLogsByDate(dateStr || todayStr());
  return Math.round(s.cal - (state.profile?.targets?.cal || 0));
}

// 单餐脂肪转化量（理论）：热量 ÷ 9 kcal/g
function mealFatGrams(kcal) {
  return Math.round((kcal || 0) / KCAL_PER_GRAM_FAT * 10) / 10;
}

// 日汇总体脂增量：净余热量 ÷ 7700 kcal/kg × 1000 g（仅盈余时）
function dailyFatGrams(net) {
  return net > 0 ? Math.round(net / KCAL_PER_KG_FAT * 1000) : 0;
}