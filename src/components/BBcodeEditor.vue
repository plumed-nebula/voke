<script setup>
import { sceditor, contentStyleUrl } from '@/lib/sceditor-shim'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ImageDropZone from './ImageDropZone.vue'
import {
  formatImageBBCode,
  getDefaultImageFormatOptions,
  mergeFormatOptions,
  convertToAlignParam,
  convertFromAlignParam,
  convertToListParam,
  convertFromListParam,
} from '@/utils/formatUtils'
import { useTranslation } from '@/utils/i18n'

// 国际化
const { t } = useTranslation()

/**
 * DOM引用
 */
const editor = ref(null)
const editorInstance = ref(null)
const dropZone = ref(null)

/**
 * 组件属性定义
 */
const props = defineProps({
  value: { type: String, default: '' },
  options: {
    type: Object,
    default: () => ({ format: 'bbcode' }),
  },
  /** 编辑区高度（数字表示px，字符串支持vh/rem等单位） */
  height: { type: [Number, String], default: '60vh' },
  /** 自定义工具栏按钮集合，未提供则使用默认配置 */
  toolbar: { type: Array, default: null },
  /** 图床设置 */
  imageHost: { type: String, default: 'freeimage' },
  imageApiKey: { type: String, default: '' },
  pixhostContentType: { type: String, default: '0' },
  customImageHostConfig: {
    type: Object,
    default: () => ({ url: '', urlParams: [], responsePattern: '', useProxy: true }),
  },
  useDirectImageLink: { type: Boolean, default: true },
  autoNewlineAfterImage: { type: Boolean, default: false },
  imageAlignment: { type: String, default: 'none' },
  useAlignParamOnCopy: { type: Boolean, default: false },
  /** 导出到剪贴板时自动格式化列表 */
  autoFormatListOnCopy: { type: Boolean, default: false },
})

/**
 * 组件事件定义
 */
const emit = defineEmits([
  'update:value',
  'ready',
  'error',
  'image-inserted',
  'upload-start',
  'upload-progress',
  'upload-success',
  'upload-error',
])

/**
 * 内部状态变量
 */
let destroyed = false // 组件是否已销毁
let isInitializing = true // 是否正在初始化
let lastValidContent = '' // 最后一次有效的内容，用于防止内容意外丢失
let lastContentUpdateTime = 0 // 最后一次内容更新的时间戳

/**
 * 安全地获取编辑器内容，防止在图片加载期间获取到不完整的内容
 * @returns {string} 编辑器内容
 */
function getSafeEditorContent() {
  if (!editorInstance.value) return lastValidContent || ''

  const currentContent = editorInstance.value.val()

  // 如果内容为空或明显比上次有效内容短很多，可能是图片加载导致的临时问题
  if (!currentContent || currentContent.trim() === '') {
    // 如果有上次的有效内容且当前为空，可能是临时问题，返回上次的内容
    if (lastValidContent && lastValidContent.trim() !== '') {
      // 检查是否有图片正在加载，如果没有图片加载，用户可能是故意清空内容
      const iframe = editor.value?.parentNode?.querySelector('iframe')
      const hasLoadingImages =
        iframe && iframe.contentDocument
          ? Array.from(iframe.contentDocument.querySelectorAll('img')).some((img) => !img.complete)
          : false

      // 只有在有图片正在加载时才认为是意外清空
      if (hasLoadingImages) {
        console.warn(t('editorContentUnexpectedlyEmpty'))
        return lastValidContent
      }

      // 如果没有图片加载，检查是否是在初始化期间，初始化期间也保护内容
      if (isInitializing) {
        console.warn(t('editorInitContentCleared'))
        return lastValidContent
      }
    }
    // 添加额外的保护：如果当前内容为空但有有效的lastValidContent，
    // 且距离上次内容更新时间很短，可能是SCEditor内部状态问题
    const now = Date.now()
    const timeSinceLastUpdate = lastContentUpdateTime ? now - lastContentUpdateTime : 0

    if (
      currentContent === '' &&
      lastValidContent &&
      lastValidContent.trim() !== '' &&
      timeSinceLastUpdate < 10000
    ) {
      console.warn(t('detectedSceditorStateIssue'))
      return lastValidContent
    }

    // 用户可能是故意清空内容
    lastValidContent = '' // 只在确认用户意图清空时才清除
    return currentContent
  }

  // 检查是否有图片正在加载
  const iframe = editor.value?.parentNode?.querySelector('iframe')
  if (iframe && iframe.contentDocument) {
    const images = iframe.contentDocument.querySelectorAll('img')
    const hasLoadingImages = Array.from(images).some((img) => !img.complete)

    // 如果有图片正在加载且内容明显比上次短很多，可能获取到了不完整的内容
    if (
      hasLoadingImages &&
      lastValidContent &&
      currentContent.length < lastValidContent.length * 0.8
    ) {
      console.warn(t('imageLoadingIncompleteContent'))
      return lastValidContent
    }
  }

  // 更新最后有效内容
  if (currentContent && currentContent.trim() !== '') {
    lastValidContent = currentContent
    lastContentUpdateTime = Date.now()
  }

  return currentContent
}

/**
 * 默认工具栏配置
 * @returns {Array} 工具栏按钮组数组
 */
function defaultToolbar() {
  return [
    ['bold', 'italic', 'underline', 'strike'],
    ['left', 'center', 'right', 'justify'],
    ['font', 'size', 'color', 'removeformat'],
    ['bulletlist', 'orderedlist'],
    ['quote', 'code'],
    ['image', 'link', 'unlink'],
    ['source'],
    ['formatAlignment', 'export'],
    ['maximize'],
  ]
}

/**
 * 过滤和清理工具栏配置
 * @param {Array} tb 工具栏配置
 * @returns {Array} 清理后的工具栏配置
 */
