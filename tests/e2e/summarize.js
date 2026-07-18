// Print a compact failure summary from the Playwright JSON report.
const r = require('./report/results.json')
const out = []
function walk(s) {
  ;(s.suites || []).forEach(walk)
  ;(s.specs || []).forEach((sp) => {
    sp.tests.forEach((t) => {
      t.results.forEach((res) => {
        if (res.status !== 'passed' && res.status !== 'skipped') {
          const msg = (res.error && res.error.message) || (res.errors || []).map((e) => e.message).join('\n') || res.status
          out.push({ title: sp.title, err: String(msg) })
        }
      })
    })
  })
}
;(r.suites || []).forEach(walk)
const strip = (s) => s.replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'), '')
out.forEach((o, i) => {
  console.log('======== FAIL ' + (i + 1) + ': ' + o.title)
  console.log(strip(o.err).split('\n').slice(0, 14).join('\n'))
  console.log()
})
console.log('total failures:', out.length)
