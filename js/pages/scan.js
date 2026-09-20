/* ============ SCAN ============ */

async function compressImage(file, maxWidth = 1280, quality = 0.8) {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= 512 * 1024) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxWidth && img.height <= maxWidth) { resolve(file); return; }
      const scale = Math.min(maxWidth / img.width, maxWidth / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => { resolve(blob && blob.size < file.size ? new File([blob], file.name, {type: 'image/jpeg'}) : file); },
        'image/jpeg', quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

function renderScan() {
  const sel = document.getElementById('manual-food');
  sel.innerHTML = '<option value="">-- 让 AI 辅助识别后选择 --</option>' +
    FOODS.map(f => `<option value="${f.name}">${f.name}</option>`).join('');
  renderPortionUnits(null);
  // 克数保留输入框现有值（切换页面往返后不清零），输入框默认值即 150
}

// 单位下拉：依据所选食物生成（份 恒在首位，其余按 FOOD_SERVINGS 配置）
function renderPortionUnits(food) {
  const sel = document.getElementById('portion-unit');
  if (!sel) return;
  const prev = sel.value;
  const units = foodUnits(food);
  sel.innerHTML = units.map(u =>
    `<option value="${u.key}">${u.label}≈${u.grams}g</option>`
  ).join('');
  if (units.some(u => u.key === prev)) sel.value = prev;
}

// 选中食物后重置单位/份数，并按份量换算克数
function refreshPortionForFood(food) {
  renderPortionUnits(food);
  const countEl = document.getElementById('portion-count');
  if (countEl) countEl.value = '1';
  const unit = document.getElementById('portion-unit') ? document.getElementById('portion-unit').value : 'portion';
  const count = countEl ? Number(countEl.value) : 1;
  const grams = gramsFromPortion(food, unit, count);
  const g = document.getElementById('grams');
  if (g) g.value = grams;
  if (currentAnalysis) {
    currentAnalysis.grams = grams;
    currentAnalysis.totals = computeTotals(food, grams);
  }
}

// 单位/份数变化 → 换算克数并刷新结果
function applyPortion() {
  const unitEl = document.getElementById('portion-unit');
  const countEl = document.getElementById('portion-count');
  const unit = unitEl ? unitEl.value : 'portion';
  const count = countEl ? Number(countEl.value) : 1;
  const food = currentAnalysis ? currentAnalysis.food : null;
  const grams = gramsFromPortion(food, unit, count);
  const g = document.getElementById('grams');
  if (g) g.value = grams;
  if (currentAnalysis) {
    currentAnalysis.grams = grams;
    currentAnalysis.totals = computeTotals(food, grams);
    showAnalysis({ quiet: true });
  }
}

// 手动修改克数：与当前「单位×份数」换算不一致时，回落为单份，保证显示与日志一致
function onGramsInput() {
  const g = document.getElementById('grams');
  const grams = Number(g && g.value);
  if (!currentAnalysis || !grams) return;
  const unitEl = document.getElementById('portion-unit');
  const countEl = document.getElementById('portion-count');
  const unit = unitEl ? unitEl.value : 'portion';
  const count = countEl ? Number(countEl.value) : 1;
  if (gramsFromPortion(currentAnalysis.food, unit, count) !== grams) {
    if (unitEl) unitEl.value = 'portion';
    if (countEl) countEl.value = '1';
  }
  currentAnalysis.grams = grams;
  currentAnalysis.totals = computeTotals(currentAnalysis.food, grams);
  showAnalysis({ quiet: true });
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = document.getElementById('preview-img');
  img.src = url;
  img.classList.add('show');
  const bg = document.getElementById('preview-bg');
  if (bg) bg.classList.add('hidden');
  document.getElementById('candidates-panel').classList.add('hidden');
  document.getElementById('analyze-result').classList.add('hidden');
}

function setScanProgress(pct, step) {
  document.getElementById('scan-bar').style.width = pct + '%';
  document.getElementById('scan-pct').textContent = Math.round(pct) + '%';
  if (step) document.getElementById('scan-step').textContent = step;
}

function addDetectionItem(food, confidence) {
  const container = document.getElementById('scan-detections');
  const pct = Math.round(confidence * 100);
  const s = foodStyle(food);
  const div = document.createElement('div');
  div.className = 'detection-row';
  div.innerHTML = `
    <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background:linear-gradient(135deg,${s.from},${s.to});">
      <i data-lucide="${s.icon}" class="w-4 h-4" style="color:${s.text};"></i>
    </div>
    <div class="min-w-0 flex-1">
      <div class="detection-name">${esc(food.name)}</div>
      <div class="progress-track-sm"><div class="h-full rounded-full" style="width:${pct}%;background:linear-gradient(90deg,#1B6B4A,#3DBAA5);transition:width 0.4s ease;"></div></div>
    </div>
    <span class="detection-pct">${pct}%</span>
  `;
  container.appendChild(div);
  refreshIcons();
}

let currentCandidates = [];

// ── 识别结果 → 本地食物库匹配 ──
function matchFoodByName(name) {
  if (!name) return null;
  const normalized = name.replace(/[\s（）()\[\]【】]/g, '').toLowerCase();
  // 1. 精确匹配（去括号后）
  let hit = FOODS.find(f => f.name.replace(/[（].*?[）]/g,'').toLowerCase() === normalized);
  if (hit) return hit;
  // 2. 子串包含：FOODS名包含识别结果
  hit = FOODS.find(f => normalized.includes(f.name.replace(/[（].*?[）]/g,'')));
  if (hit) return hit;
  // 3. 关键词映射（常见菜品→食材）
  const kwMap = {
    '饭': '米饭（煮）', '粥': '小米粥', '面': '面条（煮）', '馒头': '馒头',
    '面包': '全麦面包', '包子': '馒头', '饺子': '馒头',
    '鸡蛋': '鸡蛋', '番茄': '番茄', '西红柿': '番茄',
    '鸡': '鸡胸肉', '鱼': '草鱼', '牛肉': '牛肉（瘦）', '猪肉': '猪肉（瘦）', '虾': '虾仁',
    '牛奶': '牛奶', '酸奶': '酸奶（无糖）', '豆浆': '豆浆', '豆腐': '豆腐（北）',
    '菠菜': '菠菜', '西兰花': '西兰花', '黄瓜': '黄瓜', '胡萝卜': '胡萝卜',
    '土豆': '土豆', '红薯': '红薯', '玉米': '玉米（鲜）', '白菜': '白菜',
    '苹果': '苹果', '香蕉': '香蕉', '橙': '橙子', '西瓜': '西瓜', '葡萄': '葡萄',
    '可乐': '可乐', '咖啡': '黑咖啡', '茶': '绿茶',
    '燕麦': '燕麦片', '核桃': '核桃', '花生': '花生',
  };
  for (const [kw, foodName] of Object.entries(kwMap)) {
    if (normalized.includes(kw)) return FOODS.find(f => f.name === foodName) || null;
  }
  return null;
}

// 为未匹配到的识别结果创建临时食物条目（允许用户选择但提示营养数据不全）
function createUnknownFood(name) {
  return {
    name: name + '（未匹配）',
    category: '其他',
    kcal: 0, protein: 0, fat: 0, carbs: 0,
    k: 0, na: 0, p: 0, purine: 0,
    unknown: true,
    originalName: name
  };
}

/* 后端地址自动探测：
 *  - 同源部署（Node 同时托管前端）→ 留空即可
 *  - Live Server 本地开发（如 5500 端口）→ 自动探测 http://localhost:3000
 * 如需强制指定，可填 API_BASE_MANUAL（如 'http://localhost:3000'） */
const API_BASE_MANUAL = '';
let __apiBase = null;
async function getApiBase() {
  if (__apiBase !== null) return __apiBase;
  if (API_BASE_MANUAL) { __apiBase = API_BASE_MANUAL; return __apiBase; }
  const probe = async (url) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const r = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      return r.ok;
    } catch (e) { return false; }
  };
  // 远程静态托管（如 GitHub Pages）：无 Node 后端，直接纯前端模式。
  // 不做 /api/health 探测，避免纯静态站产生无意义的 404 控制台报错。
  const localHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!localHost) { __apiBase = ''; return __apiBase; }
  // 本地静态服务器开发（如 Live Server :5500）：同源没有后端，
  // 直接探测本机 Node 后端
  if (location.port && location.port !== '3000') {
    __apiBase = (await probe('http://localhost:3000/api/health')) ? 'http://localhost:3000' : '';
    return __apiBase;
  }
  // 同源后端（Node 同时托管前端）
  __apiBase = (await probe('/api/health')) ? '' : 'http://localhost:3000';
  return __apiBase;
}

