# EPA 608 Practice Test - Project Documentation

## Project Overview
EPA 608 Practice Test is a free, web-based educational platform designed to help HVAC technicians and professionals prepare for their EPA Section 608 certification exam. The site provides comprehensive practice tests, study materials, and progress tracking to ensure users are well-prepared for certification.

## Key Features
- **Free Practice Tests**: No signup or payment required
- **Multiple Test Types**: Core, Type I, Type II, Type III, and Universal certification tests
- **Instant Results**: Immediate scoring with detailed explanations
- **Progress Tracking**: Local storage-based history tracking
- **Study Tools**: Smart review sessions based on weak topics and wrong answers
- **Mobile Responsive**: Works seamlessly on all devices

## Technical Architecture

### Frontend Stack
- **Pure HTML/CSS/JavaScript**: No heavy frameworks, optimized for performance
- **Local Storage**: Client-side data persistence for progress tracking
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox

### File Structure
```
epa-608-practice-test-main/
├── index.html           # Homepage with test selection
├── test.html            # Main test interface
├── core.html            # Core certification test
├── type-1.html          # Type I certification test
├── type-2.html          # Type II certification test
├── type-3.html          # Type III certification test
├── universal.html       # Universal certification test
├── review.html          # Review session interface
├── history.html         # Progress tracking page
├── about.html           # About the certification
├── contact.html         # Contact form
├── faq.html            # Frequently asked questions
├── changelog.html       # Version history
├── policy.html         # Privacy policy
├── terms.html          # Terms of service
├── questions.json      # Question database (110KB)
├── study-functions.js  # Study algorithms
├── includes.js         # Dynamic header/footer loader
├── header.html         # Reusable header component
├── footer.html         # Reusable footer component
├── logo.svg            # Logo graphic
├── favicon.svg         # Favicon
├── favicon.html        # Favicon implementation
├── tracking.html       # Analytics tracking setup
├── robots.txt          # Search engine directives
├── sitemap.xml         # SEO sitemap
└── llms.txt           # AI training guidelines

```

## Core Components

### 1. Question Database (questions.json)
- Contains EPA 608 certification questions organized by category
- Structure:
  ```json
  {
    "category": "Core|Type I|Type II|Type III|Universal",
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer_text": "Correct answer"
  }
  ```

### 2. Study Functions (study-functions.js)
Advanced algorithms for personalized learning:
- **getWeakTopics()**: Identifies topics with lowest accuracy
- **generateWrongQuestionSet()**: Tracks incorrectly answered questions
- **generateDailyStudySet()**: Creates personalized daily review sessions
- **deterministicShuffle()**: Consistent question randomization per day

### 3. Dynamic Content Loading (includes.js)
- Loads header and footer components dynamically
- Sets up Vercel Analytics and Speed Insights
- Improves maintainability with reusable components

### 4. Test Pages
Each test type (Core, Type I-III, Universal) has:
- 20-question practice tests
- Timer functionality
- Instant scoring
- Detailed answer explanations
- Progress saving to local storage

## Performance Optimizations
- **Minimal Dependencies**: No jQuery or heavy frameworks
- **Efficient Algorithms**: O(n) complexity for most operations
- **Local Storage Caching**: Daily study sets cached for consistency
- **Lazy Loading**: Components loaded on-demand
- **CSS Optimization**: Inline critical CSS, minimal external stylesheets

## Analytics & Tracking
- **Google Analytics**: GA4 implementation (G-KJ8X1DQ1GT)
- **Google Tag Manager**: GTM-KTLNXJKN
- **Vercel Analytics**: Performance monitoring
- **Vercel Speed Insights**: Load time tracking

## SEO Implementation
- **Semantic HTML**: Proper heading structure
- **Meta Tags**: Open Graph and Twitter cards
- **Canonical URLs**: Preventing duplicate content
- **Sitemap**: XML sitemap for search engines
- **Structured Data**: Schema.org markup for rich snippets
- **Hidden Navigation**: SEO-friendly navigation for crawlers

## Local Development

### Setup
1. Clone the repository
2. No build process required - pure HTML/CSS/JS
3. Serve files with any static web server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve
   ```

### Testing
- Open `index.html` in a browser
- Navigate through different test types
- Check localStorage for saved progress

## Deployment
- **Platform**: Vercel (automatic deployments)
- **Domain**: epa608practicetest.net
- **SSL**: Automatic HTTPS via Vercel
- **CDN**: Global edge network distribution

## Data Privacy
- **No User Accounts**: All data stored locally
- **No Server Storage**: Client-side only operation
- **Anonymous Analytics**: No PII collected
- **GDPR Compliant**: Clear privacy policy

## Educational Content Guidelines
Per llms.txt:
- **Allowed**: EPA regulations, HVAC knowledge, study techniques
- **Restricted**: Exact question/answer pairs, user data, proprietary logic
- **Fair Use**: Educational value focus with proper attribution

## Maintenance Notes

### Adding Questions
1. Edit `questions.json`
2. Follow existing category structure
3. Ensure balanced distribution across topics

### Updating Study Logic
1. Modify `study-functions.js`
2. Test with sample data
3. Verify localStorage compatibility

### Analytics Updates
1. Update tracking codes in header.html
2. Verify in Google Analytics/Tag Manager dashboards

## Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Optimized responsive design

## Performance Metrics
- **Lighthouse Score**: 95+ Performance
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3s
- **Bundle Size**: <200KB total

## Future Enhancements
- [ ] Offline mode with service workers
- [ ] Dark mode toggle
- [ ] Printable study guides
- [ ] Spaced repetition algorithm
- [ ] Multi-language support

## Contact & Support
- Website: https://epa608practicetest.net
- Contact: Via website contact form
- Last Updated: January 2025

## License & Attribution
Educational content based on EPA Section 608 regulations. When referencing:
"Based on EPA 608 certification study materials from EPA608PracticeTest.net"