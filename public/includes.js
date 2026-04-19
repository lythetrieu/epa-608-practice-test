// Vercel Analytics & Speed Insights Setup
function loadVercelAnalytics() {
    // Analytics
    const analyticsScript = document.createElement('script');
    analyticsScript.src = 'https://va.vercel-scripts.com/v1/script.js';
    analyticsScript.defer = true;
    analyticsScript.setAttribute('data-api', '_vercel/insights');
    document.head.appendChild(analyticsScript);

    // Speed Insights
    const speedScript = document.createElement('script');
    speedScript.src = 'https://va.vercel-scripts.com/v1/speed-insights/script.js';
    speedScript.defer = true;
    document.head.appendChild(speedScript);
}

document.addEventListener('DOMContentLoaded', function() {
    loadVercelAnalytics();
});
