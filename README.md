# 轻食记 LightEat — 代码流程文档

面向慢病人群（肾病 / 糖尿病 / 高血压 / 痛风）与减重人群的饮食营养管理 Web 应用。
核心闭环：**AI 拍照识别食物 → 映射营养库 → 按克数计算营养 → 结合饮食模式给建议 → 记入今日饮食 → 仪表盘/食谱**。

---

## 1. 技术栈

| 层 | 技术 |
|---|---|
| 前端 | 原生 HTML + 多个经典 `<script>` 模块（无打包器、无 ES module，保留内联 `onclick`） |
| 样式 | 自定义 `style.css` + Tailwind CSS v4（CLI 预编译为 `css/tailwind.css`） |
| 图表 | Chart.js 4.4.1（CDN） |
| 图标 | Lucide 1.46.0（jsdelivr CDN） |
| 本地 AI | transformers.js 4.3.0（jsdelivr CDN）+ CLIP ViT-B/32（ONNX 量化） |
| 云端 AI | 百度图像识别 - 菜品识别 |
| 后端 | Node.js + Express 4 + cors + multer + axios + dotenv |
| 存储 | 浏览器 `localStorage`（键名 `lightEatState_v2`） |

---

## 2. 目录结构

```
light-eat-redesign/
├─ index.html                 页面骨架（约 490 行）：7 个 <section> + 资源引用 + 末尾脚本序列
├─ style.css                  全部自定义样式（含桌面响应式布局）
├─ css/
│  └─ tailwind.css            Tailwind 预编译产物（构建生成，勿手改）
├─ src/
│  └─ tailwind.css            Tailwind 入口：@import "tailwindcss" + @source 扫描声明
├─ package.json               仅用于 Tailwind 构建（build:css / watch:css）
├─ js/                        前端逻辑（经典脚本，按顺序共享全局作用域）
│  ├─ data.js                 食物营养库 FOODS、英文标签、图标样式、模式等常量
│  ├─ core.js                 状态 state、localStorage 读写、营养与目标热量计算
│  ├─ ui.js                   UI 工具：showToast / confirmDialog / esc / foodIconHtml / refreshIcons 等
│  ├─ router.js               switchPage() 页面路由
│  ├─ init.js                 启动：后端探测 + 初始切页
│  └─ pages/
│     ├─ home.js              renderHome()
│     ├─ profile.js           renderProfile() / saveProfile()
│     ├─ scan.js              拍照识别全流程（CLIP / 百度 / 手动兜底）
│     ├─ logs.js              renderLogs() / deleteLog() / clearTodayLogs()
│     ├─ dashboard.js         renderDashboard() / drawCharts()
│     ├─ recipes.js           generateRecipes()
│     └─ library.js           renderLibrary()
├─ README.md                  本文档
├─ start.bat                  一键启动：装依赖 → 构建样式 → 起后端 → 打开浏览器
├─ download-clip-model.ps1    下载本地 CLIP 模型权重到 assets/models/
├─ assets/
│  ├─ hero-fresh-food.jpg     首页/扫描页默认背景图
│  ├─ logo-icon.jpg
│  ├─ meals/                  食谱配图 breakfast/lunch/dinner.jpg
│  └─ models/Xenova/clip-vit-base-patch32/   本地自托管 CLIP 模型（9 个文件，随仓库提交）
└─ server/
   ├─ server.js               Express 入口：API 路由 + 静态托管 + 模型代理
   ├─ baidu.js                百度 AI 鉴权与菜品识别客户端
   ├─ .env.example            环境变量模板
   ├─ package.json
   └─ node_modules/
```

> 前端不使用打包器：所有 `js/*.js` 为**经典脚本**，按 `index.html` 末尾的加载顺序共享同一全局作用域，
> 因此页面内联的 `onclick="switchPage('home')"` 等仍可访问全局函数。修改时须保持加载顺序（依赖在前）。
> 新增 JS 文件后需手动在 `index.html` 末尾追加 `<script src="...">`。

---

## 3. 启动与运行

### 前置：构建前端样式（首次 / 修改样式后）
```powershell
cd E:\webstorm\one\轻食记\light-eat-redesign
npm install        # 安装 Tailwind CLI（根目录，非 server）
npm run build:css  # 由 src/tailwind.css 生成 css/tailwind.css
```