/* ============ 本地免费 AI 识别（浏览器端 CLIP 零样本） ============
 * 不依赖任何 API Key，模型权重在用户设备上运行，永久免费、无调用限额。
 * 线上部署：静态托管即可，后端只需用于代理模型下载。
 * 国内网络默认走 hf-mirror 镜像加速；海外部署可改为 https://huggingface.co */
const CLIP_TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';
const CLIP_MODEL_ID = 'Xenova/clip-vit-base-patch32';
const CLIP_MIN_SCORE = 0.04; // 仅保留超过该置信度的候选
// 本地模型目录：由 download-clip-model.ps1 下载到 assets/models/（仅本地使用）
const LOCAL_MODEL_PATH = new URL('./assets/models/', location.href).href;

// 检测本地自托管模型是否就绪（页面同级的 assets/models/ 下存在 config.json）
async function isLocalModelReady() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(LOCAL_MODEL_PATH + CLIP_MODEL_ID + '/config.json',
      { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch (e) { return false; }
}

let clipClassifierPromise = null;
function getClipClassifier() {
  if (!clipClassifierPromise) {
    clipClassifierPromise = (async () => {
      // 本地已用 download-clip-model.ps1 下载模型时直接加载本地文件（快）；
      // 仅 localhost 探测，线上静态托管静默跳过，避免无意义的 config.json 404
      const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      const localReady = isLocalHost ? await isLocalModelReady() : false;
      const timeoutMs = localReady ? 30000 : 300000;
      const timeoutMsg = localReady
        ? '本地模型加载超时，请刷新页面重试'
        : '模型下载超时：网络不佳，可稍后点「下载 AI 模型」按钮重试';
      let timer;
      const timedOut = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMsg)), timeoutMs);
      });
      try {
        const mod = await import(CLIP_TRANSFORMERS_CDN);
        const { pipeline, env } = mod;
        env.allowLocalModels = true;
        env.localModelPath = LOCAL_MODEL_PATH;
        const base = await getApiBase();
        const hosts = [];
        if (base) hosts.push(base + '/hf-proxy');
        // 国内优先走 hf-mirror 镜像（huggingface.co 直连经常超时），海外可直连
        hosts.push('https://hf-mirror.com');
        hosts.push('https://huggingface.co');
        let lastErr = null;
        for (const host of hosts) {
          try {
            env.remoteHost = host;
            return await Promise.race([
              timedOut,
              pipeline('zero-shot-image-classification', CLIP_MODEL_ID, {
                quantized: true, // 使用量化的 model_quantized.onnx（更小更快）
              }),
            ]);
          } catch (e) { lastErr = e; }
        }
        throw lastErr || new Error('无法加载AI模型');
      } finally {
        clearTimeout(timer);
      }
    })().catch(err => { clipClassifierPromise = null; throw err; }); // 失败后允许下次重试
  }
  return clipClassifierPromise;
}

