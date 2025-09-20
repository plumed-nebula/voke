<template>
  <div class="settings-overlay" v-if="visible" @click="closeSettings">
    <div class="settings-panel" @click.stop>
      <!-- 设置面板头部 -->
      <div class="settings-header">
        <h2 class="settings-title">
          <svg class="settings-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"
            />
          </svg>
          {{ t('settings') }}
        </h2>
        <button class="close-button" @click="closeSettings" :title="t('close')">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>

      <!-- 设置内容 -->
      <div class="settings-content">
        <!-- 编辑器设置 -->
        <div class="setting-section">
          <h3 class="section-title">{{ t('generalSettings') }}</h3>

          <div class="setting-item">
            <label class="setting-label">{{ t('autoSaveDelay') }}</label>
            <div class="setting-control">
              <select v-model="localSettings.autoSaveDelay" class="select-input">
                <option value="500">{{ t('halfSecond') }}</option>
                <option value="1000">{{ t('oneSecond') }}</option>
                <option value="2000">{{ t('twoSeconds') }}</option>
                <option value="3000">{{ t('threeSeconds') }}</option>
                <option value="5000">{{ t('fiveSeconds') }}</option>
              </select>
            </div>
            <p class="setting-description">{{ t('autoSaveDelayDesc') }}</p>
          </div>
        </div>

        <!-- 存储设置 -->
        <div class="setting-section">
          <h3 class="section-title">{{ t('storageSettings') }}</h3>

          <!-- 安全警告 -->
          <div class="security-warning">
            {{ t('storageSecurityWarning') }}
          </div>

          <div class="setting-item">
            <label class="setting-label">{{ t('storageExpiry') }}</label>
            <div class="setting-control">
              <select v-model="localSettings.storageExpiry" class="select-input">
                <option value="86400000">{{ t('oneDay') }}</option>
                <option value="604800000">{{ t('sevenDays') }}</option>
                <option value="2592000000">{{ t('thirtyDays') }}</option>
                <option value="0">{{ t('neverExpire') }}</option>
              </select>
            </div>
            <p class="setting-description">{{ t('storageExpiryDesc') }}</p>
          </div>

          <div class="setting-item">
            <label class="setting-label">{{ t('clearLocalData') }}</label>
            <div class="setting-control">
              <button @click="clearLocalData" class="danger-button" :disabled="clearing">
                {{ clearing ? t('clearing') : t('clearAllLocalData') }}
              </button>
            </div>
            <p class="setting-description">{{ t('clearDescription') }}</p>
          </div>
        </div>

        <!-- 图床设置 -->
        <div class="setting-section">
          <h3 class="section-title">{{ t('imageUploadSettings') }}</h3>

          <div class="setting-item">
            <label class="setting-label">{{ t('defaultImageHost') }}</label>
            <div class="setting-control">
              <select v-model="localSettings.imageHost" class="select-input">
                <option value="local">{{ t('localTest') }}</option>
                <option value="freeimage">{{ t('freeimageHost') }}</option>
                <option value="sda1">{{ t('sda1Host') }}</option>
              </select>
            </div>
            <p class="setting-description">
              {{ t('imageHostDescription') }}
            </p>
          </div>

          <div class="setting-item" v-if="localSettings.imageHost === 'freeimage'">
            <label class="setting-label">{{ t('freeimageApiKey') }}</label>
            <div class="setting-control">
              <div class="input-group">
                <input
                  v-model="localSettings.freeimageApiKey"
                  :type="showApiKey ? 'text' : 'password'"
                  class="text-input"
                  :placeholder="t('apiKeyPlaceholder')"
                  autocomplete="off"
                />
                <button
                  type="button"
                  class="input-button"
                  @click="showApiKey = !showApiKey"
                  :title="showApiKey ? t('hideApiKey') : t('showApiKey')"
                >
                  <svg v-if="showApiKey" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"
                    />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.38,7 12,7Z"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <p class="setting-description">
              {{ t('getApiKeyAt') }}
              <a href="https://freeimage.host/page/api" target="_blank" rel="noopener">{{
                t('freeimageApiPage')
              }}</a>
              {{ t('getYourApiKey') }}
            </p>
          </div>

          <div class="setting-item">
            <label class="setting-label">{{ t('imageInsertOptions') }}</label>
            <div class="setting-control">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="localSettings.autoNewlineAfterImage"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                {{ t('autoNewlineAfterImage') }}
              </label>
            </div>
            <p class="setting-description">{{ t('autoNewlineDescription') }}</p>
          </div>

          <div class="setting-item">
            <label class="setting-label">{{ t('imageAlignment') }}</label>
            <div class="setting-control">
              <select v-model="localSettings.imageAlignment" class="select-input">
                <option value="none">{{ t('alignNone') }}</option>
                <option value="left">{{ t('alignLeft') }}</option>
                <option value="center">{{ t('alignCenter') }}</option>
                <option value="right">{{ t('alignRight') }}</option>
                <option value="justify">{{ t('alignJustify') }}</option>
              </select>
            </div>
            <p class="setting-description">{{ t('imageAlignmentDescription') }}</p>
          </div>
        </div>

        <!-- 导出选项 -->
        <div class="setting-section">
          <h3 class="section-title">{{ t('exportOptions') }}</h3>

          <div class="setting-item">
            <label class="setting-label">{{ t('useAlignParamOnCopy') }}</label>
            <div class="setting-control">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="localSettings.useAlignParamOnCopy"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                {{ t('useAlignParamOnCopy') }}
              </label>
            </div>
            <p class="setting-description">{{ t('useAlignParamDescription') }}</p>
          </div>
        </div>
      </div>

      <!-- 设置面板底部 -->
      <div class="settings-footer">
        <button @click="resetSettings" class="secondary-button">{{ t('resetSettings') }}</button>
        <button @click="saveSettings" class="primary-button">{{ t('saveSettings') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useTranslation } from '../utils/i18n.js'

// 国际化
const { t } = useTranslation()

/**
 * 组件属性定义
 */
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  settings: {
    type: Object,
    default: () => ({
      autoSaveDelay: 1000,
      storageExpiry: 604800000, // 7天
      imageHost: 'freeimage',
      freeimageApiKey: '',
      autoNewlineAfterImage: false,
      imageAlignment: 'none',
      useAlignParamOnCopy: false,
    }),
  },
  currentTheme: {
    type: String,
    default: 'light',
  },
  currentLanguage: {
    type: String,
    default: 'zh-cn',
  },
  autoSaveEnabled: {
    type: Boolean,
    default: false,
  },
})