### 方式 A：一键启动（推荐）
双击项目根目录 `start.bat`：
1. 检查 Node.js 是否安装
2. 若 `server/node_modules` 不存在则 `npm install`
3. 若 `css/tailwind.css` 不存在则 `npm install` + `npm run build:css`
4. 启动 `node server\server.js`
5. 自动打开 `http://localhost:3000/`

### 方式 B：手动
```powershell
cd E:\webstorm\one\轻食记\light-eat-redesign
node server\server.js
# 浏览器访问 http://localhost:3000/
```

### 方式 C：前端开发（Live Server + 监听构建）
```powershell
npm run watch:css    # 监听 index.html/js，样式改动即时重建
node server\server.js
```
用 VS Code Live Server 打开 `index.html`（端口 5500），前端会自动探测后端地址（见 §6.1）。

> 端口由 `server/.env` 的 `PORT` 控制，默认 3000。

---

## 4. 前端页面结构

单页应用，7 个 `<section class="section">`，同一时刻只有一个带 `.active`：

| id | 名称 | 渲染入口 |
|---|---|---|
| `page-home` | 首页 | `renderHome()` |
| `page-scan` | 拍照分析 | `renderScan()` |
| `page-logs` | 饮食记录 | `renderLogs()` |
| `page-dashboard` | 营养仪表盘 | `renderDashboard()` + `drawCharts()` |
| `page-recipes` | 食谱推荐 | `generateRecipes()` |
| `page-library` | 食物库 | `renderLibrary()` |
| `page-profile` | 我的档案 | `renderProfile()` |

### 4.1 路由：`switchPage(id)`（js/router.js）
1. `document.body.dataset.page = id`（CSS 依据它做布局切换）
2. 所有 `.section` 移除 `.active`，目标 `#page-{id}` 加上 `.active`
3. 同步底部导航 `.nav-item` 高亮
4. 更新顶栏标题 `#header-title`
5. 按 id 调用对应的 `render*()` 渲染函数
6. `window.scrollTo(0,0)`

页面顶部导航按钮通过内联 `onclick="switchPage('home')"` 触发。

---

## 5. 数据层与状态

### 5.1 核心数据表（js/data.js）

| 常量 | 说明 |
|---|---|
| `FOODS` | 食物营养库，每 100g：`kcal/protein/fat/carbs/k/na/p/purine`，`category` 分类。数据来源：中国食物成分表第6版、卫健委痛风食养指南(2024)、USDA |
| `FOOD_EN_LABELS` | 中文食物名 → 英文标签（约 60 项），供 CLIP 零样本识别 |
| `FOOD_STYLES` | 食物 → `{icon, from, to, text}` 图标与渐变配色 |
| `ACTIVITY_LEVELS` | 活动系数（sedentary…veryActive） |
| `MODES` | 6 种饮食模式及其营养上限（loseWeight/kidney/diabetes/hypertension/gout/healthy） |
| `TARGET_FIELDS` | 展示字段定义（热量/钾/钠/磷/脂肪/碳水/嘌呤） |
| `PORTION_UNITS` | 食量单位：碗/杯/个/片/根/匙/份（所有食物可选；通用默认克数：碗150g/杯200g/个100g/片40g/根100g/匙20g/份100g） |
| `FOOD_SERVINGS` | 常见食物每「1 单位」≈克数（如 米饭 1碗=150g），未配置时按「份」=100g |
| `EXERCISES` | 运动类型与 MET（快走3.5/慢跑8.0/骑车6.0/跳绳11.0/游泳7.0/爬楼梯7.5），用于「吃动平衡」建议 |
| `STORAGE_KEY` | `'lightEatState_v2'` |

