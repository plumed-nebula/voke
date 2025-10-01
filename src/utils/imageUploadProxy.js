/**
 * 代理上传图片工具模块 - 支持多个图床：FreeImage.host、SDA1.dev 和本地测试
 */

import { t } from './i18n.js'

// 代理配置 - 支持环境变量
const PROXY_CONFIG = {
  baseUrl: import.meta.env.VITE_PROXY_BASE_URL || 'https://proxy.pinni.xyz',
}

// 支持的图床配置
const IMAGE_HOSTS = {
  FREEIMAGE: {
    name: 'FreeImage.host',
    id: 'freeimage',
    uploadUrl: 'https://freeimage.host/api/1/upload',
    maxSize: 64 * 1024 * 1024, // 64MB
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    requiresApiKey: true,
  },
  SDA1: {
    name: 'SDA1.dev',
    id: 'sda1',
    uploadUrl: 'https://p.sda1.dev/api/v1/upload_external_noform',
    maxSize: 5 * 1024 * 1024, // 5MB (SDA1实际限制)
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'],
    requiresApiKey: false,
  },
  PIXHOST: {
    name: 'PiXhost.to',
    id: 'pixhost',
    uploadUrl: 'https://api.pixhost.to/images',
    maxSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif'],
    requiresApiKey: false,
  },
  CUSTOM: {
    name: () => t('customImageHost'),
    id: 'custom',
    maxSize: 50 * 1024 * 1024, // 50MB (自定义图床默认限制)
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    requiresApiKey: false,
  },
  LOCAL: {
    name: () => t('localTest'),
    id: 'local',
    maxSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    requiresApiKey: false,
  },
}

/**
 * 解析 JSON 路径（支持 $json:path$ 格式）
 * @param {Object} jsonData - JSON 数据对象
 * @param {string} path - 路径字符串，如 "data.url" 或 "result.image.link"
 * @returns {any} 解析后的值
 */
function parseJsonPath(jsonData, path) {
  if (!path) return null

  const keys = path.split('.')
  let value = jsonData

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      return null
    }
  }

  return value
}

/**
 * 解析响应模式（支持 $json:path$ 和 $text$ 格式）
 * @param {Response} response - Fetch 响应对象
 * @param {string} pattern - 解析模式，如 "$json:data.url$" 或 "$text$"
 * @returns {Promise<string>} 解析后的 URL
 */
async function parseResponsePattern(response, pattern) {
  if (!pattern) {
    throw new Error(t('responsePatternNotConfigured'))
  }

  // 匹配 $json:path$ 格式
  const jsonMatch = pattern.match(/^\$json:(.+)\$$/)
  if (jsonMatch) {
    const path = jsonMatch[1]
    const jsonData = await response.json()
    const url = parseJsonPath(jsonData, path)

    if (!url) {
      // 提供更详细的错误信息，帮助用户调试
      console.error('[自定义图床] 路径解析失败:', {
        配置的路径: path,
        实际返回的JSON: jsonData,
        提示: `请检查路径是否正确。如果 URL 在根级别，使用 $json:url$；如果在嵌套对象中，使用 $json:data.url$ 等格式`,
      })
      throw new Error(
        `${t('failedToParseResponse')}: ${t('pathNotFound')} "${path}"。` +
          `实际返回: ${JSON.stringify(jsonData).substring(0, 200)}...`,
      )
    }

    return String(url)
  }

  // 匹配 $text$ 格式
  if (pattern === '$text$') {
    return await response.text()
  }

  // 其他情况：直接返回 pattern 作为固定值
  return pattern
}

/**
 * 替换 URL 参数中的占位符
 * @param {string} value - 参数值
 * @param {string} filename - 文件名
 * @returns {string} 替换后的值
 */
function replaceUrlParamPlaceholders(value, filename) {
  if (!value) return value
  return value.replace(/\$filename\$/g, filename)
}

/**
 * 构建代理 URL
 * @param {string} targetUrl - 目标 URL
 * @returns {string} 代理 URL
 */
function buildProxyUrl(targetUrl) {
  return `${PROXY_CONFIG.baseUrl}/?target=${encodeURIComponent(targetUrl)}`
}

/**
 * 验证图片文件
 * @param {File} file - 图片文件
 * @param {Object} hostConfig - 图床配置
 * @returns {Object} 验证结果
 */
