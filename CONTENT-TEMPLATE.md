# CONTENT-TEMPLATE.md - Article Structure Guide

## 📋 TEMPLATE OVERVIEW

This template provides the complete HTML structure for every article on EPA608PracticeTest.net. Follow this exactly for consistency, SEO optimization, and LLM citation-worthiness.

**Use this template for:** All articles in /study-guides/, /certification-guide/, and /exam-prep/ sections

---

## 🎯 BEFORE YOU START

### Required Information (Gather from CONTENT-MAP.md):
- [ ] Article title
- [ ] Target keyword
- [ ] Target URL (/section/filename.html)
- [ ] Word count target
- [ ] Primary tool link (most relevant practice test)
- [ ] Related articles (2-3 for internal linking)
- [ ] Section hub URL

### Quick Checklist:
- [ ] Know your target keyword
- [ ] Have 5-8 FAQ questions ready
- [ ] Know which tool pages to link to
- [ ] Have related articles identified
- [ ] Ready to write [word count] words

---

## 📄 COMPLETE HTML TEMPLATE

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- TITLE: Format = [Target Keyword]: [Benefit] [2025] | EPA 608 Practice Test -->
    <title>EPA 608 Type 2 Study Guide: High-Pressure Systems [2025] | EPA 608 Practice Test</title>
    
    <!-- META DESCRIPTION: 150-160 characters, include keyword + CTA -->
    <meta name="description" content="Complete EPA 608 Type 2 study guide covering high-pressure refrigeration systems. Free practice tests, exam tips, and everything you need to pass. Start preparing today!">
    
    <!-- CANONICAL URL -->
    <link rel="canonical" href="https://epa608practicetest.net/study-guides/type-2-guide.html">
    
    <!-- REQUIRED: Article Schema Markup -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "EPA 608 Type 2 Study Guide: High-Pressure Systems [2025]",
      "description": "Complete EPA 608 Type 2 study guide covering high-pressure refrigeration systems for HVAC technicians.",
      "author": {
        "@type": "Organization",
        "name": "EPA 608 Practice Test",
        "url": "https://epa608practicetest.net"
      },
      "publisher": {
        "@type": "Organization",
        "name": "EPA 608 Practice Test",
        "logo": {
          "@type": "ImageObject",
          "url": "https://epa608practicetest.net/logo.png"
        }
      },
      "datePublished": "2025-01-20",
      "dateModified": "2025-01-20",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://epa608practicetest.net/study-guides/type-2-guide.html"
      },
      "image": "https://epa608practicetest.net/images/type-2-guide.jpg"
    }
    </script>
    
    <!-- REQUIRED IF 5+ FAQs: FAQ Schema Markup -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is EPA 608 Type 2 certification?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "EPA 608 Type 2 certification qualifies HVAC technicians to service high-pressure refrigeration systems with pressures above 50 psig, including residential and commercial air conditioning units, heat pumps, and rooftop HVAC systems."
          }
        },
        {
          "@type": "Question",
          "name": "How many questions are on the Type 2 exam?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The EPA 608 Type 2 exam consists of 50 total questions: 25 Core section questions (required for all technicians) and 25 Type 2-specific questions about high-pressure systems."
          }
        },
        {
          "@type": "Question",
          "name": "What is the passing score for Type 2?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You must score 70% or higher on both the Core section (18 out of 25 correct) and the Type 2 section (18 out of 25 correct) to pass and receive EPA 608 Type 2 certification."
          }
        },
        {
          "@type": "Question",
          "name": "How long should I study for Type 2?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Most technicians need 1-2 weeks of focused study using practice tests and study guides. Those with HVAC experience may need less time, while beginners should plan for 2-3 weeks of preparation."
          }
        },
        {
          "@type": "Question",
          "name": "Can I take Type 2 practice tests for free?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, EPA608PracticeTest.net offers completely free Type 2 practice tests with unlimited attempts, detailed explanations, and progress tracking to help you prepare for your certification exam."
          }
        }
      ]
    }
    </script>
    
    <!-- OPTIONAL: HowTo Schema (for step-by-step guides) -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Study for EPA 608 Type 2 Certification",
      "description": "Step-by-step guide to preparing for EPA 608 Type 2 exam",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Review Core concepts",
          "text": "Start by reviewing EPA Core section material covering Clean Air Act, ozone depletion, and refrigerant regulations.",
          "position": 1
        },
        {
          "@type": "HowToStep",
          "name": "Study Type 2 material",
          "text": "Focus on high-pressure system topics including recovery procedures, leak detection, and refrigerant charging.",
          "position": 2
        },
        {
          "@type": "HowToStep",
          "name": "Take practice tests",
          "text": "Complete multiple practice tests to identify weak areas and build confidence before the actual exam.",
          "position": 3
        }
      ]
    }
    </script>
