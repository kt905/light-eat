/* ============ RECIPES ============ */

/**
 * 三餐食谱模板生成
 * 参考《中国居民膳食指南（2022）》:
 * - 早餐占全天能量 25%-30%，含谷薯类+优质蛋白+奶豆/蔬果
 * - 午餐占全天能量 30%-40%，荤素搭配
 * - 晚餐占全天能量 30%-35%，清淡易消化
 * - 少喝或不喝含糖饮料，早餐不喝可乐
 */
function generateRecipes() {
  const mode = state.profile.mode;
  const targetCal = state.profile.targets.cal || 1800;
  document.getElementById('recipe-mode').textContent = MODES[mode].label;

  // 按模式过滤食物
  function allowed(f) {
    if (['咸菜','腊肉','火腿肠','方便面','油条','可乐','橙汁（鲜榨）','酸奶（含糖）'].includes(f.name)) return false;
    if (mode === 'kidney') return f.k < 250 && f.na < 150 && f.p < 160 && f.category !== '豆制品';
    if (mode === 'hypertension') return f.na < 150;
    if (mode === 'diabetes') return f.carbs < 25 && !['香蕉','葡萄','西瓜'].includes(f.name);
    if (mode === 'gout') return f.purine < 75;
    if (mode === 'loseWeight') return f.kcal < 200 || f.category === '蔬菜';
    return true;
  }

  const pool = FOODS.filter(allowed);
  const byCat = (cat) => pool.filter(f => f.category === cat);

  // 按食物分类的可用池
  const staples = byCat('主食');
  const drinks = byCat('饮品').filter(f => ['白开水','绿茶','黑咖啡','豆浆','牛奶'].includes(f.name));
  const fruits = byCat('水果');
  const veg = byCat('蔬菜');
  const meats = byCat('肉类').filter(f => mode !== 'gout' || f.purine < 100);
  const eggs = byCat('蛋类');
  const tofu = byCat('豆制品').filter(f => mode !== 'kidney');
  const milk = byCat('奶类').filter(f => f.name !== '酸奶（含糖）');
  const fish = byCat('鱼类').filter(f => mode !== 'gout' || f.purine < 75);
  const nuts = byCat('坚果');

  function pick(arr) { return arr.length ? arr[Math.floor(Math.random()*arr.length)] : null; }

  // 三餐热量分配：早30%、午40%、晚30%（中国居民膳食指南推荐）
  const mealCals = {
    breakfast: Math.round(targetCal * 0.30),
    lunch: Math.round(targetCal * 0.40),
    dinner: Math.round(targetCal * 0.30),
  };

  // 构建一餐：指定 主食/蛋白质/蔬菜/水果/奶类 的热量占比，然后从池中挑选并计算克重
  function buildMeal(mealCal, config) {
    const result = [];

    // 选择食材
    const picks = {};
    picks.staple = config.staple > 0 ? pick(staples) : null;
    picks.protein = config.protein > 0
      ? pick(config.proteinPool || meats.concat(fish, eggs, tofu))
      : null;
    picks.veg = config.veg > 0 ? pick(veg) : null;
    picks.veg2 = config.veg2 > 0 ? pick(veg.filter(f => f !== picks.veg)) : null;
    picks.fruit = config.fruit > 0 ? pick(fruits) : null;
    picks.dairy = config.dairy > 0 ? pick(milk.length ? milk : (tofu.length ? [pick(tofu)] : [])) : null;
    picks.drink = pick(drinks) || pick([FOODS.find(f=>f.name==='白开水')]);
    picks.nut = config.nut > 0 ? pick(nuts) : null;

    // 根据热量占比计算克数（克数=目标热量×100/食物kcal_per_100g，取整到5g）
    function addItem(food, pct, minGrams, maxGrams) {
      if (!food || !food.kcal) return;
      let g = Math.round(mealCal * pct * 100 / food.kcal / 5) * 5;
      g = Math.max(minGrams, Math.min(maxGrams, g));
      if (g < 5) return;
      result.push({food:food, grams:g});
    }

    // 基础分量（参考中国居民膳食指南餐盘建议）
    addItem(picks.staple, config.staple, 80, 300);
    addItem(picks.protein, config.protein, 50, 200);
    addItem(picks.veg, config.veg, 100, 300);
    addItem(picks.veg2, (config.veg2||0), 100, 250);
    addItem(picks.fruit, config.fruit, 80, 200);
    addItem(picks.dairy, config.dairy, 150, 300);
    addItem(picks.nut, (config.nut||0), 10, 25);
    if (picks.drink) {
      result.push({food:picks.drink, grams:200});
    }

    // 补偿：如果总热量偏差超过15%，按比例增减主食和蛋白质分量
    let currentCal = result.reduce((a,item) => a + computeTotals(item.food, item.grams).cal, 0);
    const diff = mealCal - currentCal;
    if (Math.abs(diff) > mealCal * 0.15) {
      const ratio = mealCal / currentCal;
      // 调整主食和蛋白质（不超过合理上限）
      result.forEach(item => {
        if (item.food.category === '主食') {
          item.grams = Math.min(350, Math.max(60, Math.round(item.grams * ratio / 5) * 5));
        } else if (['肉类','鱼类','蛋类','豆制品'].includes(item.food.category)) {
          item.grams = Math.min(220, Math.max(40, Math.round(item.grams * ratio / 5) * 5));
        }
      });
    }

    return result;
  }

  // 早餐：主食30% + 蛋白质(蛋/奶/豆)25% + 奶/豆浆20% + 水果15% + 坚果10%
  let breakfast = buildMeal(mealCals.breakfast, {
    staple: 0.30, protein: 0.15, veg: 0, fruit: 0.15, dairy: 0.25, nut: 0.05,
    proteinPool: eggs.concat(milk, tofu)
  });

  // 午餐：主食35% + 蛋白质(肉/鱼/豆)30% + 蔬菜20% + 蔬菜2 10% + 饮品5%
  let lunch = buildMeal(mealCals.lunch, {
    staple: 0.35, protein: 0.25, veg: 0.15, veg2: 0.10, fruit: 0.05, dairy: 0, nut: 0,
    proteinPool: meats.concat(fish, tofu, eggs)
  });

  // 晚餐：主食30% + 蛋白质(鱼/豆/蛋，清淡)25% + 蔬菜25% + 蔬菜2 15% + 饮品5%
  let dinner = buildMeal(mealCals.dinner, {
    staple: 0.25, protein: 0.20, veg: 0.25, veg2: 0.20, fruit: 0, dairy: 0.05, nut: 0,
    proteinPool: fish.concat(tofu, eggs, meats.filter(f => ['鸡胸肉','牛肉（瘦）','虾仁'].includes(f.name)))
  });

  function mealCard(title, items, gradient, mealTargetCal, image) {
    const totals = items.reduce((a,item)=>{
      const t = computeTotals(item.food, item.grams);
      a.cal+=t.cal; a.protein+=t.protein; a.fat+=t.fat; a.carbs+=t.carbs; a.k+=t.k; a.na+=t.na; a.p+=t.p; a.purine+=t.purine;
      return a;
    },{cal:0,protein:0,fat:0,carbs:0,k:0,na:0,p:0,purine:0});
    const calDiff = totals.cal - mealTargetCal;
    return `
      <div class="glass-card overflow-hidden" style="padding:0;">
        <div class="relative meal-banner">
          ${image ? `<img src="${image}" alt="${title}" class="meal-banner-img" onerror="this.style.display='none'">` : ''}
          <div class="meal-banner-tint" style="background:linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, ${gradient.from}33 45%, ${gradient.to}88 72%, rgba(15,41,33,0.88) 100%);"></div>
          <div class="absolute bottom-0 left-0 right-0 p-4">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-white" style="font-size:var(--text-lg,1.125rem);">${title}</h3>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold text-white" style="background:rgba(212,168,83,0.9);backdrop-filter:blur(8px);">目标 ${mealTargetCal} kcal</span>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold" style="background:${Math.abs(calDiff)<=mealTargetCal*0.1?'rgba(255,255,255,0.9)':'rgba(255,200,100,0.9)'};color:#1B6B4A;">约 ${totals.cal} kcal</span>
              </div>
            </div>
          </div>
        </div>
        <div class="p-4">
          <div class="text-xs mb-3 tabular-nums flex items-center gap-2 flex-wrap" style="color:var(--color-text-tertiary,#8A9A91);">
            <span>蛋白质 ${Math.round(totals.protein)}g</span>
            <span>·</span>
            <span>脂肪 ${Math.round(totals.fat)}g</span>
            <span>·</span>
            <span>碳水 ${Math.round(totals.carbs)}g</span>
            ${totals.purine > 0 ? `<span>·</span><span>嘌呤 ${Math.round(totals.purine)}mg</span>` : ''}
          </div>
          <ul class="text-sm space-y-3">
            ${items.map(item=>{
              const f = item.food;
              const t = computeTotals(f, item.grams);
              return `
              <li class="flex items-center justify-between gap-3" style="border-bottom:1px solid var(--color-border-subtle,#EEF0EE);padding-bottom:10px;">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  ${foodIconHtml(f, 'w-10 h-10')}
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-medium" style="color:var(--color-text-primary,#1A2E24);">${esc(f.name)}</div>
                    ${f.note ? `<div class="text-xs truncate" style="color:#D4A853;">${f.note}</div>` : ''}
                  </div>
                </div>
                <div class="shrink-0 text-right">
                  <div class="text-sm font-bold tabular-nums" style="color:var(--color-primary,#1B6B4A);">${t.cal} kcal</div>
                  <div class="text-xs tabular-nums" style="color:var(--color-text-tertiary,#8A9A91);">${item.grams}g</div>
                </div>
              </li>`;
            }).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  const tipCard = `
    <div class="glass-card p-4 flex items-start gap-3" style="background:linear-gradient(135deg, rgba(212,168,83,0.12) 0%, rgba(232,199,122,0.08) 100%);border:1px solid rgba(212,168,83,0.25);">
      <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:linear-gradient(135deg, #D4A853 0%, #E8C77A 100%);">
        <i data-lucide="calculator" class="w-5 h-5 text-white"></i>
      </div>
      <div class="min-w-0 flex-1">
        <div class="font-bold text-sm mb-1" style="color:var(--color-text-primary,#1A2E24);">智能配餐 · 目标 ${targetCal} kcal/天</div>
        <div class="text-xs" style="color:var(--color-text-secondary,#5A6B62);line-height:1.6;">
          根据您的身体数据和${MODES[mode].label}自动计算。三餐热量分配：早${Math.round(mealCals.breakfast)}kcal、午${Math.round(mealCals.lunch)}kcal、晚${Math.round(mealCals.dinner)}kcal。符合《中国居民膳食指南（2022）》推荐比例。
        </div>
      </div>
    </div>
  `;

  document.getElementById('recipe-cards').innerHTML =
    tipCard +
    mealCard('早餐', breakfast, {from:'#D4A853', to:'#E8C77A'}, mealCals.breakfast, 'assets/meals/breakfast.jpg') +
    mealCard('午餐', lunch, {from:'#1B6B4A', to:'#2A9D6A'}, mealCals.lunch, 'assets/meals/lunch.jpg') +
    mealCard('晚餐', dinner, {from:'#3A8FB7', to:'#6BB3D9'}, mealCals.dinner, 'assets/meals/dinner.jpg');
  refreshIcons();
}
