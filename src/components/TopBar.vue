<template>
  <header class="top-bar">
    <div class="top-bar-content">
      <!-- Logo/Title -->
      <div class="brand">
        <h1>BBCode Editor</h1>
      </div>

      <!-- Controls -->
      <div class="controls">
        <!-- Language Selector -->
        <div class="control-group">
          <label class="control-label">{{ t('language') }}:</label>
          <div class="custom-select-wrapper">
            <div
              class="custom-select"
              :class="{ 'is-open': isLanguageDropdownOpen }"
              @click="toggleLanguageDropdown"
            >
              <div class="select-display">
                <span class="select-text">{{ getLanguageDisplayText(currentLanguage) }}</span>
                <svg
                  class="select-arrow"
                  :class="{ rotated: isLanguageDropdownOpen }"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </div>
              <div class="select-dropdown" v-show="isLanguageDropdownOpen">
                <div
                  class="select-option"
                  :class="{ selected: currentLanguage === 'zh-cn' }"
                  @click="selectLanguage('zh-cn')"
                >
                  简体中文
                </div>
                <div
                  class="select-option"
                  :class="{ selected: currentLanguage === 'en' }"
                  @click="selectLanguage('en')"
                >
                  English
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- File Operations -->
        <div class="control-group file-operations">
          <label class="control-label">{{ t('fileOperations') }}:</label>
          <div class="file-buttons-group">
            <button class="file-button new-file-btn" @click="newDocument" :title="t('newDocument')">
              <svg class="file-icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                />
                <path d="M12,8V14H14V8H16L13,5L10,8H12Z" />
              </svg>
              <span class="file-text">{{ t('newFile') }}</span>
            </button>

            <button class="file-button save-file-btn" @click="saveToFile" :title="t('saveToFile')">
              <svg class="file-icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                />
                <path d="M12,19L8,15H10.5V12H13.5V15H16L12,19Z" />
              </svg>
              <span class="file-text">{{ t('saveFile') }}</span>
            </button>

            <button
              class="file-button load-file-btn"
              @click="loadFromFile"
              :title="t('loadFromFile')"
            >
              <svg class="file-icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                />
                <path d="M12,11L16,15H13.5V18H10.5V15H8L12,11Z" />
              </svg>
              <span class="file-text">{{ t('loadFile') }}</span>
            </button>
          </div>
        </div>

        <!-- Auto Save Toggle -->
        <div class="control-group">
          <label class="control-label">{{ t('autoSave') }}:</label>
          <button
            class="auto-save-toggle"
            @click="toggleAutoSave"
            :class="{ active: autoSaveEnabled }"
            :title="autoSaveEnabled ? t('disableAutoSave') : t('enableAutoSave')"
          >
            <svg class="save-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"
              />
            </svg>
            <span class="save-text">{{ autoSaveEnabled ? t('on') : t('off') }}</span>
          </button>
        </div>

        <!-- Save Status Indicator -->
        <div class="control-group" v-if="autoSaveEnabled">
          <div class="save-status" :class="saveStatus" :title="getSaveStatusText()">
            <svg class="status-icon" viewBox="0 0 24 24" fill="currentColor">
              <!-- Saved icon (check) -->
              <path
                v-if="saveStatus === 'saved'"
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
              />
              <!-- Saving icon (loading) -->
              <path
                v-else-if="saveStatus === 'saving'"
                d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6z"
              />
              <!-- Unsaved icon (dot) -->
              <circle v-else-if="saveStatus === 'unsaved'" cx="12" cy="12" r="8" />
            </svg>
            <span class="status-text">{{ getSaveStatusText() }}</span>
          </div>
        </div>

        <!-- Theme Toggle Button -->
        <div class="control-group">
          <button
            class="theme-toggle"
            @click="toggleTheme"
            :title="isDark ? t('switchToLight') : t('switchToDark')"
          >
            <svg class="theme-icon" viewBox="0 0 24 24" fill="currentColor">
              <!-- Sun icon -->
              <path
                v-if="isDark"
                class="sun-icon"
                d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"
              />
              <!-- Moon icon -->
              <path
                v-else
                class="moon-icon"
                d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
              />
            </svg>
            <span class="theme-text">{{ isDark ? t('light') : t('dark') }}</span>
          </button>
        </div>

        <!-- Settings Button -->
        <div class="control-group">
          <button class="settings-button" @click="openSettings" :title="t('settings')">
            <svg class="settings-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"
              />
            </svg>
            <span class="settings-text">{{ t('settings') }}</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useTranslation } from '../utils/i18n.js'

