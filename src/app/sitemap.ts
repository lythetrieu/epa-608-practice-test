import { MetadataRoute } from 'next'

const D = new Date('2026-04-21')

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://epa608practicetest.net'

  return [
    // Homepage
    { url: `${baseUrl}/`, lastModified: D, changeFrequency: 'weekly', priority: 1 },

    // Practice test pages
    { url: `${baseUrl}/core.html`, lastModified: D, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/type-1.html`, lastModified: D, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/type-2.html`, lastModified: D, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/type-3.html`, lastModified: D, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/universal.html`, lastModified: D, changeFrequency: 'weekly', priority: 1 },

    // Hub pages
    { url: `${baseUrl}/study-guides.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.9 },

    // Pricing
    { url: `${baseUrl}/pricing.html`, lastModified: D, changeFrequency: 'weekly', priority: 0.9 },

    // Practice questions (was orphaned — real content page, now indexed)
    { url: `${baseUrl}/epa-608-practice-questions.html`, lastModified: D, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/practice-test-with-answers.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },

    // Study guides
    { url: `${baseUrl}/study-guide-core.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/study-guide-type-1.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/study-guide-type-2.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/study-guide-type-3.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/study-guide-universal.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/study-guide-cheat-sheet.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },

    // Certification guides
    { url: `${baseUrl}/what-is-epa-608-certification.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/certification-types.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/how-to-get-certified.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/epa-608-certification-complete-guide.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/cost-and-exam-fees.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/does-it-expire.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/aim-act-changes.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.7 },

    // Exam prep articles
    { url: `${baseUrl}/epa-608-passing-score.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/how-to-study-for-epa-608.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/test-day-checklist.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/exam-day.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/exam-rules.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/test-locations.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/where-to-take-epa-608-test.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.7 },

    // Study tools & resources
    { url: `${baseUrl}/flashcards.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/tutor.html`, lastModified: D, changeFrequency: 'monthly', priority: 0.6 },

    // Support pages
    { url: `${baseUrl}/about.html`, lastModified: D, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${baseUrl}/contact.html`, lastModified: D, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${baseUrl}/terms.html`, lastModified: D, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/policy.html`, lastModified: D, changeFrequency: 'yearly', priority: 0.3 },

  ]
}
