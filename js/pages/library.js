/* ============ FOOD LIBRARY ============ */
function renderLibrary() {
  const q = document.getElementById('lib-search').value.trim().toLowerCase();
  const rows = FOODS.filter(f => f.name.toLowerCase().includes(q)).map(f => {
    const tags = foodTags(f).map(t=>`<span class="tag" style="background:${t.bg};color:${t.color};">${t.t}</span>`).join('');
    return `
      <tr>
        <td class="lib-td"><div class="flex items-center gap-2.5">${foodIconHtml(f, 'w-11 h-11')}<span class="truncate font-medium text-primary">${esc(f.name)}</span></div></td>
        <td class="lib-td text-right tabular-nums font-semibold text-secondary">${f.kcal}</td>
        <td class="lib-td text-right tabular-nums text-secondary">${f.k}</td>
        <td class="lib-td text-right tabular-nums text-secondary">${f.na}</td>
        <td class="lib-td text-right tabular-nums text-secondary">${f.p}</td>
        <td class="lib-td">${tags || '<span class="tag" style="background:var(--color-primary-muted,rgba(27,107,74,0.08));color:var(--color-primary,#1B6B4A);">安全</span>'}</td>
      </tr>
    `;
  }).join('');
  document.getElementById('lib-body').innerHTML = rows || '<tr><td colspan="6" class="p-4 text-center text-tertiary">未找到匹配食物</td></tr>';
  refreshIcons();
}
