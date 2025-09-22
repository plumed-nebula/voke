import 'sceditor/minified/sceditor.min.js'
import 'sceditor/minified/formats/bbcode.js'

export const sceditor = window.sceditor

// 导出编辑器内容样式文件路径 - 使用public目录下的文件，确保生产环境可访问
export const contentStyleUrl = '/editor-content.css'