### 5.2 状态模型（js/core.js）
```js
state = {
  profile: {
    mode: 'healthy',                       // 饮食模式
    personal: { gender, age, height, weight, activity },
    targets: { cal, k, na, p, fat, carbs, purine }  // 每日目标
  },
  logs: [ { id, date, time, foodName, grams, unit, count, totals } ]  // 饮食记录（按 date 保留所有日期）
}   // unit/count 为此前新增「单位+份数」；旧记录缺省按克数展示
```
- `loadState()`：从 localStorage 读取，缺失字段补默认值并计算目标热量（逐字段补齐，不清空既有记录）
- `saveState()`：写回 localStorage
- `calcBMR()` → `calcTDEE()` → `calcTargetCal()`：Mifflin-St Jeor 公式链
- `getLogsByDate(date)` / `getTodayLogs()`：按日期取记录
- `sumLogs()` / `sumLogsByDate(date)`：汇总各营养素
- `computeTotals(food, grams)`：按克数换算实际营养（`营养值 × grams/100`）
- `gramsFromPortion(food, unit, count)`：食量单位 × 份数 → 克数（`FOOD_SERVINGS`；缺省「份」=100g）
- `netCalories()` / `stepsToBurn()` / `minutesToBurn()` / `mealFatGrams()` / `dailyFatGrams()`：能量平衡（摄入−目标）与「吃动平衡」运动建议
- 历史汇总不再单独存储：`logs` 已含日期，仪表盘「近 7 天趋势」由 `getLogsByDate()` 实时聚合。
- 记录页 `logsViewDate`（js/pages/logs.js）保存当前查看的日期，支持前后翻页与日期选择器。

---

## 6. 拍照识别流程（核心，js/pages/scan.js）

```
用户点击上传框 / “从相册选择”
        │
        ▼
handleFileSelect(e)                    # 预览图片，隐藏旧结果
        │
        ▼  点击“开始分析”
analyze()
        │
        ├─ getBackendStatus()          # 探测后端：online? mockMode?
        │      useLocalClip = !online || mockMode
        │
        ├─ useLocalClip === false ──►  POST /api/food/recognize   ┐
        │        （百度云通道）          → data.candidates         │
        │                                                         │
        └─ useLocalClip === true  ──►  recognizeWithClip(file)    │
                 （本地 CLIP 通道）      → candidates              │
                                                                  ▼
                          candidatesData = 候选 [{name, confidence, ...}]
                                                                  │
                                                                  ▼
                  matchFoodByName() / createUnknownFood() 映射到本地库，去重
                                                                  │
                                                                  ▼
                  finishWithCandidates(mapped[0..5], mode)  → renderCandidates()
                                                                  │
                                              用户点选候选 selectCandidate(i)
                                                                  │
                                            computeTotals → currentAnalysis → showAnalysis()
                                                       （展示营养 + 模式建议）
                                                                  │
                                              addCurrentToLog(event) → state.logs.push()
                                                   → saveState() → 跳转“饮食记录”
```

### 6.1 后端状态探测（js/init.js）

```js
getApiBase()      // 解析后端地址，带缓存
  1. API_BASE_MANUAL 非空 → 用它
  2. 探测同源 '/api/health' → 成功则 ''（同源部署）
  3. 探测 'http://localhost:3000/api/health' → 成功则用该地址（Live Server 场景）
  4. 都不通 → ''（纯前端本地 AI）

getBackendStatus() // GET {base}/api/health → { online, mockMode }，缓存于 __backend
checkBackendStatus() // 页面加载时调用，更新提示文案、hero 徽标颜色
```

识别模式提示 `#scan-mode-text` 三态：
- 后端在线且非 mock → 「百度AI 真实识别已启用」
- 后端在线且 mock → 「免费本地AI识别已启用（浏览器端CLIP模型，无需API Key）」
- 后端离线 → 「未连接到后端，将使用浏览器端免费本地AI识别」

### 6.2 本地 CLIP 通道（js/pages/scan.js）

```js
getClipClassifier()          // 单例 Promise，加载失败后重置以便重试
  ├─ isLocalModelReady()  → HEAD {LOCAL_MODEL_PATH}{id}/config.json
  ├─ 动态超时看门狗：本地就绪 120s
  ├─ import(CLIP_TRANSFORMERS_CDN)      // transformers.js（jsdelivr）
  ├─ env.allowLocalModels = true
  ├─ env.localModelPath  = './assets/models/'   // 相对路径→同源绝对，兼容子目录部署
  ├─ 并行加载（模型权重全部同源 assets/models/）：
  │    AutoProcessor / AutoTokenizer
  │    CLIPVisionModelWithProjection（dtype:'q8' → onnx/vision_model_quantized.onnx）
  │    CLIPTextModelWithProjection（dtype:'q8' → onnx/text_model_quantized.onnx）
  └─ 返回手动打分函数 classifier(url, labels, {topk})：
       tokenizer("This is a photo of ...") → processor(image) → 两编码器 forward
       → L2 归一化 → cos 相似度 × logit_scale(100) → softmax → 排序取 topk

recognizeWithClip(file)
  ├─ enLabels = FOOD_EN_LABELS 的英文标签数组
  ├─ classifier(objectURL, enLabels, { topk: 6 })
  ├─ 过滤 score >= CLIP_MIN_SCORE(0.04)
  └─ 英文标签反查中文 → 返回 [{name, confidence, calorie, hasNutrition}]
```

