/**
 * 国际化工具模块
 * 统一管理应用中的多语言支持
 */

// 全局翻译字典
const translations = {
  'zh-cn': {
    // 通用
    language: '语言',
    selectLanguage: '选择语言',
    cancel: '取消',
    close: '关闭',
    save: '保存',
    load: '读取',
    delete: '删除',
    confirm: '确认',
    insert: '插入',
    update: '更新',
    retry: '重试',

    // 主题和外观
    switchToLight: '切换到白天模式',
    switchToDark: '切换到夜间模式',
    light: '日间',
    dark: '夜间',

    // 自动保存
    autoSave: '自动保存',
    enableAutoSave: '启用自动保存',
    disableAutoSave: '禁用自动保存',
    on: '开',
    off: '关',
    saved: '已保存',
    saving: '保存中',
    unsaved: '未保存',

    // 文件操作
    fileOperations: '文件操作',
    saveToFile: '保存到文件',
    loadFromFile: '从文件读取',
    saveFile: '保存',
    loadFile: '读取',
    newFile: '新建',
    newDocument: '新建文档',
    settings: '设置',

    // 新建文档确认
    confirmNewDocument: '新建文档',
    unsavedChangesWarning: '当前可能有未保存到本地文件的内容，新建文档将丢失这些内容。',
    continueNewDocument: '确定要继续吗？',
    newDocumentCreated: '已创建新文档',

    // 图片上传 - 拖拽区域
    dragHint: '拖拽图片到这里上传',
    dragHintActive: '松开上传图片',
    supportedFormats: '支持 JPG、PNG、GIF、WebP 格式，最大64MB',
    selectFiles: '选择文件上传',
    insertLink: '插入链接',
    backToUpload: '返回上传',

    // 图片上传 - 链接输入
    insertImageLink: '插入图片链接',
    imageLinkPlaceholder: '请输入图片链接 (如: https://example.com/image.jpg)',
    linkHint: '支持 JPG、PNG、GIF、WebP 等图片格式',

    // 图片上传 - 进度和状态
    uploadingImage: '正在上传图片...',
    uploadFailed: '上传失败',

    // 错误消息
    fileSizeExceeded: '文件大小超过限制',
    unsupportedFormat: '不支持的文件格式',
    supportedFormatsOnly: '仅支持',
    pleaseSelectImage: '请选择图片文件',
    onlyImageFiles: '只支持图片文件上传',
    pleaseEnterValidLink: '请输入有效的图片链接',
    invalidLinkFormat: '链接格式不正确，请输入完整的URL',
    notImageFileConfirm: '这个链接可能不是图片文件，确定要插入吗？',

    // API 配置错误
    apiKeyRequired:
      '请先在设置中配置FreeImage.host API密钥。\n\n' +
      '1. 点击右上角齿轮图标打开设置\n' +
      '2. 在"图片上传设置"中输入FreeImage.host API密钥\n' +
      '3. 在 https://freeimage.host/page/api 获取免费API密钥',

    // 设置面板
    generalSettings: '常规设置',
    storageSettings: '存储设置',
    imageUploadSettings: '图片上传设置',
    autoSaveDelay: '自动保存延迟',
    autoSaveDelayDesc: '设置自动保存的延迟时间',
    storageExpiry: '本地存储过期时间',
    storageExpiryDesc: '设置本地存储的内容过期时间',
    storageSecurityWarning: '⚠️ 本地存储的安全性不高，长久保存建议使用文件',
    clearLocalData: '清除本地数据',
    clearing: '清除中...',
    clearAllLocalData: '清除所有本地数据',
    clearDescription: '清除所有保存在浏览器中的数据',
    defaultImageHost: '默认图床服务',
    localTest: '本地测试 (Base64预览)',
    freeimageHost: 'FreeImage.host (通过代理)',
    sda1Host: 'SDA1.dev (通过代理)',
    freeimageApiKey: 'FreeImage.host API密钥 (可选)',
    apiKeyPlaceholder: '请输入您的API密钥（留空使用公共密钥）',
    showApiKey: '显示API密钥',
    hideApiKey: '隐藏API密钥',
    imageHostDescription:
      '选择图片处理方式。本地测试使用Base64编码，无需网络连接。FreeImage.host和SDA1.dev通过代理上传，SDA1.dev无需API密钥。',
    apiKeyDescription: '在 https://freeimage.host/page/api 获取免费API密钥',
    autoNewlineAfterImage: '图片后自动隔行',
    autoNewlineDescription: '在插入图片后自动添加空行，创建更清晰的排版',
    imageAlignment: '图片排版',
    imageAlignmentDescription: '设置图片在文档中的对齐方式',
    alignLeft: '靠左',
    alignCenter: '居中',
    alignRight: '靠右',
    alignJustify: '两端对齐',
    alignNone: '无格式',
    useAlignParamOnCopy: '复制时使用通用格式',
    useAlignParamDescription: '复制到剪贴板时将对齐标签转换为通用的align参数格式',
    formatAlignment: '格式化对齐标签',
    formatAlignmentTooltip: '将通用格式转换为可识别的对齐标签',

    // 时间选项
    halfSecond: '0.5秒',
    oneSecond: '1秒',
    twoSeconds: '2秒',
    threeSeconds: '3秒',
    fiveSeconds: '5秒',
    oneDay: '1天',
    sevenDays: '7天',
    thirtyDays: '30天',
    neverExpire: '永不过期',

    // 文件工具错误消息
    selectTextFile: '请选择文本文件（.txt 或 .bbcode）',
    fileTooLarge: '文件太大，请选择小于5MB的文件',
    fileReadFailed: '文件读取失败',

    // 图片上传代理相关
    pleaseConfigureApiKey: '请在设置中配置 FreeImage.host API 密钥',
    uploadFailedHttp: '上传失败',
    freeimageUploadFailed: 'FreeImage 上传失败',
    unknownError: '未知错误',
    pleaseSelectImageFile: '请选择要上传的图片文件',
    unsupportedImageHost: '不支持的图床类型',
    viaProxy: '通过代理上传，支持大文件',
    localTestNotUpload: '生成本地预览，不实际上传',

    // 设置面板按钮
    resetSettings: '重置设置',
    saveSettings: '保存设置',

    // API密钥获取提示
    getApiKeyAt: '在',
    freeimageApiPage: 'FreeImage.host API页面',
    getYourApiKey: '获取您的API密钥',

    // 设置项标签
    imageInsertOptions: '图片插入选项',
    exportOptions: '导出选项',

    // 图片拖拽区域错误信息
    onlyImageFilesUpload: '只支持图片文件上传',
    uploadFailedWithError: '上传失败',
    unknownErrorFallback: '未知错误',
    partialUploadFailed: '部分文件上传失败',
    pleaseEnterValidImageLink: '请输入有效的图片链接',
    invalidUrlFormat: '链接格式不正确，请输入完整的URL',
    notImageFileConfirmation: '这个链接可能不是图片文件，确定要插入吗？',
  },

  en: {
    // Common
    language: 'Language',
    selectLanguage: 'Select Language',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    load: 'Load',
    delete: 'Delete',
    confirm: 'Confirm',
    insert: 'Insert',
    update: 'Update',
    retry: 'Retry',

    // Theme and appearance
    switchToLight: 'Switch to Light Mode',
    switchToDark: 'Switch to Dark Mode',
    light: 'Light',
    dark: 'Dark',

    // Auto save
    autoSave: 'Auto Save',
    enableAutoSave: 'Enable Auto Save',
    disableAutoSave: 'Disable Auto Save',
    on: 'ON',
    off: 'OFF',
    saved: 'Saved',
    saving: 'Saving',
    unsaved: 'Unsaved',

    // File operations
    fileOperations: 'File Operations',
    saveToFile: 'Save to File',
    loadFromFile: 'Load from File',
    saveFile: 'Save',
    loadFile: 'Load',
    newFile: 'New',
    newDocument: 'New Document',
    settings: 'Settings',

    // New document confirmation
    confirmNewDocument: 'New Document',
    unsavedChangesWarning:
      'You may have unsaved content that has not been saved to a local file. Creating a new document will lose this content.',
    continueNewDocument: 'Do you want to continue?',
    newDocumentCreated: 'New document created',

    // Image upload - drag area
    dragHint: 'Drag images here to upload',
    dragHintActive: 'Release to upload images',
    supportedFormats: 'Supports JPG, PNG, GIF, WebP formats, max 64MB',
    selectFiles: 'Select Files to Upload',
    insertLink: 'Insert Link',
    backToUpload: 'Back to Upload',

    // Image upload - link input
    insertImageLink: 'Insert Image Link',
    imageLinkPlaceholder: 'Enter image link (e.g: https://example.com/image.jpg)',
    linkHint: 'Supports JPG, PNG, GIF, WebP and other image formats',

    // Image upload - progress and status
    uploadingImage: 'Uploading image...',
    uploadFailed: 'Upload Failed',

    // Error messages
    fileSizeExceeded: 'File size exceeds limit',
    unsupportedFormat: 'Unsupported file format',
    supportedFormatsOnly: 'Only supports',
    pleaseSelectImage: 'Please select an image file',
    onlyImageFiles: 'Only image files are supported for upload',
    pleaseEnterValidLink: 'Please enter a valid image link',
    invalidLinkFormat: 'Invalid link format, please enter a complete URL',
    notImageFileConfirm: 'This link may not be an image file, are you sure you want to insert it?',

    // API configuration errors
    apiKeyRequired:
      'Please configure FreeImage.host API key in settings first.\n\n' +
      '1. Click the gear icon in the top right to open settings\n' +
      '2. Enter FreeImage.host API key in "Image Upload Settings"\n' +
      '3. Get free API key at https://freeimage.host/page/api',

    // Settings panel
    generalSettings: 'General Settings',
    storageSettings: 'Storage Settings',
    imageUploadSettings: 'Image Upload Settings',
    autoSaveDelay: 'Auto Save Delay',
    autoSaveDelayDesc: 'Set the delay time for auto save',
    storageExpiry: 'Local Storage Expiry Time',
    storageExpiryDesc: 'Set expiry time for local storage content',
    storageSecurityWarning: '⚠️ Local storage has low security, use files for long-term storage',
    clearLocalData: 'Clear Local Data',
    clearing: 'Clearing...',
    clearAllLocalData: 'Clear All Local Data',
    clearDescription: 'Clear all data saved in the browser',
    defaultImageHost: 'Default Image Host',
    localTest: 'Local Test (Base64 preview)',
    freeimageHost: 'FreeImage.host (via proxy)',
    sda1Host: 'SDA1.dev (via proxy)',
    freeimageApiKey: 'FreeImage.host API Key (Optional)',
    apiKeyPlaceholder: 'Enter your API key (leave empty to use public key)',
    showApiKey: 'Show API key',
    hideApiKey: 'Hide API key',
    imageHostDescription:
      'Choose image processing method. Local test uses Base64 encoding, no network connection required. FreeImage.host and SDA1.dev upload via proxy, SDA1.dev requires no API key.',
    apiKeyDescription: 'Get free API key at https://freeimage.host/page/api',
    autoNewlineAfterImage: 'Auto Line Spacing After Image',
    autoNewlineDescription:
      'Automatically add blank lines after inserting images for better formatting',
    imageAlignment: 'Image Alignment',
    imageAlignmentDescription: 'Set image alignment in the document',
    alignLeft: 'Left',
    alignCenter: 'Center',
    alignRight: 'Right',
    alignJustify: 'Justify',
    alignNone: 'None',
    useAlignParamOnCopy: 'Use Universal Format on Copy',
    useAlignParamDescription:
      'Convert alignment tags to universal align parameter format when copying to clipboard',
    formatAlignment: 'Format Alignment Tags',
    formatAlignmentTooltip: 'Convert universal format to recognizable alignment tags',

    // Time options
    halfSecond: '0.5s',
    oneSecond: '1s',
    twoSeconds: '2s',
    threeSeconds: '3s',
    fiveSeconds: '5s',
    oneDay: '1 day',
    sevenDays: '7 days',
    thirtyDays: '30 days',
    neverExpire: 'Never expire',

    // File utils error messages
    selectTextFile: 'Please select a text file (.txt or .bbcode)',
    fileTooLarge: 'File too large, please select a file smaller than 5MB',
    fileReadFailed: 'File reading failed',

    // Image upload proxy related
    pleaseConfigureApiKey: 'Please configure FreeImage.host API key in settings',
    uploadFailedHttp: 'Upload failed',
    freeimageUploadFailed: 'FreeImage upload failed',
    unknownError: 'Unknown error',
    pleaseSelectImageFile: 'Please select an image file to upload',
    unsupportedImageHost: 'Unsupported image host type',
    viaProxy: 'Upload via proxy, supports large files',
    localTestNotUpload: 'Generate local preview, no actual upload',

    // Settings panel buttons
    resetSettings: 'Reset Settings',
    saveSettings: 'Save Settings',

    // API key acquisition prompt
    getApiKeyAt: 'Get your API key at',
    freeimageApiPage: 'FreeImage.host API page',
    getYourApiKey: 'Get your API key',

    // Setting item labels
    imageInsertOptions: 'Image Insert Options',
    exportOptions: 'Export Options',

    // Image drop zone error messages
    onlyImageFilesUpload: 'Only image files are supported for upload',
    uploadFailedWithError: 'Upload failed',
    unknownErrorFallback: 'Unknown error',
    partialUploadFailed: 'Partial upload failed',
    pleaseEnterValidImageLink: 'Please enter a valid image link',
    invalidUrlFormat: 'Invalid link format, please enter a complete URL',
    notImageFileConfirmation:
      'This link may not be an image file, are you sure you want to insert it?',
  },
}

