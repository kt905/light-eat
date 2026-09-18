/* ============ DASHBOARD ============ */
function renderDashboard() {
  const logs = getTodayLogs();
  const s = sumLogs(logs);
  const t = state.profile.targets;
  const cards = document.getElementById('dashboard-cards');

  const iconMap = {
    cal: 'flame',
    k: 'activity',
    na: 'droplets',
    p: 'atom',
    purine: 'alert-triangle',
    fat: 'drumstick',
    carbs: 'utensils'
  };

  function card(key, label, unit, gradientFrom, gradientTo, isAccent) {
    const val = s[key];
    const limit = t[key];
    let pct = limit ? Math.min(100, Math.round(val/limit*100)) : 0;
    let over = limit && val > limit;
    const icon = iconMap[key] || 'circle';
    const accentCls = isAccent ? ' card-accent' : '';
    const valueColor = isAccent ? '#fff' : (over ? 'var(--state-error,#BF3B2A)' : 'var(--color-text-primary,#1A2E24)');
    const unitColor = isAccent ? 'rgba(255,255,255,0.6)' : 'var(--color-text-tertiary,#8A9A91)';
    const labelColor = isAccent ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary,#8A9A91)';
    const progressTrackBg = isAccent ? 'rgba(255,255,255,0.2)' : 'var(--color-border-subtle,#EEF0EE)';
    const metaColor = over ? 'var(--state-error,#BF3B2A)' : (isAccent ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary,#8A9A91)');
    const limitColor = isAccent ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary,#8A9A91)';
    const badgeCls = over ? 'over' : 'safe';
    const badgeBg = over ? 'rgba(191,59,42,0.15)' : (isAccent ? 'rgba(255,255,255,0.2)' : 'var(--color-primary-muted,rgba(27,107,74,0.08))');
    const badgeColor = over ? '#fff' : (isAccent ? '#fff' : 'var(--color-primary,#1B6B4A)');
    return `
      <div class="glass-card${accentCls} p-4">
        <div class="flex items-start gap-3 mb-3">
          <div class="metric-icon" style="background:${isAccent ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,'+gradientFrom+' 0%,'+gradientTo+' 100%)'};box-shadow:${isAccent ? 'none' : '0 2px 8px '+gradientFrom+'33'};">
            <i data-lucide="${icon}" class="w-5 h-5" style="color:${isAccent ? '#D4A853' : '#fff'};"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start">
              <div>
                <div class="metric-name" style="color:${labelColor};">${label}</div>
                <div class="metric-value" style="color:${valueColor};">${Math.round(val)}<span class="metric-unit" style="color:${unitColor};">${unit}</span></div>
              </div>
              ${limit ? `<div class="metric-pct-badge ${badgeCls}" style="background:${badgeBg};color:${badgeColor};">${pct}%</div>` : ''}
            </div>
          </div>
        </div>
        ${limit ? `
        <div class="progress-bg" style="background:${progressTrackBg};height:8px;">
          <div class="progress-fill" style="width:${pct}%;background:${isAccent ? 'linear-gradient(90deg,#D4A853,#E8C77A)' : 'linear-gradient(90deg,'+gradientFrom+','+gradientTo+')'};height:100%;"></div>
        </div>
        <div class="flex justify-between mt-1.5">
          <span class="metric-meta ${over ? 'over' : ''}" style="color:${metaColor};">${over ? '⚠ 已超出上限' : '已摄入 ' + Math.round(val) + ' ' + unit}</span>
          <span class="metric-meta" style="color:${limitColor};">上限 ${limit} ${unit}</span>
        </div>
        ` : `<div class="metric-no-limit" style="color:${isAccent?'rgba(255,255,255,0.6)':'var(--color-text-tertiary,#8A9A91)'};">当前模式未设置上限</div>`}
      </div>
    `;
  }

  cards.innerHTML = `
    <div class="grid grid-cols-1 gap-3 lg:gap-5 lg:grid-cols-3">
      ${card('cal','热量','kcal','#0D3D2A','#2A9D6A', true)}
      ${card('k','钾','mg','#BF3B2A','#E66B5A')}
      ${card('na','钠','mg','#C68E0E','#E6B52E')}
      ${card('p','磷','mg','#3DBAA5','#65D4C1')}
      ${card('purine','嘌呤','mg','#8B5CF6','#A78BFA')}
      ${card('fat','脂肪','g','#D4A853','#E8C77A')}
      ${card('carbs','碳水','g','#3A8FB7','#6BB3D9')}
    </div>
  `;

  drawCharts(s, t);
  requestAnimationFrame(() => {
    refreshIcons();
  });
}

/* 仪表盘指标元数据：标签 / 单位 */
const METRIC_META = {
  cal:    { label: '热量', unit: 'kcal' },
  k:      { label: '钾',   unit: 'mg' },
  na:     { label: '钠',   unit: 'mg' },
  p:      { label: '磷',   unit: 'mg' },
  purine: { label: '嘌呤', unit: 'mg' },
  fat:    { label: '脂肪', unit: 'g' },
  carbs:  { label: '碳水', unit: 'g' },
};

function drawCharts(s, t) {
  const canvasPie = document.getElementById('chart-macros');
  const canvasBar = document.getElementById('chart-limits');
  const canvasTrend = document.getElementById('chart-trend');

  // Chart.js CDN 未加载（网络受限）→ 各图显示占位空态，避免白屏/抛错
  if (typeof Chart === 'undefined') {
    const emptyPie = document.getElementById('chart-macros-empty');
    const emptyBar = document.getElementById('chart-limits-empty');
    const emptyTrend = document.getElementById('chart-trend-empty');
    [canvasPie, canvasBar, canvasTrend].forEach(c => { if (c) c.style.visibility = 'hidden'; });
    [emptyPie, emptyBar, emptyTrend].forEach(e => {
      if (!e) return;
      e.style.display = 'flex';
      if (e.dataset.chartLoaded !== '1') {
        e.innerHTML = '<div class="text-xs text-tertiary text-center py-1">图表组件未加载（网络受限），营养数据仍正常统计</div>';
      }
    });
    return;
  }
  const ctxPie = canvasPie.getContext('2d');
  const ctxBar = canvasBar.getContext('2d');
  const ctxTrend = canvasTrend.getContext('2d');

  const emptyPie = document.getElementById('chart-macros-empty');
  const emptyBar = document.getElementById('chart-limits-empty');
  const emptyTrend = document.getElementById('chart-trend-empty');

  if (chartMacros) { chartMacros.destroy(); chartMacros = null; }
  if (chartLimits) { chartLimits.destroy(); chartLimits = null; }
  if (chartTrend) { chartTrend.destroy(); chartTrend = null; }

  // Helper
  function showEmpty(canvas, emptyEl) {
    canvas.style.visibility = 'hidden';
    emptyEl.style.display = 'flex';
  }
  function showCanvas(canvas, emptyEl) {
    canvas.style.visibility = 'visible';
    emptyEl.style.display = 'none';
  }

  // ── 1. 宏量营养素供能占比（Atwater 系数：蛋白质 4 / 脂肪 9 / 碳水 4 kcal·g⁻¹）──
  const macros = [
    { label: '蛋白质', kcal: s.protein * 4, color: '#1B6B4A' },
    { label: '脂肪',   kcal: s.fat * 9,     color: '#D4A853' },
    { label: '碳水',   kcal: s.carbs * 4,   color: '#3A8FB7' },
  ];
  const macroTotal = macros.reduce((a, m) => a + m.kcal, 0);

  if (macroTotal <= 0) {
    showEmpty(canvasPie, emptyPie);
  } else {
    showCanvas(canvasPie, emptyPie);
    chartMacros = new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: macros.map(m => m.label),
        datasets: [{
          data: macros.map(m => Math.round(m.kcal * 10) / 10),
          backgroundColor: macros.map(m => m.color),
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 14, usePointStyle: true, boxHeight: 7,
              font: { size: 12, family: '"PingFang SC", sans-serif' },
              generateLabels(chart) {
                const ds = chart.data.datasets[0];
                const tot = ds.data.reduce((a, x) => a + x, 0) || 1;
                return chart.data.labels.map((label, i) => ({
                  text: `${label} ${(ds.data[i] / tot * 100).toFixed(1)}%`,
                  fillStyle: ds.backgroundColor[i],
                  strokeStyle: ds.backgroundColor[i],
                  lineWidth: 0,
                  pointStyle: 'circle',
                  index: i
                }));
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(26,46,36,0.92)',
            titleFont: { size: 12 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8,
            callbacks: {
              label: (c) => {
                const tot = c.dataset.data.reduce((a, x) => a + x, 0) || 1;
                return ` ${Math.round(c.parsed)} kcal · ${(c.parsed / tot * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'macroCenter',
        afterDraw(chart) {
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          const tot = chart.data.datasets[0].data.reduce((a, x) => a + x, 0);
          const cx = (chartArea.left + chartArea.right) / 2;
          const cy = (chartArea.top + chartArea.bottom) / 2;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#1A2E24';
          ctx.font = '700 20px "PingFang SC", sans-serif';
          ctx.fillText(String(Math.round(tot)), cx, cy - 7);
          ctx.fillStyle = '#8A9A91';
          ctx.font = '500 11px "PingFang SC", sans-serif';
          ctx.fillText('kcal', cx, cy + 12);
          ctx.restore();
        }
      }]
    });
  }

  // ── 2. 关键指标 vs 上限（自动纳入当前模式已设置上限的全部指标）──
  const BAR_KEYS = ['k', 'na', 'p', 'purine', 'fat', 'carbs'];
  const active = BAR_KEYS
    .filter(k => t[k] !== null && t[k] !== undefined && Number(t[k]) > 0)
    .map(k => ({ key: k, label: `${METRIC_META[k].label} (${METRIC_META[k].unit})`, unit: METRIC_META[k].unit, limit: Number(t[k]) }));

  if (active.length === 0) {
    showEmpty(canvasBar, emptyBar);
  } else {
    showCanvas(canvasBar, emptyBar);
    chartLimits = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: active.map(x => x.label),
        datasets: [
          { label: '已摄入', data: active.map(x => Math.round(s[x.key])), backgroundColor: '#1B6B4A', borderRadius: 4 },
          { label: '上限', data: active.map(x => x.limit), backgroundColor: '#E5E8E5', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#8A9A91' } },
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#8A9A91' } }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 16, usePointStyle: true, boxHeight: 7, font: { size: 12, family: '"PingFang SC", sans-serif' } }
          },
          tooltip: {
            backgroundColor: 'rgba(26,46,36,0.92)',
            titleFont: { size: 12 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8,
            callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y} ${active[c.dataIndex]?.unit || ''}` }
          }
        }
      }
    });
  }

  // 近7天热量趋势
  const days = [];
  const dayCals = [];
  const targetCal = t.cal || 1800;
  const today = new Date();
  let hasHistoryData = false;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = localDateStr(d);
    const label = (i === 0) ? '今天' : `${d.getMonth()+1}/${d.getDate()}`;
    days.push(label);
    const dayLogs = getLogsByDate(dStr);
    const val = dayLogs.length ? Math.round(sumLogs(dayLogs).cal) : null;
    if (val !== null) hasHistoryData = true;
    dayCals.push(val);
  }

  if (!hasHistoryData) {
    showEmpty(canvasTrend, emptyTrend);
  } else {
    showCanvas(canvasTrend, emptyTrend);
    chartTrend = new Chart(ctxTrend, {
      type: 'line',
      data: {
      labels: days,
      datasets: [
        {
          label: '热量摄入 (kcal)',
          data: dayCals,
          borderColor: '#1B6B4A',
          backgroundColor: 'rgba(27,107,74,0.1)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: '#1B6B4A',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointStyle: 'circle',
          spanGaps: false,
        },
        {
          label: '目标线',
          data: Array(7).fill(targetCal),
          borderColor: '#D4A853',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          tension: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { size: 11 }, color: '#8A9A91' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#8A9A91' }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, usePointStyle: true, boxHeight: 7, font: { size: 11, family: '"PingFang SC", sans-serif' } }
        },
        tooltip: {
          backgroundColor: 'rgba(26,46,36,0.92)',
          titleFont: { size: 12 },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (c) => c.parsed.y === null ? ` ${c.dataset.label}: —` : ` ${c.dataset.label}: ${c.parsed.y} kcal`
          }
        }
      }
    }
  });
  }
}