> **为何不用官方 `pipeline('zero-shot-image-classification')`**：transformers.js v4 的该 pipeline 需要
> **合并体 `model_quantized.onnx`（146.5MB）**，超过 GitHub 单文件 100MB 上限，无法随仓库静态托管。
> 因此改为加载仓库内已提交的两个**分体量化编码器**（各 <100MB），按 CLIPModel 原始公式
> （`logits = logit_scale × cos_sim(L2 规范化嵌入)`，`logit_scale≈ln(100)`）手动组合打分，
> 输出与官方 pipeline 等价（tiger 样例实测置信度 >99%）。

常量（js/pages/scan.js）：
| 常量 | 值 |
|---|---|
| `CLIP_TRANSFORMERS_CDN` | `https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0` |
| `CLIP_MODEL_ID` | `Xenova/clip-vit-base-patch32` |
| `CLIP_MIN_SCORE` | `0.04` |

### 6.3 百度云通道
`POST {base}/api/food/recognize`，`FormData` 携带 `image` 字段。
前端处理错误：`503` 或 `code=BAIDU_NOT_CONFIGURED` → 提示配置 Key；其它 → 提示识别异常。

### 6.4 结果映射与展示（js/pages/scan.js）
- `matchFoodByName(name)`：归一化名称，优先精确匹配，其次名称归一化匹配
- `createUnknownFood(name)`：未匹配时生成 `unknown:true` 的占位食物
- 映射后按 `food.name` 去重，仅保留置信度最高项
- `finishWithCandidates()`：进度 100% → 展示候选面板 → 本地模式弹提示
- `renderCandidates()`：置信度条 + 未匹配警告
- `selectCandidate(i)`：按所选单位/份数换算克数，生成 `currentAnalysis`
- `showAnalysis()`：渲染图标、营养标签（`foodTags` 高钾/高钠/高磷/高嘌呤/安全）、8 项营养、模式建议（`kidney/hypertension/diabetes/gout/loseWeight` 各自规则）、**脂肪转化量（热量÷9）与单餐运动建议（按体重估算快走步数/慢跑分钟数）**
- `applyPortion()` / `onGramsInput()`：单位或份数变化时换算克数并刷新结果；手动改克数与「单位×份数」换算不一致时自动回落为「份×1」，保证结果页与记录页显示一致
- `addCurrentToLog(event)`：写入 `state.logs`（含 `unit/count`）→ `saveState` → 跳转记录页

### 6.5 手动兜底
- `showManualSelector()`：从 `FOODS` 搜索选择（`filterManualList` / `renderManualList` / `pickManualFood`）
- 识别失败时 `failWithError()` 会自动展示手动选择器

---

## 7. 后端架构（server/server.js）

```
Express App
├─ cors()                                  # 允许跨域（Live Server 访问 3000）
├─ express.json({limit:'10mb'})
├─ GET  /api/health                        # { ok, mockMode, baiduConfigured, time }
├─ POST /api/food/recognize                # 上传图片 → 候选列表
│    ├─ 解析：multipart file(image) 或 JSON {image: base64}
│    ├─ MOCK_MODE → getMockCandidates()    # 5 个固定候选
│    └─ 否则 → recognizeDish(buffer|b64,5) → 映射为 {name, confidence, calorie, hasNutrition}
├─ GET  /hf-proxy/*                        # 代理 https://hf-mirror.com/{path}（60s 超时）
│                                          # 解决 hf-mirror 无 CORS 问题；缓存 7 天
└─ express.static(项目根) + SPA 回退        # 静态托管前端，未命中路由返回 index.html
```

`MOCK_MODE` 判定：
```js
process.env.MOCK_MODE === 'true'
  || !process.env.BAIDU_API_KEY
  || process.env.BAIDU_API_KEY === 'your_api_key_here'
```