// 浏览器端识别：返回与后端一致的 candidates [{name, confidence, calorie, hasNutrition}]
async function recognizeWithClip(file) {
  const classifier = await getClipClassifier();
  const labels = Object.entries(FOOD_EN_LABELS);
  const enLabels = labels.map(l => l[1]);
  const url = URL.createObjectURL(file);
  try {
    const results = await classifier(url, enLabels, { topk: 6 });
    return results
      .filter(r => r.score >= CLIP_MIN_SCORE)
      .map(r => {
        const entry = labels.find(l => l[1] === r.label);
        const zh = entry ? entry[0] : r.label;
        const food = FOODS.find(f => f.name === zh);
        return {
          name: zh,
          confidence: r.score,
          calorie: food ? food.kcal : null,
          hasNutrition: !!food,
        };
      });
  } finally {
    URL.revokeObjectURL(url);
  }
}

let clipDownloadState = null; // 'loading' | 'done' | null

// 提前下载本地 AI 模型（约150MB），避免首次分析时等待
async function downloadClipModel() {
  const btn = document.getElementById('model-download-btn');
  const st = document.getElementById('model-download-status');
  const orig = btn ? btn.innerHTML : '';
  if (clipDownloadState === 'loading') return;
  if (clipDownloadState === 'done') {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> 模型已下载'; }
    if (st) st.textContent = '识别模型已就绪并缓存在此浏览器。';
    refreshIcons();
    return;
  }
  clipDownloadState = 'loading';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block align-middle mr-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></span> 下载中...';
  }
  if (st) st.textContent = '正在后台下载约 150MB 模型，请勿关闭页面，下载一次后永久生效。';
  refreshIcons();
  try {
    await getClipClassifier();
    clipDownloadState = 'done';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> 模型已下载'; }
    if (st) st.textContent = '已就绪：模型保存在浏览器缓存中，之后识别秒开。';
  } catch (err) {
    clipDownloadState = null;
    if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    if (st) st.textContent = '下载失败：' + (err && err.message || '网络异常') + '。可稍后重试，或直接开始分析（会自动用已缓存部分）。';
  }
  refreshIcons();
}

