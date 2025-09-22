<template>
  <div
    ref="dropZone"
    class="image-drop-zone"
    :class="{
      'is-dragging': isDragging,
      'is-uploading': isUploading,
      'is-error': hasError,
      'is-hidden': !showDropZone,
    }"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 拖拽提示 -->
    <div v-if="!isUploading && !hasError && !showLinkInput" class="drop-hint">
      <div class="drop-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
          />
          <path d="M12,11L16,15H13.5V18H10.5V15H8L12,11Z" />
        </svg>
      </div>
      <div class="drop-text">
        <p class="drop-title">{{ isDragging ? t('dragHintActive') : t('dragHint') }}</p>
        <p class="drop-subtitle">{{ t('supportedFormats') }}</p>
      </div>
    </div>

    <!-- 链接输入界面 -->
    <div v-if="showLinkInput && !isUploading && !hasError" class="link-input-container">
      <h3 class="link-title">{{ t('insertBatchLinks') }}</h3>
      <div class="link-hint-top">
        <p class="link-hint">{{ t('linkHint') }}</p>
      </div>
      <textarea
        ref="linkInput"
        v-model="imageUrl"
        :placeholder="t('batchLinkPlaceholder')"
        class="link-input"
        rows="6"
        @keyup.ctrl.enter="insertImageLink"
      ></textarea>
      <button class="insert-button" @click="insertImageLink" :disabled="!imageUrl.trim()">
        {{ t('insertBatchLinks') }}
      </button>
    </div>
    <!-- 上传进度 -->
    <div v-if="isUploading" class="upload-progress">
      <div class="progress-icon">
        <svg class="spin" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
        </svg>
      </div>
      <div class="progress-info">
        <p class="progress-title">
          {{ isBatchProcessing ? t('batchProcessing') : t('uploadingImage') }}
        </p>
        <div class="progress-details" v-if="totalFiles > 1">
          <p class="file-progress">
            {{ currentFileIndex + 1 }} / {{ totalFiles }} - {{ currentFileName }}
          </p>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <div class="progress-bottom">
          <p class="progress-text">{{ progress }}%</p>
          <button v-if="canCancel" class="cancel-upload-btn" @click="cancelUpload">
            {{ t('cancel') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="hasError" class="upload-error">
      <div class="error-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
          />
        </svg>
      </div>
      <div class="error-info">
        <p class="error-title">{{ t('uploadFailed') }}</p>
        <p class="error-message">{{ errorMessage }}</p>
        <button class="retry-button" @click="clearError">{{ t('retry') }}</button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="!isUploading && !hasError" class="action-buttons">
      <button class="action-button upload-button" @click="openFileDialog">
        <svg viewBox="0 0 24 24" fill="currentColor" class="button-icon">
          <path d="M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z" />
        </svg>
        {{ t('selectFiles') }}
      </button>
      <button
        class="action-button link-button"
        @click="showLinkInput ? hideLinkInput() : showLinkInputForm()"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" class="button-icon">
          <path
            d="M10.59,13.41C11,13.8 11,14.4 10.59,14.81C10.2,15.2 9.6,15.2 9.19,14.81L7.77,13.39C7,12.61 7,11.39 7.77,10.61L9.19,9.19C10.2,8.2 11.8,8.2 12.8,9.19L14.22,10.61C14.61,11 14.61,11.6 14.22,12C13.83,12.39 13.23,12.39 12.84,12L11.42,10.58C11.23,10.39 10.94,10.39 10.75,10.58L9.33,12C9.14,12.2 9.14,12.49 9.33,12.68L10.59,13.41M13.41,9.17C13.8,8.78 14.4,8.78 14.81,9.17L16.23,10.59C17,11.37 17,12.63 16.23,13.41L14.81,14.83C13.8,15.8 12.2,15.8 11.2,14.83L9.78,13.41C9.39,13 9.39,12.4 9.78,12C10.17,11.61 10.77,11.61 11.16,12L12.58,13.42C12.77,13.61 13.06,13.61 13.25,13.42L14.67,12C14.86,11.8 14.86,11.51 14.67,11.32L13.41,9.17Z"
          />
        </svg>
        {{ showLinkInput ? t('backToUpload') : t('insertBatchLinks') }}
      </button>
      <button class="action-button main-cancel-button" @click="hideDropZone">
        <svg viewBox="0 0 24 24" fill="currentColor" class="button-icon">
          <path
            d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
          />
        </svg>
        {{ t('cancel') }}
      </button>
    </div>

    <!-- 文件输入元素 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      @change="handleFileSelect"
      class="file-input"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { uploadImage, generateImageBBCode, isImageFile } from '../utils/imageUploadProxy.js'
import { useTranslation } from '../utils/i18n.js'

// 国际化
const { t } = useTranslation()

// ===== Props & Emits =====
const props = defineProps({
  /**
   * 图床配置
   */
  imageHost: {
    type: String,
    default: 'freeimage',
  },

  /**
   * API密钥
   */
  apiKey: {
    type: String,
    default: '',
  },

  /**
   * 是否自动显示拖拽区域
   */
  autoShow: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'show', // 显示拖拽区域
  'hide', // 隐藏拖拽区域
  'upload-start', // 开始上传
  'upload-progress', // 上传进度
  'upload-success', // 上传成功
  'upload-error', // 上传失败
  'upload-canceled', // 上传取消
  'insert-image', // 请求插入图片
])

// ===== 响应式数据 =====
const dropZone = ref(null)
const fileInput = ref(null)
const linkInput = ref(null)
const isDragging = ref(false)
const isUploading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const progress = ref(0)
const showDropZone = ref(props.autoShow)
const dragCounter = ref(0) // 用于跟踪拖拽事件

// 批量上传状态
const currentFileIndex = ref(0)
const totalFiles = ref(0)
const currentFileName = ref('')
const uploadResults = ref([]) // 存储上传结果
const canCancel = ref(false)

// 链接输入相关
const showLinkInput = ref(false)
const imageUrl = ref('')
const errorSource = ref('') // 跟踪错误来源：'upload'或'link'
const isBatchProcessing = ref(false) // 批量链接处理状态

// ===== 拖拽处理 =====
function handleDragEnter(e) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter.value++

  if (!isDragging.value && hasImageFiles(e)) {
    isDragging.value = true
    showDropZone.value = true
  }
}

function handleDragOver(e) {
  e.preventDefault()
  e.stopPropagation()
}

function handleDragLeave(e) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter.value--

  if (dragCounter.value === 0) {
    isDragging.value = false
    if (!props.autoShow) {
      setTimeout(() => {
        if (!isDragging.value && !isUploading.value && !hasError.value) {
          showDropZone.value = false
        }
      }, 300)
    }
  }
}