// 国际化
const { t } = useTranslation()

// ===== Props =====
const props = defineProps({
  saveStatus: {
    type: String,
    default: 'saved',
    validator: (value) => ['saved', 'saving', 'unsaved'].includes(value),
  },
  autoSaveEnabled: {
    type: Boolean,
    default: false,
  },
  currentLanguage: {
    type: String,
    default: 'zh',
  },
  currentTheme: {
    type: String,
    default: 'light',
    validator: (value) => ['light', 'dark'].includes(value),
  },
})

// ===== 响应式状态 =====
const isLanguageDropdownOpen = ref(false)

// 使用计算属性映射props到本地状态
const saveStatus = computed(() => props.saveStatus)
const autoSaveEnabled = computed(() => props.autoSaveEnabled)
const currentLanguage = computed(() => {
  // 映射语言格式
  const lang = props.currentLanguage
  return lang === 'zh' ? 'zh-cn' : lang === 'en' ? 'en' : 'zh-cn'
})
const isDark = computed(() => props.currentTheme === 'dark')

// ===== 主题管理 =====
// 获取保存状态文本
const getSaveStatusText = () => {
  return t(saveStatus.value)
}

// ===== 事件处理 =====
const emit = defineEmits([
  'toggle-theme',
  'toggle-auto-save',
  'change-language',
  'save-to-file',
  'load-from-file',
  'new-document',
  'open-settings',
])

function toggleTheme() {
  emit('toggle-theme')
}

function toggleAutoSave() {
  emit('toggle-auto-save')
}

// ===== 自定义下拉框方法 =====
function toggleLanguageDropdown() {
  isLanguageDropdownOpen.value = !isLanguageDropdownOpen.value
}

function selectLanguage(language) {
  isLanguageDropdownOpen.value = false
  // 转换格式：zh-cn -> zh, en -> en
  const mappedLanguage = language === 'zh-cn' ? 'zh' : language
  emit('change-language', mappedLanguage)
}

function getLanguageDisplayText(language) {
  return language === 'zh-cn' ? '简体中文' : 'English'
}

function closeDropdownOnOutsideClick(event) {
  if (!event.target.closest('.custom-select-wrapper')) {
    isLanguageDropdownOpen.value = false
  }
}

/**
 * 新建文档
 */
function newDocument() {
  emit('new-document')
}

/**
 * 保存到文件
 */
function saveToFile() {
  emit('save-to-file')
}

/**
 * 从文件加载
 */
function loadFromFile() {
  emit('load-from-file')
}

/**
 * 打开设置
 */
function openSettings() {
  emit('open-settings')
}

// ===== 监听器 =====
// 监听关键状态变化，重新计算顶栏高度
watch(
  [() => props.autoSaveEnabled, () => props.saveStatus],
  () => {
    updateTopbarHeight()
  },
  { flush: 'post' },
)

// ===== 初始化 =====
onMounted(() => {
  updateTopbarHeight()
  // 监听窗口大小变化
  window.addEventListener('resize', updateTopbarHeight)
  // 监听外部点击关闭下拉框
  document.addEventListener('click', closeDropdownOnOutsideClick)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateTopbarHeight)
  document.removeEventListener('click', closeDropdownOnOutsideClick)
})

/**
 * 更新顶栏高度CSS变量
 */
function updateTopbarHeight() {
  nextTick(() => {
    const topbarElement = document.querySelector('.top-bar')
    if (topbarElement) {
      const height = topbarElement.offsetHeight
      document.documentElement.style.setProperty('--topbar-height', `${height}px`)
    }
  })
}
</script>

<style scoped>
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--topbar-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--topbar-border);
  box-shadow: 0 2px 10px var(--topbar-shadow);
  transition: all 0.3s ease;
  /* 对齐调节变量，可根据不同平台字体渲染微调 */
  --topbar-title-adjust: -2px; /* 负值表示向上移动 */
  --topbar-button-adjust: 0px; /* 如按钮显得偏低可设为 -1px */
}

.top-bar-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 20px;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand {
  display: flex;
  align-items: center;
}

.brand h1 {
  /* 视觉标题样式 */
  margin: 0 !important;
  padding: 0 !important;
  font-size: 1.5rem !important;
  font-weight: 600 !important;
  color: var(--topbar-text) !important;
  background: var(--brand-gradient) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  line-height: 1.05 !important; /* 略放大减少底部空白 */
  /* 使用 transform 代替 top，避免定位上下文差异 */
  transform: translateY(var(--topbar-title-adjust)) !important;
  /* 让 GPU 参与，有助于某些平台的文字像素 snapping */
  will-change: transform !important;
}

