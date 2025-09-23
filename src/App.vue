<script setup>
import TopBar from './components/TopBar.vue'
import BBcodeEditor from './components/BBcodeEditor.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { ref, onMounted, watch } from 'vue'
import { useSettings } from './composables/useSettings.js'
import { saveToFile, readFromFile, selectFile, showFileNotification } from './utils/fileUtils.js'
import { useTranslation } from './utils/i18n.js'

const editorRef = ref(null)
const content = ref('')
let contentLoaded = false // 标记内容是否已经加载
let pendingContent = '' // 待加载的内容

// 国际化
const { t } = useTranslation()

// 使用设置管理系统
const {
  settings,
  settingsVisible,
  showSettings,
  hideSettings,
  saveSettings,
  clearAllData,
  setWithExpiry,
  getWithExpiry,
} = useSettings()

// 从设置中获取当前状态
const currentTheme = ref(settings.value.theme)
const autoSaveEnabled = ref(settings.value.autoSaveEnabled)
const currentLanguage = ref(settings.value.language)
const saveStatus = ref('saved') // 'saved', 'saving', 'unsaved'

// 自动保存相关
let autoSaveTimer = null
const AUTOSAVE_DELAY = ref(settings.value.autoSaveDelay) // 从设置获取延迟时间
let isUpdatingContent = false // 防止watch循环的标志

/**
 * 延迟内容加载 - 确保在页面完全加载后才设置内容
 */
const loadContentSafely = (newContent) => {
  if (contentLoaded && editorRef.value) {
    // 如果已经加载完成且编辑器准备好，直接设置
    isUpdatingContent = true
    content.value = newContent
    isUpdatingContent = false

    // 同步到编辑器
    if (editorRef.value.updateContent) {
      editorRef.value.updateContent(newContent)
    }
  } else {
    // 否则保存待加载的内容
    pendingContent = newContent
  }
}

/**
 * 编辑器准备就绪回调
 */
const handleEditorReady = () => {
  // 标记内容加载完成
  contentLoaded = true

  // 如果有待加载的内容，现在加载它
  if (pendingContent !== '') {
    isUpdatingContent = true
    content.value = pendingContent
    isUpdatingContent = false

    // 同步到编辑器
    if (editorRef.value && editorRef.value.updateContent) {
      editorRef.value.updateContent(pendingContent)
    }

    pendingContent = '' // 清空待加载内容
  }
}

// 默认内容（多语言）
const defaultContent = {
  zh: `[b]欢迎使用BBCode编辑器！[/b]

这是一个功能丰富的BBCode编辑器，支持以下特性：

[size=16][color=blue]基本格式[/color][/size]
• [b]粗体文本[/b]
• [i]斜体文本[/i]
• [u]下划线文本[/u]
• [s]删除线文本[/s]

[size=16][color=green]高级功能[/color][/size]
• [color=red]彩色文本[/color]
• [size=18]不同大小的文本[/size]
• [url=https://github.com]GitHub 链接[/url]
• [img]https://picsum.photos/300/200[/img]

[quote]这是引用文本的示例[/quote]

[code]console.log("这是代码块");[/code]

尽情享受编辑的乐趣吧！`,
  en: `[b]Welcome to the BBCode Editor![/b]

This is a feature-rich BBCode editor that supports:

[size=16][color=blue]Basic Formatting[/color][/size]
• [b]Bold text[/b]
• [i]Italic text[/i]
• [u]Underlined text[/u]
• [s]Strikethrough text[/s]

[size=16][color=green]Advanced Features[/color][/size]
• [color=red]Colored text[/color]
• [size=18]Different text sizes[/size]
• [url=https://github.com]GitHub Link[/url]
• [img]https://picsum.photos/300/200[/img]

[quote]This is an example of quoted text[/quote]

[code]console.log("This is a code block");[/code]

Enjoy editing!`,
}

// 统一的内容获取逻辑
const getInitialContent = (language, useAutoSave = autoSaveEnabled.value) => {
  if (useAutoSave) {
    // 如果启用自动保存，优先使用保存的内容
    const savedContent = getWithExpiry('editorContent')
    if (savedContent && savedContent.trim()) {
      return savedContent
    }
  }
  // 否则使用默认内容，统一语言格式映射
  const mappedLanguage = language === 'zh-cn' ? 'zh' : language === 'en' ? 'en' : 'zh'
  return defaultContent[mappedLanguage]
}

const initializeApp = () => {
  // 设置系统会自动加载设置，我们只需要同步到本地变量
  currentTheme.value = settings.value.theme
  autoSaveEnabled.value = settings.value.autoSaveEnabled
  currentLanguage.value = settings.value.language
  AUTOSAVE_DELAY.value = settings.value.autoSaveDelay

  // 使用统一的内容获取逻辑，但不立即设置，而是等待编辑器准备完成
  const initialContent = getInitialContent(settings.value.language, settings.value.autoSaveEnabled)

  // 使用延迟加载逻辑
  loadContentSafely(initialContent)
  saveStatus.value = 'saved'

  // 应用主题
  applyTheme(currentTheme.value)
}

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme)
}

