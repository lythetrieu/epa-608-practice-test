'use client'

import { useState, useEffect } from 'react'
import type { Category } from '@/types'

type StudyDay = {
  day: number
  date: string
  topic: string
  mode: string
  estimatedMinutes: number
  details: string
}

type StudyPlan = {
  totalDays: number
  examDate: string
  days: StudyDay[]
}

const CATEGORIES: Category[] = ['Core', 'Type I', 'Type II', 'Type III']
const STORAGE_KEY = 'epa608-study-plan'
const COMPLETED_KEY = 'epa608-study-plan-completed'

export default function StudyPlanClient() {
  const [examDate, setExamDate] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(['Core'])
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load saved plan + completed days from localStorage
  useEffect(() => {
    try {
      const savedPlan = localStorage.getItem(STORAGE_KEY)
      if (savedPlan) setPlan(JSON.parse(savedPlan))
      const savedCompleted = localStorage.getItem(COMPLETED_KEY)
      if (savedCompleted) setCompletedDays(JSON.parse(savedCompleted))
    } catch {}
  }, [])

  // Save completed days to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(completedDays))
    } catch {}
  }, [completedDays])

  const toggleCategory = (cat: Category) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const toggleDay = (day: number) => {
    setCompletedDays(prev => ({ ...prev, [day]: !prev[day] }))
  }

  const generatePlan = async () => {
    if (!examDate) {
      setError('Please select your target exam date.')
      return
    }
    if (selectedCategories.length === 0) {
      setError('Please select at least one category.')
      return
    }

    const daysUntilExam = Math.ceil(
      (new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (daysUntilExam < 1) {
      setError('Exam date must be in the future.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/ai/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examDate, categories: selectedCategories }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to generate plan.')
        return
      }

      setPlan(data)
      setCompletedDays({})
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        localStorage.setItem(COMPLETED_KEY, '{}')
      } catch {}
    } catch {
      setError('Failed to generate study plan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const clearPlan = () => {
    setPlan(null)
    setCompletedDays({})
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(COMPLETED_KEY)
    } catch {}
  }

  const completedCount = Object.values(completedDays).filter(Boolean).length

  // Minimum date = tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Study Plan AI</h1>
      <p className="text-gray-500 mb-8">
        Generate a personalized day-by-day study schedule based on your exam date and weak areas.
      </p>

      {!plan ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Exam date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Exam Date
            </label>
            <input
              type="date"
              value={examDate}
              min={minDate}
              onChange={e => setExamDate(e.target.value)}
              className="w-full sm:w-64 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories to Study
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    selectedCategories.includes(cat)
                      ? 'border-blue-800 bg-blue-50 text-blue-800'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            onClick={generatePlan}
            disabled={loading}
            className="px-6 py-3 bg-blue-800 text-white rounded-lg font-semibold hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating Plan...
              </span>
            ) : (
              'Generate Study Plan'
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Your Study Plan</h2>
                <p className="text-sm text-gray-500">
                  {plan.totalDays} days until exam &middot; {completedCount}/{plan.days.length} days completed
                </p>
              </div>
              <button
                onClick={clearPlan}
                className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Reset Plan
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300 rounded-full"
                style={{ width: `${plan.days.length > 0 ? (completedCount / plan.days.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Day-by-day plan */}
          <div className="space-y-3">
            {plan.days.map(day => (
              <div
                key={day.day}
                className={`bg-white rounded-xl border p-4 sm:p-5 transition-colors ${
                  completedDays[day.day]
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleDay(day.day)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      completedDays[day.day]
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {completedDays[day.day] && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <h3 className={`font-semibold text-sm ${completedDays[day.day] ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                        Day {day.day}: {day.topic}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                          {day.mode}
                        </span>
                        <span>{day.estimatedMinutes} min</span>
                      </div>
                    </div>
                    <p className={`text-sm mt-1 ${completedDays[day.day] ? 'text-green-600' : 'text-gray-500'}`}>
                      {day.details}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
