'use client'

import { useEffect } from 'react'
import 'shepherd.js/dist/css/shepherd.css'

export function GuidedTour() {
  useEffect(() => {
    // Don't show if already completed — and, crucially, skip loading the 612KB
    // shepherd.js bundle entirely for everyone who has (i.e. almost all page loads).
    if (localStorage.getItem('epa608_tour_done')) return

    let cancelled = false
    let cleanup: (() => void) | undefined

    ;(async () => {
      const { default: Shepherd } = await import('shepherd.js')
      if (cancelled) return

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'shadow-xl rounded-xl',
          scrollTo: true,
          cancelIcon: { enabled: true },
        },
      })

      // Single merged intro step: data-tour="header" now sits on the navy hero
      // card (welcome + readiness ring + stat chips), so one step covers it all.
      tour.addStep({
        id: 'welcome',
        title: 'Your dashboard',
        text: 'Your exam readiness, streak, and scores at a glance. This tour takes 30 seconds.',
        attachTo: { element: '[data-tour="header"]', on: 'bottom' },
        buttons: [
          { text: 'Skip', action: tour.cancel, classes: 'shepherd-button-secondary' },
          { text: 'Next →', action: tour.next },
        ],
      })

      tour.addStep({
        id: 'learn-section',
        title: 'Learn First, Then Practice',
        text: 'Pick a section to study — Core is where everyone starts.',
        attachTo: { element: '[data-tour="sections"]', on: 'bottom' },
        buttons: [
          { text: '← Back', action: tour.back, classes: 'shepherd-button-secondary' },
          { text: 'Next →', action: tour.next },
        ],
      })

      // ('tools' step removed — its data-tour="tools" anchor no longer exists
      // on the dashboard, so the step floated unanchored mid-screen.)

      // (AI Tutor step removed — its Home card is gone; the floating bubble is
      // the AI entry point and needs no tour anchor.)

      tour.addStep({
        id: 'ready',
        title: "You're ready!",
        text: 'Click Core to start practicing. Good luck!',
        attachTo: { element: '[data-tour="core"]', on: 'bottom' },
        buttons: [
          { text: 'Start practicing!', action: tour.complete },
        ],
      })

      tour.on('complete', () => localStorage.setItem('epa608_tour_done', 'true'))
      tour.on('cancel', () => localStorage.setItem('epa608_tour_done', 'true'))

      // Start tour after a brief delay to let DOM render
      const timer = setTimeout(() => tour.start(), 500)
      cleanup = () => {
        clearTimeout(timer)
        tour.cancel()
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return null
}