function handleDrop(e) {
  e.preventDefault()
  e.stopPropagation()

  isDragging.value = false
  dragCounter.value = 0

  const files = Array.from(e.dataTransfer.files)
  const imageFiles = files.filter(isImageFile)

  if (imageFiles.length > 0) {
    uploadFiles(imageFiles)
  } else {
    if (files.length > 0) {
      showError(t('onlyImageFilesUpload'))
    }
  }
}

// ===== 文件选择处理 =====
function handleFileSelect(e) {
  const files = Array.from(e.target.files)
  const imageFiles = files.filter(isImageFile)

  if (imageFiles.length > 0) {
    uploadFiles(imageFiles)
  }

  // 清空input
  e.target.value = ''
}

function openFileDialog() {
  fileInput.value?.click()
}

// ===== 上传处理 =====
async function uploadFiles(files) {
  // 初始化批量上传状态
  isUploading.value = true
  hasError.value = false
  progress.value = 0
  currentFileIndex.value = 0
  totalFiles.value = files.length
  uploadResults.value = []
  canCancel.value = true
  showDropZone.value = true

  emit('upload-start', files)

  try {
    // 依次上传每个文件
    for (let i = 0; i < files.length; i++) {
      if (!canCancel.value) {
        // 上传被取消
        break
      }

      const file = files[i]
      currentFileIndex.value = i
      currentFileName.value = file.name

      try {
        const result = await uploadImage(file, props.imageHost, props.apiKey, (fileProgress) => {
          // 计算总进度：已完成文件的进度 + 当前文件的进度
          const completedProgress = (i / files.length) * 100
          const currentProgress = fileProgress / files.length
          progress.value = Math.round(completedProgress + currentProgress)
          emit('upload-progress', progress.value)
        })

        // 检查上传结果，如果上传失败则抛出错误
        if (!result.success) {
          throw new Error(result.error || t('uploadFailed'))
        }

        // 记录成功结果
        uploadResults.value.push({
          file: file,
          success: true,
          result: result,
          error: null,
        })

        // 生成BBCode并发射插入事件
        const bbcode = generateImageBBCode(result.url)
        emit('insert-image', bbcode, result)
        emit('upload-success', result)
      } catch (error) {
        console.error(`上传文件 ${file.name} 失败:`, error)

        // 记录失败结果
        uploadResults.value.push({
          file: file,
          success: false,
          result: null,
          error: error,
        })

        // 对于批量上传，不立即显示错误，而是继续上传其他文件
        if (files.length === 1) {
          showError(`${file.name}: ${error.message}`)
          emit('upload-error', error)
          // 不要直接return，让它继续到finally块
          break
        }
      }
    }

    // 检查上传结果
    const successCount = uploadResults.value.filter((r) => r.success).length
    const failCount = uploadResults.value.filter((r) => !r.success).length

    if (failCount > 0 && successCount === 0) {
      // 全部失败
      const firstError = uploadResults.value.find((r) => !r.success)?.error
      showError(
        `${t('uploadFailedWithError')}: ${firstError?.message || t('unknownErrorFallback')}`,
      )
      emit('upload-error', firstError)
    } else if (failCount > 0) {
      // 部分失败
      const failedFiles = uploadResults.value
        .filter((r) => !r.success)
        .map((r) => r.file.name)
        .join(', ')
      showError(`${t('partialUploadFailed')}: ${failedFiles}`)
    } else {
      // 全部成功，隐藏拖拽区域
      setTimeout(() => {
        if (!props.autoShow) {
          showDropZone.value = false
        }
        resetState()
      }, 1500)
    }
  } catch (error) {
    showError(error.message)
    emit('upload-error', error)
  } finally {
    canCancel.value = false
  }
}

