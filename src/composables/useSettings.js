/**
 * 设置管理 Composable
 * 提供应用设置的存储、读取和管理功能
 */

import { ref, watch } from 'vue'

/**
 * 默认设置配置
 */
const DEFAULT_SETTINGS = {
  theme: 'light',
  autoSaveDelay: 1000,
  storageExpiry: 7 * 24 * 60 * 60 * 1000, // 7天 (毫秒)
  language: 'zh-cn',
  autoSaveEnabled: false,
  imageHost: 'local', // 默认使用本地测试
  freeimageApiKey: '',
  pixhostContentType: '0', // Pixhost内容类型：'0' = Safe Content, '1' = NSFW
  autoNewlineAfterImage: false, // 图片插入后自动隔行
  imageAlignment: 'none', // 图片排版方式：left, right, justify, none
  useAlignParamOnCopy: false, // 复制时使用align参数格式
  autoFormatListOnCopy: false, // 导出到剪贴板时自动格式化列表
  enableImageCompression: false, // 是否启用图片压缩
  imageCompressionQuality: 80, // 图片压缩质量（1-100）
  enableConvertToWebp: false, // 是否转换为WebP

  // 自定义图床配置
  customImageHost: {
    url: '', // 上传API地址
    urlParams: [], // URL参数数组: [{key: 'token', value: 'xxx'}, {key: 'filename', value: '$filename$'}]
    responsePattern: '$json:data.url$', // 响应解析模式: $json:path$ 或 $text$
    useProxy: true, // 是否使用代理（规避CORS）
  },
}

/**
 * localStorage 带过期处理的工具函数
 */
function setWithExpiry(key, value, ttl = 0) {
  const record = {
    value,
    expiresAt: ttl && ttl > 0 ? Date.now() + ttl : null,
  }
  try {
    localStorage.setItem(key, JSON.stringify(record))
  } catch {
    console.warn('Failed to save to localStorage')
  }
}

function getWithExpiry(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const record = JSON.parse(raw)
    if (!record) return null
    if (record.expiresAt && Date.now() > record.expiresAt) {
      localStorage.removeItem(key)
      return null
    }
    return record.value
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

/**
 * 设置管理 Hook
 */
export function useSettings() {
  // 设置状态
  const settings = ref({ ...DEFAULT_SETTINGS })
  const settingsVisible = ref(false)

  /**
   * 加载设置
   */
  const loadSettings = () => {
    try {
      // 从localStorage加载各项设置
      const savedTheme = localStorage.getItem('theme')
      let theme = DEFAULT_SETTINGS.theme

      if (savedTheme) {
        // 如果有保存的主题设置，使用保存的设置
        theme = savedTheme
      } else {
        // 如果没有保存的主题设置，检查系统偏好
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          theme = 'dark'
        } else {
          theme = 'light'
        }
      }

      const savedLanguage = localStorage.getItem('language') || DEFAULT_SETTINGS.language
      const savedAutoSave = localStorage.getItem('autoSave') === 'true'

      // 加载自定义设置
      const customSettings = getWithExpiry('appSettings') || {}

      settings.value = {
        ...DEFAULT_SETTINGS,
        theme: theme,
        language: savedLanguage,
        autoSaveEnabled: savedAutoSave,
        ...customSettings,
      }
    } catch (error) {
      console.warn('Failed to load settings:', error)
      settings.value = { ...DEFAULT_SETTINGS }
    }
  }

  /**
   * 保存设置
   */
  const saveSettings = (newSettings) => {
    try {
      // 更新设置状态
      settings.value = { ...settings.value, ...newSettings }

      // 保存到localStorage
      const { theme, language, autoSaveEnabled, ...customSettings } = settings.value

      // 保存基础设置（无过期时间）
      localStorage.setItem('theme', theme)
      localStorage.setItem('language', language)
      localStorage.setItem('autoSave', autoSaveEnabled.toString())

      // 保存自定义设置（使用过期时间）
      setWithExpiry('appSettings', customSettings, settings.value.storageExpiry)

      return { success: true }
    } catch (error) {
      console.error('Failed to save settings:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 重置设置
   */
  const resetSettings = () => {
    settings.value = { ...DEFAULT_SETTINGS }
    return saveSettings(settings.value)
  }

  /**
   * 清除所有本地数据
   */
  const clearAllData = () => {
    try {
      const keysToRemove = ['theme', 'language', 'autoSave', 'appSettings', 'editorContent']

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key)
      })

      // 重置为默认设置
      settings.value = { ...DEFAULT_SETTINGS }

      return { success: true }
    } catch (error) {
      console.error('Failed to clear data:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 显示设置面板
   */
  const showSettings = () => {
    settingsVisible.value = true
  }

  /**
   * 隐藏设置面板
   */
  const hideSettings = () => {
    settingsVisible.value = false
  }

  /**
   * 获取特定设置值
   */
  const getSetting = (key) => {
    return settings.value[key]
  }

  /**
   * 更新单个设置
   */
  const updateSetting = (key, value) => {
    settings.value[key] = value
    return saveSettings({ [key]: value })
  }

  /**
   * 监听设置变化，自动保存
   */
  watch(
    settings,
    () => {
      // 可以在这里添加自动保存逻辑
      // 但要小心避免无限循环
    },
    { deep: true },
  )

  // 初始化时加载设置
  loadSettings()

  return {
    // 状态
    settings,
    settingsVisible,

    // 方法
    loadSettings,
    saveSettings,
    resetSettings,
    clearAllData,
    showSettings,
    hideSettings,
    getSetting,
    updateSetting,

    // 工具函数
    setWithExpiry,
    getWithExpiry,
  }
}
