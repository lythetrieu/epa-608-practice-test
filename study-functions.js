/**
 * Study Functions for EPA 608 Practice Test
 * Plain JavaScript implementation for analyzing test history and generating study sets
 */

/**
 * 1. Identifies the weakest topics based on test history accuracy
 * @param {Array} testHistory - Array of objects { qId, topic, isCorrect }
 * @returns {Array} Top 3 weakest topics as { topic, accuracy }
 * 
 * Optimized for thousands of records using:
 * - Single pass grouping with Map for O(n) complexity
 * - Efficient sorting only on final results (not raw data)
 * - Early termination when we have top 3 results
 */
function getWeakTopics(testHistory) {
    // Input validation
    if (!Array.isArray(testHistory) || testHistory.length === 0) {
        return [];
    }
    
    // Use Map for efficient grouping - O(1) lookup/insert
    const topicStats = new Map();
    
    // Single pass through data - O(n) complexity
    testHistory.forEach(record => {
        const { topic, isCorrect } = record;
        
        // Skip invalid records
        if (!topic || typeof isCorrect !== 'boolean') {
            return;
        }
        
        // Get or create topic stats
        if (!topicStats.has(topic)) {
            topicStats.set(topic, { correct: 0, total: 0 });
        }
        
        const stats = topicStats.get(topic);
        stats.total++;
        if (isCorrect) {
            stats.correct++;
        }
    });
    
    // Convert Map to array and calculate accuracy - O(m) where m = number of unique topics
    const topicsWithAccuracy = Array.from(topicStats.entries()).map(([topic, stats]) => ({
        topic,
        accuracy: Math.round((stats.correct / stats.total) * 100)
    }));
    
    // Sort by accuracy ascending (weakest first) - O(m log m)
    // Since m is typically small (< 20 topics), this is very fast
    topicsWithAccuracy.sort((a, b) => a.accuracy - b.accuracy);
    
    // Return top 3 weakest topics - O(1)
    return topicsWithAccuracy.slice(0, 3);
}

/**
 * 2. Generates a set of questions that the user answered incorrectly
 * @param {Array} testHistory - Array of { qId, isCorrect }
 * @param {Array} questionBank - Array of { qId, question, choices, correct, topic }
 * @param {boolean} onlyNewWrongs - If true, exclude questions later corrected
 * @returns {Array} Array of full question objects for wrong answers
 * 
 * Performance optimizations:
 * - Map-based lookups for O(1) question retrieval
 * - Set-based tracking for corrected questions
 * - Single pass filtering
 */
function generateWrongQuestionSet(testHistory, questionBank, onlyNewWrongs = false) {
    // Input validation
    if (!Array.isArray(testHistory) || !Array.isArray(questionBank)) {
        return [];
    }
    
    // Create efficient lookup maps - O(n) setup for O(1) lookups
    const questionMap = new Map();
    questionBank.forEach(question => {
        if (question.qId) {
            questionMap.set(question.qId, question);
        }
    });
    
    let wrongQuestionIds;
    
    if (onlyNewWrongs) {
        // Track questions that were later corrected
        const correctedQuestions = new Set();
        const wrongQuestions = new Set();
        
        // Process history chronologically to track corrections
        testHistory.forEach(record => {
            const { qId, isCorrect } = record;
            
            if (!qId || typeof isCorrect !== 'boolean') {
                return;
            }
            
            if (isCorrect) {
                // If previously wrong, mark as corrected
                if (wrongQuestions.has(qId)) {
                    correctedQuestions.add(qId);
                }
            } else {
                // Add to wrong questions if not already corrected
                if (!correctedQuestions.has(qId)) {
                    wrongQuestions.add(qId);
                }
            }
        });
        
        // Only include questions that remain wrong (never corrected)
        wrongQuestionIds = Array.from(wrongQuestions).filter(qId => 
            !correctedQuestions.has(qId)
        );
    } else {
        // Simple approach: get all wrong answers
        const wrongAnswers = testHistory.filter(record => 
            record.qId && record.isCorrect === false
        );
        
        // Remove duplicates using Set - O(n)
        wrongQuestionIds = [...new Set(wrongAnswers.map(record => record.qId))];
    }
    
    // Map question IDs to full question objects - O(k) where k = wrong questions
    const wrongQuestions = wrongQuestionIds
        .map(qId => questionMap.get(qId))
        .filter(question => question !== undefined); // Remove any missing questions
    
    return wrongQuestions;
}