function validateImageFile(file, hostConfig) {
  const errors = []

  // 检查文件大小
  if (file.size > hostConfig.maxSize) {
    const maxSizeMB = Math.round(hostConfig.maxSize / (1024 * 1024))
    errors.push(t('fileSizeExceeded') + ` (${maxSizeMB}MB)`)
  }

  // 检查文件格式
  const fileExtension = file.name.split('.').pop().toLowerCase()
  if (!hostConfig.supportedFormats.includes(fileExtension)) {
    errors.push(
      t('unsupportedFormat') +
        ` (${t('supportedFormatsOnly')}: ${hostConfig.supportedFormats.join(', ')})`,
    )
  }

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    errors.push(t('pleaseSelectImage'))
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 创建本地预览 URL
 * @param {File} file - 图片文件
 * @returns {Promise<string>} Data URL
 */
function createLocalPreviewUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 上传到 FreeImage.host (通过代理)
 * @param {File} file - 图片文件
 * @param {string} apiKey - API 密钥
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} 上传结果
 */
async function uploadToFreeImageProxy(file, apiKey, onProgress) {
  // 如果没有提供API密钥，使用默认公共密钥
  const defaultApiKey = '6d207e02198a847aa98d0a2a901485a5'
  const effectiveApiKey = apiKey || defaultApiKey

  const hostConfig = IMAGE_HOSTS.FREEIMAGE
  const validation = validateImageFile(file, hostConfig)
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  try {
    onProgress?.(10)

    // 构建代理 URL
    const proxyUrl = buildProxyUrl(hostConfig.uploadUrl)

    // 准备表单数据 - FreeImage 支持直接上传文件
    const formData = new FormData()
    formData.append('key', effectiveApiKey)
    formData.append('action', 'upload')
    formData.append('source', file) // 直接上传文件，而不是 base64
    formData.append('format', 'json')

    onProgress?.(50)

    // 发送请求
    const response = await fetch(proxyUrl, {
      method: 'POST',
      body: formData,
      // 不设置 Content-Type，让浏览器自动设置 multipart boundary
    })

    onProgress?.(90)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`${t('uploadFailedHttp')}: HTTP ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    onProgress?.(100)

    if (data.status_code === 200 && data.image && data.image.url) {
      return {
        success: true,
        url: data.image.url,
        deleteUrl: data.image.delete_url || null,
        host: 'freeimage',
      }
    } else {
      throw new Error(`${t('freeimageUploadFailed')}: ${data.error?.message || t('unknownError')}`)
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      host: 'freeimage',
    }
  }
}

/**
 * 上传到 SDA1.dev (通过代理)
 * @param {File} file - 图片文件
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} 上传结果
 */
async function uploadToSDA1Proxy(file, onProgress) {
  const hostConfig = IMAGE_HOSTS.SDA1
  const validation = validateImageFile(file, hostConfig)
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  try {
    onProgress?.(10)

    // 构建代理 URL，带filename参数
    const targetUrl = `${hostConfig.uploadUrl}?filename=${encodeURIComponent(file.name)}`
    const proxyUrl = buildProxyUrl(targetUrl)

    onProgress?.(50)

    // 使用与测试脚本完全相同的方式处理文件
    // 1. 先转换为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    // 2. 再转换为Uint8Array (类似Buffer的行为)
    const uint8Array = new Uint8Array(arrayBuffer)

    // 发送与测试脚本完全相同的数据类型
    const response = await fetch(proxyUrl, {
      method: 'POST',
      body: uint8Array, // 发送Uint8Array，与Buffer行为一致
      headers: {
        'Content-Type': 'application/octet-stream',
        // 'User-Agent': 'Mozilla/5.0 (compatible; Voke-Editor/1.0)',
        'Content-Length': uint8Array.length.toString(), // 添加Content-Length
      },
    })

    onProgress?.(90)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`${t('uploadFailedHttp')}: HTTP ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    onProgress?.(100)

    // 检查响应格式 - SDA1返回 {success: true, data: {url: "...", delete_url: "..."}}
    if (data.success && data.data && data.data.url) {
      return {
        success: true,
        url: data.data.url,
        deleteUrl: data.data.delete_url || null,
        host: 'sda1',
      }
    } else {
      throw new Error(`${t('uploadFailed')}: ${data.message || data.error || t('unknownError')}`)
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      host: 'sda1',
    }
  }
}

/**
 * 上传到 PiXhost.to (通过代理)
 * @param {File} file - 图片文件
 * @param {Function} onProgress - 进度回调
 * @param {Object} options - 上传选项 (例如: {contentType: '0'})
 * @returns {Promise<Object>} 上传结果
 */
