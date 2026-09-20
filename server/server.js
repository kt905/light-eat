/**
 * LightEat 后端服务
 * - 静态文件托管（前端页面）
 * - HuggingFace 模型文件代理（本地 CLIP 模型下载用）
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const CORS_ORIGIN = process.env.CORS_ORIGIN || '';
const corsOptions = CORS_ORIGIN
  ? { origin: CORS_ORIGIN.split(',').map(s => s.trim()), methods: ['GET'] }
  : { origin: [/localhost/, /127\.0\.0\.1/], methods: ['GET'] };
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
  res.json({ ok: true, time: new Date().toISOString() });
});

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
  console.log('  ║     识别: 浏览器端本地 AI（CLIP）         ║');
  console.log('  ╚═══════════════════════════════════════════╝');
  console.log('');
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