// ===== 工具函数 =====
function hasImageFiles(e) {
  if (!e.dataTransfer) {
    return false
  }

  // 检查 dataTransfer.items (推荐方式)
  if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
    const hasImages = Array.from(e.dataTransfer.items).some((item) => {
      return item.kind === 'file' && item.type.startsWith('image/')
    })
    return hasImages
  }

  // 检查 dataTransfer.files (备用方式)
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const hasImages = Array.from(e.dataTransfer.files).some((file) => {
      return file.type.startsWith('image/')
    })
    return hasImages
  }

  // 检查 dataTransfer.types (最后的备用)
  if (e.dataTransfer.types && e.dataTransfer.types.length > 0) {
    const hasFileType = e.dataTransfer.types.includes('Files')
    return hasFileType
  }

  return false
}

function showError(message, source = 'upload') {
  hasError.value = true
  errorMessage.value = message
  errorSource.value = source
  isUploading.value = false
  progress.value = 0
}

function clearError() {
  hasError.value = false
  errorMessage.value = ''

  // 根据错误来源决定回到哪个界面
  if (errorSource.value === 'link') {
    // 如果错误来源是链接输入，返回链接输入界面
    showLinkInput.value = true
    errorSource.value = ''
    nextTick(() => {
      if (linkInput.value) {
        linkInput.value.focus()
      }
    })
  } else {
    // 如果错误来源是上传，且不是自动显示模式，则隐藏drop zone
    if (!props.autoShow) {
      showDropZone.value = false
    }
    errorSource.value = ''
  }
}

function cancelUpload() {
  canCancel.value = false
  isUploading.value = false
  resetState()
  emit('upload-canceled')
}

function resetState(clearErrorState = true) {
  isUploading.value = false
  isBatchProcessing.value = false
  if (clearErrorState) {
    hasError.value = false
    errorMessage.value = ''
  }
  progress.value = 0
  currentFileIndex.value = 0
  totalFiles.value = 0
  currentFileName.value = ''
  uploadResults.value = []
  canCancel.value = false
  isDragging.value = false
  dragCounter.value = 0
  showLinkInput.value = false
  imageUrl.value = ''
}

function hideDropZone() {
  showDropZone.value = false
  // 同时重置所有状态
  resetState()
}

// ===== 链接输入方法 =====
function showLinkInputForm() {
  showLinkInput.value = true
  showDropZone.value = true
  // 下次更新后聚焦输入框
  nextTick(() => {
    if (linkInput.value) {
      linkInput.value.focus()
    }
  })
}

function hideLinkInput() {
  showLinkInput.value = false
  imageUrl.value = ''
  // 不要自动隐藏整个drop zone，只隐藏链接输入界面
}