async function uploadToPixhostProxy(file, onProgress, options = {}) {
  const hostConfig = IMAGE_HOSTS.PIXHOST
  const validation = validateImageFile(file, hostConfig)
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  try {
    onProgress?.(10)

    // 构建代理 URL
    const proxyUrl = buildProxyUrl(hostConfig.uploadUrl)

    // 从 options 中获取 contentType，默认为 '0' (Safe Content)
    const contentType = options.contentType || '0'

    // 准备表单数据
    const formData = new FormData()
    formData.append('img', file)
    formData.append('content_type', contentType) // 0 for safe content, 1 for NSFW
    formData.append('max_th_size', '350') // thumbnail size (150-500)

    onProgress?.(50)

    // 发送请求
    const response = await fetch(proxyUrl, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
      // 不设置 Content-Type，让浏览器自动设置 multipart boundary
    })

    onProgress?.(90)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`${t('uploadFailedHttp')}: HTTP ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    onProgress?.(100)

    // 检查响应格式 - Pixhost返回 {name: "...", show_url: "...", th_url: "..."}
    // show_url 格式: https://pixhost.to/show/9100/646280537_1.png
    // 需要转换为真实图片链接: https://img1.pixhost.to/images/9100/646280537_1.png
    if (data.show_url) {
      // 从 show_url 提取路径信息并构建真实图片 URL
      // 示例: https://pixhost.to/show/9100/646280537_1.png
      // 提取: /show/9100/646280537_1.png -> 9100/646280537_1.png
      const showUrl = data.show_url
      const match = showUrl.match(/\/show\/(.+)$/)

      if (match && match[1]) {
        const imagePath = match[1] // 例如: 9100/646280537_1.png
        // 构建真实图片URL: https://img[X].pixhost.to/images/{path}
        // 根据 Pixhost 的分布式存储，img 后面的数字通常是 1-4
        // 我们使用 img1 作为默认，也可以根据路径哈希来选择
        const imageUrl = `https://img1.pixhost.to/images/${imagePath}`

        return {
          success: true,
          url: imageUrl, // 真实图片直链
          showUrl: showUrl, // 展示页面链接
          thumbnailUrl: data.th_url || null, // 缩略图链接
          host: 'pixhost',
        }
      } else {
        throw new Error(`${t('pixhostUploadFailed')}: ${t('invalidResponseFormat')}`)
      }
    } else {
      throw new Error(
        `${t('pixhostUploadFailed')}: ${data.error || data.message || t('unknownError')}`,
      )
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      host: 'pixhost',
    }
  }
}

/**
 * 本地测试上传 (生成 Base64 预览)
 * @param {File} file - 图片文件
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} 上传结果
 */
async function uploadToLocal(file, onProgress) {
  const hostConfig = IMAGE_HOSTS.LOCAL
  const validation = validateImageFile(file, hostConfig)
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  try {
    onProgress?.(20)

    // 创建本地预览 URL
    const dataUrl = await createLocalPreviewUrl(file)
    onProgress?.(100)

    return {
      success: true,
      url: dataUrl,
      deleteUrl: null,
      host: 'local',
      isLocal: true,
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      host: 'local',
    }
  }
}

/**
 * 上传到自定义图床
 * @param {File} file - 图片文件
 * @param {Function} onProgress - 进度回调
 * @param {Object} config - 自定义图床配置 {url, urlParams, responsePattern, useProxy}
 * @returns {Promise<Object>} 上传结果
 */
async function uploadToCustom(file, onProgress, config) {
  const hostConfig = IMAGE_HOSTS.CUSTOM
  const validation = validateImageFile(file, hostConfig)
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  // 验证配置
  if (!config || !config.url) {
    throw new Error(t('customHostUrlNotConfigured'))
  }

  if (!config.responsePattern) {
    throw new Error(t('responsePatternNotConfigured'))
  }

  try {
    onProgress?.(10)

    // 构建带参数的 URL
    let targetUrl = config.url
    if (config.urlParams && Array.isArray(config.urlParams) && config.urlParams.length > 0) {
      const params = new URLSearchParams()
      config.urlParams.forEach((param) => {
        if (param.key && param.value) {
          // 替换 $filename$ 占位符
          const value = replaceUrlParamPlaceholders(param.value, file.name)
          params.append(param.key, value)
        }
      })
      const paramString = params.toString()
      if (paramString) {
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + paramString
      }
    }

    onProgress?.(30)

    // 决定是否使用代理
    const uploadUrl = config.useProxy ? buildProxyUrl(targetUrl) : targetUrl

    onProgress?.(50)

    // 转换为二进制数据（支持 --data-binary 格式）
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // 根据文件类型自动判断 Content-Type
    let contentType = file.type || 'application/octet-stream'

    // 如果浏览器没有正确识别，根据文件扩展名补充
    if (contentType === 'application/octet-stream') {
      const extension = file.name.split('.').pop().toLowerCase()
      const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        bmp: 'image/bmp',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        ico: 'image/x-icon',
      }
      contentType = mimeTypes[extension] || contentType
    }

    // 发送二进制数据
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: uint8Array,
      headers: {
        'Content-Type': contentType,
        'Content-Length': uint8Array.length.toString(),
      },
    })

    onProgress?.(80)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[自定义图床] 上传失败:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      throw new Error(`${t('uploadFailedHttp')}: HTTP ${response.status} - ${errorText}`)
    }

    // 记录响应信息用于调试
    console.log('[自定义图床] 响应状态:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      contentType: response.headers.get('content-type'),
    })

    // 克隆响应以便多次读取
    const responseClone = response.clone()

    // 先尝试读取原始文本查看格式
    let rawText = ''
    try {
      rawText = await responseClone.text()
      console.log('[自定义图床] 原始响应内容:', rawText)

      // 尝试解析为 JSON 查看结构
      try {
        const jsonData = JSON.parse(rawText)
        console.log('[自定义图床] JSON 解析结果:', JSON.stringify(jsonData, null, 2))
      } catch {
        console.log('[自定义图床] 响应不是 JSON 格式，为纯文本')
      }
    } catch (readError) {
      console.warn('[自定义图床] 无法读取响应文本:', readError)
    }

    // 根据配置的模式解析响应
    console.log('[自定义图床] 使用解析模式:', config.responsePattern)
    const imageUrl = await parseResponsePattern(response, config.responsePattern)
    console.log('[自定义图床] 解析得到的图片URL:', imageUrl)

    onProgress?.(100)

    if (!imageUrl) {
      throw new Error(t('failedToParseImageUrl'))
    }

    return {
      success: true,
      url: imageUrl,
      deleteUrl: null,
      host: 'custom',
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      host: 'custom',
    }
  }
}

