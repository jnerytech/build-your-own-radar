#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')

const [, , csvPath, outputPath = 'radar-output.html'] = process.argv

if (!csvPath) {
  console.error('Usage: radar-html <input.csv> [output.html]')
  process.exit(1)
}

const csvAbsPath = path.resolve(csvPath)
if (!fs.existsSync(csvAbsPath)) {
  console.error(`Error: CSV file not found: ${csvAbsPath}`)
  process.exit(1)
}

const standaloneDir = path.resolve(__dirname, '..', 'dist', 'standalone')
const templatePath = path.join(standaloneDir, 'index.html')
if (!fs.existsSync(templatePath)) {
  console.error('Error: standalone template not found. Run: npm run build:standalone')
  process.exit(1)
}

const csvContent = fs.readFileSync(csvAbsPath, 'utf8')
let html = fs.readFileSync(templatePath, 'utf8')

// Inline the JS bundle: replace <script defer src="standalone/main.HASH.js"> with inline <script>
const scriptSrcMatch = html.match(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/)
if (scriptSrcMatch) {
  const jsSrc = scriptSrcMatch[1] // e.g. "standalone/main.HASH.js"
  const jsPath = path.resolve(__dirname, '..', 'dist', jsSrc)
  if (!fs.existsSync(jsPath)) {
    console.error(`Error: JS bundle not found at ${jsPath}`)
    process.exit(1)
  }
  const jsContent = fs.readFileSync(jsPath, 'utf8').replace(/<\/script>/gi, '<\\/script>')
  html = html.replace(scriptSrcMatch[0], () => `<script>${jsContent}</script>`)
}

// Inject radar data before the bundle so Factory() reads it at startup
const dataScript = `<script>window.__RADAR_DATA__ = ${JSON.stringify(csvContent).replace(/<\/script>/gi, '<\\/script>')};</script>`
html = html.replace('<script>', () => `${dataScript}\n<script>`)

// Inline static images: replace "/images/filename" anywhere in the final HTML (template + bundle JS strings)
const srcImagesDir = path.resolve(__dirname, '..', 'src', 'images')
const mimeTypes = { png: 'image/png', ico: 'image/x-icon', svg: 'image/svg+xml', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' }
const imageFiles = fs.readdirSync(srcImagesDir)
for (const imgFile of imageFiles) {
  const ext = imgFile.split('.').pop().toLowerCase()
  const mime = mimeTypes[ext]
  if (!mime) continue
  const filePath = path.join(srcImagesDir, imgFile)
  const b64 = fs.readFileSync(filePath).toString('base64')
  const dataUri = `data:${mime};base64,${b64}`
  const escaped = imgFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  html = html.replace(new RegExp(`/images/${escaped}`, 'g'), () => dataUri)
}

const outputAbsPath = path.resolve(outputPath)
fs.writeFileSync(outputAbsPath, html, 'utf8')
console.log(outputAbsPath)
