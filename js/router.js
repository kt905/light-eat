/* ============ PAGE ROUTING ============ */
function switchPage(id) {
  document.body.dataset.page = id;
  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('nav-active');
    el.querySelector('span')?.classList.remove('nav-label-bold');
    el.querySelector('span')?.classList.add('nav-label-medium');
  });
  const nav = document.querySelector('.nav-item[data-page="' + id + '"]');
  if (nav) {
    nav.classList.add('nav-active');
    const label = nav.querySelector('span');
    if (label) {
      label.classList.remove('nav-label-medium');
      label.classList.add('nav-label-bold');
    }
  }
  const pageTitles = {
    home: '首页', scan: '拍照分析', logs: '饮食记录',
    dashboard: '营养仪表盘', recipes: '食谱推荐', library: '食物库', profile: '我的档案'
  };
  const headerTitle = document.getElementById('header-title');
  if (headerTitle) headerTitle.textContent = pageTitles[id] || '';
  if (id === 'profile') renderProfile();
  if (id === 'scan') renderScan();
  if (id === 'logs') renderLogs();
  if (id === 'dashboard') renderDashboard();
  if (id === 'recipes') generateRecipes();
  if (id === 'library') renderLibrary();
  if (id === 'home') renderHome();
  window.scrollTo(0,0);
}