### 7.1 百度客户端（server/baidu.js）
- `getAccessToken()`：`POST aip.baidubce.com/oauth/2.0/token`，内存缓存，提前 1 天刷新
- `recognizeDish(image, topNum)`：`POST rest/2.0/image-classify/v2/dish`（`top_num`、`filter_threshold=0.1`）
- 错误码：`BAIDU_NOT_CONFIGURED` / `BAIDU_TOKEN_FAILED` / `BAIDU_TOKEN_INVALID` / `BAIDU_API_ERROR`

---

## 8. 本地 AI 模型自托管

### 8.1 下载模型
```powershell
powershell -ExecutionPolicy Bypass -File download-clip-model.ps1
```
脚本行为：
- 自动探测镜像：`hf-mirror.com` → `huggingface.co`（可用 `-Source` 指定，`-Force` 强制重下）
- 下载 9 个文件到 `assets/models/Xenova/clip-vit-base-patch32/`：
  `config.json`、`preprocessor_config.json`、`tokenizer.json`、`tokenizer_config.json`、
  `vocab.json`、`merges.txt`、`special_tokens_map.json`、
  `onnx/vision_model_quantized.onnx`（约 89MB）、`onnx/text_model_quantized.onnx`（约 64MB）
- 注意：transformers.js v4 采用 `vision_model` / `text_model` 分体结构；官方 `pipeline`
  虽会请求合并体 `model_quantized.onnx`（146.5MB，超 GitHub 单文件 100MB 上限），
  但应用不使用该 pipeline，而是直接加载下面两个分体编码器并手动组合打分（见 §6.2）。
  脚本会自动删除废弃的旧的 v2 `model_quantized.onnx`（146MB）
- 逐文件重试、临时 `.part` 文件、JSON 首尾校验、已存在文件跳过

> 模型随仓库提交：9 个文件中最大的 `vision_model_quantized.onnx` 为 89MB（< 100MB git 上限），
> 因此 `assets/models/` 不再被 `.gitignore` 排除，GitHub Pages 等静态托管可直接同源加载，无 CORS / 无外网依赖。

### 8.2 加载方式
```
全部同源：本地 assets/models/（随仓库提交）→ 浏览器 Cache API 缓存
```
前端只用 jsdelivr CDN 加载 transformers.js **代码**（约 1.5MB）；模型权重全部
从同源 `assets/models/` 加载，**完全不依赖外网**（huggingface.co / hf-mirror），
无 CORS 问题，模型在浏览器（WASM）中推理，免费无限次。

---

## 9. 配置项汇总

| 位置 | 键 | 说明 |
|---|---|---|
| `server/.env` | `BAIDU_API_KEY` | 百度应用 API Key（留空 → Mock/本地模式） |
| `server/.env` | `BAIDU_SECRET_KEY` | 百度应用 Secret Key |
| `server/.env` | `PORT` | 服务端口，默认 3000 |
| `server/.env` | `MOCK_MODE` | 强制模拟模式 |
| `js/init.js` | `API_BASE_MANUAL` | 手动指定后端地址（留空=自动探测） |
| `js/pages/scan.js` | `CLIP_TRANSFORMERS_CDN` | transformers.js CDN |
| `js/pages/scan.js` | `CLIP_MODEL_ID` | 模型仓库名 |
| `js/pages/scan.js` | `CLIP_MIN_SCORE` | 候选最低置信度 |
| `src/tailwind.css` | `@source` | Tailwind 扫描范围（HTML + js） |

---

## 10. 部署

| 场景 | 前端 | 后端 | 识别 |
|---|---|---|---|
| 本地开发 | `localhost:3000` | 同一进程 | 本地 CLIP（或配 Key 用百度） |
| Live Server | `:5500` | 另起 `:3000` | 自动探测 3000 后端 |
| 生产（同源） | Node 静态托管 | 同源 | 百度 / 本地 CLIP |
| 生产（纯静态） | 任意静态托管 | 无 | 本地 CLIP（模型随仓库提交，同源加载，无需外网） |

> 部署前须执行 `npm run build:css`，并确保 `css/tailwind.css` 一并发布。

### 10.1 本项目已内置的部署文件