/**
 * 获取当前语言
 * @returns {string} 当前语言代码
 */
export function getCurrentLanguage() {
  const lang = localStorage.getItem('language') || 'zh'
  return lang === 'zh' ? 'zh-cn' : lang === 'en' ? 'en' : 'zh-cn'
}

/**
 * 翻译文本
 * @param {string} key - 翻译键
 * @param {string} fallback - 降级文本（可选）
 * @returns {string} 翻译后的文本
 */
export function t(key, fallback = null) {
  const currentLang = getCurrentLanguage()
  const translation = translations[currentLang]?.[key]

  if (translation) {
    return translation
  }

  // 如果当前语言没有翻译，尝试使用英文
  if (currentLang !== 'en') {
    const englishTranslation = translations['en']?.[key]
    if (englishTranslation) {
      return englishTranslation
    }
  }

  // 如果都没有，返回降级文本或键名
  return fallback || key
}

/**
 * 创建响应式翻译函数
 * 用于在Vue组件中使用，会自动响应语言变化
 * @returns {Object} 包含翻译函数的对象
 */
export function useTranslation() {
  return {
    t: (key, fallback = null) => t(key, fallback),
  }
}

/**
 * 检查是否支持某种语言
 * @param {string} lang - 语言代码
 * @returns {boolean} 是否支持
 */
export function isSupportedLanguage(lang) {
  const normalizedLang = lang === 'zh' ? 'zh-cn' : lang
  return Object.keys(translations).includes(normalizedLang)
}

/**
 * 获取所有支持的语言
 * @returns {Array} 支持的语言列表
 */
export function getSupportedLanguages() {
  return [
    { code: 'zh-cn', name: '简体中文', shortCode: 'zh' },
    { code: 'en', name: 'English', shortCode: 'en' },
  ]
}

// 默认导出
export default {
  t,
  useTranslation,
  getCurrentLanguage,
  isSupportedLanguage,
  getSupportedLanguages,
}
