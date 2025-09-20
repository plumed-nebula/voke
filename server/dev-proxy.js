/**
 * 本地开发代理服务器 - 模仿 Cloudflare Worker 的功能
 * 仅在开发环境使用，生产环境不包含此文件
 */

// 加载环境变量
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 4000

// 启用 CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    maxAge: 86400,
  }),
)

// 处理原始数据
app.use(
  express.raw({
    type: '*/*',
    limit: '100mb',
    verify: (req, res, buf) => {
      req.rawBody = buf
    },
  }),
)

// 处理 JSON 数据
app.use(express.json({ limit: '100mb' }))

// 处理 form-data
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

// 主代理路由
app.all('/', async (req, res) => {
  try {
    const targetRaw = req.query.target
    if (!targetRaw) {
      return res.status(400).json({ error: 'Missing target parameter' })
    }

    // 解码并规范化 target（支持前端传入 encodeURIComponent 后的字符串）
    const decoded = decodeURIComponent(targetRaw.trim())
    const forwardUrl = new URL(decoded.startsWith('http') ? decoded : 'https://' + decoded)

    // 把外层 URL 的其它查询参数追加到 forwardUrl（但跳过 target 本身）
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'target') continue
      // 如果外层想覆盖某个参数，可改成 set()；这里用 append() 保持 target 的原始参数优先
      forwardUrl.searchParams.append(k, v)
    }

    // 可选：如果是 imgbb 且环境变量中有 key，自动注入（客户端无需传 key）
    if (
      forwardUrl.hostname.includes('imgbb.com') &&
      process.env.IMGBB_KEY &&
      !forwardUrl.searchParams.get('key')
    ) {
      forwardUrl.searchParams.set('key', process.env.IMGBB_KEY)
    }

    // 准备请求选项
    const fetchOptions = {
      method: req.method,
      headers: {},
      redirect: 'follow',
    }

    // 复制请求头（完全模仿 Worker 行为）
    const skipHeaders = ['host', 'connection', 'content-length']
    for (const [key, value] of Object.entries(req.headers)) {
      if (!skipHeaders.includes(key.toLowerCase())) {
        fetchOptions.headers[key] = value
      }
    }

    // 🔧 不再强制禁用压缩，保留浏览器原始的 Accept-Encoding
    // 让 node-fetch 自动处理压缩（就像 Worker 的原生 fetch）

    // 处理请求体
    if (!['GET', 'HEAD'].includes(req.method.toUpperCase())) {
      if (req.rawBody && req.rawBody.length > 0) {
        fetchOptions.body = req.rawBody
      } else if (req.body && Object.keys(req.body).length > 0) {
        if (req.headers['content-type']?.includes('application/json')) {
          fetchOptions.body = JSON.stringify(req.body)
        } else {
          fetchOptions.body = req.body
        }
      }
    }

    // 发送请求（完全透明转发）
    const fetch = (await import('node-fetch')).default
    const upstream = await fetch(forwardUrl.toString(), fetchOptions)

    // 获取响应体（不解析，直接转发）
    const responseBody = await upstream.buffer()

    // 设置响应头（透明转发）
    upstream.headers.forEach((value, key) => {
      // 只跳过传输层相关的头部
      if (
        ![
          'connection',
          'transfer-encoding',
          'content-length', // Express 会自动设置正确的 content-length
        ].includes(key.toLowerCase())
      ) {
        res.set(key, value)
      }
    })

    // 设置 CORS 头
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.set('Access-Control-Allow-Headers', '*')

    // 透明转发响应体
    res.status(upstream.status).send(responseBody)
  } catch (error) {
    console.error('[Dev Proxy] Error:', error)
    res.status(500).json({
      error: 'Proxy internal error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: PORT,
  })
})

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 Dev proxy server running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health`)
  console.log(`🔗 Proxy usage: http://localhost:${PORT}/?target=<encoded_url>`)
})

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down dev proxy server...')
  server.close(() => {
    console.log('Server closed gracefully')
    process.exit(0)
  })
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down dev proxy server...')
  server.close(() => {
    console.log('Server closed gracefully')
    process.exit(0)
  })
})