/**
 * 组件事件定义
 */
const emit = defineEmits(['close', 'save', 'clear-data'])

/**
 * 本地设置状态
 */
const localSettings = ref({ ...props.settings })
const clearing = ref(false)
const showApiKey = ref(false)

/**
 * 监听外部设置变化
 */
watch(
  () => props.settings,
  (newSettings) => {
    localSettings.value = { ...newSettings }
  },
  { deep: true },
)

/**
 * 关闭设置面板
 */
const closeSettings = () => {
  emit('close')
}

/**
 * 保存设置
 */
const saveSettings = () => {
  emit('save', { ...localSettings.value })
  closeSettings()
}

/**
 * 重置设置
 */
const resetSettings = () => {
  localSettings.value = {
    autoSaveDelay: 1000,
    storageExpiry: 604800000,
    imageHost: 'freeimage',
    freeimageApiKey: '',
    autoNewlineAfterImage: false,
    imageAlignment: 'none',
    useAlignParamOnCopy: false,
  }
}

/**
 * 清除本地数据
 */
const clearLocalData = async () => {
  clearing.value = true
  try {
    emit('clear-data')
    // 模拟清除过程
    await new Promise((resolve) => setTimeout(resolve, 1000))
  } finally {
    clearing.value = false
  }
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.settings-panel {
  background: var(--bg-color, white);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  background: var(--header-bg, #f9fafb);
}

.settings-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color, #1f2937);
}

.settings-icon {
  width: 24px;
  height: 24px;
}

.close-button {
  background: none;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-color, #6b7280);
  transition: all 0.2s ease;
}

.close-button:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--text-color, #374151);
}

