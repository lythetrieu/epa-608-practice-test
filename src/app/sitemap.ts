import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://epa608practicetest.net'
  const now = new Date()

  return [
    // Homepage
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },

    // Practice test pages (free demo - highest SEO value)
    { url: `${baseUrl}/core.html`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/type-1.html`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/type-2.html`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/type-3.html`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/universal.html`, lastModified: now, changeFrequency: 'weekly', priority: 1 },

    // Hub pages
    { url: `${baseUrl}/study-guides.html`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/exam-prep.html`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },

    // Study guides
    { url: `${baseUrl}/study-guide-core.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/study-guide-type-1.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/study-guide-type-2.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/study-guide-type-3.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/study-guide-universal.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/study-guide-cheat-sheet.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/epa-608-complete-study-guide.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },

    // Certification guides
    { url: `${baseUrl}/what-is-epa-608-certification.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/certification-types.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/how-to-get-certified.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/epa-608-certification-complete-guide.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/cost-and-exam-fees.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/does-it-expire.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/difference-between-epa-608-and-609.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/aim-act-changes.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

    // Exam prep articles
    { url: `${baseUrl}/epa-608-online-test.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/epa-608-passing-score.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/epa-608-practice-exam-tips.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/how-to-study-for-epa-608.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/test-day-checklist.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/test-strategies.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/test-anxiety.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/study-schedule.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/exam-day.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/exam-results.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/exam-rules.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/test-locations.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/test-duration.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/timed-exam.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/pass-rate.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

    // Study tools & resources
    { url: `${baseUrl}/flashcards.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/mini-quiz.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/practice-test-with-answers.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/questions-answers-pdf.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/practice-vs-real.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/hvac-students.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

    // SaaS public pages
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },

    // Support pages
    { url: `${baseUrl}/faq.html`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/about.html`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${baseUrl}/contact.html`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${baseUrl}/terms.html`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/policy.html`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
