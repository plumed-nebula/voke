/**
 * 格式化工具模块
 * 用于处理编辑器内容的各种格式化功能
 * @author BBcode Editor Team
 * @version 1.0.0
 */

/**
 * 图片BBCode格式化选项
 * @typedef {Object} ImageFormatOptions
 * @property {boolean} autoNewline - 是否在图片后自动添加空行
 * @property {string} alignment - 图片排版方式 ('left', 'right', 'justify', 'none')
 */

/**
 * 格式化图片BBCode
 * @param {string} bbcode - 原始图片BBCode
 * @param {ImageFormatOptions} options - 格式化选项
 * @returns {string} 格式化后的BBCode
 */
export function formatImageBBCode(bbcode, options = {}) {
  if (!bbcode || typeof bbcode !== 'string') {
    return bbcode
  }

  let formattedCode = bbcode

  // 添加图片排版
  if (options.alignment && options.alignment !== 'none') {
    // 将基础的[img]url[/img]转换为带排版的格式
    formattedCode = formattedCode.replace(
      /(\[img\])([^[\]]+)(\[\/img\])/,
      `[${options.alignment}]$1$2$3[/${options.alignment}]`,
    )
  }

  // 在图片后添加换行
  if (options.autoNewline) {
    // 如果BBCode末尾没有换行符，则添加
    if (!formattedCode.endsWith('\n')) {
      formattedCode += '\n'
    }

    // 添加额外的换行来创建空行
    if (!formattedCode.endsWith('\n\n')) {
      formattedCode += '\n'
    }
  }

  return formattedCode
}

/**
 * 文本格式化选项
 * @typedef {Object} TextFormatOptions
 * @property {boolean} trimWhitespace - 是否移除首尾空白
 * @property {boolean} normalizeNewlines - 是否标准化换行符
 * @property {string} newlineStyle - 换行符样式 ('unix' | 'windows' | 'mac')
 */

/**
 * 格式化文本内容
 * @param {string} text - 原始文本
 * @param {TextFormatOptions} options - 格式化选项
 * @returns {string} 格式化后的文本
 */
export function formatText(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return text
  }

  let formattedText = text

  // 移除首尾空白
  if (options.trimWhitespace) {
    formattedText = formattedText.trim()
  }

  // 标准化换行符
  if (options.normalizeNewlines) {
    const newlineMap = {
      unix: '\n',
      windows: '\r\n',
      mac: '\r',
    }
    const targetNewline = newlineMap[options.newlineStyle] || '\n'

    // 先统一转换为\n，再转换为目标格式
    formattedText = formattedText.replace(/\r\n|\r|\n/g, '\n')
    if (targetNewline !== '\n') {
      formattedText = formattedText.replace(/\n/g, targetNewline)
    }
  }

  return formattedText
}

/**
 * BBCode格式化选项
 * @typedef {Object} BBCodeFormatOptions
 * @property {boolean} autoIndent - 是否自动缩进
 * @property {number} indentSize - 缩进大小（空格数）
 * @property {boolean} prettifyTags - 是否美化标签格式
 */

/**
 * 格式化BBCode内容
 * @param {string} bbcode - 原始BBCode
 * @param {BBCodeFormatOptions} options - 格式化选项
 * @returns {string} 格式化后的BBCode
 */
export function formatBBCode(bbcode, options = {}) {
  if (!bbcode || typeof bbcode !== 'string') {
    return bbcode
  }

  let formattedCode = bbcode

  // 美化标签格式
  if (options.prettifyTags) {
    // 标准化标签格式（转换为小写，规范化空格）
    formattedCode = formattedCode.replace(/\[([^\]]+)\]/g, (match, tagContent) => {
      // 保持原有的大小写，只规范化空格
      return `[${tagContent.trim()}]`
    })
  }

  // TODO: 实现自动缩进功能（可在后续版本中添加）
  // 这里可以添加更复杂的BBCode格式化逻辑

  return formattedCode
}

/**
 * 获取默认的图片格式化选项
 * @returns {ImageFormatOptions} 默认选项
 */