.controls {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  flex-wrap: wrap;
  flex: 1;
  justify-content: flex-end;
}

.control-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  white-space: nowrap;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--topbar-text);
  margin: 0;
}

/* 自定义下拉选择器样式 */
.custom-select-wrapper {
  position: relative;
  display: inline-block;
}

.custom-select {
  position: relative;
  min-width: 120px;
  cursor: pointer;
  user-select: none;
}

.select-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--button-bg);
  border: 1px solid var(--button-border);
  border-radius: var(--radius-md);
  color: var(--button-text);
  font-size: 14px;
  font-family: var(--font-family);
  transition: all var(--duration-fast) var(--timing-ease);
  gap: var(--space-sm);
}

.custom-select:hover .select-display {
  background: var(--button-hover-bg);
  border-color: var(--button-hover-border);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.custom-select.is-open .select-display {
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.select-text {
  flex: 1;
  white-space: nowrap;
}

.select-arrow {
  width: 16px;
  height: 16px;
  transition: transform var(--duration-fast) var(--timing-ease);
  flex-shrink: 0;
}

.select-arrow.rotated {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-surface);
  border: 1px solid var(--border-focus);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 1001;
  overflow: hidden;
  animation: dropdownSlideDown 0.2s ease-out;
}

@keyframes dropdownSlideDown {
  from {
    opacity: 0;
    transform: translateY(-8px) scaleY(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }
}

.select-option {
  padding: 10px 12px;
  font-size: 14px;
  font-family: var(--font-family);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--timing-ease);
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-primary);
}

.select-option:last-child {
  border-bottom: none;
}

.select-option:hover {
  background: var(--brand-primary);
  color: var(--text-inverse);
}

.select-option.selected {
  background: var(--bg-secondary);
  color: var(--brand-primary);
  font-weight: 500;
  position: relative;
}

.select-option.selected::after {
  content: '✓';
  margin-left: auto;
  color: var(--brand-primary);
  font-weight: bold;
}

.select-option.selected:hover {
  background: var(--brand-primary);
  color: var(--text-inverse);
}

.select-option.selected:hover::after {
  color: var(--text-inverse);
}

/* 自动保存按钮样式 */
.auto-save-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 8px 12px;
  background: var(--button-bg);
  border: 1px solid var(--button-border);
  border-radius: var(--radius-md);
  color: var(--button-text);
  cursor: pointer;
  transition: all var(--duration-fast) var(--timing-ease);
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  box-sizing: border-box;
  min-width: 80px;
}