/**
 * 统一上传接口
 * @param {File} file - 图片文件
 * @param {string} host - 图床类型
 * @param {string} apiKey - API 密钥
 * @param {Function} onProgress - 进度回调
 * @param {Object} options - 额外选项 (例如: {contentType: '0'} for Pixhost, 或 {customConfig: {...}} for Custom)
 * @returns {Promise<Object>} 上传结果
 */
export async function uploadImage(file, host = 'freeimage', apiKey = '', onProgress, options = {}) {
  if (!file) {
    throw new Error(t('pleaseSelectImageFile'))
  }

  try {
    switch (host) {
      case 'freeimage':
        return await uploadToFreeImageProxy(file, apiKey, onProgress)
      case 'sda1':
        return await uploadToSDA1Proxy(file, onProgress)
      case 'pixhost':
        return await uploadToPixhostProxy(file, onProgress, options)
      case 'custom':
        return await uploadToCustom(file, onProgress, options.customConfig)
      case 'local':
        return await uploadToLocal(file, onProgress)
      default:
        throw new Error(`${t('unsupportedImageHost')}: ${host}`)
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      host,
    }
  }
}

/**
 * 生成 BBCode 格式的图片代码
 * @param {string} url - 图片 URL
 * @param {string} alt - 图片描述
 * @returns {string} BBCode 字符串
 */
export function generateImageBBCode(url, alt = '') {
  if (!url) return ''

  if (alt) {
    return `[img alt="${alt}"]${url}[/img]`
  } else {
    return `[img]${url}[/img]`
  }
}

/**
 * 检查文件是否为图片
 * @param {File} file - 文件对象
 * @returns {boolean} 是否为图片
 */
export function isImageFile(file) {
  if (!file) return false

  // 检查 MIME 类型
  if (file.type && file.type.startsWith('image/')) {
    return true
  }

  // 检查文件扩展名
  const extension = file.name.split('.').pop().toLowerCase()
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
  return imageExtensions.includes(extension)
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 获取支持的图床列表
 * @returns {Array} 图床列表
 */
export function getSupportedHosts() {
  return [
    {
      id: 'freeimage',
      name: 'FreeImage.host',
      requiresApiKey: true,
      description: t('viaProxy'),
    },
    {
      id: 'sda1',
      name: 'SDA1.dev',
      requiresApiKey: false,
      description: t('viaProxy'),
    },
    {
      id: 'pixhost',
      name: 'PiXhost.to',
      requiresApiKey: false,
      description: t('viaProxy'),
    },
    {
      id: 'custom',
      name: t('customImageHost'),
      requiresApiKey: false,
      description: t('customImageHostDescription'),
    },
    {
      id: 'local',
      name: t('localTest'),
      requiresApiKey: false,
      description: t('localTestNotUpload'),
    },
  ]
}

/**
 * 获取图床配置
 * @param {string} hostId - 图床 ID
 * @returns {Object|null} 图床配置
 */
export function getHostConfig(hostId) {
  const configs = {
    freeimage: IMAGE_HOSTS.FREEIMAGE,
    sda1: IMAGE_HOSTS.SDA1,
    pixhost: IMAGE_HOSTS.PIXHOST,
    custom: IMAGE_HOSTS.CUSTOM,
    local: IMAGE_HOSTS.LOCAL,
  }
  return configs[hostId] || null
}

// 默认导出
export default {
  uploadImage,
  generateImageBBCode,
  isImageFile,
  formatFileSize,
  getSupportedHosts,
  getHostConfig,
}
