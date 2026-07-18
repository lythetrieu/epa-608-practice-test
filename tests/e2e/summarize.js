// Turn the Playwright JSON report into a readable failure summary.
//   node tests/e2e/summarize.js          -> plain text (terminal)
//   node tests/e2e/summarize.js --md     -> GitHub-flavoured markdown
const fs = require('fs')
const path = require('path')

const REPORT = path.join(__dirname, 'report', 'results.json')
const md = process.argv.includes('--md')

if (!fs.existsSync(REPORT)) {
  console.log(md ? '_No report produced (the run crashed before tests started)._' : 'no report found')
  process.exit(0)
}

const r = JSON.parse(fs.readFileSync(REPORT, 'utf8'))
const fails = []
let passed = 0
let skipped = 0

function walk(s) {
  ;(s.suites || []).forEach(walk)
  ;(s.specs || []).forEach((sp) => {
    sp.tests.forEach((t) => {
      t.results.forEach((res) => {
        if (res.status === 'passed') passed++
        else if (res.status === 'skipped') skipped++
        else {
          const msg =
            (res.error && res.error.message) ||
            (res.errors || []).map((e) => e.message).join('\n') ||
            res.status
          fails.push({ file: sp.file || '', title: sp.title, project: t.projectName || '', err: String(msg) })
        }
      })
    })
  })
}
;(r.suites || []).forEach(walk)

const strip = (s) => s.replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'), '')
// The first line of a Playwright error carries the useful assertion message.
const headline = (s) =>
  strip(s)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' — ')
    .slice(0, 300)

// Which layer does a spec belong to? Keeps the summary skimmable.
const LAYER = [
  [/01-smoke/, 'Function'],
  [/02-gating/, 'Function · paywall'],
  [/03-abuse/, 'Security'],
  [/04-winding|05-quiz|06-progress/, 'Function'],
  [/10-data/, 'Data integrity'],
  [/11-canonical/, 'EPA facts'],
  [/12-security/, 'Security'],
  [/13-a11y/, 'A11y / UX'],
  [/14-content/, 'Content'],
]
const layerOf = (file) => (LAYER.find(([re]) => re.test(file)) || [null, 'Other'])[1]

if (md) {
  console.log(`## QA run — ${fails.length ? '❌ ' + fails.length + ' failing' : '✅ all green'}`)
  console.log('')
  console.log(`\`${passed}\` passed · \`${fails.length}\` failed · \`${skipped}\` skipped`)
  console.log('')
  if (fails.length) {
    console.log('| Layer | Test | What broke |')
    console.log('|---|---|---|')
    for (const f of fails.slice(0, 40)) {
      const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
      console.log(`| ${cell(layerOf(f.file))} | ${cell(f.title)}${f.project ? ` <sub>${cell(f.project)}</sub>` : ''} | ${cell(headline(f.err))} |`)
    }
    if (fails.length > 40) console.log(`\n_…and ${fails.length - 40} more._`)
    console.log('')
    console.log('> Video + trace for each failure are in the **qa-report** artifact on this run.')
  }
} else {
  fails.forEach((f, i) => {
    console.log('======== FAIL ' + (i + 1) + ': ' + f.title)
    console.log(strip(f.err).split('\n').slice(0, 14).join('\n'))
    console.log()
  })
  console.log(`total: ${passed} passed, ${fails.length} failed, ${skipped} skipped`)
}

process.exitCode = 0