| 文件 | 说明 |
|---|---|
| `.gitignore` | 排除 `node_modules/`、`server/.env`；`assets/models/`（识别模型约 150MB）**随仓库提交**，供静态托管同源加载 |
| `render.yaml` | Render Blueprint：免费套餐、原生 Node、构建 CSS + 后端依赖、健康检查 `/api/health` |
| `Dockerfile` + `.dockerignore` | 可选方案（把 `render.yaml` 的 `runtime` 改成 `docker` 即用镜像构建） |
| 根 `package.json` | 已含 `"start": "node server/server.js"`，便于平台自动识别 |

### 10.2 Render（免费版）完整流程

**第 0 步：本地预检**
```powershell
npm install
npm run build:css          # 确认 css/tailwind.css 为最新产物
node server/server.js      # 本地访问 http://localhost:3000 冒烟测试
```

**第 1 步：推送到 GitHub**
```powershell
git init
git add .
git commit -m "chore: deploy to Render"
git branch -M main
git remote add origin https://github.com/<你的用户名>/light-eat.git
git push -u origin main
```
推送前确认密钥**不在**提交列表：`git status` 中不应出现 `server/.env`；`assets/models/` 内的识别模型应**随仓库一并提交**（供 GitHub Pages 同源加载）。

**第 2 步：在 Render 创建服务**（[dashboard.render.com](https://dashboard.render.com)）

- 方式 A（推荐，自动读配置）：`New → Blueprint → 选择仓库`，Render 读取 `render.yaml` 建服务。
- 方式 B（手动）：`New → Web Service → 选择仓库`，填写：

| 项 | 值 |
|---|---|
| Runtime | `Node` |
| Build Command | `npm ci --include=dev && npm run build:css && cd server && npm ci` |
| Start Command | `node server/server.js` |
| Health Check Path | `/api/health` |
| Plan | `Free` |

**第 3 步：环境变量**（Render → 服务 → Environment）

| Key | 值 |
|---|---|
| `BAIDU_API_KEY` | 百度 AI 应用 API Key（**可留空**） |
| `BAIDU_SECRET_KEY` | 百度 AI 应用 Secret Key（**可留空**） |
| `NODE_VERSION` | `22`（可选） |

留空时后端自动进入演示模式（`mockMode`），前端识别自动走浏览器本地 CLIP。`PORT` 由 Render 注入，勿手动设置。
**同源部署下 `js/init.js` 的 `API_BASE_MANUAL` 保持为空**；若拆分前后端，则填后端公网地址。

**第 4 步：部署与验证**

1. 等待构建日志结束（`Your service is live`）。
2. 访问 `https://<服务名>.onrender.com`，确认首页、仪表盘图表正常。
3. 访问 `https://<服务名>.onrender.com/api/health`，返回 `{"ok":true,...}`。
4. 进入「识别」页，首次使用本地识别会从同源 `assets/models/` 加载约 150MB 模型（浏览器内缓存），耐心等待后重试。
5. 之后每次 `git push origin main` 会自动重新部署。

### 10.3 纯静态托管（Vercel / Netlify / Cloudflare Pages / GitHub Pages）

仅部署前端（`index.html` + `css/` + `js/` + `assets/`），**识别模型已随仓库提交**，由静态托管**同源加载**（无 CORS、无外网依赖、国内可用），首次分析需在浏览器内下载/缓存约 150MB 模型。**注意**：静态托管没有 `/api`、`/hf-proxy` 与百度识别：

- 识别走浏览器本地 CLIP（同源 `assets/models/`，不依赖 `huggingface.co`，国内亦可用）；
- 百度识别不可用；如需使用，须把后端（`server/`）单独部到 Node 主机，并在 `js/init.js` 设置 `API_BASE_MANUAL = 'https://<后端地址>'`。

### 10.4 免费额度与限制

- Render 免费实例**闲置约 15 分钟休眠**，冷启动 30–60s，属正常现象。
- 免费实例无持久磁盘，但本应用状态存于浏览器 `localStorage`，无需磁盘。
- Render 免费每月 100GB 出网；模型从同源 `assets/` 加载并经浏览器缓存，不再重复下载。
- 备选常驻免费方案：Koyeb（1 个 Web Service，0.1 vCPU / 512MB，不休眠）。

---

## 11. 优化记录与注意事项

### 已完成优化
- 删除未被引用的 `food-icons.js`（图标逻辑已内联为 `FOOD_STYLES` + `foodStyle()` + `foodIconHtml()`）。
- 删除识别流程中已废弃的 `detectFood(filename)`「按文件名关键词猜测」遗留函数。
- 删除 `generateRecipes()` 内未被调用的 `pickN()` / `gramsForCal()` 死代码。
- 修复 `showAnalysis()` 中 `resultEl` 的隐式全局变量（跨函数赋值会污染 `window`），改为局部声明 + 空值保护。
- 清理过时注释（`foodTags` 注释里引用的 `assets/foods-data.js` 并不存在）。
- 识别超时改为动态：本地模型就绪时 120s，避免慢网络下约 150MB 模型加载被固定 70s 误杀，并给出区分化的错误提示。
- 修复 `addCurrentToLog` 依赖隐式全局 `event`（非标准，部分浏览器报错），改为显式传参 `addCurrentToLog(event)`。
- 修复日期用 `toISOString()`（UTC）导致凌晨/晚间记录归属错日，改用本地日期 `localDateStr()`。
- 修复 `foodIconHtml` 生成无效 Tailwind 类 `w-5.5`（图标尺寸失效），并补 `w-16` 尺寸映射。
- 修复 `matchFoodByName` 死映射（`'大白菜'` 不存在）与冗余匹配分支。
- 新增 `esc()` 对插入 `innerHTML` 的识别结果/食物名做转义；手动选择器改为 `data-*` 传参。
- 新增 `refreshIcons()` 统一刷新图标，替换 17 处重复判断；lucide 由 `unpkg@latest` 改为 jsdelivr 固定版本 `1.46.0`。
- `saveProfile` 查找反馈按钮时增加空值保护。
- **前端模块化**：将原 ~2300 行单文件内联脚本拆分为 `js/` 下 12 个经典脚本（`data` / `core` / `ui` / `router` / `pages/*` / `init`），`index.html` 精简至约 490 行。
- **Tailwind 预编译**：移除运行时浏览器版 CDN（首屏闪烁、体积大、并发扫描开销），改为 CLI 预编译静态 `css/tailwind.css`（约 18KB，`npm run build:css`）。
- **`confirm()` 替换**：新增 `confirmDialog()`（返回 `Promise<boolean>`，样式与主题一致），替换原生阻塞式弹窗；`clearTodayLogs()` 相应改为 `async`。
- **本地模型路径相对化**：`LOCAL_MODEL_PATH` 改为按页面地址解析（`new URL('./assets/models/', location.href)`），修复子目录/子路径部署（如 Live Server）下模型 404。
- **后端探测修复**：`getApiBase()` 在本地静态端口（Live Server 等）跳过同源 `/api/health` 探测，消除控制台 404。
- **「我的档案」PC 布局**：饮食模式选择器移至右上（`lg:order-2` 并将其纵向拉伸至与左侧卡等高），目标卡片 `lg:order-3 lg:col-span-2`，两上排卡片等高。
- **输入聚焦样式**：`.profile-input:focus` 增加主题色背景，与「选中」态视觉一致。
- **仪表盘图表修复**：
  - 宏量供能占比图补充百分比展示（图例 `蛋白质 38.5%`、tooltip `114 kcal · 38.5%`、圆环中心绘制总 kcal）。
  - 「关键指标 vs 上限」自动纳入**当前模式所有已设上限的指标**（钾/钠/磷/嘌呤/脂肪/碳水，带单位），修复减重/糖尿病/痛风模式误显示「未设置上限」缺陷。
  - 趋势图 tooltip 补充单位与空值占位；空记录时清除当日历史缓存。
  - 图例圆点修正为正圆：Chart.js 设置 `pointStyleWidth` 会走 `ctx.ellipse`（两轴不等→椭圆），改用 `boxHeight` 使其走 `ctx.arc`。
- **部署配置**：新增 `.gitignore` / `render.yaml` / `Dockerfile` / `.dockerignore`，根 `package.json` 增加 `start` 脚本与 `engines`；详见第 10 节。
- **首屏闪烁修复**：`data-page` 原先仅由 `switchPage()` 在脚本末尾设置，首帧会先按未命中 `body[data-page="home"]` 的移动端布局绘制、随后跳变为桌面布局；改为在 `<body>` 静态声明 `data-page="home"`，首帧即命中正确布局。
- **历史数据可回看**：记录页新增日期导航（前/后一天 + 日期选择器），可查看与删除任意一天的明细；「近 7 天趋势」改为由 `logs` 按日期实时聚合，移除易失配的 `history` 缓存（含 `updateHistory()`）。
- **食量单位 + 份额**：扫描/手动选择时「食用量」升级为单位（碗/杯/个/片/根/匙/份，依食物 `FOOD_SERVINGS` 自动带出）+ 份数（0.5/1/1.5/2/3）+ 自动换算克数（可手改）；记录写入 `unit/count`，记录页显示「1碗≈150g」。
- **能量平衡 + 运动建议（吃动平衡）**：首页新增「能量平衡 · 今日运动建议」卡片（摄入/目标/净余；超量时给「快走 X 步 / 慢跑 Y 分钟」并按 7700 kcal≈1kg 折算体脂），计算基于个人体重（`state.profile.personal.weight`）与运动 MET。
- **脂肪转化量**：识别结果菜单餐展示「≈ X g 脂肪（按 9 kcal/g）」。
- **缓存与数据健壮性**：`server.js` 静态资源对 HTML/JS/CSS 发送 `Cache-Control: no-cache`（ETag 304），`index.html` 本地资源带 `?v=N` 版本号；`loadState()` 改为逐字段补齐默认值，旧存档缺字段不再整体清空数据。
- **CDN 异步化（防白屏）**：Chart.js / Lucide 由同步 `<script>` 改为 `async`（`onload="refreshIcons()"`），即使 CDN 不可达页面也能完整加载；`drawCharts()` 增加 `typeof Chart` 守卫，图表库缺失时显示占位提示而非报错。
- **「记入今日饮食」防连点**：`data-adding` 一次性锁，连点只写入 1 条。
- **历史记录健壮性**：`loadState()` 逐条补全缺失的 `totals`（各营养补 0）与 `grams`（缺省 100），残缺旧记录不再导致 `sumLogs()` 抛错。
- **份量一致性修复**：从其他页返回「拍照分析」不再把克数重置为默认值，保留当前的单位/份数换算结果。
- **`setMode()` 幂等**：重复点击当前模式按钮仅刷新界面，不再重置并覆盖已保存的目标值（尤其手动热量）。
- **趋势图连线修正**：近 7 天热量折线 `spanGaps:false`，无记录的天不再被拉线连成连续曲线。
- **运动估算校准**：快走 MET 4.5→3.5（65kg 时约 10000 步≈365 kcal，更贴近常识）。
- **文案调整**：识别结果脂肪量改为「这餐热量约相当于 X g 脂肪 · 如不及时消耗需快走/慢跑抵消」；食谱三餐比例改为早30/午40/晚30。
- **CLIP 打分改用手动组合分体编码器（GitHub Pages 可用的关键修复）**：transformers.js v4 的官方
  `zero-shot-image-classification` pipeline 需要合并体 `model_quantized.onnx`（146.5MB，超 GitHub
  单文件 100MB 上限，无法静态托管）；改为加载随仓库提交的 `vision_model`/`text_model` 分体量化 onnx
  （各 <100MB），用 `AutoProcessor`/`AutoTokenizer` + `CLIPVisionModelWithProjection`/
  `CLIPTextModelWithProjection` 本地推理，按 CLIPModel 原始公式（`logits = 100 × cos_sim(L2 嵌入)` +
  softmax）手动打分，输出与官方 pipeline 等价（实测 tiger 99.3%）；彻底移除 hf-proxy/huggingface 远端
  回退，模型权重全同源加载，规避 hf-mirror 无 CORS 与 huggingface.co 国内超时；`isLocalModelReady()`
  不再仅限 localhost 探测，本地加载超时放宽至 120s。

### 注意事项
- 前端为多文件经典脚本，无模块系统；`js/*.js` 按 `index.html` 末尾顺序加载并共享全局作用域，**新增文件/调整依赖须同步维护顺序**。
- `css/tailwind.css` 是构建产物，不要手改；样式改动后运行 `npm run build:css`（或 `npm run watch:css`）。Tailwind 以 `@layer` 输出，未分层的 `style.css` 始终优先覆盖 Tailwind。
- 动态拼接的 Tailwind 类名须以**完整字面量**出现（如 `foodIconHtml(food, 'w-10 h-10')`），否则扫描不到；新增后需重新构建。
- 百度菜品识别个人实名免费额度 1000 次，超出按次计费。
- 定位代码请以**文件名 + 函数名/区块名**为准，避免依赖具体行号。