async function analyze() {
  const grams = Number(document.getElementById('grams').value) || 100;
  const manual = document.getElementById('manual-food').value;
  const btn = document.getElementById('analyze-btn');
  const resultEl = document.getElementById('analyze-result');
  const candidatesEl = document.getElementById('candidates-panel');
  const progressEl = document.getElementById('scan-progress');
  const scanner = document.getElementById('scanner');
  const detectionsEl = document.getElementById('scan-detections');
  const btnText = document.getElementById('analyze-btn-text');

  if (manual) {
    const food = FOODS.find(f => f.name === manual);
    if (!food) return;
    const totals = computeTotals(food, grams);
    currentAnalysis = { food, grams, totals, detections: [{food, confidence: 1}] };
    refreshPortionForFood(food);
    applyPortion();
    candidatesEl.classList.add('hidden');
    resultEl.classList.remove('hidden');
    showAnalysis();
    return;
  }

  const file = document.getElementById('food-file').files[0];
  if (!file) {
    showToast('请先选择一张图片或从下方选择食物');
    return;
  }

  resultEl.classList.add('hidden');
  candidatesEl.classList.add('hidden');
  progressEl.classList.remove('hidden');
  detectionsEl.innerHTML = '';
  btn.disabled = true;

  // 统一走浏览器端免费本地 AI 识别（CLIP 模型，首次需下载模型）
  const steps = [
    { pct: 15, step: '正在读取图片...' },
    { pct: 40, step: '加载本地AI模型（首次需下载，请稍候）...' },
    { pct: 65, step: '浏览器端 AI 识别中...' },
    { pct: 90, step: '比对食物营养库...' },
  ];

  let stepIdx = 0;
  const stepTimer = setInterval(() => {
    if (stepIdx >= steps.length) { clearInterval(stepTimer); return; }
    const s = steps[stepIdx];
    setScanProgress(s.pct, s.step);
    stepIdx++;
  }, 400);

  function finishWithCandidates(candidates) {
    clearInterval(stepTimer);
    setScanProgress(100, '识别完成');
    currentCandidates = candidates;
    setTimeout(() => {
      scanner.classList.add('hidden');
      btn.disabled = false;
      progressEl.classList.add('hidden');
      renderCandidates();
      candidatesEl.classList.remove('hidden');
      refreshIcons();
      showToast('免费本地AI识别：模型在您的设备上运行，无需API Key');
    }, 300);
  }

  function failWithError(msg) {
    clearInterval(stepTimer);
    scanner.classList.add('hidden');
    btn.disabled = false;
    progressEl.classList.add('hidden');
    showToast(msg || '识别失败，请手动选择食物');
    showManualSelector();
  }

  let candidatesData;
  try {
    candidatesData = await recognizeWithClip(file);
  } catch (err) {
    console.error('识别失败:', err);
    failWithError((err && err.message ? '识别失败：' + err.message : '识别失败') + '，请手动选择食物');
    return;
  }

  // 将候选结果映射到本地食物库
  const mapped = candidatesData.map(c => {
    const food = matchFoodByName(c.name);
    return {
      food: food || createUnknownFood(c.name),
      confidence: c.confidence,
      originalName: c.name,
      matched: !!food
    };
  }).filter((c, i, arr) => {
    // 去重：同一food只保留置信度最高的
    return i === arr.findIndex(x => x.food.name === c.food.name);
  });

  // 如果所有结果都未匹配，给出提示但仍然显示（用户可以手动选）
  if (mapped.length > 0) {
    // 添加检测动画
    setTimeout(() => {
      if (mapped[0]) addDetectionItem(mapped[0].food, mapped[0].confidence);
    }, 600);
    setTimeout(() => {
      if (mapped[1]) addDetectionItem(mapped[1].food, mapped[1].confidence);
    }, 1100);
    finishWithCandidates(mapped.slice(0, 5));
  } else {
    failWithError('未能识别出食物，请手动选择');
  }
}

