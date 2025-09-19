/**
 * 文件操作工具模块
 * 提供保存到文件和从文件读取的功能
 */

import { t } from './i18n.js'

/**
 * 将内容保存为文件并下载
 * @param {string} content - 要保存的内容
 * @param {string} filename - 文件名（默认包含时间戳）
 * @param {string} mimeType - 文件MIME类型
 */
export function saveToFile(content, filename = null, mimeType = 'text/plain') {
  try {
    // 如果没有提供文件名，生成一个包含时间戳的默认文件名
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      filename = `bbcode-content-${timestamp}.txt`
    }

    // 创建Blob对象
    const blob = new Blob([content], { type: mimeType })

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename

    // 触发下载
    document.body.appendChild(link)
    link.click()

    // 清理
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    return { success: true, filename }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 从文件读取内容
 * @param {File} file - 文件对象
 * @returns {Promise<{success: boolean, content?: string, error?: string}>}
 */
export function readFromFile(file) {
  return new Promise((resolve) => {
    try {
      // 检查文件类型
      if (
        !file.type.includes('text') &&
        !file.name.endsWith('.txt') &&
        !file.name.endsWith('.bbcode')
      ) {
        resolve({ success: false, error: t('selectTextFile') })
        return
      }

      // 检查文件大小（限制为5MB）
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        resolve({ success: false, error: t('fileTooLarge') })
        return
      }

      const reader = new FileReader()

      reader.onload = (event) => {
        resolve({ success: true, content: event.target.result })
      }

      reader.onerror = () => {
        resolve({ success: false, error: t('fileReadFailed') })
      }

      reader.readAsText(file, 'UTF-8')
    } catch (error) {
      resolve({ success: false, error: error.message })
    }
  })
}

/**
 * 触发文件选择对话框
 * @param {string} accept - 接受的文件类型
 * @returns {Promise<FileList|null>}
 */
export function selectFile(accept = '.txt,.bbcode,text/*') {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = false

    input.onchange = (event) => {
      const files = event.target.files
      resolve(files && files.length > 0 ? files : null)
    }

    input.oncancel = () => {
      resolve(null)
    }

    // 触发文件选择对话框
    input.click()
  })
}

/**
 * 创建带进度显示的文件操作通知
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型：'success', 'error', 'info'
 * @param {number} duration - 显示时长（毫秒）
 */
export function showFileNotification(message, type = 'info', duration = 3000) {
  const notification = document.createElement('div')
  notification.textContent = message

  // 根据类型设置样式
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
  }

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
    max-width: 300px;
  `

  document.body.appendChild(notification)

  // 自动移除通知
  setTimeout(() => {
    notification.style.opacity = '0'
    notification.style.transform = 'translateY(-20px)'
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, duration)
}
