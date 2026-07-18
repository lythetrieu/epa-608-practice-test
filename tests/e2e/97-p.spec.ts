import { test, hasSession } from './fixtures'
import AxeBuilder from '@axe-core/playwright'
test('P', async ({ freePage }) => {
  test.skip(!hasSession('free'), 'no session')
  await freePage.goto('/dashboard', { waitUntil: 'networkidle' })
  const r = await new AxeBuilder({ page: freePage }).withTags(['wcag2a','wcag2aa']).analyze()
  for (const v of r.violations.filter(x => x.impact === 'serious' || x.impact === 'critical')) {
    for (const n of v.nodes) {
      console.log('\nTARGET:', n.target.join(' '))
      console.log('HTML  :', (n.html||'').slice(0,180))
      console.log('DETAIL:', [...(n.any||[]),...(n.all||[])].map(c=>c.message).join(' | ').slice(0,260))
    }
  }
})