function insertImageLink() {
  const input = imageUrl.value.trim()

  if (!input) {
    showError(t('pleaseEnterValidImageLink'), 'link')
    return
  }

  // 分割输入为多行，过滤空行
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    showError(t('pleaseEnterValidImageLink'), 'link')
    return
  }

  // 单行处理 - 保持原有逻辑
  if (lines.length === 1) {
    const url = lines[0]

    // 基本的URL验证
    try {
      new URL(url)
    } catch {
      showError(t('invalidUrlFormat'), 'link')
      return
    }

    // 检查是否是图片文件扩展名
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i
    if (!imageExtensions.test(url)) {
      const confirmed = confirm(t('notImageFileConfirmation'))
      if (!confirmed) {
        return
      }
    }

    // 生成BBCode并发射插入事件
    const bbcode = generateImageBBCode(url)
    emit('insert-image', bbcode, { url, source: 'link' })

    // 清理状态并隐藏整个drop zone
    hideLinkInput()
    if (!props.autoShow) {
      showDropZone.value = false
    }
    return
  }

  // 批量处理
  processBatchLinks(lines)
}

async function processBatchLinks(urls) {
  // 显示批量处理状态
  isBatchProcessing.value = true
  isUploading.value = true
  hasError.value = false
  progress.value = 0
  totalFiles.value = urls.length
  currentFileIndex.value = 0

  const validUrls = []
  const invalidUrls = []

  // 验证所有URL
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    currentFileIndex.value = i
    progress.value = Math.round((i / urls.length) * 50) // 验证阶段占50%进度

    try {
      new URL(url)
      validUrls.push(url)
    } catch {
      invalidUrls.push(url)
    }
  }

  if (validUrls.length === 0) {
    isBatchProcessing.value = false
    showError(t('invalidUrlFormat'), 'link')
    return
  }

  // 如果有无效URL，询问用户是否继续
  if (invalidUrls.length > 0) {
    const message = t('batchLinkConfirm')
      .replace('{invalid}', invalidUrls.length)
      .replace('{valid}', validUrls.length)
    const confirmed = confirm(message)
    if (!confirmed) {
      isBatchProcessing.value = false
      isUploading.value = false
      progress.value = 0
      return
    }
  }

  // 插入所有有效的图片链接
  try {
    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i]
      currentFileIndex.value = i
      currentFileName.value = url.split('/').pop() || url
      progress.value = Math.round(50 + (i / validUrls.length) * 50) // 插入阶段占另外50%

      // 检查是否是图片文件扩展名
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i
      if (!imageExtensions.test(url)) {
        // 对于批量处理，自动跳过非图片链接而不是询问用户
        continue
      }

      // 生成BBCode并发射插入事件
      const bbcode = generateImageBBCode(url)
      emit('insert-image', bbcode, { url, source: 'batch-link' })

      // 添加小延迟避免过快插入
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    progress.value = 100

    // 批量处理完成，短暂显示成功状态后隐藏
    setTimeout(() => {
      isBatchProcessing.value = false
      isUploading.value = false
      hideLinkInput()
      if (!props.autoShow) {
        showDropZone.value = false
      }
      resetState()
    }, 1000)
  } catch (error) {
    isBatchProcessing.value = false
    showError(`${t('batchProcessFailed')}: ${error.message}`, 'link')
  }
}

// ===== 生命周期 =====
onMounted(() => {
  // 移除全局拖拽监听，改为通过工具栏按钮激活
})

onUnmounted(() => {
  // 清理资源
})

// ===== 暴露方法 =====
defineExpose({
  showDropZone: () => {
    showDropZone.value = true
  },
  hideDropZone: () => {
    showDropZone.value = false
  },
  resetState,
})
</script>