export function getDefaultImageFormatOptions() {
  return {
    autoNewline: false,
    alignment: 'none',
  }
}

/**
 * 合并格式化选项
 * @param {Object} defaultOptions - 默认选项
 * @param {Object} userOptions - 用户选项
 * @returns {Object} 合并后的选项
 */
export function mergeFormatOptions(defaultOptions, userOptions) {
  return {
    ...defaultOptions,
    ...userOptions,
  }
}

/**
 * 验证格式化选项
 * @param {Object} options - 待验证的选项
 * @param {string} type - 选项类型 ('image' | 'text' | 'bbcode')
 * @returns {boolean} 是否有效
 */
export function validateFormatOptions(options, type) {
  if (!options || typeof options !== 'object') {
    return false
  }

  switch (type) {
    case 'image':
      return typeof options.autoNewline === 'boolean' || typeof options.alignment === 'string'

    case 'text':
      return (
        typeof options.trimWhitespace === 'boolean' ||
        typeof options.normalizeNewlines === 'boolean' ||
        typeof options.newlineStyle === 'string'
      )

    case 'bbcode':
      return (
        typeof options.autoIndent === 'boolean' ||
        typeof options.indentSize === 'number' ||
        typeof options.prettifyTags === 'boolean'
      )

    default:
      return false
  }
}

// 导出格式化工具的默认配置
export const FORMAT_DEFAULTS = {
  IMAGE: {
    autoNewline: false,
    alignment: 'none',
  },
  TEXT: {
    trimWhitespace: false,
    normalizeNewlines: false,
    newlineStyle: 'unix',
  },
  BBCODE: {
    autoIndent: false,
    indentSize: 2,
    prettifyTags: false,
  },
}

/**
 * 将标准BBCode对齐标签转换为align参数格式
 * [left][/left] -> [align=left][/align]
 * [center][/center] -> [align=center][/align]
 * [right][/right] -> [align=right][/align]
 * [justify][/justify] -> [align=justify][/align]
 * @param {string} bbcode - 原始BBCode内容
 * @returns {string} 转换后的BBCode内容
 */
export function convertToAlignParam(bbcode) {
  if (!bbcode || typeof bbcode !== 'string') {
    return bbcode
  }

  const alignmentTags = ['left', 'center', 'right', 'justify']
  let convertedCode = bbcode

  // 处理每种对齐标签
  alignmentTags.forEach((align) => {
    // 匹配 [tag]内容[/tag] 格式并转换为 [align=tag]内容[/align]
    const regex = new RegExp(`\\[${align}\\]([\\s\\S]*?)\\[\\/${align}\\]`, 'g')
    convertedCode = convertedCode.replace(regex, `[align=${align}]$1[/align]`)
  })

  return convertedCode
}

/**
 * 将align参数格式转换为标准BBCode对齐标签
 * [align=left][/align] -> [left][/left]
 * [align=center][/align] -> [center][/center]
 * [align=right][/align] -> [right][/right]
 * [align=justify][/align] -> [justify][/justify]
 * @param {string} bbcode - 原始BBCode内容
 * @returns {string} 转换后的BBCode内容
 */
export function convertFromAlignParam(bbcode) {
  if (!bbcode || typeof bbcode !== 'string') {
    return bbcode
  }

  // 匹配 [align=对齐方式]内容[/align] 格式并转换为对应的标准标签
  const alignRegex = /\[align=(left|center|right|justify)\]([\s\S]*?)\[\/align\]/g

  const convertedCode = bbcode.replace(alignRegex, (match, alignValue, content) => {
    return `[${alignValue}]${content}[/${alignValue}]`
  })

  return convertedCode
}

/**
 * 批量格式化BBCode内容的对齐标签
 * @param {string} bbcode - BBCode内容
 * @param {string} direction - 转换方向 ('toParam' | 'fromParam')
 * @returns {string} 格式化后的内容
 */
export function formatAlignmentTags(bbcode, direction = 'toParam') {
  if (direction === 'toParam') {
    return convertToAlignParam(bbcode)
  } else if (direction === 'fromParam') {
    return convertFromAlignParam(bbcode)
  }
  return bbcode
}
