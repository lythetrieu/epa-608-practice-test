'use client'
import Link from 'next/link'

type Feature = { text: string; included: boolean }

export type PlanCardData = {
  name: string
  price: string
  priceNote: string
  description: string
  features: Feature[]
  cta: string
  ctaHref?: string
  highlighted?: boolean
  paddlePriceId?: string
}

function CheckIcon({ included }: { included: boolean }) {
  if (included) {
    return (
      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export function PlanCard({ plan }: { plan: PlanCardData }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 ${
        plan.highlighted
          ? 'bg-blue-800 text-white ring-2 ring-blue-800 shadow-xl'
          : 'bg-white border border-gray-200 shadow-sm'
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-green-500 px-3 py-0.5 text-xs font-semibold text-white shadow">
            Most popular
          </span>
        </div>
      )}

      {/* Plan header */}
      <div className="mb-6">
        <h2 className={`text-lg font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
          {plan.name}
        </h2>
        <div className="mt-2 flex items-baseline gap-1">
          <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
            {plan.price}
          </span>
          <span className={`text-sm ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>
            {plan.priceNote}
          </span>
        </div>
        <p className={`mt-2 text-sm ${plan.highlighted ? 'text-blue-100' : 'text-gray-500'}`}>
          {plan.description}
        </p>
      </div>

      {/* Features list */}
      <ul className="space-y-3 flex-1 mb-8">
        {plan.features.map((feature) => (
          <li key={feature.text} className="flex items-center gap-2.5">
            <CheckIcon included={feature.included} />
            <span
              className={`text-sm ${
                feature.included
                  ? plan.highlighted ? 'text-white' : 'text-gray-700'
                  : plan.highlighted ? 'text-blue-300 line-through' : 'text-gray-400 line-through'
              }`}
            >
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {plan.ctaHref ? (
        <Link
          href={plan.ctaHref}
          className={`inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
            plan.highlighted
              ? 'bg-white text-blue-800 hover:bg-blue-50'
              : 'bg-blue-800 text-white hover:bg-blue-900'
          }`}
        >
          {plan.cta}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => {
            // TODO: open Paddle.js checkout
            // window.Paddle?.Checkout.open({ items: [{ priceId: plan.paddlePriceId }] })
            alert('Paddle checkout coming soon!')
          }}
          className={`inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
            plan.highlighted
              ? 'bg-white text-blue-800 hover:bg-blue-50'
              : 'bg-blue-800 text-white hover:bg-blue-900'
          }`}
        >
          {plan.cta}
        </button>
      )}
    </div>
  )
}