function renderCandidates() {
  const list = document.getElementById('candidates-list');
  list.innerHTML = currentCandidates.map((c, i) => {
    const s = foodStyle(c.food);
    const pct = Math.round(c.confidence * 100);
    const warnBadge = c.food.unknown ? '<span class="candidate-warn"><i data-lucide="alert-circle" class="w-3 h-3"></i>未匹配</span>' : '';
    const displayName = c.originalName || c.food.name;
    return `
      <button class="candidate-card${c.food.unknown ? ' candidate-unknown' : ''}" onclick="selectCandidate(${i})">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style="background:linear-gradient(135deg,${s.from},${s.to});">
          <i data-lucide="${s.icon}" class="w-5 h-5" style="color:${s.text};"></i>
        </div>
        <div class="candidate-info">
          <div class="candidate-name">${esc(displayName)}${warnBadge}</div>
          <div class="candidate-conf-bar"><div class="candidate-conf-fill" style="width:${pct}%"></div></div>
        </div>
        <span class="candidate-pct">${pct}%</span>
      </button>`;
  }).join('');
  refreshIcons();
}

function selectCandidate(idx) {
  const c = currentCandidates[idx];
  if (!c) return;
  const grams = Number(document.getElementById('grams').value) || 100;
  currentAnalysis = {
    food: c.food,
    grams,
    totals: computeTotals(c.food, grams),
    detections: currentCandidates.slice(0, Math.min(2, currentCandidates.length)),
    selectedIdx: idx
  };
  refreshPortionForFood(c.food);
  applyPortion();
  document.getElementById('candidates-panel').classList.add('hidden');
  document.getElementById('analyze-result').classList.remove('hidden');
  showAnalysis();
}

function backToCandidates() {
  document.getElementById('analyze-result').classList.add('hidden');
  if (currentCandidates.length > 0) {
    document.getElementById('candidates-panel').classList.remove('hidden');
  }
}