const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
  // 更新设置系统
  saveSettings({ theme: currentTheme.value })
  applyTheme(currentTheme.value)
}

const toggleAutoSave = () => {
  autoSaveEnabled.value = !autoSaveEnabled.value
  // 更新设置系统
  saveSettings({ autoSaveEnabled: autoSaveEnabled.value })

  if (!autoSaveEnabled.value) {
    // 如果关闭自动保存，清理定时器和保存的内容
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
      autoSaveTimer = null
    }
    localStorage.removeItem('editorContent')
    saveStatus.value = 'saved'
  } else {
    // 如果开启自动保存，使用封装的保存函数
    if (saveEditorContent(content.value)) {
      saveStatus.value = 'saving'
      saveStatus.value = 'saved'
    } else {
      saveStatus.value = 'saved' // 空内容也视为已保存状态
    }
  }
}

const changeLanguage = (language) => {
  const wasAutoSaveEnabled = autoSaveEnabled.value

  currentLanguage.value = language
  // 更新设置系统
  saveSettings({ language: language })

  // 发送语言变化事件给编辑器
  // 编辑器期望 'zh' 或 'en' 格式，需要映射 'zh-cn' -> 'zh'
  const editorLanguage = language === 'zh-cn' ? 'zh' : language === 'en' ? 'en' : 'zh'
  window.dispatchEvent(
    new CustomEvent('language-changed', {
      detail: { language: editorLanguage },
    }),
  )

  // 内容切换逻辑
  let shouldUseDefaultContent = false

  if (!wasAutoSaveEnabled) {
    // 未启用自动保存时，总是使用默认内容
    shouldUseDefaultContent = true
  } else {
    // 启用自动保存时，检查是否有保存的内容
    const savedContent = getWithExpiry('editorContent')
    if (!savedContent || savedContent.trim() === '') {
      shouldUseDefaultContent = true
    }
    // 如果有保存的内容，保持现有内容不变
  }

  if (shouldUseDefaultContent) {
    const newContent = getInitialContent(language, false) // 强制使用默认内容
    loadContentSafely(newContent) // 使用延迟加载
  }

  // 强制刷新页面以确保语言切换完全生效
  setTimeout(() => {
    window.location.reload()
  }, 100) // 稍微延迟一下确保设置已保存
}

/**
 * 新建文档
 */
const handleNewDocument = async () => {
  // 无论任何情况都弹出确认对话框，提醒用户可能有未保存到本地文件的内容
  const confirmed = window.confirm(`${t('unsavedChangesWarning')}\n\n${t('continueNewDocument')}`)

  if (!confirmed) {
    return // 用户取消
  }

  // 清空内容
  loadContentSafely('') // 使用延迟加载

  // 如果开启了自动保存，清除保存的内容
  if (autoSaveEnabled.value) {
    localStorage.removeItem('editorContent')
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
      autoSaveTimer = null
    }
  }

  // 更新保存状态
  saveStatus.value = 'saved'

  showFileNotification(t('newDocumentCreated') || t('documentCreated'), 'success')
}

/**
 * 保存内容到文件
 */
const handleSaveToFile = async () => {
  if (!content.value || content.value.trim() === '') {
    showFileNotification(t('noContentToSave'), 'error')
    return
  }

  const result = saveToFile(content.value)
  if (result.success) {
    showFileNotification(`${t('fileSavedAs')}: ${result.filename}`, 'success')
  } else {
    showFileNotification(`${t('saveFailed')}: ${result.error}`, 'error')
  }
}

/**
 * 从文件加载内容
 */
const handleLoadFromFile = async () => {
  try {
    const files = await selectFile()
    if (!files || files.length === 0) {
      return // 用户取消选择
    }

    const file = files[0]
    const result = await readFromFile(file)

    if (result.success) {
      loadContentSafely(result.content) // 使用延迟加载
      showFileNotification(`${t('loadedFromFile')}: ${file.name}`, 'success')

      // 如果启用了自动保存，使用封装的保存函数保存加载的内容
      if (autoSaveEnabled.value) {
        if (saveEditorContent(result.content)) {
          saveStatus.value = 'saved'
        } else {
          saveStatus.value = 'saved' // 空内容也视为已保存状态
        }
      } else {
        saveStatus.value = 'saved'
      }
    } else {
      showFileNotification(`${t('loadFailed')}: ${result.error}`, 'error')
    }
  } catch (error) {
    showFileNotification(`${t('fileLoadError')}: ${error.message}`, 'error')
  }
}

/**
 * 打开设置面板
 */
const handleOpenSettings = () => {
  showSettings()
}

/**
 * 保存设置
 */