/**
 * 3. Generates a daily study set focused on weak topics and wrong answers
 * @param {Array} testHistory - User's test history with { qId, topic, isCorrect }
 * @param {Array} questionBank - Full question database
 * @param {number} limitPerDay - Maximum questions per day (default: 10)
 * @returns {Array} Daily study set of question objects
 * 
 * Algorithm:
 * 1. Identify top 3 weakest topics (excluding those >85% accuracy)
 * 2. Prioritize wrong questions from these topics
 * 3. Fill remaining slots with new questions
 * 4. Use date-based seeding for consistent daily sets
 * 5. Cache results in localStorage
 */
function generateDailyStudySet(testHistory, questionBank, limitPerDay = 10) {
    // Input validation
    if (!Array.isArray(testHistory) || !Array.isArray(questionBank) || limitPerDay < 1) {
        return [];
    }
    
    // Generate cache key based on current date for consistent daily sets
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const cacheKey = `dailyStudySet_${today}`;
    
    // Check if today's set is already cached
    try {
        const cachedSet = localStorage.getItem(cacheKey);
        if (cachedSet) {
            const parsed = JSON.parse(cachedSet);
            // Verify cached set is still valid (same parameters)
            if (parsed.limitPerDay === limitPerDay && Array.isArray(parsed.questions)) {
                return parsed.questions;
            }
        }
    } catch (e) {
        // Handle localStorage errors gracefully
        console.warn('Failed to load cached daily study set:', e);
    }
    
    // Step 1: Get weakest topics, excluding those with high accuracy
    const allWeakTopics = getWeakTopics(testHistory);
    const eligibleTopics = allWeakTopics.filter(topic => topic.accuracy < 85);
    
    // If no weak topics, return empty set (user is performing well!)
    if (eligibleTopics.length === 0) {
        return [];
    }
    
    // Get topic names for filtering
    const weakTopicNames = eligibleTopics.map(topic => topic.topic);
    
    // Step 2: Create efficient lookup structures
    const answeredQuestionIds = new Set(testHistory.map(record => record.qId).filter(Boolean));
    const wrongQuestions = generateWrongQuestionSet(testHistory, questionBank, true);
    
    // Filter wrong questions by weak topics
    const relevantWrongQuestions = wrongQuestions.filter(q => 
        weakTopicNames.includes(q.topic)
    );
    
    // Step 3: Get new questions from weak topics (never answered before)
    const newQuestionsFromWeakTopics = questionBank.filter(question => 
        weakTopicNames.includes(question.topic) && 
        !answeredQuestionIds.has(question.qId)
    );
    
    // Step 4: Build the daily set
    const dailySet = [];
    
    // Priority 1: Add wrong questions first (up to half the limit)
    const maxWrongQuestions = Math.floor(limitPerDay / 2);
    const selectedWrongQuestions = relevantWrongQuestions.slice(0, maxWrongQuestions);
    dailySet.push(...selectedWrongQuestions);
    
    // Priority 2: Fill remaining slots with new questions
    const remainingSlots = limitPerDay - dailySet.length;
    if (remainingSlots > 0) {
        const selectedNewQuestions = newQuestionsFromWeakTopics.slice(0, remainingSlots);
        dailySet.push(...selectedNewQuestions);
    }
    
    // Step 5: Randomize order using date as seed for consistency
    // Simple deterministic shuffle based on date
    const dateBasedSeed = parseInt(today.replace(/-/g, '')) % 1000;
    const shuffledSet = deterministicShuffle([...dailySet], dateBasedSeed);
    
    // Step 6: Cache the result for the day
    try {
        const cacheData = {
            questions: shuffledSet,
            limitPerDay: limitPerDay,
            generatedAt: new Date().toISOString(),
            weakTopics: eligibleTopics
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        
        // Clean up old cache entries (keep only last 7 days)
        cleanupOldDailyStudySets();
    } catch (e) {
        console.warn('Failed to cache daily study set:', e);
    }
    
    return shuffledSet;
}

/**
 * Utility function: Deterministic shuffle using a seed
 * Ensures the same order for the same date across page reloads
 * @param {Array} array - Array to shuffle
 * @param {number} seed - Seed for reproducible randomness
 * @returns {Array} Shuffled array
 */
function deterministicShuffle(array, seed) {
    // Simple Linear Congruential Generator for deterministic randomness
    let rng = seed;
    const next = () => {
        rng = (rng * 1103515245 + 12345) & 0x7fffffff;
        return rng / 0x7fffffff;
    };
    
    // Fisher-Yates shuffle with deterministic random
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    
    return array;
}

/**
 * Utility function: Clean up old daily study set cache entries
 * Keeps only the last 7 days to prevent localStorage bloat
 */
function cleanupOldDailyStudySets() {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        const cutoffString = cutoffDate.toISOString().split('T')[0];

        // Get all localStorage keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('dailyStudySet_')) {
                const dateString = key.replace('dailyStudySet_', '');
                if (dateString < cutoffString) {
                    keysToRemove.push(key);
                }
            }
        }

        // Remove old entries
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
        console.warn('Failed to cleanup old daily study sets:', e);
    }
}

