/* ============ INIT ============ */
// 检测后端识别服务状态
let __backend = null;
async function getBackendStatus() {
  if (__backend) return __backend;
  const base = await getApiBase();
  try {
    const resp = await fetch(base + '/api/health', { cache: 'no-store' });
    if (!resp.ok) throw new Error('bad response');
    const data = await resp.json();
    __backend = { online: true, mockMode: !!data.mockMode };
  } catch (e) {
    __backend = { online: false, mockMode: true };
  }
  return __backend;
}

async function checkBackendStatus() {
  const hintEl = document.getElementById('scan-mode-text');
  const heroBadge = document.querySelector('.hero-match-badge');
  const backend = await getBackendStatus();
  if (backend.online && !backend.mockMode) {
    if (hintEl) hintEl.textContent = '百度AI 真实识别已启用，上传照片即可智能分析';
    if (heroBadge) heroBadge.textContent = 'AI 识别已启用';
    if (heroBadge) heroBadge.style.background = 'rgba(27,107,74,0.85)';
  } else if (backend.online && backend.mockMode) {
    if (hintEl) hintEl.textContent = '免费本地AI识别已启用（浏览器端CLIP模型，无需API Key）';
    if (heroBadge) heroBadge.textContent = '本地AI识别';
    if (heroBadge) heroBadge.style.background = 'rgba(139,92,246,0.9)';
  } else {
    if (hintEl) hintEl.textContent = '未连接到后端，将使用浏览器端免费本地AI识别';
    if (heroBadge) heroBadge.textContent = '本地AI识别';
    if (heroBadge) heroBadge.style.background = 'rgba(139,92,246,0.9)';
  }
}
switchPage('home');
checkBackendStatus();
