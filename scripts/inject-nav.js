#!/usr/bin/env node
/**
 * Injects header.html and footer.html directly into all static HTML pages.
 *
 * WHY: Google crawls raw HTML first. If nav is loaded via JS (includes.js),
 * Google may not see internal links → pages become orphans → no PageRank.
 *
 * HOW: Replaces placeholder divs with actual HTML content.
 * includes.js is kept for analytics only.
 *
 * USAGE: node scripts/inject-nav.js
 * RUN AFTER: Any change to header.html or footer.html
 */

const fs = require('fs')
const path = require('path')

const PUBLIC = path.join(__dirname, '..', 'public')

// Read header and footer source
const headerSrc = fs.readFileSync(path.join(PUBLIC, 'header.html'), 'utf-8')
const footerSrc = fs.readFileSync(path.join(PUBLIC, 'footer.html'), 'utf-8')

// Extract just the <header>...</header> part (skip head content like favicon/gtag)
const headerMatch = headerSrc.match(/<!-- Header -->[\s\S]*$/)
const headerHTML = headerMatch ? headerMatch[0].trim() : ''

const footerHTML = footerSrc.trim()

// Skip these files
const SKIP = new Set(['header.html', 'footer.html', 'favicon.html', 'google68ec010432371dbf.html'])

// Get all HTML files
const files = fs.readdirSync(PUBLIC).filter(f => f.endsWith('.html') && !SKIP.has(f))

let updated = 0
let skipped = 0

for (const file of files) {
  const filePath = path.join(PUBLIC, file)
  let html = fs.readFileSync(filePath, 'utf-8')
  let changed = false

  // Inject header: replace placeholder div with actual header HTML
  // Match both empty placeholder and previously injected content
  const headerPlaceholderRegex = /<div id="header-placeholder">[\s\S]*?<\/div>\s*(?=\n)/
  const headerPlaceholderEmpty = '<div id="header-placeholder"></div>'

  if (html.includes('id="header-placeholder"')) {
    const replacement = `<div id="header-placeholder">\n${headerHTML}\n</div>`

    if (html.includes(headerPlaceholderEmpty)) {
      html = html.replace(headerPlaceholderEmpty, replacement)
      changed = true
    } else if (headerPlaceholderRegex.test(html)) {
      html = html.replace(headerPlaceholderRegex, replacement)
      changed = true
    }
  }

  // Inject footer: same approach
  const footerPlaceholderEmpty = '<div id="footer-placeholder"></div>'
  const footerPlaceholderRegex = /<div id="footer-placeholder">[\s\S]*?<\/div>\s*(?=\n|<\/body>|$)/

  if (html.includes('id="footer-placeholder"')) {
    const replacement = `<div id="footer-placeholder">\n${footerHTML}\n</div>`

    if (html.includes(footerPlaceholderEmpty)) {
      html = html.replace(footerPlaceholderEmpty, replacement)
      changed = true
    } else if (footerPlaceholderRegex.test(html)) {
      html = html.replace(footerPlaceholderRegex, replacement)
      changed = true
    }
  }

  // Remove previously injected head content (favicon, gtag, GTM, Vercel, noscript)
  // that was added by older versions of this script
  const oldHeadContentRegex = /\n?<!-- Favicon -->[\s\S]*?(?=<style>|<\/head>)/
  if (oldHeadContentRegex.test(html)) {
    html = html.replace(oldHeadContentRegex, '\n')
    changed = true
  }

  // Inject GA/GTM if missing
  if (!html.includes('G-KJ8X1DQ1GT')) {
    const gaSnippet = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-KJ8X1DQ1GT"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-KJ8X1DQ1GT');
</script>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KTLNXJKN');</script>`
    html = html.replace('</head>', gaSnippet + '\n</head>')
    changed = true
  }

  if (changed) {
    fs.writeFileSync(filePath, html)
    updated++
    console.log(`✅ ${file}`)
  } else {
    skipped++
  }
}

console.log(`\nDone: ${updated} updated, ${skipped} unchanged, ${files.length} total`)
console.log('All pages now have hardcoded nav — Google will see internal links in raw HTML.')
