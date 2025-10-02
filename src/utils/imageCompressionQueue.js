import imageCompression from 'browser-image-compression'

const MIN_FILE_SIZE_FOR_COMPRESSION = 50 * 1024 // 50KB
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const DEFAULT_QUALITY = 0.8
const COMPRESSION_PROGRESS_WEIGHT = 1 // map compression progress to 0-1 internally

class TaskQueue {
  constructor() {
    this.queue = []
    this.processing = false
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject })
      this.#processNext()
    })
  }

  clear() {
    this.queue.length = 0
  }

  async #processNext() {
    if (this.processing) return
    this.processing = true

    while (this.queue.length) {
      const { task, resolve, reject } = this.queue.shift()
      try {
        const result = await task()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }

    this.processing = false
  }
}

const queue = new TaskQueue()

function clampQuality(quality) {
  if (!Number.isFinite(quality)) {
    return DEFAULT_QUALITY
  }
  const normalized = Math.min(100, Math.max(10, quality)) / 100
  return Number.isFinite(normalized) ? normalized : DEFAULT_QUALITY
}

function shouldSkipCompression(file, settings = {}) {
  if (!settings.enableImageCompression) {
    return { skip: true, reason: 'disabled' }
  }

  if (!file || typeof file.size !== 'number') {
    return { skip: true, reason: 'invalid-file' }
  }

  if (file.size < MIN_FILE_SIZE_FOR_COMPRESSION) {
    return { skip: true, reason: 'file-too-small' }
  }

  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    return { skip: true, reason: 'unsupported-mime' }
  }

  if (file.type === 'image/webp' && !settings.enableConvertToWebp) {
    // 如果原始文件已经是 webp 且未开启转换，则跳过压缩
    return { skip: true, reason: 'already-webp' }
  }

  return { skip: false }
}

function resolveFileName(originalName, targetExtension) {
  if (!targetExtension) return originalName

  const lastDot = originalName.lastIndexOf('.')
  if (lastDot === -1) {
    return `${originalName}.${targetExtension}`
  }

  return `${originalName.slice(0, lastDot)}.${targetExtension}`
}

function buildCompressionOptions(file, settings = {}, hostConfig = {}, callbacks = {}) {
  const { onProgress } = callbacks
  const options = {
    useWebWorker: true,
    maxIteration: 10,
    initialQuality: clampQuality(settings.imageCompressionQuality),
    alwaysKeepResolution: true,
    onProgress: (percent) => {
      onProgress?.(Math.max(0, Math.min(100, percent)) * COMPRESSION_PROGRESS_WEIGHT)
    },
  }

  // 如果宿主限制上传最大尺寸，留出5%的安全余量
  if (hostConfig?.maxSize) {
    const maxSizeMB = hostConfig.maxSize / (1024 * 1024)
    if (Number.isFinite(maxSizeMB) && maxSizeMB > 0) {
      options.maxSizeMB = Math.max(0.2, maxSizeMB * 0.95)
    }
  }

  // PNG 通常通过转换为 JPEG/WebP 获得更好压缩效果
  const wantsWebp = Boolean(
    settings.enableConvertToWebp && hostConfig?.supportedFormats?.includes('webp'),
  )
  if (wantsWebp) {
    options.fileType = 'image/webp'
  } else if (file.type === 'image/png') {
    options.fileType = 'image/png'
  }

  return { options, wantsWebp }
}

async function compressFile(file, settings = {}, hostConfig = {}, callbacks = {}) {
  const skipCheck = shouldSkipCompression(file, settings)
  if (skipCheck.skip) {
    callbacks.onProgress?.(100)
    return {
      originalFile: file,
      processedFile: file,
      wasCompressed: false,
      skipped: true,
      reason: skipCheck.reason,
      ratio: 1,
    }
  }

  try {
    const { options, wantsWebp } = buildCompressionOptions(file, settings, hostConfig, callbacks)
    const blob = await imageCompression(file, options)

    const originalSize = file.size || 1
    const sizeRatio = blob ? blob.size / originalSize : 1
    const shouldKeepCompressed = wantsWebp || sizeRatio < 0.98

    // 如果压缩结果无效或没有带来收益（且没有强制转换格式），则保留原文件
    if (!blob || !shouldKeepCompressed) {
      return {
        originalFile: file,
        processedFile: file,
        wasCompressed: false,
        skipped: true,
        reason: !blob ? 'error' : 'ineffective',
        ratio: sizeRatio,
      }
    }

    const targetExtension = wantsWebp ? 'webp' : file.name.split('.').pop()
    const mimeType = blob.type || (wantsWebp ? 'image/webp' : file.type || 'image/jpeg')
    const nextFile = new File([blob], resolveFileName(file.name, targetExtension), {
      type: mimeType,
      lastModified: Date.now(),
    })

    return {
      originalFile: file,
      processedFile: nextFile,
      wasCompressed: true,
      skipped: false,
      reason: null,
      ratio: sizeRatio,
      convertedToWebp: wantsWebp,
    }
  } catch (error) {
    console.warn('[imageCompressionQueue] compress failed, fallback to original file:', error)
    return {
      originalFile: file,
      processedFile: file,
      wasCompressed: false,
      skipped: true,
      reason: 'error',
      error,
      ratio: 1,
    }
  }
}

export function enqueueImageCompression(file, { settings = {}, hostConfig = {}, onProgress } = {}) {
  return queue.enqueue(() => compressFile(file, settings, hostConfig, { onProgress }))
}

export function clearCompressionQueue() {
  queue.clear()
}

export function isCompressionSupported(file, settings = {}) {
  return !shouldSkipCompression(file, settings).skip
}

export function getCompressionProgressWeight() {
  return 15
}
