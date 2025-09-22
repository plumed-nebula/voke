#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import process from 'process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const sourcePath = join(projectRoot, 'src', 'styles', 'editor-content.css')
const targetPath = join(projectRoot, 'public', 'editor-content.css')

try {
  const cssContent = readFileSync(sourcePath, 'utf8')
  writeFileSync(targetPath, cssContent, 'utf8')
  console.log('✅ Successfully synced editor-content.css to public directory')
} catch (error) {
  console.error('❌ Failed to sync CSS file:', error.message)
  process.exit(1)
}
