'use client'

import { useEffect } from 'react'
import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'

export function GuidedTour() {
  useEffect(() => {
    // Don't show if already completed
    if (localStorage.getItem('epa608_tour_done')) return

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shadow-xl rounded-xl',
        scrollTo: true,
        cancelIcon: { enabled: true },
      },
    })

    tour.addStep({
      id: 'welcome',
      title: 'Welcome to EPA 608!',
      text: 'Let me show you around. This tour takes 30 seconds.',
      attachTo: { element: '[data-tour="header"]', on: 'bottom' },
      buttons: [
        { text: 'Skip', action: tour.cancel, classes: 'shepherd-button-secondary' },
        { text: 'Next \u2192', action: tour.next },
      ],
    })

    tour.addStep({
      id: 'core-section',
      title: 'Start with Core',
      text: 'Core is required for ALL EPA 608 certifications. Start here!',
      attachTo: { element: '[data-tour="core"]', on: 'bottom' },
      buttons: [
        { text: '\u2190 Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next \u2192', action: tour.next },
      ],
    })

    tour.addStep({
      id: 'tools',
      title: 'Study Tools',
      text: 'Flashcards, Podcast, AI Tutor, Progress tracking \u2014 all free for Core!',
      attachTo: { element: '[data-tour="tools"]', on: 'top' },
      buttons: [
        { text: '\u2190 Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next \u2192', action: tour.next },
      ],
    })

    tour.addStep({
      id: 'ai-tutor',
      title: 'AI Tutor',
      text: 'Stuck on a question? Ask the AI \u2014 5 free queries per day.',
      attachTo: { element: '[data-tour="ai-tutor"]', on: 'top' },
      buttons: [
        { text: '\u2190 Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Got it! \u2192', action: tour.next },
      ],
    })

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

    return () => {
      clearTimeout(timer)
      tour.cancel()
    }
  }, [])

  return null
}
