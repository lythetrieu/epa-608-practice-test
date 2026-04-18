// Google Tag Manager
function loadGTM() {
    // GTM script in <head>
    var s = document.createElement('script');
    s.innerHTML = "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-KSX9M3DD');";
    document.head.appendChild(s);
    // GTM noscript at top of <body>
    var ns = document.createElement('noscript');
    ns.innerHTML = '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KSX9M3DD" height="0" width="0" style="display:none;visibility:hidden"></iframe>';
    document.body.insertBefore(ns, document.body.firstChild);
}

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
    loadGTM();
    loadVercelAnalytics();
});