/**
 * 4. Generates smart, actionable recommendations based on test history
 * @param {Array} testHistory - User's complete test history with { qId, topic, isCorrect, testType }
 * @param {number} maxRecommendations - Maximum number of recommendations to return (default: 3)
 * @returns {Array} Array of recommendation objects with { icon, text, priority }
 *
 * Recommendation types:
 * 1. Weak topic focus suggestions
 * 2. Specific question review alerts
 * 3. Next test type suggestions
 * 4. Progress encouragement
 * 5. Mastery achievements
 */
function generateSmartRecommendations(testHistory, maxRecommendations = 3) {
    // Input validation
    if (!Array.isArray(testHistory) || testHistory.length === 0) {
        return [{
            icon: '🚀',
            text: '<strong>Start your first practice test</strong> - begin building your study profile',
            priority: 1
        }];
    }

    const recommendations = [];

    // Analyze weak topics
    const weakTopics = getWeakTopics(testHistory);

    // Get topic-based statistics
    const topicStats = new Map();
    testHistory.forEach(record => {
        const { topic, isCorrect } = record;
        if (!topic || typeof isCorrect !== 'boolean') return;

        if (!topicStats.has(topic)) {
            topicStats.set(topic, { correct: 0, total: 0, recent: [] });
        }

        const stats = topicStats.get(topic);
        stats.total++;
        if (isCorrect) stats.correct++;
        stats.recent.push(isCorrect);

        // Keep only last 10 for trend analysis
        if (stats.recent.length > 10) {
            stats.recent.shift();
        }
    });

    // Recommendation 1: Focus on weakest topic (if accuracy < 70%)
    if (weakTopics.length > 0 && weakTopics[0].accuracy < 70) {
        const weakest = weakTopics[0];
        recommendations.push({
            icon: '💡',
            text: `<strong>Focus on ${weakest.topic} next</strong> - it's your growth opportunity (${weakest.accuracy}% accuracy)`,
            priority: 1
        });
    }

    // Recommendation 2: Review specific topics with multiple recent mistakes
    const recentWrongsByTopic = new Map();
    const recentHistory = testHistory.slice(-50); // Last 50 questions

    recentHistory.forEach(record => {
        if (!record.isCorrect && record.topic) {
            const count = recentWrongsByTopic.get(record.topic) || 0;
            recentWrongsByTopic.set(record.topic, count + 1);
        }
    });

    // Find topics with 3+ recent mistakes
    for (const [topic, count] of recentWrongsByTopic.entries()) {
        if (count >= 3 && recommendations.length < maxRecommendations) {
            recommendations.push({
                icon: '🎯',
                text: `<strong>Review ${topic}</strong> - ${count} questions missed recently`,
                priority: 2
            });
        }
    }

    // Recommendation 3: Identify improving topics (encouragement)
    for (const [topic, stats] of topicStats.entries()) {
        if (stats.recent.length >= 5) {
            const recentAccuracy = stats.recent.slice(-5).filter(Boolean).length / 5;
            const overallAccuracy = stats.correct / stats.total;

            // If recent performance is 20%+ better than overall
            if (recentAccuracy > overallAccuracy + 0.2 && recommendations.length < maxRecommendations) {
                recommendations.push({
                    icon: '📈',
                    text: `<strong>Great progress on ${topic}!</strong> - keep practicing to maintain this improvement`,
                    priority: 3
                });
                break; // Only show one encouragement
            }
        }
    }

    // Recommendation 4: Suggest test type based on performance
    const testTypeStats = new Map();
    testHistory.forEach(record => {
        if (record.testType) {
            if (!testTypeStats.has(record.testType)) {
                testTypeStats.set(record.testType, { correct: 0, total: 0 });
            }
            const stats = testTypeStats.get(record.testType);
            stats.total++;
            if (record.isCorrect) stats.correct++;
        }
    });

    // Find untested or weak test types
    const allTestTypes = ['Core', 'Type I', 'Type II', 'Type III', 'Universal'];
    const untriedTypes = allTestTypes.filter(type => !testTypeStats.has(type));

    if (untriedTypes.length > 0 && recommendations.length < maxRecommendations) {
        recommendations.push({
            icon: '🆕',
            text: `<strong>Try ${untriedTypes[0]} practice test</strong> - expand your certification coverage`,
            priority: 4
        });
    } else {
        // Find weakest test type
        let weakestType = null;
        let lowestAccuracy = 100;

        for (const [type, stats] of testTypeStats.entries()) {
            const accuracy = (stats.correct / stats.total) * 100;
            if (accuracy < lowestAccuracy && stats.total >= 10) {
                lowestAccuracy = accuracy;
                weakestType = type;
            }
        }

        if (weakestType && lowestAccuracy < 75 && recommendations.length < maxRecommendations) {
            recommendations.push({
                icon: '🔄',
                text: `<strong>Retake ${weakestType} practice test</strong> - improve your ${Math.round(lowestAccuracy)}% score`,
                priority: 4
            });
        }
    }

    // Recommendation 5: Mastery achievement (if overall accuracy > 85%)
    const totalCorrect = testHistory.filter(r => r.isCorrect === true).length;
    const overallAccuracy = Math.round((totalCorrect / testHistory.length) * 100);

    if (overallAccuracy >= 85 && recommendations.length < maxRecommendations) {
        recommendations.push({
            icon: '⭐',
            text: `<strong>Excellent work!</strong> - ${overallAccuracy}% overall accuracy. You're ready for the real exam!`,
            priority: 5
        });
    }

    // Recommendation 6: If not enough data, encourage more practice
    if (testHistory.length < 20 && recommendations.length < maxRecommendations) {
        recommendations.push({
            icon: '📚',
            text: `<strong>Keep building your test history</strong> - more practice = better insights`,
            priority: 6
        });
    }

    // Sort by priority and return top recommendations
    recommendations.sort((a, b) => a.priority - b.priority);
    return recommendations.slice(0, maxRecommendations);
}

