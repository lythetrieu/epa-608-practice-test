// Vercel Analytics & Speed Insights
function loadVercelAnalytics() {
    const a = document.createElement('script');
    a.src = 'https://va.vercel-scripts.com/v1/script.debug.js';
    a.defer = true;
    a.setAttribute('data-api', '_vercel/insights');
    document.head.appendChild(a);

    const s = document.createElement('script');
    s.src = 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js';
    s.defer = true;
    document.head.appendChild(s);
}

document.addEventListener('DOMContentLoaded', function() {
    loadVercelAnalytics();
});