</head>

<body>

<!-- NAVIGATION (Same on every page) -->
<nav class="main-nav">
    <div class="nav-container">
        <a href="/" class="logo">EPA 608 Practice Test</a>
        <ul class="nav-links">
            <li><a href="/">Home</a></li>
            <li><a href="/study-guides/">Study Guides</a></li>
            <li><a href="/certification-guide/">Certification Guide</a></li>
            <li><a href="/exam-prep/">Exam Prep</a></li>
            <li><a href="/core.html" class="cta-nav">Practice Tests</a></li>
        </ul>
    </div>
</nav>

<!-- BREADCRUMB (Update section and page name) -->
<div class="breadcrumb">
    <a href="/">Home</a> › 
    <a href="/study-guides/">Study Guides</a> › 
    <span>Type 2 Study Guide</span>
</div>

<!-- MAIN CONTENT CONTAINER -->
<div class="content-wrapper">
    
    <!-- MAIN ARTICLE COLUMN -->
    <article class="main-content">
        
        <!-- H1 TITLE: [Target Keyword]: [Benefit] [2025] -->
        <h1>EPA 608 Type 2 Study Guide: High-Pressure Systems [2025]</h1>
        
        <!-- ARTICLE METADATA -->
        <div class="article-meta">
            <span class="publish-date">Published: January 20, 2025</span>
            <span class="update-date">Last Updated: January 20, 2025</span>
            <span class="read-time">12 min read</span>
        </div>
        
        <!-- TL;DR BOX (REQUIRED - ALWAYS FIRST) -->
        <div class="tldr-box">
            <h2>Quick Answer</h2>
            <p><strong>EPA 608 Type 2 certification qualifies technicians to service high-pressure refrigeration systems (above 50 psig) including residential and commercial air conditioning units, heat pumps, and rooftop HVAC systems.</strong> The exam consists of 25 Core questions and 25 Type 2-specific questions. You need 70% on both sections to pass. This guide covers all Type 2 topics including recovery procedures, leak detection, system components, and refrigerant charging.</p>
            <a href="/type-2.html" class="cta-button-primary">Start Free Type 2 Practice Test →</a>
        </div>
        
        <!-- TABLE OF CONTENTS (REQUIRED) -->
        <div class="table-of-contents">
            <h2>Table of Contents</h2>
            <ul>
                <li><a href="#introduction">Introduction</a></li>
                <li><a href="#what-is-type-2">What is Type 2 Certification?</a></li>
                <li><a href="#exam-structure">Type 2 Exam Structure</a></li>
                <li><a href="#core-topics">Type 2 Topics Covered</a></li>
                <li><a href="#recovery-procedures">Recovery Procedures</a></li>
                <li><a href="#leak-detection">Leak Detection Methods</a></li>
                <li><a href="#system-components">System Components</a></li>
                <li><a href="#study-tips">Study Tips & Strategies</a></li>
                <li><a href="#takeaways">Key Takeaways</a></li>
                <li><a href="#faqs">FAQs</a></li>
                <li><a href="#resources">Related Resources</a></li>
            </ul>
        </div>
        
        <!-- INTRODUCTION SECTION (200-300 words) -->
        <section id="introduction">
            <p><strong>EPA 608 Type 2 certification is the most common HVAC certification because it covers high-pressure refrigeration systems found in residential and commercial air conditioning, heat pumps, and rooftop units.</strong> If you work on systems with refrigerant pressures above 50 psig (pounds per square inch gauge), you need Type 2 certification to legally handle refrigerants.</p>
            
            <p>Type 2 systems include split-system air conditioners, package units, water-cooled chillers with reciprocating or scroll compressors, and most heat pump systems. These are the systems HVAC technicians encounter most frequently in residential homes, commercial buildings, and light industrial applications. Understanding Type 2 is essential for any technician working in the HVAC industry.</p>
            
            <p>This comprehensive study guide covers everything you need to pass the EPA 608 Type 2 certification exam. We'll break down the exam structure, review all tested topics, explain critical concepts like recovery procedures and leak detection, and provide study strategies to help you pass on your first attempt. By the end of this guide, you'll know exactly what to expect and how to prepare effectively.</p>
        </section>
        
        <!-- MAIN CONTENT SECTION 1 (400-600 words) -->
        <section id="what-is-type-2">
            <h2>What is EPA 608 Type 2 Certification?</h2>
            
            <p>EPA 608 Type 2 certification qualifies HVAC technicians to service, maintain, and repair high-pressure refrigeration systems. "High-pressure" means systems with evaporator pressures above 50 psig at standard operating temperatures. This includes the vast majority of air conditioning and heat pump systems you'll encounter in the field.</p>
            
            <h3>Systems Covered by Type 2</h3>
            <p>Type 2 certification allows you to work on:</p>
            <ul>
                <li><strong>Residential air conditioners:</strong> Split systems and package units serving single-family homes</li>
                <li><strong>Commercial rooftop units (RTUs):</strong> Package systems serving commercial buildings</li>
                <li><strong>Heat pumps:</strong> Both air-source and water-source heat pump systems</li>
                <li><strong>Commercial refrigeration:</strong> Walk-in coolers and freezers with high-pressure compressors</li>
                <li><strong>Water-cooled chillers:</strong> Reciprocating and scroll compressor chillers</li>
            </ul>
            
            <h3>Type 2 vs Other Certifications</h3>
            <p>Understanding how Type 2 differs from other EPA 608 certifications helps you choose the right path:</p>
            
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Certification</th>
                        <th>Systems Covered</th>
                        <th>Pressure Range</th>
                        <th>Common Applications</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Type 1</strong></td>
                        <td>Small appliances</td>
                        <td>≤5 lbs refrigerant</td>
                        <td>Fridges, window AC units, dehumidifiers</td>
                    </tr>
                    <tr>
                        <td><strong>Type 2</strong></td>
                        <td>High-pressure systems</td>
                        <td>&gt;50 psig</td>
                        <td>Residential/commercial AC, heat pumps</td>
                    </tr>
                    <tr>
                        <td><strong>Type 3</strong></td>
                        <td>Low-pressure systems</td>
                        <td>&lt;50 psig</td>
                        <td>Centrifugal chillers</td>
                    </tr>
                    <tr>
                        <td><strong>Universal</strong></td>
                        <td>All systems</td>
                        <td>All ranges</td>
                        <td>Complete flexibility for any system</td>
                    </tr>
                </tbody>
            </table>
            
            <p>Most HVAC technicians either get Type 2 specifically (if they only work on AC/heat pump systems) or Universal certification (for complete flexibility). Type 2 is the minimum certification needed for most residential and commercial HVAC work.</p>
            
            <!-- INLINE CTA (Every 300-400 words) -->
            <div class="inline-cta">
                <p>📝 <strong><a href="/type-2.html">Take a free Type 2 practice test</a></strong> to see what topics you already know and which areas need more study.</p>
            </div>
        </section>
        
        <!-- MAIN CONTENT SECTION 2 (400-600 words) -->
        <section id="exam-structure">
            <h2>EPA 608 Type 2 Exam Structure</h2>
            
            <p>Understanding the exam format helps you prepare more effectively and reduces test-day anxiety. Here's exactly what to expect when you sit for the EPA 608 Type 2 certification exam.</p>
            
            <h3>Number of Questions and Time</h3>
            <p>The Type 2 exam consists of <strong>50 total questions</strong> divided into two sections:</p>
            <ul>
                <li><strong>Core Section:</strong> 25 questions (required for all technicians regardless of certification type)</li>
                <li><strong>Type 2 Section:</strong> 25 questions specific to high-pressure systems</li>
            </ul>
            
            <p>You typically have <strong>2 hours (120 minutes)</strong> to complete both sections, though some testing centers may have different time limits. Most test-takers finish in 60-90 minutes, so time pressure is rarely an issue if you've prepared properly.</p>
            
            <h3>Passing Score Requirements</h3>
            <p>To pass and receive EPA 608 Type 2 certification, you must score <strong>70% or higher on BOTH sections</strong>:</p>
            <ul>
                <li><strong>Core Section:</strong> 18 out of 25 questions correct (70%)</li>
                <li><strong>Type 2 Section:</strong> 18 out of 25 questions correct (70%)</li>
            </ul>
            
            <p><strong>Important:</strong> If you pass one section but fail the other, you only need to retake the section you failed. Your passing score on the other section remains valid. However, it's best to pass both sections on your first attempt to avoid additional testing fees and delays.</p>
            
            <h3>Question Format</h3>
            <p>All questions are <strong>multiple choice</strong> with four answer options (A, B, C, D). Questions fall into several categories:</p>
            <ul>
                <li><strong>Factual recall:</strong> "What is the required evacuation level for Type 2 systems?"</li>
                <li><strong>Procedural:</strong> "What is the first step when recovering refrigerant?"</li>
                <li><strong>Calculation:</strong> "If a system loses 15% of its charge annually, what is the leak rate?"</li>
                <li><strong>Scenario-based:</strong> "A technician finds oil spots on a compressor. What should they do?"</li>
            </ul>
            
            <h3>Open Book Policy</h3>
            <p>Most testing centers <strong>do NOT allow open book testing</strong> for EPA 608 exams. You must memorize key facts, procedures, and regulations. Some online proctored exams may have different policies, but don't count on having references available during the test.</p>
            
            <!-- INLINE CTA -->
            <div class="inline-cta">
                <p>🎯 <strong><a href="/universal.html">Considering Universal certification instead?</a></strong> It covers Type 2 plus all other system types in one exam.</p>
            </div>
        </section>
        
        <!-- MAIN CONTENT SECTION 3 (400-600 words) -->
        <section id="core-topics">
            <h2>Type 2 Topics Covered on the Exam</h2>
            
            <p>The Type 2 section tests your knowledge of high-pressure refrigeration systems. Here are the main topic areas you must master, along with the percentage of questions typically devoted to each area.</p>
            
            <h3>1. Recovery Procedures (30-35% of questions)</h3>
            <p>Recovery is the most heavily tested topic on the Type 2 exam. You must know:</p>
            <ul>
                <li>EPA-required recovery levels (10 inches of vacuum for systems with &lt;200 lbs charge)</li>
                <li>Push-pull recovery method (fastest for large systems)</li>
                <li>Vapor recovery vs liquid recovery techniques</li>
                <li>Recovery equipment connection points</li>
                <li>When recovery is required (before opening system, disposal, major repairs)</li>
                <li>Recovery cylinder specifications and color codes (gray body, yellow top)</li>
            </ul>
            
            <h3>2. Leak Detection and Repair (25-30% of questions)</h3>
            <p>Type 2 systems must maintain refrigerant charge, making leak detection critical:</p>
            <ul>
                <li>Electronic leak detectors (most sensitive, 0.1 oz/year detection)</li>
                <li>Ultrasonic leak detectors (detect sound of escaping gas)</li>
                <li>Bubble solution methods (visual confirmation)</li>
                <li>Fluorescent dye injection (for hard-to-find leaks)</li>
                <li>Required leak repair thresholds (35% annual loss for commercial comfort cooling)</li>
                <li>Standing pressure test procedures</li>
            </ul>
            
            <h3>3. Evacuation and Dehydration (15-20% of questions)</h3>
            <p>Proper evacuation removes air and moisture before recharging:</p>
            <ul>
                <li>Required vacuum levels (500 microns is best practice)</li>
                <li>Deep vacuum method vs triple evacuation method</li>
                <li>Vacuum pump sizing and operation</li>
                <li>Moisture removal importance (prevents acid formation)</li>
                <li>System hold test after evacuation</li>
            </ul>
            
            <h3>4. Refrigerant Charging (15-20% of questions)</h3>
            <p>Correct charging ensures system efficiency and longevity:</p>
            <ul>
                <li>Charging by weight (most accurate for residential systems)</li>
                <li>Charging by superheat (for fixed orifice systems)</li>
                <li>Charging by subcooling (for TXV systems)</li>
                <li>Refrigerant cylinder positioning (liquid vs vapor)</li>
                <li>Overcharge and undercharge symptoms</li>
            </ul>
            
            <h3>5. System Components (10-15% of questions)</h3>
            <p>Understanding components helps with troubleshooting:</p>
            <ul>
                <li>Compressor types (reciprocating, scroll, rotary)</li>
                <li>Metering devices (TXV, piston, capillary tube)</li>
                <li>Heat exchangers (condenser, evaporator coils)</li>
                <li>Safety controls (high/low pressure switches)</li>
                <li>Service valves and access points</li>
            </ul>
            
            <!-- INLINE CTA -->
            <div class="inline-cta">
                <p>📚 <strong><a href="/study-guides/complete-study-guide.html">Need more detail on Core section topics?</a></strong> Check our complete EPA 608 study guide covering all certification types.</p>
            </div>
        </section>
        
        <!-- ADDITIONAL MAIN SECTIONS (Continue pattern above) -->
        <!-- Add 2-3 more H2 sections following same structure -->
        <!-- Each section 400-600 words -->
        <!-- Inline CTA every 300-400 words -->
        
        <!-- KEY TAKEAWAYS SECTION (REQUIRED) -->
        <section id="takeaways" class="key-takeaways">
            <h2>Key Takeaways</h2>
            <ul>
                <li>✅ <strong>Type 2 covers high-pressure systems</strong> (above 50 psig) including residential AC, commercial rooftop units, and heat pumps</li>
                <li>✅ <strong>Exam has 50 questions:</strong> 25 Core + 25 Type 2, need 70% on both sections to pass</li>
                <li>✅ <strong>Recovery procedures are 30-35%</strong> of Type 2 questions - master evacuation levels and methods</li>
                <li>✅ <strong>Required recovery level:</strong> 10 inches of vacuum for systems with less than 200 lbs refrigerant charge</li>
                <li>✅ <strong>Leak detection is critical:</strong> Know electronic, ultrasonic, and bubble solution methods</li>
                <li>✅ <strong>Proper evacuation:</strong> Achieve 500 microns to remove moisture and prevent system contamination</li>
                <li>✅ <strong>Charging methods:</strong> Weight method for residential, superheat for fixed orifice, subcooling for TXV systems</li>
                <li>✅ <strong>Study timeline:</strong> Most technicians need 1-2 weeks of focused preparation with practice tests</li>
            </ul>
        </section>
        
        <!-- CTA SECTION (REQUIRED) -->
        <div class="cta-section">
            <h2>Ready to Start Practicing?</h2>
            <p>Test your knowledge with our free EPA 608 practice tests. Over 50,000 HVAC technicians have used our platform to pass their certification on the first attempt. Get instant feedback, detailed explanations, and track your progress as you prepare.</p>
            
            <div class="cta-buttons">
                <a href="/type-2.html" class="button-primary">Take Free Type 2 Practice Test</a>
                <a href="/universal.html" class="button-primary">Try Universal Practice Test</a>
                <a href="/core.html" class="button-secondary">Core Section Practice</a>
            </div>
            
            <p class="cta-subtext">100% free • Unlimited attempts • Detailed explanations • No credit card required</p>
        </div>
        
        <!-- FAQs SECTION (REQUIRED: 5-8 questions) -->
        <section id="faqs" class="faq-section">
            <h2>Frequently Asked Questions</h2>
            
            <div class="faq-item">
                <h3>What is EPA 608 Type 2 certification?</h3>
                <p>EPA 608 Type 2 certification qualifies HVAC technicians to service high-pressure refrigeration systems with pressures above 50 psig, including residential and commercial air conditioning units, heat pumps, and rooftop HVAC systems. It's required by federal law to purchase, handle, or dispose of refrigerants in these systems.</p>
            </div>
            
            <div class="faq-item">
                <h3>How many questions are on the Type 2 exam?</h3>
                <p>The EPA 608 Type 2 exam consists of 50 total questions: 25 Core section questions (required for all technicians) and 25 Type 2-specific questions about high-pressure systems. You must pass both sections with 70% or higher to receive certification.</p>
            </div>
            
            <div class="faq-item">
                <h3>What is the passing score for Type 2?</h3>
                <p>You must score 70% or higher on both the Core section (18 out of 25 correct) and the Type 2 section (18 out of 25 correct) to pass and receive EPA 608 Type 2 certification. Passing only one section means you'll need to retake the failed section.</p>
            </div>
            
            <div class="faq-item">
                <h3>How long should I study for Type 2?</h3>
                <p>Most technicians need 1-2 weeks of focused study using practice tests and study guides. Those with HVAC experience may need less time (3-7 days), while beginners should plan for 2-3 weeks of preparation. Taking multiple practice tests helps you gauge when you're ready.</p>
            </div>
            
            <div class="faq-item">
                <h3>Can I take Type 2 practice tests for free?</h3>
                <p>Yes, EPA608PracticeTest.net offers completely free Type 2 practice tests with unlimited attempts, detailed explanations for every question, and progress tracking. Over 50,000 HVAC technicians have used our free practice tests to prepare for their EPA 608 certification exams.</p>
            </div>
            
            <div class="faq-item">
                <h3>What's the difference between Type 2 and Universal certification?</h3>
                <p>Type 2 certification only covers high-pressure systems (above 50 psig), while Universal certification covers all system types (Type 1, 2, and 3). Universal requires passing the Core section plus all three Type sections (75 total questions) but gives you flexibility to work on any refrigeration system. <a href="/certification-guide/universal-certification.html">Learn more about Universal certification</a>.</p>
            </div>
            
            <div class="faq-item">
                <h3>Is the EPA 608 Type 2 exam open book?</h3>
                <p>No, most testing centers do not allow open book testing for EPA 608 exams. You must memorize key facts, procedures, and regulations. Some online proctored exams may have different policies, but you should prepare as if no reference materials will be available during the test.</p>
            </div>
            
            <div class="faq-item">
                <h3>How much does the Type 2 exam cost?</h3>
                <p>EPA 608 Type 2 exam costs vary by testing provider, typically ranging from $25 to $75. Some online testing options may cost $30-50, while in-person testing at technical schools or training centers may cost $50-75. Check our <a href="/certification-guide/cost.html">complete cost guide</a> for detailed pricing information.</p>
            </div>
        </section>
        
        <!-- RELATED RESOURCES SECTION (REQUIRED) -->
        <section id="resources" class="related-resources">
            <h2>Related Resources</h2>
            <div class="resource-grid">
                <div class="resource-card">
                    <h3>📚 <a href="/study-guides/complete-study-guide.html">Complete EPA 608 Study Guide</a></h3>
                    <p>Comprehensive guide covering all certification types including Core, Type 1, 2, 3, and Universal</p>
                </div>
                
                <div class="resource-card">
                    <h3>📝 <a href="/type-2.html">Free Type 2 Practice Test</a></h3>
                    <p>Test your knowledge with our interactive Type 2 practice exam - unlimited attempts</p>
                </div>
                
                <div class="resource-card">
                    <h3>📖 <a href="/study-guides/universal-guide.html">Universal Certification Guide</a></h3>
                    <p>Learn about Universal certification that covers all system types in one exam</p>
                </div>
                
                <div class="resource-card">
                    <h3>🎯 <a href="/study-guides/">All Study Guides</a></h3>
                    <p>Browse all EPA 608 study resources, tips, and preparation materials</p>
                </div>
            </div>
        </section>
        
        <!-- AUTHOR BOX (REQUIRED) -->
        <div class="author-box">
            <h3>About EPA 608 Practice Test</h3>
            <p><strong>Created by EPA 608 Practice Test</strong> - Trusted by over 50,000 HVAC technicians preparing for EPA certification</p>
            <p><strong>Last Updated:</strong> January 20, 2025 | <strong>Review Status:</strong> Expert Verified | <strong>Accuracy:</strong> Updated with current EPA regulations</p>
            <p>Our study guides are created by experienced HVAC professionals and updated regularly to reflect the latest EPA Section 608 requirements and exam content.</p>
        </div>
        
        <!-- CITATION INFO (REQUIRED) -->
        <div class="citation-info">
            <h3>Citing This Resource</h3>
            <p><strong>Citation Format:</strong> EPA 608 Practice Test (2025). EPA 608 Type 2 Study Guide: High-Pressure Systems [2025]. Retrieved from https://epa608practicetest.net/study-guides/type-2-guide.html</p>
            <p>This guide is regularly updated to ensure accuracy. Check the "Last Updated" date above for the most recent revision.</p>
        </div>
        
    </article>
    
    <!-- SIDEBAR (Same on every article page) -->
    <aside class="sidebar">
        
        <!-- Widget 1: Quick Practice Tests -->
        <div class="widget practice-widget">
            <h3>🎯 Start Practicing</h3>
            <p class="widget-intro">Free practice tests for all certification types</p>
            <ul class="practice-links">
                <li><a href="/core.html">Core Practice Test</a></li>
                <li><a href="/type-1.html">Type 1 Practice Test</a></li>
                <li><a href="/type-2.html">Type 2 Practice Test</a></li>
                <li><a href="/type-3.html">Type 3 Practice Test</a></li>
                <li><a href="/universal.html">Universal Practice Test</a></li>
            </ul>
            <a href="/core.html" class="widget-cta">Start Free Practice Test →</a>
        </div>
        
        <!-- Widget 2: Progress Tracker -->
        <div class="widget progress-widget">
            <h3>📊 Track Your Progress</h3>
            <p>Create a free account to track your practice test scores and see which topics need more study.</p>
            <a href="/history.html" class="widget-cta">View Your Progress →</a>
        </div>
        
        <!-- Widget 3: Popular Guides -->
        <div class="widget popular-widget">
            <h3>📚 Popular Guides</h3>
            <ul class="popular-links">
                <li><a href="/study-guides/complete-study-guide.html">Complete Study Guide</a></li>
                <li><a href="/certification-guide/complete-guide.html">Certification Guide</a></li>
                <li><a href="/study-guides/cheat-sheet.html">Quick Reference Cheat Sheet</a></li>
                <li><a href="/certification-guide/cost.html">Certification Cost Guide</a></li>
                <li><a href="/exam-prep/exam-guide.html">Exam Day Guide</a></li>
            </ul>
        </div>
        
        <!-- Widget 4: Quick Stats -->
        <div class="widget stats-widget">
            <h3>📈 Success Stats</h3>
            <div class="stat-item">
                <span class="stat-number">50,000+</span>
                <span class="stat-label">Students Trained</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">92%</span>
                <span class="stat-label">Pass Rate</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">500+</span>
                <span class="stat-label">Practice Questions</span>
            </div>
        </div>
        
    </aside>
    