<style scoped>
.image-drop-zone {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(8px);
  border: 2px dashed var(--border-secondary, #d1d5db);
  border-radius: var(--radius-lg, 8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  transition: all 0.3s ease;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.95);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .image-drop-zone {
  background: rgba(17, 24, 39, 0.98);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.image-drop-zone:not(.is-hidden) {
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

.image-drop-zone.is-dragging {
  border-color: var(--brand-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.1);
}

.image-drop-zone.is-uploading {
  border-color: var(--brand-secondary, #10b981);
}

.image-drop-zone.is-error {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* 拖拽提示 */
.drop-hint {
  text-align: center;
  max-width: 400px;
  padding: var(--space-xl, 24px);
  background: rgba(255, 255, 255, 0.9);
  border-radius: var(--radius-lg, 8px);
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .drop-hint {
  background: rgba(31, 41, 55, 0.9);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.drop-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-lg, 16px);
  color: var(--text-secondary, #6b7280);
  transition: all 0.3s ease;
}

[data-theme='dark'] .drop-icon {
  color: #9ca3af;
}

.is-dragging .drop-icon {
  color: var(--brand-primary, #3b82f6);
  transform: scale(1.1);
}

.drop-icon svg {
  width: 100%;
  height: 100%;
}

.drop-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #111827);
  margin: 0 0 var(--space-sm, 8px);
}

[data-theme='dark'] .drop-title {
  color: #f9fafb;
}

.drop-subtitle {
  font-size: 14px;
  color: var(--text-secondary, #6b7280);
  margin: 0;
}

[data-theme='dark'] .drop-subtitle {
  color: #9ca3af;
}

/* 上传进度 */
.upload-progress {
  text-align: center;
  max-width: 400px;
  padding: var(--space-xl);
}

.progress-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--space-lg);
  color: var(--brand-secondary);
}

.progress-icon svg {
  width: 100%;
  height: 100%;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.progress-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-md);
}

.progress-details {
  margin-bottom: var(--space-md);
}

.file-progress {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  font-weight: 500;
  word-break: break-all;
}

[data-theme='dark'] .file-progress {
  color: #9ca3af;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--space-sm);
}

.progress-fill {
  height: 100%;
  background: var(--brand-secondary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
}

.progress-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.cancel-upload-btn {
  padding: var(--space-sm, 8px) var(--space-md, 12px);
  background: transparent;
  color: var(--text-danger, #ef4444);
  border: 1px solid var(--text-danger, #ef4444);
  border-radius: var(--radius-sm, 4px);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.cancel-upload-btn:hover {
  background: var(--text-danger, #ef4444);
  color: white;
}

[data-theme='dark'] .cancel-upload-btn {
  color: #fca5a5;
  border-color: #fca5a5;
}

[data-theme='dark'] .cancel-upload-btn:hover {
  background: #fca5a5;
  color: var(--bg-primary, #111827);
}

/* 错误信息 */
.upload-error {
  text-align: center;
  max-width: 400px;
  padding: var(--space-xl);
}

.error-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--space-lg);
  color: #ef4444;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

.error-title {
  font-size: 16px;
  font-weight: 600;
  color: #ef4444;
  margin: 0 0 var(--space-sm);
}

.error-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 var(--space-lg);
  word-break: break-word;
}

.retry-button {
  padding: var(--space-sm) var(--space-lg);
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: var(--brand-primary-hover);
  transform: translateY(-1px);
}

/* 文件选择 */
.file-input-container {
  margin-top: var(--space-lg, 16px);
}

/* 操作按钮 */
.action-buttons {
  position: absolute;
  bottom: var(--space-xl, 24px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--space-md, 12px);
  align-items: center;
}

.action-button {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 8px);
  padding: var(--space-md, 12px) var(--space-lg, 16px);
  background: var(--bg-primary, white);
  color: var(--brand-primary, #3b82f6);
  border: 1px solid var(--brand-primary, #3b82f6);
  border-radius: var(--radius-md, 6px);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-button:hover {
  background: var(--brand-primary, #3b82f6);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2);
}

.action-button:active {
  transform: translateY(0);
}

.upload-button {
  background: var(--brand-primary, #3b82f6);
  color: white;
}

.upload-button:hover {
  background: var(--brand-primary-dark, #2563eb);
}

.link-button {
  background: transparent;
}

.main-cancel-button {
  background: transparent;
  color: var(--text-secondary, #6b7280);
  border-color: var(--border-secondary, #d1d5db);
}

.main-cancel-button:hover {
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-primary, #111827);
  border-color: var(--border-primary, #9ca3af);
}

[data-theme='dark'] .main-cancel-button {
  color: var(--text-secondary, #9ca3af);
  border-color: var(--border-tertiary, #4b5563);
}

[data-theme='dark'] .main-cancel-button:hover {
  background: var(--bg-tertiary, #4b5563);
  color: #f9fafb;
  border-color: var(--border-secondary, #6b7280);
}

.button-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

[data-theme='dark'] .action-button {
  background: var(--bg-secondary, #374151);
  border-color: var(--brand-primary, #60a5fa);
  color: var(--brand-primary, #60a5fa);
}

[data-theme='dark'] .upload-button {
  background: var(--brand-primary, #60a5fa);
  color: var(--bg-primary, #111827);
}

.file-input {
  display: none;
}

/* 链接输入界面 */
.link-input-container {
  text-align: center;
  max-width: 500px;
  padding: var(--space-xl, 24px);
  background: rgba(255, 255, 255, 0.9);
  border-radius: var(--radius-lg, 8px);
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .link-input-container {
  background: rgba(31, 41, 55, 0.9);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.link-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-lg, 16px);
  color: var(--brand-primary, #3b82f6);
  transition: all 0.3s ease;
}

[data-theme='dark'] .link-icon {
  color: #60a5fa;
}

.link-icon svg {
  width: 100%;
  height: 100%;
}

.link-form {
  width: 100%;
}

.link-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #111827);
  margin: 0 0 var(--space-md, 12px);
}

[data-theme='dark'] .link-title {
  color: #f9fafb;
}

.link-hint-top {
  margin-bottom: var(--space-lg, 16px);
}

.link-hint {
  font-size: 14px;
  color: var(--text-secondary, #6b7280);
  margin: 0;
  text-align: center;
  line-height: 1.5;
}

[data-theme='dark'] .link-hint {
  color: #d1d5db;
}

.input-group {
  display: flex;
  gap: var(--space-sm, 8px);
  margin-bottom: var(--space-md, 12px);
  align-items: stretch;
}

.link-input {
  width: 100%;
  padding: var(--space-md, 12px) var(--space-lg, 16px);
  border: 1px solid var(--border-secondary, #d1d5db);
  border-radius: var(--radius-md, 6px);
  font-size: 14px;
  background: var(--bg-primary, white);
  color: var(--text-primary, #111827);
  transition: all 0.2s ease;
  margin-bottom: var(--space-lg, 16px);
  box-sizing: border-box;
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.5;
}

.link-input:focus {
  outline: none;
  border-color: var(--brand-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.link-input::placeholder {
  color: var(--text-tertiary, #9ca3af);
}

[data-theme='dark'] .link-input {
  background: var(--bg-secondary, #374151);
  border-color: var(--border-tertiary, #4b5563);
  color: #f9fafb;
}

[data-theme='dark'] .link-input:focus {
  border-color: var(--brand-primary, #60a5fa);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

.insert-button {
  padding: var(--space-md, 12px) var(--space-xl, 24px);
  background: var(--brand-primary, #3b82f6);
  color: white;
  border: none;
  border-radius: var(--radius-md, 6px);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.insert-button:hover:not(:disabled) {
  background: var(--brand-primary-dark, #2563eb);
  transform: translateY(-1px);
}

.insert-button:disabled {
  background: var(--bg-tertiary, #e5e7eb);
  color: var(--text-tertiary, #9ca3af);
  cursor: not-allowed;
  transform: none;
}

[data-theme='dark'] .insert-button {
  background: var(--brand-primary, #60a5fa);
  color: var(--bg-primary, #111827);
}

[data-theme='dark'] .insert-button:disabled {
  background: var(--bg-tertiary, #4b5563);
  color: var(--text-tertiary, #6b7280);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .drop-hint,
  .upload-progress,
  .upload-error,
  .link-input-container {
    padding: var(--space-lg);
    max-width: 300px;
  }

  .drop-icon,
  .progress-icon,
  .error-icon,
  .link-icon {
    width: 48px;
    height: 48px;
  }

  .drop-title,
  .progress-title,
  .error-title,
  .link-title {
    font-size: 16px;
  }

  .drop-subtitle,
  .progress-text,
  .error-message,
  .link-hint {
    font-size: 13px;
  }

  .action-buttons {
    flex-direction: column;
    gap: var(--space-sm, 8px);
    bottom: var(--space-lg, 16px);
  }

  .action-button {
    width: 100%;
    justify-content: center;
    padding: var(--space-md, 12px) var(--space-lg, 16px);
  }

  .input-group {
    flex-direction: column;
    gap: var(--space-md, 12px);
  }

  .link-input {
    padding: var(--space-md, 12px);
  }

  .insert-button {
    width: 100%;
    padding: var(--space-md, 12px);
  }

  .link-actions {
    flex-direction: column;
    gap: var(--space-sm, 8px);
    text-align: center;
  }
}
</style>
