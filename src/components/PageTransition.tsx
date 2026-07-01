'use client'
import { useEffect, useRef } from 'react'

/**
 * Navigation mask overlay. TRANSPARENT by default so server-rendered content is
 * visible immediately on every load (no reveal-after-hydrate delay — that made
 * every page feel slow). window.__goTo(url) / window.__hardReload() paint it
 * opaque to mask a hard reload, then navigate.
 */
export function PageTransition() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cover = () => {
      if (ref.current) {
        ref.current.style.transition = 'none'
        ref.current.style.opacity = '1'
        ref.current.style.pointerEvents = 'all'
      }
    }
    ;(window as any).__goTo = (url: string) => {
      cover()
      requestAnimationFrame(() => { window.location.href = url })
    }
    ;(window as any).__hardReload = () => {
      cover()
      requestAnimationFrame(() => { window.location.reload() })
    }
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#f9fafb', // matches bg-gray-50
        zIndex: 9999,
        opacity: 0,
        pointerEvents: 'none',
        transition: 'none',
      }}
      aria-hidden="true"
    />
  )
}
