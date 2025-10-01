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
  LOCAL: {
    name: () => t('localTest'),
    id: 'local',
    maxSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    requiresApiKey: false,
  },
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
    // 注意：show_url 是展示页面，th_url 才是图片直链
    if (data.th_url) {
      return {
        success: true,
        url: data.th_url, // 使用 th_url 作为图片直链
        showUrl: data.show_url || null, // 展示页面链接（可选）
        host: 'pixhost',
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
 * 统一上传接口
 * @param {File} file - 图片文件
 * @param {string} host - 图床类型
 * @param {string} apiKey - API 密钥
 * @param {Function} onProgress - 进度回调
 * @param {Object} options - 额外选项 (例如: {contentType: '0'} for Pixhost)
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