.auto-save-toggle:hover {
  background: var(--button-hover-bg);
  border-color: var(--button-hover-border);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.auto-save-toggle.active {
  background: var(--brand-primary);
  color: var(--text-inverse);
  border-color: var(--brand-primary);
}

.auto-save-toggle.active:hover {
  background: var(--brand-secondary);
  border-color: var(--brand-secondary);
}

.save-icon {
  width: 16px;
  height: 16px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.save-text {
  font-size: 14px;
  white-space: nowrap;
  line-height: 1;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 16px 11px; /* 下边距略大，使视觉中心抬高 */
  background: var(--button-bg);
  border: 1px solid var(--button-border);
  border-radius: var(--radius-md);
  color: var(--button-text);
  cursor: pointer;
  transition: all var(--duration-fast) var(--timing-ease);
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  box-sizing: border-box;
  transform: translateY(var(--topbar-button-adjust));
  will-change: transform;
}

/* 调试辅助：如需观察对齐，可临时给父容器加 .debug-topbar 类 */
.debug-topbar .brand h1 {
  outline: 1px dashed rgba(255, 0, 0, 0.4);
}
.debug-topbar .theme-toggle {
  outline: 1px dashed rgba(0, 128, 255, 0.4);
}

.theme-toggle:hover {
  background: var(--button-hover-bg);
  border-color: var(--button-hover-border);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--button-shadow);
}

.theme-toggle:active {
  transform: translateY(0);
}

.theme-icon {
  width: 16px;
  height: 16px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.sun-icon,
.moon-icon {
  fill: currentColor;
}

.theme-text {
  font-size: 14px;
  white-space: nowrap;
  line-height: 1;
}

/* 文件操作按钮样式 */
.file-operations {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-buttons-group {
  display: flex;
  background: var(--button-bg);
  border: 1px solid var(--button-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.file-button {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 8px 14px;
  background: transparent;
  border: none;
  color: var(--button-text);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  transition: all var(--duration-fast) var(--timing-ease);
  white-space: nowrap;
  position: relative;
  transform: translateY(var(--topbar-button-adjust));
}

.file-button::after {
  content: '';
  position: absolute;
  right: 0;
  top: 20%;
  bottom: 20%;
  width: 1px;
  background: var(--button-border);
  transition: all var(--duration-fast) var(--timing-ease);
}

.file-button:last-child::after {
  display: none;
}

.file-button:hover {
  background: var(--button-hover-bg);
  transform: translateY(-1px);
}

.file-button:hover::after {
  opacity: 0;
}

.file-button:active {
  transform: translateY(0);
}

.file-icon {
  width: 16px;
  height: 16px;
  transition: all 0.3s ease;
  flex-shrink: 0;
  fill: currentColor;
}

.file-text {
  font-size: 14px;
  white-space: nowrap;
  line-height: 1;
}

.save-file-btn {
  color: var(--primary-color, #3b82f6);
}

.save-file-btn:hover {
  background: var(--primary-bg-light, rgba(59, 130, 246, 0.1));
  color: var(--primary-hover, #2563eb);
}

.load-file-btn {
  color: var(--secondary-color, #6b7280);
}

.load-file-btn:hover {
  background: var(--secondary-bg-light, rgba(107, 114, 128, 0.1));
  color: var(--secondary-hover, #4b5563);
}

/* 设置按钮样式 */
.settings-button {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 8px 12px;
  background: var(--button-bg);
  border: 1px solid var(--button-border);
  border-radius: var(--radius-md);
  color: var(--button-text);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  transition: all var(--duration-fast) var(--timing-ease);
  white-space: nowrap;
  transform: translateY(var(--topbar-button-adjust));
}

.settings-button:hover {
  background: var(--button-hover-bg);
  border-color: var(--button-hover-border);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--button-shadow);
}

.settings-button:active {
  transform: translateY(0);
}

.settings-icon {
  width: 16px;
  height: 16px;
  transition: all 0.3s ease;
  flex-shrink: 0;
  fill: currentColor;
}

.settings-text {
  font-size: 14px;
  white-space: nowrap;
  line-height: 1;
}

/* 保存状态指示器样式 */
.save-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  transition: all var(--duration-fast) var(--timing-ease);
  background: var(--button-bg);
  border: 1px solid var(--button-border);
}

.save-status.saved {
  color: var(--success-text, #10b981);
  border-color: var(--success-border, #10b981);
  background: var(--success-bg, rgba(16, 185, 129, 0.1));
}

.save-status.saving {
  color: var(--warning-text, #f59e0b);
  border-color: var(--warning-border, #f59e0b);
  background: var(--warning-bg, rgba(245, 158, 11, 0.1));
}

.save-status.unsaved {
  color: var(--error-text, #ef4444);
  border-color: var(--error-border, #ef4444);
  background: var(--error-bg, rgba(239, 68, 68, 0.1));
}

.status-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.save-status.saving .status-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.status-text {
  font-size: 12px;
  white-space: nowrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .top-bar-content {
    padding: 8px 16px;
    min-height: 56px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .brand {
    justify-content: center;
  }

  .brand h1 {
    font-size: 1.3rem;
  }

  .controls {
    justify-content: center;
    gap: var(--space-md);
  }

  .control-group {
    gap: var(--space-xs);
  }

  .theme-toggle {
    padding: 6px 12px;
    font-size: 0.8rem;
  }

  .theme-icon {
    width: 16px;
    height: 16px;
  }

  .file-buttons-group {
    flex-direction: column;
    gap: 0;
  }

  .file-button {
    padding: 8px 12px;
    font-size: 0.8rem;
    border-bottom: 1px solid var(--button-border);
  }

  .file-button:last-child {
    border-bottom: none;
  }

  .file-button::after {
    display: none;
  }
}

/* 更小屏幕的进一步优化 */
@media (max-width: 480px) {
  .top-bar-content {
    padding: 6px 12px;
    gap: 8px;
  }

  .controls {
    flex-direction: column;
    gap: 8px;
  }

  .control-group {
    width: 100%;
    justify-content: center;
  }

  .brand h1 {
    font-size: 1.2rem;
  }
}
</style>