</div><!-- End content wrapper -->

<!-- FOOTER (Same on every page) -->
<footer class="site-footer">
    <div class="footer-container">
        
        <div class="footer-column">
            <h4>Practice Tests</h4>
            <ul>
                <li><a href="/core.html">Core Exam</a></li>
                <li><a href="/type-1.html">Type 1</a></li>
                <li><a href="/type-2.html">Type 2</a></li>
                <li><a href="/type-3.html">Type 3</a></li>
                <li><a href="/universal.html">Universal</a></li>
            </ul>
        </div>
        
        <div class="footer-column">
            <h4>Study Resources</h4>
            <ul>
                <li><a href="/study-guides/">Study Guides</a></li>
                <li><a href="/certification-guide/">Certification Guide</a></li>
                <li><a href="/exam-prep/">Exam Prep</a></li>
                <li><a href="/faq.html">FAQ</a></li>
            </ul>
        </div>
        
        <div class="footer-column">
            <h4>Company</h4>
            <ul>
                <li><a href="/about.html">About Us</a></li>
                <li><a href="/contact.html">Contact</a></li>
                <li><a href="/changelog.html">Updates</a></li>
            </ul>
        </div>
        
        <div class="footer-column">
            <h4>Legal</h4>
            <ul>
                <li><a href="/terms.html">Terms of Service</a></li>
                <li><a href="/policy.html">Privacy Policy</a></li>
            </ul>
        </div>
        
    </div>
    
    <div class="footer-bottom">
        <p>&copy; 2025 EPA 608 Practice Test. Free practice tests for HVAC certification.</p>
        <p class="footer-disclaimer">Not affiliated with the EPA. Practice tests for educational purposes only.</p>
    </div>