const handleSaveSettings = (newSettings) => {
  const result = saveSettings(newSettings)
  if (result.success) {
    // 同步设置到本地变量
    currentTheme.value = settings.value.theme
    autoSaveEnabled.value = settings.value.autoSaveEnabled
    currentLanguage.value = settings.value.language
    AUTOSAVE_DELAY.value = settings.value.autoSaveDelay

    // 应用主题
    applyTheme(currentTheme.value)

    showFileNotification(t('settingsSaved'), 'success')
  } else {
    showFileNotification(`${t('settingsSaveFailed')}: ${result.error}`, 'error')
  }
}

/**
 * 清除所有本地数据
 */
const handleClearData = () => {
  const result = clearAllData()
  if (result.success) {
    // 重置界面状态
    loadContentSafely(defaultContent[settings.value.language]) // 使用延迟加载
    saveStatus.value = 'saved'

    showFileNotification(t('allLocalDataCleared'), 'success')
  } else {
    showFileNotification(`${t('clearDataFailed')}: ${result.error}`, 'error')
  }
}

/**
 * 安全保存编辑器内容到localStorage
 * @param {string} contentToSave - 要保存的内容
 * @param {boolean} force - 是否强制保存（忽略空内容检查）
 * @returns {boolean} 是否成功保存
 */
const saveEditorContent = (contentToSave, force = false) => {
  // 检查内容是否为空（除非强制保存）
  if (!force && (!contentToSave || contentToSave.trim() === '')) {
    // 内容为空时，清除已保存的内容以保持一致性
    localStorage.removeItem('editorContent')
    saveStatus.value = 'saved' // 空内容视为已保存状态
    return false // 返回false表示未保存（因为内容为空）
  }

  try {
    setWithExpiry('editorContent', contentToSave, settings.value.storageExpiry)
    return true // 保存成功
  } catch (error) {
    console.error('保存编辑器内容失败:', error)
    return false // 保存失败
  }
}

// 改进的自动保存逻辑
const handleContentChange = (newContent) => {
  // 如果是程序内部更新内容，跳过自动保存逻辑
  if (isUpdatingContent) {
    return
  }

  if (autoSaveEnabled.value && newContent !== undefined) {
    // 标记为未保存状态
    saveStatus.value = 'unsaved'

    // 清除之前的定时器
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    // 设置新的定时器，延迟保存
    autoSaveTimer = setTimeout(() => {
      saveStatus.value = 'saving'
      // 使用封装的保存函数，它会自动处理空内容
      saveEditorContent(newContent)
      saveStatus.value = 'saved'
    }, AUTOSAVE_DELAY.value)
  }
}

// ===== 图片上传处理 =====

/**
 * 处理图片插入成功
 * @param {Object} data - 插入数据
 */
// eslint-disable-next-line no-unused-vars
const handleImageInserted = (data) => {
  // 图片插入后触发内容变化检测，进行自动保存
  if (autoSaveEnabled.value) {
    handleContentChange(content.value)
  }
}

// 监听内容变化进行自动保存
watch(content, handleContentChange, { flush: 'post' })

onMounted(() => {
  initializeApp()
})
</script>

<template>
  <div class="app">
    <TopBar
      :save-status="saveStatus"
      :auto-save-enabled="autoSaveEnabled"
      :current-language="currentLanguage"
      :current-theme="currentTheme"
      @toggle-theme="toggleTheme"
      @toggle-auto-save="toggleAutoSave"
      @change-language="changeLanguage"
      @save-to-file="handleSaveToFile"
      @load-from-file="handleLoadFromFile"
      @new-document="handleNewDocument"
      @open-settings="handleOpenSettings"
    />
    <main class="page">
      <BBcodeEditor
        ref="editorRef"
        v-model:value="content"
        :options="{ format: 'bbcode' }"
        :image-host="settings.imageHost"
        :image-api-key="settings.freeimageApiKey"
        :auto-newline-after-image="settings.autoNewlineAfterImage"
        :image-alignment="settings.imageAlignment"
        :use-align-param-on-copy="settings.useAlignParamOnCopy"
        :auto-format-list-on-copy="settings.autoFormatListOnCopy"
        @ready="handleEditorReady"
        @image-inserted="handleImageInserted"
      />
    </main>

    <!-- 设置面板 -->
    <SettingsPanel
      :visible="settingsVisible"
      :settings="settings"
      :current-theme="currentTheme"
      :current-language="currentLanguage"
      :auto-save-enabled="autoSaveEnabled"
      @close="hideSettings"
      @save="handleSaveSettings"
      @clear-data="handleClearData"
    />
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  background: var(--bg-primary);
  width: 100%;
  overflow: hidden !important; /* 防止页面滚动 */
  display: flex !important ;
  flex-direction: column !important;
}

.page {
  flex: 1;
  background: var(--bg-primary);
  width: 100%;
  padding-top: calc(var(--topbar-height, 84px) + 20px); /* 顶栏高度 + 额外间距 */
  padding-bottom: 2rem; /* 底部留白 */
  padding-left: 20px; /* 左右增加间距 */
  padding-right: 20px;
  box-sizing: border-box;
  overflow: hidden; /* 确保内容不溢出 */
}
</style>
