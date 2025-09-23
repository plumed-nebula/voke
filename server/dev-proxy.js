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

// 🔧 修复：优化body处理顺序，确保multipart数据正确处理
// 首先处理 multipart/form-data（保留原始数据）
app.use(
  express.raw({
    type: 'multipart/form-data',
    limit: '100mb',
    verify: (req, res, buf) => {
      req.rawBody = buf
    },
  }),
)

// 处理其他类型的原始数据
app.use(
  express.raw({
    type: (req) => {
      const contentType = req.headers['content-type'] || ''
      // 只处理非multipart和非json的数据
      return !contentType.includes('multipart/') && !contentType.includes('application/json')
    },
    limit: '100mb',
    verify: (req, res, buf) => {
      req.rawBody = buf
    },
  }),
)

// 处理 JSON 数据
app.use(express.json({ limit: '100mb' }))

// 处理 form-data（URL编码）
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

// 主代理路由
app.all('/', async (req, res) => {
  console.log(`\n🔄 [Dev Proxy] ${req.method} ${req.url}`)
  console.log(`📋 [Headers] User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`)
  console.log(`📋 [Headers] Content-Type: ${req.headers['content-type'] || 'undefined'}`)
  console.log(`📋 [Headers] Content-Length: ${req.headers['content-length'] || 'undefined'}`)

  try {
    const targetRaw = req.query.target
    if (!targetRaw) {
      console.log('❌ [Error] Missing target parameter')
      return res.status(400).json({ error: 'Missing target parameter' })
    }

    // 解码并规范化 target（支持前端传入 encodeURIComponent 后的字符串）
    const decoded = decodeURIComponent(targetRaw.trim())
    const forwardUrl = new URL(decoded.startsWith('http') ? decoded : 'https://' + decoded)

    console.log(`🎯 [Target] Original: ${targetRaw}`)
    console.log(`🎯 [Target] Decoded: ${decoded}`)
    console.log(`🎯 [Target] Final URL: ${forwardUrl.toString()}`)

    // 把外层 URL 的其它查询参数追加到 forwardUrl（但跳过 target 本身）
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'target') continue
      // 如果外层想覆盖某个参数，可改成 set()；这里用 append() 保持 target 的原始参数优先
      forwardUrl.searchParams.append(k, v)
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

    // 🔧 修复压缩问题：移除 Accept-Encoding 以避免解码问题
    delete fetchOptions.headers['accept-encoding']

    // 处理请求体
    if (!['GET', 'HEAD'].includes(req.method.toUpperCase())) {
      if (req.rawBody && req.rawBody.length > 0) {
        fetchOptions.body = req.rawBody
        console.log(`📤 [Body] Using rawBody, size: ${req.rawBody.length} bytes`)
      } else if (req.body && Object.keys(req.body).length > 0) {
        if (req.headers['content-type']?.includes('application/json')) {
          fetchOptions.body = JSON.stringify(req.body)
          console.log(`📤 [Body] Using JSON body, size: ${fetchOptions.body.length} bytes`)
        } else {
          fetchOptions.body = req.body
          console.log('📤 [Body] Using form body')
        }
      } else {
        console.log('📤 [Body] No body data found - this may be a problem for POST requests')
        console.log('📤 [Body] Request details:', {
          hasRawBody: !!req.rawBody,
          rawBodyLength: req.rawBody?.length || 0,
          hasBody: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : [],
          contentType: req.headers['content-type'],
        })
      }
    } else {
      console.log('📤 [Body] GET/HEAD request, no body')
    }

    console.log(`⏳ [Request] Sending ${req.method} to ${forwardUrl.toString()}`)
    const startTime = Date.now()

    // 发送请求（完全透明转发）
    const fetch = (await import('node-fetch')).default
    const upstream = await fetch(forwardUrl.toString(), fetchOptions)

    const requestTime = Date.now() - startTime
    console.log(
      `⚡ [Response] Status: ${upstream.status} ${upstream.statusText} (${requestTime}ms)`,
    )
    console.log('📋 [Response Headers]:')
    upstream.headers.forEach((value, key) => {
      console.log(`    ${key}: ${value}`)
    })

    // 设置响应状态码
    res.status(upstream.status)

    // 设置响应头（透明转发，模仿 Worker 行为）
    upstream.headers.forEach((value, key) => {
      // 跳过传输层和压缩相关的头部，避免解码问题
      if (
        ![
          'connection',
          'transfer-encoding',
          'content-length', // 让流式传输自动处理
          'content-encoding', // 🔧 修复：不转发压缩编码头，避免客户端解码失败
        ].includes(key.toLowerCase())
      ) {
        res.set(key, value)
      }
    })

    // 设置 CORS 头
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.set('Access-Control-Allow-Headers', '*')

    // 🔧 修复：使用流式传输替代 buffer()，完全模仿 Worker 行为
    console.log('🌊 [Stream] Starting stream transfer...')

    let transferredBytes = 0
    const streamStartTime = Date.now()

    // 监听数据传输
    upstream.body.on('data', (chunk) => {
      transferredBytes += chunk.length
      console.log(`📊 [Stream] Transferred: ${transferredBytes} bytes`)
    })

    upstream.body.on('end', () => {
      const streamTime = Date.now() - streamStartTime
      console.log(`✅ [Stream] Transfer completed: ${transferredBytes} bytes in ${streamTime}ms`)
    })

    // 处理流传输错误
    upstream.body.on('error', (streamError) => {
      console.error('❌ [Stream] Stream error:', streamError)
      console.error('❌ [Stream] Error details:', {
        message: streamError.message,
        code: streamError.code,
        stack: streamError.stack,
      })
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Stream error',
          message: streamError.message,
          code: streamError.code,
        })
      }
    })

    res.on('error', (resError) => {
      console.error('❌ [Response] Response error:', resError)
      console.error('❌ [Response] Error details:', {
        message: resError.message,
        code: resError.code,
      })
    })

    res.on('close', () => {
      console.log('🔌 [Response] Client connection closed')
    })

    res.on('finish', () => {
      const totalTime = Date.now() - startTime
      console.log(`🎉 [Success] Request completed successfully in ${totalTime}ms`)
    })

    upstream.body.pipe(res)
  } catch (error) {
    console.error('💥 [Fatal Error] Proxy error:', error)
    console.error('💥 [Fatal Error] Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack,
    })
    console.error('💥 [Fatal Error] Request details:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
    })

    res.status(500).json({
      error: 'Proxy internal error',
      message: error.message,
      code: error.code,
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
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health`)
  console.log(`🔗 Proxy usage: http://localhost:${PORT}/?target=<encoded_url>`)
})

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down proxy server...')
  server.close(() => {
    console.log('Server closed gracefully')
    process.exit(0)
  })
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down proxy server...')
  server.close(() => {
    console.log('Server closed gracefully')
    process.exit(0)
  })
})