function sanitizeToolbar(tb) {
  const blocked = new Set(['youtube', 'emoticon', 'print'])
  const src = Array.isArray(tb) ? tb : defaultToolbar()
  return src
    .map((grp) => grp.filter((btn) => btn && !blocked.has(btn.toLowerCase())))
    .filter((grp) => grp.length)
}

/**
 * 构建编辑器选项
 * @returns {Object} 编辑器配置对象
 */
function buildOptions() {
  // 根据当前语言设置locale，统一处理语言格式
  const currentLang = localStorage.getItem('language') || 'zh'
  // 将 'zh-cn' 映射为 'zh'，保持与编辑器内容和界面的一致性
  const normalizedLang = currentLang === 'zh-cn' ? 'zh' : currentLang === 'en' ? 'en' : 'zh'
  const locale = normalizedLang === 'zh' ? 'zh-cn' : 'en'

  const base = {
    format: 'bbcode',
    style: contentStyleUrl,
    locale: locale,
    // 添加字体列表配置 - 中文字体在前，英文字体在后
    fonts:
      '微软雅黑,黑体,宋体,新宋体,Arial,Arial Black,Comic Sans MS,Courier New,Georgia,Impact,Sans-serif,Serif,Times New Roman,Trebuchet MS,Verdana',
  }

  // 合并用户选项，但确保style使用我们的自定义样式
  const userOptions = { ...(props.options || {}) }
  delete userOptions.style
  const merged = { ...base, ...userOptions }

  // 构建工具栏字符串
  const toolbarGroups = sanitizeToolbar(props.toolbar)
  const toolbarStr = toolbarGroups.map((g) => g.join(',')).join('|')
  if (toolbarStr.trim()) merged.toolbar = toolbarStr

  return merged
} // 辅助函数：显示复制成功通知
/**
 * 显示复制成功通知
 * @param {String} message 通知消息
 */
