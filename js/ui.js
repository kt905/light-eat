/* ============ UI HELPERS ============ */
// 统一刷新 Lucide 图标（CDN 可能尚未加载完成，需做存在性检查）
function refreshIcons() {
  if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

// HTML 转义：识别结果（如云端返回的菜品名）会插入 innerHTML，需防注入/破结构
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}

function showToast(msg) {
  let t = document.getElementById('scan-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'scan-toast';
    t.style.cssText =
      'position:fixed;left:50%;top:80px;z-index:50;' +
      'transform:translateX(-50%);padding:10px 16px;border-radius:12px;' +
      'font-size:13px;font-weight:500;line-height:1.5;white-space:nowrap;' +
      'background:rgba(15,41,33,0.88);color:#fff;' +
      'backdrop-filter:blur(8px);box-shadow:0 8px 24px rgba(0,0,0,0.15);';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(-8px)';
  }, 2000);
}

// 自定义确认弹窗（替代原生 confirm）；返回 Promise<boolean>
function confirmDialog(message, opts = {}) {
  const okText = opts.okText || '确定';
  const cancelText = opts.cancelText || '取消';
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-card" role="dialog" aria-modal="true">
        <div class="confirm-msg">${esc(message)}</div>
        <div class="confirm-actions">
          <button type="button" class="btn btn-ghost confirm-cancel">${esc(cancelText)}</button>
          <button type="button" class="btn btn-danger confirm-ok">${esc(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const done = val => { overlay.remove(); resolve(val); };
    overlay.querySelector('.confirm-cancel').onclick = () => done(false);
    overlay.querySelector('.confirm-ok').onclick = () => done(true);
    overlay.onclick = e => { if (e.target === overlay) done(false); };
    requestAnimationFrame(() => overlay.classList.add('show'));
  });
}