</footer>

</body>
</html>
```

---

## 📝 WRITING GUIDELINES

### First Paragraph Rules (CRITICAL for LLMs)
Your first paragraph must:
1. **Include target keyword** naturally in first sentence
2. **Answer the main question** directly (what, why, how)
3. **Be bold** (wrap in `<strong>` tags for emphasis)
4. **Provide 2-3 key facts** with specific numbers/details
5. **Use active voice** and present tense

**Example:**
```html
<p><strong>EPA 608 Type 2 certification qualifies technicians to service high-pressure refrigeration systems (above 50 psig) including residential and commercial air conditioning units, heat pumps, and rooftop HVAC systems.</strong> The exam consists of 25 Core questions and 25 Type 2-specific questions. You need 70% on both sections to pass.</p>
```

### Entity-Attribute-Value Clarity
Always provide complete context when mentioning entities:

❌ Vague: "Type 2 is common"
✅ Clear: "Type 2 certification covers high-pressure systems (above 50 psig) used in residential and commercial air conditioning"

❌ Vague: "You need to pass the test"
✅ Clear: "You need to score 70% or higher on both the Core section (18/25 questions) and Type 2 section (18/25 questions)"

### Inline CTA Placement
Insert an inline CTA every 300-400 words:

```html
<div class="inline-cta">
    <p>📝 <strong><a href="/type-2.html">Take a free Type 2 practice test</a></strong> to see which topics you need to study more.</p>
