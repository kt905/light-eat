/* ============ LOGS ============ */
let logsViewDate = todayStr();

function logAmountText(l) {
  if (!l || !l.grams) return '';
  const isDefaultPortion = (!l.unit || l.unit === 'portion') && (!l.count || l.count === 1);
  return isDefaultPortion ? `${l.grams}g` : `${l.count || 1}${PORTION_UNITS[l.unit] || l.unit}≈${l.grams}g`;
}

function logsDateLabel(dateStr) {
  const [Y, M, D] = dateStr.split('-').map(Number);
  const weekday = ['周日','周一','周二','周三','周四','周五','周六'][new Date(Y, M - 1, D).getDay()];
  if (dateStr === todayStr()) return `今天 · ${M}月${D}日`;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (dateStr === localDateStr(y)) return `昨天 · ${M}月${D}日`;
  return `${M}月${D}日 · ${weekday}`;
}

function renderLogs() {
  if (logsViewDate > todayStr()) logsViewDate = todayStr();
  const dateStr = logsViewDate;
  const isToday = dateStr === todayStr();
  const logs = getLogsByDate(dateStr);

  const labelEl = document.getElementById('logs-date-label');
  if (labelEl) labelEl.textContent = logsDateLabel(dateStr);
  const inputEl = document.getElementById('logs-date-input');
  if (inputEl) { inputEl.value = dateStr; inputEl.max = todayStr(); }
  const nextBtn = document.getElementById('logs-next-btn');
  if (nextBtn) nextBtn.disabled = isToday;
  const todayRow = document.getElementById('logs-today-row');
  if (todayRow) todayRow.style.display = isToday ? 'none' : 'flex';
  const clearText = document.getElementById('logs-clear-text');
  if (clearText) clearText.textContent = isToday ? '清空今日记录' : '清空当日记录';

  const list = document.getElementById('logs-list');
  if (!logs.length) {
    list.innerHTML = `
      <div class="glass-card p-10 text-center">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style="background:var(--color-primary-muted,rgba(27,107,74,0.08));">
          <i data-lucide="clipboard-list" class="w-8 h-8" style="color:var(--color-primary,#1B6B4A);"></i>
        </div>
        <p class="font-semibold text-sm mb-1" style="color:var(--color-text-primary,#1A2E24);">${isToday ? '今天还没有记录' : '这一天没有记录'}</p>
        <p class="text-xs" style="color:var(--color-text-tertiary,#8A9A91);">${isToday ? '点击底部"拍照"开始记录饮食' : '换个日期看看，或点击底部"拍照"开始记录'}</p>
      </div>
    `;
    refreshIcons();
    return;
  }
  list.innerHTML = logs.map(l => {
    const foodObj = FOODS.find(f => f.name === l.foodName) || { name: l.foodName };
    return `
    <div class="glass-card p-4 flex items-center gap-3">
      <div class="relative shrink-0">
        ${foodIconHtml(foodObj, 'w-14 h-14')}
        <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style="background:var(--color-surface,#FFFFFF);box-shadow:0 1px 4px rgba(15,41,33,0.1);">
          <div class="w-3 h-3 rounded-full" style="background:linear-gradient(135deg, #1B6B4A 0%, #2A9D6A 100%);"></div>
        </div>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between mb-1">
          <div class="font-bold text-sm truncate" style="color:var(--color-text-primary,#1A2E24);">${esc(l.foodName)}</div>
          <div class="shrink-0 text-sm font-bold tabular-nums" style="color:var(--color-primary,#1B6B4A);">${l.totals.cal} kcal</div>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs truncate" style="color:var(--color-text-tertiary,#8A9A91);">
            <i data-lucide="clock" class="w-3.5 h-3.5 shrink-0"></i>
            <span class="truncate">${l.time} · ${logAmountText(l)}</span>
          </div>
          <div class="shrink-0 flex items-center gap-2 text-xs tabular-nums" style="color:var(--color-text-tertiary,#8A9A91);">
            <span>K ${l.totals.k}</span>
            <span>Na ${l.totals.na}</span>
          </div>
        </div>
      </div>
      <button onclick="deleteLog(${l.id})" class="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150" style="color:var(--state-error,#BF3B2A);background:rgba(191,59,42,0.06);" onmouseenter="this.style.background='rgba(191,59,42,0.12)'" onmouseleave="this.style.background='rgba(191,59,42,0.06)'">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `; }).join('');
  refreshIcons();
}

function shiftLogsDate(delta) {
  const [Y, M, D] = logsViewDate.split('-').map(Number);
  const d = new Date(Y, M - 1, D);
  d.setDate(d.getDate() + delta);
  const next = localDateStr(d);
  if (next > todayStr()) return;
  logsViewDate = next;
  renderLogs();
}

function jumpLogsDate(value) {
  if (!value) return;
  logsViewDate = value > todayStr() ? todayStr() : value;
  renderLogs();
}

function deleteLog(id) {
  state.logs = state.logs.filter(l => l.id !== id);
  saveState();
  renderLogs();
}

async function clearShownLogs() {
  const isToday = logsViewDate === todayStr();
  const msg = isToday ? '确定清空今日所有记录？' : `确定清空 ${logsDateLabel(logsViewDate)} 的所有记录？`;
  if (!await confirmDialog(msg)) return;
  state.logs = state.logs.filter(l => l.date !== logsViewDate);
  saveState();
  renderLogs();
}
