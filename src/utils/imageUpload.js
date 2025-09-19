/**
 * 图片上传基础工具模块
 * 仅提供基础工具函数，主要上传逻辑在 imageUploadProxy.js 中
 */

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
 * 将文件转换为 Base64
 * @param {File} file - 图片文件
 * @returns {Promise<string>} Base64 字符串
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // 返回完整的 Data URL
      resolve(reader.result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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

// 默认导出
export default {
  isImageFile,
  formatFileSize,
  fileToBase64,
  generateImageBBCode,
}