</div>
```

**CTA Variety (Rotate these):**
- "📝 Take a free [Type] practice test to identify weak areas"
- "🎯 Practice [specific topic] with our interactive test questions"
- "📚 Download our [resource] for quick reference"
- "✅ Check your understanding with [test type] practice questions"

### Table Usage
Use tables for comparisons, specifications, or structured data:

```html
<table class="comparison-table">
    <thead>
        <tr>
            <th>Type</th>
            <th>Pressure Range</th>
            <th>Common Systems</th>
            <th>Practice Test</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Type 1</td>
            <td>≤5 lbs refrigerant</td>
            <td>Small appliances</td>
            <td><a href="/type-1.html">Practice</a></td>
        </tr>
    </tbody>
</table>
```

### Lists: Bulleted vs Numbered
**Use bullet lists for:**
- Features or benefits
- Non-sequential items
- Tips or recommendations

**Use numbered lists for:**
- Sequential steps
- Prioritized items
- Ranked comparisons

---

## ✅ PRE-PUBLISH CHECKLIST

### SEO Elements
- [ ] Title format: [Keyword]: [Benefit] [2025] | EPA 608 Practice Test
- [ ] Title length: 50-60 characters
- [ ] Meta description: 150-160 characters with keyword + CTA
- [ ] Target keyword in H1
- [ ] Target keyword in first 100 words (bolded)
- [ ] Target keyword in at least 1 H2
- [ ] URL format: /section/descriptive-slug.html
- [ ] Canonical URL added

### Content Structure
- [ ] TL;DR box at top
- [ ] Table of contents with working jump links
- [ ] Introduction 200-300 words
- [ ] 3-5 main H2 sections (400-600 words each)
- [ ] Inline CTA every 300-400 words
- [ ] Key Takeaways section (5-8 bullets)
- [ ] CTA section with 3 buttons
- [ ] FAQs section (5-8 questions)
- [ ] Related Resources section (4 items)
- [ ] Author box with current date
- [ ] Citation info

### Internal Links
- [ ] 1-2 links to relevant tool pages
- [ ] 1 link to section hub
- [ ] 2-3 links to related articles
- [ ] Breadcrumb to homepage
- [ ] All links use descriptive anchor text
- [ ] No placeholder links or [INSERT URL]

### Schema Markup
- [ ] Article schema present
- [ ] FAQ schema if 5+ FAQs
- [ ] HowTo schema if step-by-step
- [ ] All required fields filled
- [ ] Valid JSON-LD syntax
- [ ] Validated at schema.org validator

### Site-Wide Elements
- [ ] Site-wide n-grams present (3-5 times naturally)
- [ ] Navigation included
- [ ] Breadcrumb included
- [ ] Sidebar widgets included
- [ ] Footer included
- [ ] Consistent branding (free tool provider)

### Content Quality
- [ ] Word count meets target
- [ ] No placeholder text [INSERT]
- [ ] No broken or missing links
- [ ] Grammar and spelling checked
- [ ] Active voice throughout
- [ ] Specific numbers (not vague)
- [ ] Varies sentence length
- [ ] Proper heading hierarchy (H1>H2>H3)

---

## 🎯 COMMON MISTAKES TO AVOID

❌ **DON'T:**
- Use passive voice: "The test can be taken..."
- Be vague: "Many people pass..."
- Skip schema markup
- Forget inline CTAs
- Use generic anchor text: "click here"
- Include placeholder text
- Skip the TL;DR box
- Forget to bold first paragraph
- Use only one tool link
- Skip FAQs
- Forget citation info
- Use wrong file extension (must be .html)

✅ **DO:**
- Use active voice: "Take the test..."
- Be specific: "92% of students pass..."
- Include all required schema
- Add CTA every 300-400 words
- Use descriptive anchors: "practice Type 2 questions"
- Complete all sections
- Start with TL;DR
- Bold first paragraph for emphasis
- Link to 1-2 relevant tools
- Include 5-8 FAQs with schema
- Add citation information
- Use .html extension

---

## 📊 WORD COUNT TARGETS BY ARTICLE TYPE

**Hub Pages:** 2,000-4,000 words
**Pillar Articles:** 2,500-4,000 words
**Supporting Articles:** 1,800-2,500 words
**Niche/Long-tail:** 1,200-1,800 words

**General Rule:** More competitive keywords = longer content

---

## 🔄 CUSTOMIZATION NOTES

**For Each Article, Change:**
1. Title (with target keyword)
2. Meta description
3. Canonical URL
4. Schema URLs and dates
5. H1 heading
6. TL;DR content
7. Introduction
8. All main content sections
9. FAQs (unique questions)
10. Related resources links
11. Primary tool CTA (most relevant test)
12. Breadcrumb section name

**Keep Consistent:**
- Navigation
- Footer
- Sidebar widgets (unless customizing)
- Schema structure
- Overall template format
- Site-wide n-grams

---

**VERSION:** 1.0
**LAST UPDATED:** 2025-01-20
**STATUS:** Production ready
**USAGE:** Use for every article in study-guides, certification-guide, and exam-prep sections