.close-button svg {
  width: 20px;
  height: 20px;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.setting-section {
  padding: 24px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.setting-section:last-child {
  border-bottom: none;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color, #1f2937);
}

.setting-item {
  margin-bottom: 24px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color, #374151);
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-input {
  flex: 1;
  max-width: 200px;
}

.select-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 6px;
  background: var(--bg-color, white);
  color: var(--text-color, #1f2937);
  font-size: 14px;
}

.setting-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary-color, #3b82f6);
  min-width: 60px;
}

.setting-description {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: var(--text-muted, #6b7280);
}

.danger-button {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.danger-button:hover:not(:disabled) {
  background: #dc2626;
}

.danger-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* 安全警告样式 */
.security-warning {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 20px;
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

[data-theme='dark'] .security-warning {
  background: #450a0a;
  border-color: #7f1d1d;
  color: #f87171;
}

.settings-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  background: var(--footer-bg, #f9fafb);
}

.secondary-button {
  padding: 10px 20px;
  background: transparent;
  color: var(--text-color, #6b7280);
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-button:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--text-color, #374151);
}

.primary-button {
  padding: 10px 20px;
  background: var(--primary-color, #3b82f6);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.primary-button:hover {
  background: var(--primary-hover, #2563eb);
}

/* 暗色主题支持 */
:global([data-theme='dark']) .settings-panel {
  --bg-color: #1f2937;
  --header-bg: #111827;
  --footer-bg: #111827;
  --text-color: #f9fafb;
  --text-muted: #9ca3af;
  --border-color: #374151;
  --hover-bg: #374151;
  --primary-color: #60a5fa;
  --primary-hover: #3b82f6;
}

/* 输入组样式 */
.input-group {
  display: flex;
  width: 100%;
}

.text-input {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-primary, #d1d5db);
  border-right: none;
  border-radius: var(--radius-md, 6px) 0 0 var(--radius-md, 6px);
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #111827);
  font-size: 14px;
  transition: border-color 0.2s ease;
}

[data-theme='dark'] .text-input {
  background: #374151;
  color: #f9fafb;
  border-color: #4b5563;
}

.text-input:focus {
  outline: none;
  border-color: var(--brand-primary, #3b82f6);
}

.text-input::placeholder {
  color: var(--text-muted, #6b7280);
}

[data-theme='dark'] .text-input::placeholder {
  color: #9ca3af;
}

.input-button {
  padding: var(--space-sm);
  border: 1px solid var(--border-primary, #d1d5db);
  border-left: none;
  border-radius: 0 var(--radius-md, 6px) var(--radius-md, 6px) 0;
  background: var(--bg-secondary, #f9fafb);
  color: var(--text-muted, #6b7280);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

[data-theme='dark'] .input-button {
  background: #4b5563;
  color: #9ca3af;
  border-color: #4b5563;
}

.input-button:hover {
  background: var(--brand-primary, #3b82f6);
  color: white;
}

.input-button svg {
  width: 16px;
  height: 16px;
}

/* 复选框样式 */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 8px);
  margin-bottom: var(--space-sm, 8px);
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary, #111827);
}

[data-theme='dark'] .checkbox-label {
  color: #f9fafb;
}

.checkbox-label:last-child {
  margin-bottom: 0;
}

.checkbox-input {
  display: none;
}

.checkbox-custom {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-primary, #d1d5db);
  border-radius: 3px;
  background: var(--bg-primary, #ffffff);
  position: relative;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

[data-theme='dark'] .checkbox-custom {
  background: #374151;
  border-color: #4b5563;
}

.checkbox-input:checked + .checkbox-custom {
  background: var(--brand-primary, #3b82f6);
  border-color: var(--brand-primary, #3b82f6);
}

.checkbox-input:checked + .checkbox-custom::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 0px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label:hover .checkbox-custom {
  border-color: var(--brand-primary, #3b82f6);
}

/* 链接样式 */
.setting-description a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.2s ease;
}

.setting-description a:hover {
  color: var(--primary-hover);
  text-decoration: underline;
}
</style>
