'use client'
import { useEffect, useRef } from 'react'

/**
 * Invisible page-transition overlay.
 * - Starts fully opaque white on every page load
 * - Fades to transparent in 280ms — user sees a smooth "reveal" instead of a hard flash
 * - Call window.__goTo(url) before navigating to show the overlay first, then reload
 */
export function PageTransition() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Expose global helper so any component can trigger seamless navigate
    ;(window as any).__goTo = (url: string) => {
      if (ref.current) {
        ref.current.style.transition = 'none'
        ref.current.style.opacity = '1'
        ref.current.style.pointerEvents = 'all'
      }
      // Navigate after one frame so overlay is painted
      requestAnimationFrame(() => {
        window.location.href = url
      })
    }

    // Hard reload helper — shows overlay then calls reload() (guaranteed fresh page)
    ;(window as any).__hardReload = () => {
      if (ref.current) {
        ref.current.style.transition = 'none'
        ref.current.style.opacity = '1'
        ref.current.style.pointerEvents = 'all'
      }
      requestAnimationFrame(() => {
        window.location.reload()
      })
    }

    // Fade out on mount (page just loaded)
    const el = ref.current
    if (!el) return
    // Already starts opaque via inline style, now animate out
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.28s ease'
      el.style.opacity = '0'
      setTimeout(() => { el.style.pointerEvents = 'none' }, 300)
    })
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#f9fafb', // matches bg-gray-50
        zIndex: 9999,
        opacity: 1,
        pointerEvents: 'all',
        transition: 'none',
      }}
      aria-hidden="true"
    />
  )
}
