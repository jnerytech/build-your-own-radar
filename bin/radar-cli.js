#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')

const { version } = require('../package.json')

const args = process.argv.slice(2)
const clean = args.includes('--clean')

if (args.includes('--version') || args.includes('-v')) {
  console.log(version)
  process.exit(0)
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
radar-html v${version}

Generate a standalone HTML radar from a CSV file.

Usage:
  radar-html [options] <input.csv> [output.html]
  radar-clean [options] <input.csv> [output.html]

Options:
  --clean       Remove Thoughtworks branding, footer and print button
  --version, -v Show version
  --help,    -h Show this help

CSV format:
  name,ring,quadrant,isNew,description

  ring     : Adopt | Trial | Assess | Caution | Hold
  quadrant : Languages & Frameworks | Tools | Platforms | Techniques
  isNew    : TRUE | FALSE

Examples:
  radar-html meu-radar.csv
  radar-clean meu-radar.csv output.html
  radar-html --clean meu-radar.csv
`)
  process.exit(0)
}

const positional = args.filter((a) => !a.startsWith('--'))
const [csvPath, outputPath = 'radar-output.html'] = positional

if (!csvPath) {
  console.error('Usage: radar-html [--clean] <input.csv> [output.html]')
  console.error('       radar-html --help for more information')
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

if (clean) {
  const cleanCss = `<style>
    #footer, .footer-content,
    .print-radar-btn, .print-radar,
    .buttons__wave-btn, .buttons__flamingo-btn,
    .radar-title__logo,
    .input-sheet__logo,
    .hero-banner__title-text a[href*="thoughtworks"] { display: none !important; }
  </style>`
  html = html.replace('</head>', () => `${cleanCss}\n</head>`)
}

const outputAbsPath = path.resolve(outputPath)
fs.writeFileSync(outputAbsPath, html, 'utf8')
console.log(outputAbsPath)