function showManualSelector() {
  const panel = document.getElementById('manual-select-panel');
  panel.classList.remove('hidden');
  document.getElementById('food-count').textContent = FOODS.length;
  renderManualList(FOODS);
}

function hideManualSelector() {
  document.getElementById('manual-select-panel').classList.add('hidden');
  document.getElementById('manual-search').value = '';
}

function filterManualList() {
  const q = document.getElementById('manual-search').value.trim().toLowerCase();
  if (!q) { renderManualList(FOODS); return; }
  const filtered = FOODS.filter(f =>
    f.name.toLowerCase().includes(q) ||
    (f.category && f.category.toLowerCase().includes(q))
  );
  renderManualList(filtered);
}

function renderManualList(foods) {
  const list = document.getElementById('manual-food-list');
  if (!foods.length) {
    list.innerHTML = '<div class="text-xs text-tertiary text-center py-4">未找到匹配的食物</div>';
    return;
  }
  list.innerHTML = foods.map(f => {
    const s = foodStyle(f);
    return `
      <button data-name="${esc(f.name)}" onclick="pickManualFood(this.dataset.name)" class="w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors hover:bg-[var(--color-primary-light,#E6F4ED)]">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background:linear-gradient(135deg,${s.from},${s.to});">
          <i data-lucide="${s.icon}" class="w-4 h-4" style="color:${s.text};"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium text-primary truncate">${esc(f.name)}</div>
          <div class="text-xs text-tertiary">${f.category} · ${f.kcal}kcal/100g</div>
        </div>
      </button>`;
  }).join('');
  refreshIcons();
}

function pickManualFood(name) {
  const food = FOODS.find(f => f.name === name);
  if (!food) return;
  const grams = Number(document.getElementById('grams').value) || 100;
  currentAnalysis = { food, grams, totals: computeTotals(food, grams), detections: [{food, confidence: 1}] };
  refreshPortionForFood(food);
  applyPortion();
  hideManualSelector();
  document.getElementById('candidates-panel').classList.add('hidden');
  document.getElementById('analyze-result').classList.remove('hidden');
  showAnalysis();
}

