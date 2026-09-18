/* ============ HOME ============ */
function renderHome() {
  const logs = getTodayLogs();
  const s = sumLogs(logs);
  const p = state.profile;
  const target = p.targets;
  const calPct = target.cal ? Math.min(100, Math.round(s.cal/target.cal*100)) : 0;
  const today = new Date();
  const dateStr = today.getMonth()+1 + '月' + today.getDate() + '日 · ' + ['周日','周一','周二','周三','周四','周五','周六'][today.getDay()];
  document.getElementById('today-date').textContent = dateStr;
  const rem = target.cal ? target.cal - Math.round(s.cal) : 0;
  const surplus = rem < 0;
  const exKcal = surplus ? -rem : 0;
  const w = p.personal.weight || 65;
  const html = `
    <div class="glass-card card-accent p-5 mb-3">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="card-label">今日热量摄入</div>
          <div class="card-value">${Math.round(s.cal)} <span class="card-unit">/ ${target.cal || '-'} kcal</span></div>
        </div>
        <div class="card-accent-icon">
          <i data-lucide="flame" class="w-7 h-7" style="color:#D4A853;"></i>
        </div>
      </div>
      ${target.cal ? `
      <div class="progress-bg">
        <div class="progress-fill" style="width:${calPct}%;"></div>
      </div>
      <div class="flex justify-between mt-1.5">
        <span class="card-meta">已摄入 ${calPct}%</span>
        <span class="card-meta">${target.cal - Math.round(s.cal) > 0 ? '还可摄入 ' + (target.cal - Math.round(s.cal)) + ' kcal' : '已超出 ' + (Math.round(s.cal) - target.cal) + ' kcal'}</span>
      </div>
      ` : ''}
    </div>
    <div class="glass-card p-5 mb-3">
      <div class="flex items-center justify-between mb-2">
        <div class="card-label">能量平衡 · 今日运动建议</div>
        <div class="card-meta">${Math.round(s.cal)} / ${target.cal || '-'} kcal</div>
      </div>
      ${target.cal ? `
        ${surplus ? `
          <div class="text-sm font-semibold" style="color:var(--state-error,#BF3B2A);">今日摄入已超出目标 ${exKcal} kcal</div>
          <div class="activity-box mt-2">
            约需快走 <strong>${stepsToBurn(exKcal, w)} 步</strong> 或慢跑 <strong>${minutesToBurn(exKcal, EXERCISES.jog.met, w)} 分钟</strong> 消耗<br>
            相当于约 <strong>${dailyFatGrams(exKcal)} g</strong> 体脂（7700 kcal ≈ 1kg）
          </div>`
        : `
          <div class="text-sm font-semibold" style="color:var(--color-primary,#1B6B4A);">已达标 · 今日还可摄入 ${rem} kcal</div>
          <div class="activity-tip mt-1">已摄入 ${Math.min(100, Math.round(s.cal / target.cal * 100))}%，低于目标热量可适当补充优质碳水和蛋白质</div>
        `}` : `
        <div class="text-sm" style="color:var(--color-text-tertiary,#8A9A91);">在「我的资料」设置目标热量后，可查看吃动平衡与运动建议</div>
      `}
    </div>
    <div class="grid grid-cols-3 gap-3">
      <div class="glass-card mini-stat">
        <div class="mini-stat-icon" style="background:rgba(191,59,42,0.1);">
          <i data-lucide="activity" class="w-5 h-5" style="color:#BF3B2A;"></i>
        </div>
        <div class="mini-stat-label">钾</div>
        <div class="mini-stat-value">${Math.round(s.k)}<span class="mini-stat-unit">mg</span></div>
      </div>
      <div class="glass-card mini-stat">
        <div class="mini-stat-icon" style="background:rgba(198,142,14,0.1);">
          <i data-lucide="droplets" class="w-5 h-5" style="color:#C68E0E;"></i>
        </div>
        <div class="mini-stat-label">钠</div>
        <div class="mini-stat-value">${Math.round(s.na)}<span class="mini-stat-unit">mg</span></div>
      </div>
      <div class="glass-card mini-stat">
        <div class="mini-stat-icon" style="background:rgba(61,186,165,0.1);">
          <i data-lucide="atom" class="w-5 h-5" style="color:#3DBAA5;"></i>
        </div>
        <div class="mini-stat-label">磷</div>
        <div class="mini-stat-value">${Math.round(s.p)}<span class="mini-stat-unit">mg</span></div>
      </div>
    </div>
    <div class="glass-card p-4 mt-3 flex items-center gap-3 cursor-pointer" onclick="switchPage('profile')">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background:linear-gradient(135deg, #D4A853 0%, #E8C77A 100%);box-shadow:0 2px 8px rgba(212,168,83,0.25);">
        <i data-lucide="utensils" class="w-5 h-5 text-white"></i>
      </div>
      <div class="min-w-0 flex-1">
        <div class="font-bold text-sm text-primary">${MODES[p.mode].label}</div>
        <div class="text-xs truncate text-tertiary">${MODES[p.mode].desc} · 已记录 ${logs.length} 餐</div>
      </div>
      <i data-lucide="chevron-right" class="w-5 h-5 shrink-0 text-tertiary"></i>
    </div>
  `;
  document.getElementById('home-summary').innerHTML = html;
  refreshIcons();
}
