/**
 * LightEat 后端服务
 * - 百度AI菜品识别代理
 * - 静态文件托管（前端页面）
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const { recognizeDish } = require('./baidu');

const app = express();
const PORT = process.env.PORT || 3000;
const MOCK_MODE = process.env.MOCK_MODE === 'true' ||
  !process.env.BAIDU_API_KEY ||
  process.env.BAIDU_API_KEY === 'your_api_key_here';

const upload = multer({
  limits: { fileSize: 8 * 1024 * 1024 },
});

const CORS_ORIGIN = process.env.CORS_ORIGIN || '';
const corsOptions = CORS_ORIGIN
  ? { origin: CORS_ORIGIN.split(',').map(s => s.trim()), methods: ['GET', 'POST'] }
  : { origin: [/localhost/, /127\.0\.0\.1/], methods: ['GET', 'POST'] };
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试' },
});
app.use('/api/', apiLimiter);

// ────────── 健康检查 ──────────
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mockMode: MOCK_MODE,
    baiduConfigured: !MOCK_MODE,
    time: new Date().toISOString(),
  });
});

// ────────── 菜品识别接口 ──────────
// 支持 multipart/form-data (file字段) 或 JSON body (image: base64)
app.post('/api/food/recognize', upload.single('image'), async (req, res) => {
  try {
    let imageBuffer;
    let imageB64;

    if (req.file) {
      imageBuffer = req.file.buffer;
    } else if (req.body && req.body.image) {
      const b64 = req.body.image.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(b64, 'base64');
      imageB64 = b64;
    } else {
      return res.status(400).json({
        success: false,
        code: 'NO_IMAGE',
        message: '请上传图片文件（multipart file 字段或JSON {image: base64}）',
      });
    }

    let candidates;

    if (MOCK_MODE) {
      candidates = getMockCandidates();
    } else {
      const rawResults = await recognizeDish(imageBuffer || imageB64, 5);
      candidates = rawResults.map(r => ({
        name: r.name,
        confidence: Number(r.probability) || 0,
        calorie: r.calorie || null,
        hasNutrition: false,
      }));
    }

    res.json({
      success: true,
      mockMode: MOCK_MODE,
      candidates,
    });
  } catch (err) {
    console.error('[recognize] error:', err.message, err.code || '');
    res.status(err.code === 'BAIDU_NOT_CONFIGURED' ? 503 : 500).json({
      success: false,
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || '识别服务异常',
    });
  }
});

// ────────── Mock数据（无API Key时的演示模式） ──────────
function getMockCandidates() {
  const pool = [
    { name: '米饭', confidence: 0.85 },
    { name: '番茄炒蛋', confidence: 0.72 },
    { name: '清炒时蔬', confidence: 0.54 },
    { name: '清蒸鱼', confidence: 0.31 },
    { name: '凉拌黄瓜', confidence: 0.18 },
  ];
  return pool.map(p => ({ ...p, hasNutrition: false }));
}

// ────────── HuggingFace 模型文件代理（解决 hf-mirror 无 CORS 问题） ──────────
app.get('/hf-proxy/*', async (req, res) => {
  const hfPath = req.params[0];
  if (!hfPath || hfPath.includes('..') || /[\\]/.test(hfPath)) return res.status(400).json({ error: 'Invalid path' });
  const url = `https://hf-mirror.com/${hfPath}`;
  try {
    const resp = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000, // 单次模型文件下载限制 60s，防止挂起
      headers: { 'User-Agent': 'LightEat/1.0' },
    });
    res.set('Content-Type', resp.headers['content-type'] || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=604800');
    res.send(Buffer.from(resp.data));
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: 'Model proxy fetch failed', detail: err.message });
  }
});

// ────────── 静态文件托管（前端页面） ──────────
const staticDir = path.resolve(__dirname, '..');
app.use(express.static(staticDir, {
  extensions: ['html'],
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    // HTML/JS/CSS 每次校验（no-cache + ETag → 命中返回 304），避免更新后端上仍是旧脚本
    if (/\.(html|js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  },
}));

// SPA回退 - 所有未命中的路由返回index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(staticDir, 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════╗');
  console.log('  ║     LightEat 后端服务已启动               ║');
  console.log(`  ║     地址: http://localhost:${PORT}          ║`);
  console.log(`  ║     模式: ${MOCK_MODE ? '演示模式（模拟识别）' : '百度AI真实识别'}       ║`);
  console.log('  ╚═══════════════════════════════════════════╝');
  console.log('');
  if (MOCK_MODE) {
    console.log('  ⚠  当前为演示模式，配置 BAIDU_API_KEY / BAIDU_SECRET_KEY 后可启用真实识别。');
    console.log('     复制 server/.env.example 为 server/.env 并填入百度AI应用凭证。');
    console.log('');
  }
});

function gracefulShutdown(signal) {
  console.log(`\n收到 ${signal}，正在优雅关闭...`);
  server.close(() => {
    console.log('服务已停止');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('优雅关闭超时，强制退出');
    process.exit(1);
  }, 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));