function showAnalysis(opts) {
  if (!currentAnalysis) return;
  const {food, grams, totals, detections} = currentAnalysis;
  document.getElementById('analyze-result').classList.remove('hidden');
  document.getElementById('result-img').innerHTML = foodIconHtml(food, 'w-16 h-16');
  refreshIcons();
  const unit = document.getElementById('portion-unit') ? document.getElementById('portion-unit').value : 'portion';
  const count = document.getElementById('portion-count') ? Number(document.getElementById('portion-count').value) : 1;
  const amount = (unit === 'portion' && count === 1) ? grams + 'g' : count + PORTION_UNITS[unit] + '≈' + grams + 'g';
  document.getElementById('result-name').textContent = food.name + ' · ' + amount;
  const tags = foodTags(food);
  const tagHtml = tags.map(t => `<span class="tag" style="background:${t.bg};color:${t.color};">${t.t}</span>`).join('');
  document.getElementById('result-tags').innerHTML = tagHtml || '<span class="tag" style="background:var(--color-primary-muted,rgba(27,107,74,0.08));color:var(--color-primary,#1B6B4A);">安全</span>';
  ['cal','carbs','protein','fat','k','na','p','purine'].forEach(k => {
    const el = document.getElementById('res-'+k);
    if (el) el.textContent = totals[k];
  });

  const detEl = document.getElementById('result-detections');
  if (detections && detections.length > 1) {
    detEl.classList.remove('hidden');
    detEl.innerHTML = `
      <div class="text-xs font-semibold mb-2 text-secondary">检测到其他可能的食物：</div>
      <div class="flex flex-wrap gap-2">
        ${detections.filter(d => d.food.name !== food.name).map(d => `
          <span class="det-chip">
            <span class="det-chip-name">${esc(d.food.name)}</span>
            <span class="det-chip-pct">${Math.round(d.confidence*100)}%</span>
          </span>
        `).join('')}
      </div>
    `;
  } else {
    detEl.classList.add('hidden');
    detEl.innerHTML = '';
  }

  const adviceEl = document.getElementById('result-advice');
  const mode = state.profile.mode;
  let advice = '', adviceType = 'info';
  if (food.note) {
    advice = food.note;
    adviceType = 'warning';
  } else if (mode === 'kidney' && (food.k>=200 || food.na>=400 || food.p>=150)) {
    advice = '当前为肾病模式，该食物钾/钠/磷较高，建议严格限制或避免。';
    adviceType = 'danger';
  } else if (mode === 'hypertension' && food.na>=400) {
    advice = '高血压患者应注意控制钠摄入，该食物含钠较高。';
    adviceType = 'warning';
  } else if (mode === 'diabetes' && food.carbs>20) {
    advice = '糖尿病模式下建议关注碳水，可搭配蛋白质与蔬菜减缓升糖。';
    adviceType = 'hint';
  } else if (mode === 'gout' && food.purine>=100) {
    advice = '痛风模式建议避免高嘌呤食物，选择蔬果、蛋奶为主。';
    adviceType = 'teal';
  } else if (mode === 'loseWeight' && food.kcal>250) {
    advice = '减肥期间可适量食用，注意总热量不超标。';
    adviceType = 'info';
  } else {
    advice = '该食物与你的当前饮食模式较为适配。';
    adviceType = 'info';
  }
  adviceEl.className = 'advice-box ' + adviceType;
  adviceEl.textContent = advice;

  const actEl = document.getElementById('result-activity');
  if (actEl) {
    const mealKcal = totals.cal || 0;
    if (mealKcal > 0) {
      const weightKg = state.profile.personal.weight || 65;
      const fatG = mealFatGrams(mealKcal);
      const steps = stepsToBurn(mealKcal, weightKg);
      const jogMin = minutesToBurn(mealKcal, EXERCISES.jog.met, weightKg);
      actEl.classList.remove('hidden');
      actEl.innerHTML = `这餐热量约相当于 <strong>${fatG} g 脂肪</strong>（9 kcal/g 折算）· 如不及时消耗，约需快走 <strong>${steps} 步</strong> 或慢跑 <strong>${jogMin} 分钟</strong> 抵消
        <div class="activity-tip">估算依据你当前体重约 ${weightKg} kg，仅供「吃动平衡」参考</div>`;
    } else {
      actEl.classList.add('hidden');
      actEl.innerHTML = '';
    }
  }

  const resultEl = document.getElementById('analyze-result');
  if (resultEl && !(opts && opts.quiet)) resultEl.scrollIntoView({behavior:'smooth', block:'nearest'});
}

function addCurrentToLog(ev) {
  if (!currentAnalysis) return;
  const btn = ev && ev.target ? ev.target.closest('button') : null;
  if (btn && btn.dataset.adding === '1') return; // 防连点，避免重复记录
  if (btn) btn.dataset.adding = '1';
  state.logs.push({
    id: genId(),
    date: todayStr(),
    time: new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}),
    foodName: currentAnalysis.food.name,
    grams: currentAnalysis.grams,
    unit: document.getElementById('portion-unit') ? document.getElementById('portion-unit').value : 'portion',
    count: document.getElementById('portion-count') ? Number(document.getElementById('portion-count').value) || 1 : 1,
    totals: currentAnalysis.totals
  });
  saveState();
  logsViewDate = todayStr();

  if (btn) {
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i> 已记录';
    btn.classList.add('logged-flash');
    refreshIcons();
    setTimeout(() => {
      btn.innerHTML = origHTML;
      btn.classList.remove('logged-flash');
      btn.dataset.adding = '';
      refreshIcons();
      switchPage('logs');
    }, 800);
  } else {
    switchPage('logs');
  }
}