function showCopyNotification(message) {
  const notification = document.createElement('div')
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
  `

  document.body.appendChild(notification)

  // 3秒后自动移除通知
  setTimeout(() => {
    notification.style.opacity = '0'
    notification.style.transform = 'translateY(-20px)'
    setTimeout(() => {
      document.body.removeChild(notification)
    }, 300)
  }, 3000)
}

/**
 * 复制内容到剪贴板的统一处理函数
 * @param {String} content 要复制的内容
 */
function copyContentToClipboard(content) {
  // 如果启用了格式转换，将对齐标签转换为align参数格式
  let processedContent = content
  if (props.useAlignParamOnCopy) {
    processedContent = convertToAlignParam(processedContent)
  }

  // 如果启用了自动格式化列表，将列表标签转换为list参数格式
  if (props.autoFormatListOnCopy) {
    processedContent = convertToListParam(processedContent)
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(processedContent)
      .then(() => {
        showCopyNotification(t('contentCopiedToClipboard'))
      })
      .catch(() => {
        fallbackCopyText(processedContent)
      })
  } else {
    fallbackCopyText(processedContent)
  }
}

function trimTrailingNewlines(content) {
  if (typeof content !== 'string') return content
  return content.replace(/(?:\r?\n)+$/u, '')
}

/**
 * 回退复制方法（用于不支持现代Clipboard API的浏览器）
 * @param {String} text 要复制的文本
 */
function fallbackCopyText(text) {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)

  try {
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    if (successful) {
      showCopyNotification(t('contentCopiedToClipboard'))
    } else {
      showCopyNotification(t('copyFailed'))
    }
  } catch {
    showCopyNotification(t('copyFailed'))
  } finally {
    document.body.removeChild(textArea)
  }
}

// ===== 图片上传处理 =====

/**
 * 在光标位置批量插入图片BBCode
 * @param {Array} items - 包含bbcode和相关信息的数组
 */
function insertImagesAtCursor(items) {
  if (!editorInstance.value) return

  const list = Array.isArray(items) ? items : [items]
  const validItems = list
    .map((item) => {
      if (!item) return null
      if (typeof item === 'string') {
        return { bbcode: item }
      }
      if (typeof item.bbcode === 'string' && item.bbcode.trim() !== '') {
        return item
      }
      return null
    })
    .filter(Boolean)

  if (!validItems.length) return

  try {
    const formatOptions = mergeFormatOptions(getDefaultImageFormatOptions(), {
      autoNewline: props.autoNewlineAfterImage,
      alignment: props.imageAlignment,
    })

    const formattedParts = []
    const insertedItems = []

    validItems.forEach((item) => {
      const formattedBBCode = formatImageBBCode(item.bbcode, formatOptions)
      if (!formattedBBCode || formattedBBCode.trim() === '') {
        return
      }
      formattedParts.push(formattedBBCode)
      insertedItems.push({
        formattedBBCode,
        uploadResult: item.uploadResult,
        source: item.source,
      })
    })

    if (!formattedParts.length) return

    editorInstance.value.insert(formattedParts.join(''))

    let newContent = getSafeEditorContent()
    const trimmedContent = trimTrailingNewlines(newContent)
    if (trimmedContent !== newContent) {
      newContent = trimmedContent
    }

    if (newContent && newContent.trim() !== '') {
      lastValidContent = newContent
      lastContentUpdateTime = Date.now()
    }

    emit('update:value', newContent)

    const rangeHelper = editorInstance.value.getRangeHelper?.()
    const position = rangeHelper?.selectedRange ? rangeHelper.selectedRange() : null

    insertedItems.forEach((item) => {
      emit('image-inserted', {
        bbcode: item.formattedBBCode,
        uploadResult: item.uploadResult,
        source: item.source,
        position,
      })
    })
  } catch (error) {
    console.error(t('insertImageFailed'), error)
    showCopyNotification(t('imageInsertFailedManual'))
  }
}

/**
 * 处理上传开始事件
 * @param {Array} files - 上传的文件列表
 */
function handleUploadStart(files) {
  emit('upload-start', files)
}

/**
 * 处理上传进度事件
 * @param {number} progress - 进度百分比 (0-100)
 */
function handleUploadProgress(progress) {
  emit('upload-progress', progress)
}

/**
 * 处理上传成功事件
 * @param {Object} result - 上传结果
 */
function handleUploadSuccess(result) {
  emit('upload-success', result)
}

/**
 * 处理上传错误事件
 * @param {Error} error - 错误对象
 */
function handleUploadError(error) {
  console.error(t('imageUploadFailed'), error)
  emit('upload-error', error)
}

/**
 * 格式化对齐标签 - 将通用格式转换为可识别格式
 */
function formatAlignmentTags() {
  if (!editorInstance.value) return

  try {
    const currentContent = getSafeEditorContent()
    const formattedContent = convertFromAlignParam(currentContent)
    editorInstance.value.val(formattedContent)

    // 触发内容更新
    emit('update:value', formattedContent)

    // 显示通知
    showCopyNotification(t('alignTagsFormatCompleted'))
  } catch (error) {
    console.error(t('formatAlignmentTagsFailed'), error)
    showCopyNotification(t('formatFailed'))
  }
}

/**
 * 格式化列表标签 - 将通用格式转换为可识别格式
 */
function formatListTags() {
  if (!editorInstance.value) return

  try {
    const currentContent = getSafeEditorContent()
    const formattedContent = convertFromListParam(currentContent)
    editorInstance.value.val(formattedContent)

    // 触发内容更新
    emit('update:value', formattedContent)

    // 显示通知
    showCopyNotification(t('listTagsFormatCompleted'))
  } catch (error) {
    console.error(t('formatListTagsFailed'), error)
    showCopyNotification(t('formatFailed'))
  }
}

/**
 * 显示自定义图片上传界面
 */
function showCustomImageUpload() {
  if (dropZone.value) {
    dropZone.value.showDropZone()
  }
}

/**
 * 初始化编辑器实例并配置自定义命令
 */
function initializeEditor() {
  if (!editor.value || destroyed) return
  if (!window.sceditor) {
    emit('error', new Error('SCEditor global not found'))
    return
  }

  // 防重复初始化
  if (editorInstance.value) return

  // 注册自定义导出命令，支持源码和WYSIWYG两种模式
  if (window.sceditor && window.sceditor.command) {
    window.sceditor.command.set('export', {
      tooltip: t('exportToClipboard'),
      // 源码模式执行函数
      txtExec: function () {
        const content = this.val()
        copyContentToClipboard(content)
      },
      // WYSIWYG模式执行函数
      exec: function () {
        const content = this.val()
        copyContentToClipboard(content)
      },
    })

    // 覆盖默认的image命令，使用自定义图片上传功能
    window.sceditor.command.set('image', {
      tooltip: t('insertImageWithDragSupport'),
      // 源码模式执行函数
      txtExec: function () {
        showCustomImageUpload()
      },
      // WYSIWYG模式执行函数
      exec: function () {
        showCustomImageUpload()
      },
    })

    // 合并格式化命令：对齐+列表
    window.sceditor.command.set('formatAlignment', {
      tooltip: t('formatTags'),
      // 源码模式执行函数
      txtExec: function () {
        formatAlignmentTags()
        formatListTags()
      },
      // WYSIWYG模式执行函数
      exec: function () {
        formatAlignmentTags()
        formatListTags()
      },
    })

    // 为导出按钮设置图标（使用复制图标）
    if (window.sceditor.icons && window.sceditor.icons.material) {
      window.sceditor.icons.material.export =
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>'

      // 为自定义图片上传按钮设置图标
      window.sceditor.icons.material.image =
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M12,11L16,15H13.5V18H10.5V15H8L12,11Z"/></svg>'

      // 为格式化标签按钮设置图标（复用对齐图标）
      window.sceditor.icons.material.formatAlignment =
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3,3H21V5H3V3M3,7H15V9H3V7M3,11H21V13H3V11M3,15H15V17H3V15M3,19H21V21H3V19Z"/></svg>'
    }
  }

  /**
   * 添加中文语言包支持
   */
  if (window.sceditor && window.sceditor.locale) {
    window.sceditor.locale['zh-cn'] = {
      Bold: '粗体',
      Italic: '斜体',
      Underline: '下划线',
      Strikethrough: '删除线',
      Subscript: '下标',
      Superscript: '上标',
      'Align left': '左对齐',
      Center: '居中',
      'Align right': '右对齐',
      Justify: '两端对齐',
      'Font Name': '字体',
      'Font Size': '字号',
      'Font Color': '字体颜色',
      'Remove Formatting': '清除格式',
      Cut: '剪切',
      Copy: '复制',
      'Paste Text': '粘贴文本',
      'Bullet list': '无序列表',
      'Numbered list': '有序列表',
      'Insert a Quote': '插入引用',
      'Insert a horizontal rule': '插入水平线',
      'Insert an image': '插入图片',
      'Insert a link': '插入链接',
      'Insert an email': '插入邮箱',
      'Insert current date': '插入当前日期',
      'Insert current time': '插入当前时间',
      'Insert a table': '插入表格',
      Unlink: '移除链接',
      'View source': '查看源码',
      Maximize: '全屏',
      Minimize: '退出全屏',
      'Left-to-Right': '从左到右',
      'Right-to-Left': '从右到左',
      Undo: '撤销',
      Redo: '重做',
      Code: '代码',
      Quote: '引用',
      Print: '打印',
      More: '更多',
      Close: '关闭',
      Cancel: '取消',
      Insert: '插入',
      Update: '更新',
      'URL:': '链接：',
      'Description:': '描述：',
      'Description (optional):': '描述（可选）：',
      'E-mail:': '邮箱：',
      'Width (optional):': '宽度（可选）：',
      'Height (optional):': '高度（可选）：',
      'Rows:': '行数：',
      'Cols:': '列数：',
      'Alt:': '替代文本：',
      'Title:': '标题：',
      dateFormat: 'year-month-day',
      timeFormat: 'hours:minutes:seconds',
    }
  }

  const opts = buildOptions()

  // 设置编辑器尺寸 - 锁定高度
  const height = typeof props.height === 'number' ? `${props.height}px` : props.height
  editor.value.style.height = height
  editor.value.style.minHeight = height
  editor.value.style.maxHeight = height
  editor.value.style.width = '100%'
  editor.value.style.boxSizing = 'border-box'
  editor.value.style.resize = 'none'

  sceditor.create(editor.value, opts)
  editorInstance.value = sceditor.instance(editor.value)

  if (!editorInstance.value) {
    emit('error', new Error('Failed to obtain SCEditor instance'))
    return
  }

  // 隐藏原始的 textarea，SCEditor 会创建自己的编辑界面
  if (editor.value) {
    editor.value.style.display = 'none'
  }

  // 设置初始值，在编辑器实例创建后
  if (props.value && props.value.trim() !== '') {
    try {
      editorInstance.value.val(props.value)
      lastValidContent = props.value // 记录有效内容
    } catch (e) {
      emit('error', new Error('Failed to set initial value: ' + e.message))
    }
  }

  /**
   * 绑定编辑器事件监听器
   */
  editorInstance.value.bind('valuechanged', () => {
    if (!editorInstance.value) return
    const content = getSafeEditorContent()
    // 只有在非初始化期间才发送更新事件，避免初始值设置时的循环
    if (!isInitializing) {
      emit('update:value', content)
    }
    // 在内容变化时也检查并更新样式
    setTimeout(() => setupIframeStyles(), 10)
  })

  // 监听粘贴事件，确保粘贴操作也能触发自动保存
  editorInstance.value.bind('pasteraw', () => {
    setTimeout(() => {
      if (!isInitializing) {
        const content = getSafeEditorContent()
        emit('update:value', content)
      }
    }, 50)
  })

  // 监听键盘事件，确保所有编辑操作都能触发保存
  editorInstance.value.bind('keyup', () => {
    if (!isInitializing) {
      const content = getSafeEditorContent()
      emit('update:value', content)
    }
  })

  // 监听格式化命令完成事件，确保字体、颜色等格式化操作触发自动保存
  editorInstance.value.bind('aftercommand', () => {
    setTimeout(() => {
      if (!isInitializing) {
        const content = getSafeEditorContent()
        emit('update:value', content)
      }
    }, 100)
  })

  // 监听源码模式切换
  editorInstance.value.bind('selectionchanged', () => {
    if (!editorInstance.value) return
    updateSourceModeClass()
  })

  editorInstance.value.bind('nodechanged', () => {
    if (!editorInstance.value) return
    updateSourceModeClass()
  })

  // 监听工具栏按钮点击（特别是源码按钮和全屏按钮）
  setTimeout(() => {
    const sourceButton = editor.value?.parentNode?.querySelector('.sceditor-button-source')
    if (sourceButton) {
      sourceButton.addEventListener('click', () => {
        setTimeout(() => updateSourceModeClass(), 50)
      })
    }

    const maximizeButton = editor.value?.parentNode?.querySelector('.sceditor-button-maximize')
    if (maximizeButton) {
      maximizeButton.addEventListener('click', () => {
        setTimeout(() => {
          const container = editor.value?.parentNode
          if (container?.classList.contains('sceditor-maximize')) {
            document.body.classList.add('sceditor-maximize')
            document.documentElement.classList.add('sceditor-maximize')
          } else {
            document.body.classList.remove('sceditor-maximize')
            document.documentElement.classList.remove('sceditor-maximize')
          }
        }, 100)
      })
    }

    // 添加所有工具栏按钮的点击监听，确保格式化操作触发自动保存
    const toolbarButtons = editor.value?.parentNode?.querySelectorAll('.sceditor-button')
    if (toolbarButtons) {
      toolbarButtons.forEach((button) => {
        button.addEventListener('click', () => {
          // 延迟检查内容变化，确保操作完成后再触发保存
          setTimeout(() => {
            if (!isInitializing && editorInstance.value) {
              const content = getSafeEditorContent()
              emit('update:value', content)
            }
          }, 100)
        })
      })
    }

    // 设置下拉框位置监控
    setupDropdownPositioning()
  }, 500)

  // 设置编辑器 iframe 内容样式 - 添加重试机制
  const setupIframeWithRetry = () => {
    let attempts = 0
    const maxAttempts = 20 // 增加最大尝试次数

    const trySetup = () => {
      attempts++
      const success = setupIframeStyles()

      if (!success && attempts < maxAttempts) {
        setTimeout(trySetup, 100)
      } else if (success) {
        // 成功后，监听 iframe 的 load 事件
        const iframe = editor.value?.parentNode?.querySelector('iframe')
        if (iframe) {
          iframe.addEventListener('load', () => {
            setTimeout(() => {
              setupIframeStyles()
              // 在iframe加载完成后检查内容，但不强制重设
              if (props.value && props.value.trim() !== '') {
                const currentContent = editorInstance.value.val()
                // 只有当前内容为空且有传入值时才设置
                if (!currentContent || currentContent.trim() === '') {
                  editorInstance.value.val(props.value)
                  lastValidContent = props.value // 更新有效内容记录
                  // 再次应用样式确保正确显示
                  setTimeout(() => setupIframeStyles(), 50)
                }
              }
            }, 100)
          })
        }
      }
    }

    setTimeout(trySetup, 100)
  }

  setupIframeWithRetry()

  emit('ready', editorInstance.value)

  // 设置初始值的保守策略 - 减少多次设置
  const setInitialValueSafely = () => {
    if (props.value && props.value.trim() !== '' && editorInstance.value) {
      const currentContent = editorInstance.value.val()
      // 只有内容真正为空时才设置
      if (!currentContent || currentContent.trim() === '') {
        try {
          editorInstance.value.val(props.value)
          lastValidContent = props.value
          return true
        } catch (e) {
          emit('error', new Error('Failed to set initial value: ' + e.message))
          return false
        }
      }
    }
    return false
  }

  // 减少多次尝试设置初始值，避免覆盖用户编辑
  setTimeout(() => setInitialValueSafely(), 200)
  setTimeout(() => setInitialValueSafely(), 500)

  // 确保样式在编辑器完全初始化后应用，并完成初始化流程
  setTimeout(() => {
    setupIframeStyles()
    // 最终检查初始值设置
    if (props.value && props.value.trim() !== '') {
      const currentContent = editorInstance.value.val()
      if (!currentContent || currentContent.trim() === '') {
        editorInstance.value.val(props.value)
        lastValidContent = props.value
      }
      // 确保样式应用到设置的内容
      setTimeout(() => {
        setupIframeStyles()
        // 标记初始化完成
        isInitializing = false
      }, 100)
    } else {
      // 即使没有初始值也要标记初始化完成
      isInitializing = false
    }
  }, 1000)
}

/**
 * 设置下拉框位置监控 - 动态计算位置
 */
function setupDropdownPositioning() {
  if (!editor.value) return

  const container = editor.value.parentNode
  if (!container) return

  // 计算下拉框相对于按钮的正确位置
  const calculateDropdownPosition = (dropdown, button) => {
    if (!dropdown || !button || !dropdown.style) return

    try {
      // 获取按钮相对于工具栏容器的位置
      const toolbar = container.querySelector('.sceditor-toolbar')
      if (!toolbar) return

      const buttonRect = button.getBoundingClientRect()
      const toolbarRect = toolbar.getBoundingClientRect()

      // 计算相对位置
      const left = buttonRect.left - toolbarRect.left
      const top = buttonRect.bottom - toolbarRect.top + 2 // 按钮高度 + 2px间距

      // 清除所有定位相关的内联样式
      const positionProps = [
        'top',
        'left',
        'bottom',
        'right',
        'margin',
        'margin-top',
        'margin-left',
        'margin-right',
        'margin-bottom',
      ]
      positionProps.forEach((prop) => {
        dropdown.style.removeProperty(prop)
      })

      // 设置计算出的位置
      dropdown.style.position = 'absolute'
      dropdown.style.top = `${top}px`
      dropdown.style.left = `${left}px`
      dropdown.style.margin = '0'
      dropdown.style.zIndex = '2000'

      // 位置设置完成后，通过添加CSS类来显示下拉框
      dropdown.classList.add('positioned')
    } catch {
      // 即使出错也要显示下拉框，避免永久隐藏
      dropdown.classList.add('positioned')
    }
  }

  // 找到触发下拉框的按钮
  const findTriggerButton = (dropdown) => {
    // 查找最近点击的按钮或活动按钮
    const activeButton = container.querySelector('.sceditor-button.active')
    if (activeButton) return activeButton

    // 如果没有活动按钮，根据下拉框类型推断
    if (dropdown.classList.contains('sceditor-font-picker')) {
      return container.querySelector(
        '.sceditor-button[title*="字体"], .sceditor-button[title*="Font"]',
      )
    }
    if (dropdown.classList.contains('sceditor-size-picker')) {
      return container.querySelector(
        '.sceditor-button[title*="大小"], .sceditor-button[title*="Size"]',
      )
    }
    if (dropdown.classList.contains('sceditor-color-picker')) {
      return container.querySelector(
        '.sceditor-button[title*="颜色"], .sceditor-button[title*="Color"]',
      )
    }

    // 默认返回第一个下拉相关的按钮
    return container.querySelector('.sceditor-button')
  }

  // 监听下拉框的创建
  dropdownObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList?.contains('sceditor-dropdown')) {
          // CSS中已经默认隐藏了下拉框，无需额外设置
          // 延迟执行位置计算，确保DOM完全渲染
          setTimeout(() => {
            const triggerButton = findTriggerButton(node)
            if (triggerButton) {
              calculateDropdownPosition(node, triggerButton)
            } else {
              // 如果找不到触发按钮，也要显示下拉框
              node.classList.add('positioned')
            }

            // 为下拉框选项添加点击监听，确保字体和颜色修改触发自动保存
            const dropdownOptions = node.querySelectorAll(
              'a, .sceditor-font-option, .sceditor-fontsize-option, .sceditor-color-option',
            )
            dropdownOptions.forEach((option) => {
              option.addEventListener('click', () => {
                // 延迟检查内容变化，确保格式化操作完成后再触发保存
                setTimeout(() => {
                  if (!isInitializing && editorInstance.value) {
                    const content = getSafeEditorContent()
                    emit('update:value', content)
                  }
                }, 150) // 稍微增加延迟，确保SCEditor完成格式化操作
              })
            })
          }, 10)
        }
      })
    })
  })

  // 监听工具栏区域的变化
  const toolbar = container.querySelector('.sceditor-toolbar')
  if (toolbar) {
    dropdownObserver.observe(toolbar, {
      childList: true,
      subtree: true,
    })
  }

  // 监听按钮点击事件来跟踪活动按钮
  container.addEventListener('click', (event) => {
    const button = event.target.closest('.sceditor-button')
    if (button) {
      // 移除所有其他按钮的活动状态标记
      container.querySelectorAll('.sceditor-button').forEach((btn) => {
        btn.classList.remove('dropdown-active')
      })
      // 标记当前点击的按钮
      button.classList.add('dropdown-active')

      // 检查是否有下拉框需要重新定位
      setTimeout(() => {
        const dropdowns = container.querySelectorAll('.sceditor-dropdown')
        dropdowns.forEach((dropdown) => {
          // 先移除positioned类隐藏下拉框，重新计算位置后再显示
          dropdown.classList.remove('positioned')
          calculateDropdownPosition(dropdown, button)
        })
      }, 50)
    }
  })

  // 为已存在的下拉框选项添加事件监听
  const addDropdownOptionListeners = () => {
    const existingDropdowns = container.querySelectorAll('.sceditor-dropdown')
    existingDropdowns.forEach((dropdown) => {
      const dropdownOptions = dropdown.querySelectorAll(
        'a, .sceditor-font-option, .sceditor-fontsize-option, .sceditor-color-option',
      )
      dropdownOptions.forEach((option) => {
        // 检查是否已经添加过监听器
        if (!option.dataset.saveListenerAdded) {
          option.dataset.saveListenerAdded = 'true'
          option.addEventListener('click', () => {
            setTimeout(() => {
              if (!isInitializing && editorInstance.value) {
                const content = getSafeEditorContent()
                emit('update:value', content)
              }
            }, 150)
          })
        }
      })
    })
  }

  // 立即检查现有下拉框
  addDropdownOptionListeners()

  // 定期检查是否有新的下拉框选项（因为有些下拉框可能是动态创建的）
  const dropdownCheckInterval = setInterval(() => {
    if (!editor.value?.parentNode) {
      clearInterval(dropdownCheckInterval)
      return
    }
    addDropdownOptionListeners()
  }, 1000)
}

/**
 * 更新源码模式的CSS类标识
 */
function updateSourceModeClass() {
  if (!editorInstance.value || !editor.value) return

  const container = editor.value.parentNode
  if (!container) return

  // 检查是否处于源码模式
  const isSourceMode = editorInstance.value.sourceMode && editorInstance.value.sourceMode()

  if (isSourceMode) {
    container.classList.add('sourceMode')
  } else {
    container.classList.remove('sourceMode')
  }
}

/**
 * 设置编辑器iframe内部样式
 * @returns {Boolean} 是否设置成功
 */
function setupIframeStyles() {
  if (!editorInstance.value) return false

  const iframe = editor.value?.parentNode?.querySelector('iframe')
  if (!iframe?.contentDocument) return false

  const iframeDoc = iframe.contentDocument
  const iframeBody = iframeDoc.body

  if (!iframeBody) return false

  // 获取当前主题
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

  // 为 iframe 的 html 元素设置 data-theme 属性，使其与外部主题同步
  iframeDoc.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')

  // 获取主文档的计算样式
  const rootStyles = getComputedStyle(document.documentElement)
  const textColor = isDark ? '#f0f6fc' : '#2c2016'

  // 创建或更新样式元素
  let styleElement = iframeDoc.getElementById('theme-variables')
  if (!styleElement) {
    styleElement = iframeDoc.createElement('style')
    styleElement.id = 'theme-variables'
    iframeDoc.head.appendChild(styleElement)
  }

  // 注入主题变量和样式
  const cssVariables = [
    '--font-family',
    '--text-primary',
    '--text-secondary',
    '--text-muted',
    '--bg-primary',
    '--bg-secondary',
    '--bg-surface',
    '--border-primary',
    '--border-secondary',
    '--brand-primary',
    '--brand-secondary',
    '--editor-bg',
    '--editor-text',
    '--editor-border',
  ]
    .map((varName) => `${varName}: ${rootStyles.getPropertyValue(varName)};`)
    .join('\n  ')

  styleElement.textContent = `
    :root {
      ${cssVariables}
    }

    html, body {
      background: transparent !important;
      font-family: ${rootStyles.getPropertyValue('--font-family')} !important;
    }

    /* 只为body设置默认颜色，但不使用!important，允许子元素覆盖 */
    body {
      color: ${textColor};
      padding: 16px !important;
      margin: 0 !important;
      line-height: 1.6;
    }

    /* 只对没有任何颜色设置的特定元素应用默认颜色 */
    p:not([style*="color"]):not([class*="color"]),
    div:not([style*="color"]):not([class*="color"]),
    span:not([style*="color"]):not([class*="color"]),
    h1:not([style*="color"]):not([class*="color"]),
    h2:not([style*="color"]):not([class*="color"]),
    h3:not([style*="color"]):not([class*="color"]),
    h4:not([style*="color"]):not([class*="color"]),
    h5:not([style*="color"]):not([class*="color"]),
    h6:not([style*="color"]):not([class*="color"]),
    td:not([style*="color"]):not([class*="color"]),
    th:not([style*="color"]):not([class*="color"]),
    li:not([style*="color"]):not([class*="color"]),
    blockquote:not([style*="color"]):not([class*="color"]),
    pre:not([style*="color"]):not([class*="color"]),
    code:not([style*="color"]):not([class*="color"]) {
      color: ${textColor};
    }

    /* 确保用户设置的内联颜色样式优先级最高 */
    [style*="color"] {
      /* 用户设置的颜色具有最高优先级，不需要额外规则 */
    }

    /* iframe内部滚动条样式 - 适配主题 */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb {
      background: ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
      border-radius: 4px;
      transition: background 0.2s ease;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
    }

    ::-webkit-scrollbar-corner {
      background: ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    }

    /* Firefox 滚动条样式 */
    * {
      scrollbar-width: thin;
      scrollbar-color: ${isDark ? 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)'};
    }

    /* 图片最大宽度限制 */
    img {
      max-width: 80% !important;
      height: auto !important;
      display: block;
      margin: 0 auto;
    }
  `

  // 不再强制设置body样式，让CSS自然继承处理
  // 移除了可能覆盖用户颜色设置的代码

  return true
}

// 监听主题变化并更新 iframe 样式
const themeObserver = new MutationObserver(() => {
  setTimeout(() => {
    setupIframeStyles()
  }, 50)
  // 立即更新一次，确保快速响应
  setupIframeStyles()
})

// 下拉框位置监控器
let dropdownObserver = null

// 外部 v-model -> 编辑器
watch(
  () => props.value,
  (newValue) => {
    // 只有在初始化完成后才响应外部值变化
    if (
      !isInitializing &&
      editorInstance.value &&
      newValue !== undefined &&
      editorInstance.value.val() !== newValue
    ) {
      // 额外检查：如果新值为空但编辑器有内容，可能是意外清空，需要谨慎处理
      const currentContent = editorInstance.value.val()
      if (newValue === '' && currentContent && currentContent.trim() !== '') {
        // 记录警告但不立即清空，让用户决定
        console.warn(t('detectedAccidentalClear'))
        // 这里可以选择不执行清空，或者延迟执行给用户确认的机会
        // 暂时保持原有逻辑但增加警告
      }

      editorInstance.value.val(newValue)
      lastValidContent = newValue || lastValidContent // 保留上次有效内容

      // 更新值后重新应用样式
      setTimeout(() => setupIframeStyles(), 50)
    }
  },
)

// 语言配置
const languages = {
  zh: {
    Bold: '粗体',
    Italic: '斜体',
    Underline: '下划线',
    Strikethrough: '删除线',
    Subscript: '下标',
    Superscript: '上标',
    'Align left': '左对齐',
    Center: '居中',
    'Align right': '右对齐',
    Justify: '两端对齐',
    'Font Name': '字体',
    'Font Size': '字号',
    'Font Color': '字体颜色',
    'Remove Formatting': '清除格式',
    Cut: '剪切',
    Copy: '复制',
    'Paste Text': '粘贴文本',
    'Bullet list': '无序列表',
    'Numbered list': '有序列表',
    'Insert a Quote': '插入引用',
    'Insert a horizontal rule': '插入水平线',
    'Insert an image': '插入图片',
    'Insert a link': '插入链接',
    'Insert an email': '插入邮箱',
    'Insert current date': '插入当前日期',
    'Insert current time': '插入当前时间',
    'Insert a table': '插入表格',
    Unlink: '移除链接',
    'View source': '查看源码',
    Maximize: '全屏',
    Minimize: '退出全屏',
    'Left-to-Right': '从左到右',
    'Right-to-Left': '从右到左',
    Undo: '撤销',
    Redo: '重做',
    Code: '代码',
    Quote: '引用',
    Print: '打印',
    More: '更多',
    Close: '关闭',
    Cancel: '取消',
    Insert: '插入',
    Update: '更新',
    'URL:': '链接：',
    'Description:': '描述：',
    'Description (optional):': '描述（可选）：',
    'E-mail:': '邮箱：',
    'Width (optional):': '宽度（可选）：',
    'Height (optional):': '高度（可选）：',
    'Rows:': '行数：',
    'Cols:': '列数：',
    'Alt:': '替代文本：',
    'Title:': '标题：',
    dateFormat: 'year-month-day',
    timeFormat: 'hours:minutes:seconds',
  },
  en: {
    Bold: 'Bold',
    Italic: 'Italic',
    Underline: 'Underline',
    Strikethrough: 'Strikethrough',
    Subscript: 'Subscript',
    Superscript: 'Superscript',
    'Align left': 'Align left',
    Center: 'Center',
    'Align right': 'Align right',
    Justify: 'Justify',
    'Font Name': 'Font Name',
    'Font Size': 'Font Size',
    'Font Color': 'Font Color',
    'Remove Formatting': 'Remove Formatting',
    Cut: 'Cut',
    Copy: 'Copy',
    'Paste Text': 'Paste Text',
    'Bullet list': 'Bullet list',
    'Numbered list': 'Numbered list',
    'Insert a Quote': 'Insert a Quote',
    'Insert a horizontal rule': 'Insert a horizontal rule',
    'Insert an image': 'Insert an image',
    'Insert a link': 'Insert a link',
    'Insert an email': 'Insert an email',
    'Insert current date': 'Insert current date',
    'Insert current time': 'Insert current time',
    'Insert a table': 'Insert a table',
    Unlink: 'Unlink',
    'View source': 'View source',
    Maximize: 'Maximize',
    Minimize: 'Minimize',
    'Left-to-Right': 'Left-to-Right',
    'Right-to-Left': 'Right-to-Left',
    Undo: 'Undo',
    Redo: 'Redo',
    Code: 'Code',
    Quote: 'Quote',
    Print: 'Print',
    More: 'More',
    Close: 'Close',
    Cancel: 'Cancel',
    Insert: 'Insert',
    Update: 'Update',
    'URL:': 'URL:',
    'Description:': 'Description:',
    'Description (optional):': 'Description (optional):',
    'E-mail:': 'E-mail:',
    'Width (optional):': 'Width (optional):',
    'Height (optional):': 'Height (optional):',
    'Rows:': 'Rows:',
    'Cols:': 'Cols:',
    'Alt:': 'Alt:',
    'Title:': 'Title:',
    dateFormat: 'year-month-day',
    timeFormat: 'hours:minutes:seconds',
  },
}

// 更新编辑器语言
const updateLanguage = (language) => {
  if (window.sceditor && window.sceditor.locale) {
    const locale = language === 'zh' ? 'zh-cn' : 'en'
    window.sceditor.locale[locale] = languages[language]

    // 如果编辑器已经初始化，需要重建编辑器以应用新语言
    if (editorInstance.value) {
      try {
        // 保存当前内容
        const currentContent = editorInstance.value.val()

        // 销毁当前编辑器
        editorInstance.value.destroy()
        editorInstance.value = null

        // 延迟重新初始化编辑器，确保DOM清理完成
        setTimeout(() => {
          // 重新初始化编辑器
          initializeEditor()

          // 恢复内容
          setTimeout(() => {
            if (editorInstance.value && currentContent) {
              editorInstance.value.val(currentContent)
              setupIframeStyles()
            } else {
              console.warn(t('updateLanguageContentRecoveryFailed'))
            }
          }, 100)
        }, 50)
      } catch (e) {
        emit('error', new Error('Failed to update editor language: ' + e.message))
      }
    }
  }
}

/**
 * 更新编辑器内容的公共方法
 * @param {String} newContent 新的内容
 */
const updateContent = (newContent) => {
  if (editorInstance.value && newContent !== undefined) {
    // 检查是否是意外的空内容
    const currentContent = editorInstance.value.val()
    if (newContent === '' && currentContent && currentContent.trim() !== '') {
      console.warn(t('updateContentAccidentalClear'))
    }

    editorInstance.value.val(newContent)
    lastValidContent = newContent || lastValidContent // 更新有效内容记录
    setTimeout(() => setupIframeStyles(), 50)
  }
}

// 暴露方法给父组件
defineExpose({
  updateContent,
})

// 监听语言变化事件
const setupLanguageHandling = () => {
  // 监听语言变化事件
  const handleLanguageChange = (event) => {
    updateLanguage(event.detail.language)
  }

  window.addEventListener('language-changed', handleLanguageChange)

  // 初始化时设置语言
  const savedLanguage = localStorage.getItem('language') || 'zh'
  // 统一语言格式：将 'zh-cn' 映射为 'zh'
  const normalizedLanguage = savedLanguage === 'zh-cn' ? 'zh' : savedLanguage === 'en' ? 'en' : 'zh'
  updateLanguage(normalizedLanguage)

  // 清理事件监听器
  onBeforeUnmount(() => {
    window.removeEventListener('language-changed', handleLanguageChange)
  })
}

onMounted(() => {
  // 设置语言处理
  setupLanguageHandling()

  // 使用 requestAnimationFrame 确保 DOM 准备完成
  requestAnimationFrame(() => {
    initializeEditor()
  })

  // 监听主题变化
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
})

onBeforeUnmount(() => {
  destroyed = true
  isInitializing = true // 重置初始化标志
  themeObserver.disconnect()

  // 清理下拉框位置监控器
  if (dropdownObserver) {
    dropdownObserver.disconnect()
    dropdownObserver = null
  }

  // 清理全屏状态
  document.body.classList.remove('sceditor-maximize')
  document.documentElement.classList.remove('sceditor-maximize')

  if (editorInstance.value) {
    try {
      editorInstance.value.destroy()
    } catch {
      /* ignore */
    }
  }
})
</script>

<template>
  <div class="bbcode-editor-wrapper">
    <textarea ref="editor"></textarea>

    <!-- 图片拖拽上传组件 -->
    <ImageDropZone
      ref="dropZone"
      :image-host="imageHost"
      :api-key="imageApiKey"
      :pixhost-content-type="pixhostContentType"
      :custom-image-host-config="customImageHostConfig"
      :auto-show="false"
      @insert-images="insertImagesAtCursor"
      @upload-start="handleUploadStart"
      @upload-progress="handleUploadProgress"
      @upload-success="handleUploadSuccess"
      @upload-error="handleUploadError"
    />
  </div>
</template>

<style scoped>
.bbcode-editor-wrapper {
  /* 居中且占80%宽度 */
  width: 80%;
  margin: 0 auto;
  position: relative;
  box-sizing: border-box;
  height: calc(100% - 2rem); /* 使用父容器的100%减去bottom padding */
  display: flex;
  flex-direction: column;
}

/* 原始 textarea - 初始状态 */
.bbcode-editor-wrapper textarea {
  resize: none !important;
  overflow: auto;
  width: 100% !important;
  box-sizing: border-box;
  height: 100% !important;
  min-height: 100% !important;
  max-height: 100% !important;
  background: var(--editor-bg) !important;
  color: var(--editor-text) !important;
  border: 1px solid var(--editor-border) !important;
}

/* SCEditor 容器样式 - 基础尺寸设置 */
.bbcode-editor-wrapper :deep(.sceditor-container) {
  width: 100% !important;
  height: 100% !important;
  resize: none !important;
  min-height: 100% !important;
  max-height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

/* 全屏模式下的编辑器容器 */
.bbcode-editor-wrapper :deep(.sceditor-maximize) {
  width: 100vw !important;
  height: 100vh !important;
  min-height: 100vh !important;
  max-height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  left: 0 !important;
  top: 0 !important;
  position: fixed !important;
  z-index: 2000 !important;
}

/* 编辑区域基础设置 */
.bbcode-editor-wrapper :deep(.sceditor-container iframe),
.bbcode-editor-wrapper :deep(.sceditor-container textarea) {
  background: var(--editor-bg) !important;
  color: var(--editor-text) !important;
  width: 100% !important;
  flex: 1 !important;
  min-height: 0 !important;
  resize: none !important;
  border: none !important;
}

/* 禁用所有调整大小控件 */
.bbcode-editor-wrapper :deep(.sceditor-resize-grip),
.bbcode-editor-wrapper :deep(.ui-resizable-handle) {
  display: none !important;
}

/* 强制禁用任何调整大小功能 */
.bbcode-editor-wrapper :deep(*) {
  resize: none !important;
}
</style>