// Export functions for use in other files (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getWeakTopics,
        generateWrongQuestionSet,
        generateDailyStudySet,
        generateSmartRecommendations
    };
}

// Example usage and testing (commented out for production)
/*
// Example test data
const sampleTestHistory = [
    { qId: 'q1', topic: 'Core', isCorrect: true },
    { qId: 'q2', topic: 'Core', isCorrect: false },
    { qId: 'q3', topic: 'Type I', isCorrect: false },
    { qId: 'q4', topic: 'Type I', isCorrect: false },
    { qId: 'q5', topic: 'Type II', isCorrect: true },
    { qId: 'q6', topic: 'Type II', isCorrect: true },
];

const sampleQuestionBank = [
    { qId: 'q1', question: 'Core question 1', choices: ['A', 'B', 'C'], correct: 0, topic: 'Core' },
    { qId: 'q2', question: 'Core question 2', choices: ['A', 'B', 'C'], correct: 1, topic: 'Core' },
    { qId: 'q3', question: 'Type I question 1', choices: ['A', 'B', 'C'], correct: 2, topic: 'Type I' },
    { qId: 'q4', question: 'Type I question 2', choices: ['A', 'B', 'C'], correct: 0, topic: 'Type I' },
    { qId: 'q5', question: 'Type II question 1', choices: ['A', 'B', 'C'], correct: 1, topic: 'Type II' },
    { qId: 'q7', question: 'New question', choices: ['A', 'B', 'C'], correct: 0, topic: 'Type I' },
];

// Test the functions
console.log('Weak Topics:', getWeakTopics(sampleTestHistory));
console.log('Wrong Questions:', generateWrongQuestionSet(sampleTestHistory, sampleQuestionBank));
console.log('Daily Study Set:', generateDailyStudySet(sampleTestHistory, sampleQuestionBank, 5));
*/