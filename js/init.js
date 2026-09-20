/* ============ INIT ============ */
// 识别统一走浏览器端免费本地 AI（CLIP 模型），无需后端 / API Key
function checkBackendStatus() {
  const hintEl = document.getElementById('scan-mode-text');
  const heroBadge = document.querySelector('.hero-match-badge');
  if (hintEl) hintEl.textContent = '免费本地AI识别已启用（浏览器端 CLIP 模型，无需API Key）';
  if (heroBadge) heroBadge.textContent = '本地AI识别';
  if (heroBadge) heroBadge.style.background = 'rgba(139,92,246,0.9)';
}
switchPage('home');
checkBackendStatus();