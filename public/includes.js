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

// Include system for loading header and footer
function loadIncludes() {
    // Determine if we're in a subdirectory
    const pathPrefix = window.location.pathname.includes('/blog/') ? '../' : '';

    // Load header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        fetch(pathPrefix + 'header.html')
            .then(response => response.text())
            .then(data => {
                // Parse the header HTML to separate head and body content
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = data;
                
                // Extract head content (favicon, scripts, etc.)
                const headContent = data.match(/<!-- Favicon -->[\s\S]*?<!-- Header -->/);
                if (headContent) {
                    const headDiv = document.createElement('div');
                    headDiv.innerHTML = headContent[0];
                    
                    // Add head content to document head
                    const links = headDiv.querySelectorAll('link');
                    const scripts = headDiv.querySelectorAll('script');
                    const noscripts = headDiv.querySelectorAll('noscript');
                    
                    links.forEach(link => document.head.appendChild(link));
                    scripts.forEach(script => {
                        const newScript = document.createElement('script');
                        if (script.src) newScript.src = script.src;
                        if (script.innerHTML) newScript.innerHTML = script.innerHTML;
                        Array.from(script.attributes).forEach(attr => {
                            newScript.setAttribute(attr.name, attr.value);
                        });
                        document.head.appendChild(newScript);
                    });
                    noscripts.forEach(noscript => document.body.insertBefore(noscript, document.body.firstChild));
                    const styles = headDiv.querySelectorAll('style');
                    styles.forEach(style => {
                        const newStyle = document.createElement('style');
                        newStyle.innerHTML = style.innerHTML;
                        document.head.appendChild(newStyle);
                    });
                }
                
                // Extract and display header section
                const headerSection = data.match(/<!-- Header -->[\s\S]*$/);
                if (headerSection) {
                    let headerHTML = headerSection[0];
                    // Adjust paths for subdirectories
                    if (pathPrefix) {
                        headerHTML = headerHTML.replace(/href="\//g, 'href="' + pathPrefix);
                        headerHTML = headerHTML.replace(/src="logo\.svg"/g, 'src="' + pathPrefix + 'logo.svg"');
                        headerHTML = headerHTML.replace(/href="([^"]*\.html)"/g, function(match, p1) {
                            if (!p1.startsWith('http') && !p1.startsWith('/')) {
                                return 'href="' + pathPrefix + p1 + '"';
                            }
                            return match;
                        });
                    }
                    headerPlaceholder.innerHTML = headerHTML;

                    // Init dropdown hover with delay (scripts in innerHTML don't execute)
                    var timers = {};
                    headerPlaceholder.querySelectorAll('.dropdown').forEach(function(dd, idx) {
                        dd.addEventListener('mouseenter', function() {
                            clearTimeout(timers[idx]);
                            headerPlaceholder.querySelectorAll('.dropdown').forEach(function(o) { o.classList.remove('open'); });
                            dd.classList.add('open');
                        });
                        dd.addEventListener('mouseleave', function() {
                            timers[idx] = setTimeout(function() { dd.classList.remove('open'); }, 180);
                        });
                    });
                    document.addEventListener('click', function(e) {
                        if (!e.target.closest || !e.target.closest('.dropdown')) {
                            headerPlaceholder.querySelectorAll('.dropdown').forEach(function(dd) { dd.classList.remove('open'); });
                        }
                    });
                }

                // Add hidden navigation for SEO crawling
                if (!document.getElementById('seo-nav')) {
                    const seoNav = document.createElement('nav');
                    seoNav.id = 'seo-nav';
                    seoNav.style.position = 'absolute';
                    seoNav.style.left = '-9999px'; // Better SEO practice than display:none
                    seoNav.innerHTML = `
                        <ul>
                            <li><a href="/">Home</a></li>
                            <li><a href="/about.html">About</a></li>
                            <li><a href="/contact.html">Contact</a></li>
                            <li><a href="/history.html">Progress</a></li>
                            <li><a href="/core.html">Core Test</a></li>
                            <li><a href="/type-1.html">Type 1 Test</a></li>
                            <li><a href="/type-2.html">Type 2 Test</a></li>
                            <li><a href="/type-3.html">Type 3 Test</a></li>
                            <li><a href="/universal.html">Universal Test</a></li>
                            <li><a href="/review.html">Review</a></li>
                            <li><a href="/faq.html">FAQ</a></li>
                            <li><a href="/terms.html">Terms</a></li>
                            <li><a href="/policy.html">Privacy</a></li>
                            <li><a href="/changelog.html">Changelog</a></li>
                        </ul>
                    `;
                    document.body.appendChild(seoNav);
                    console.log('SEO navigation added'); // Debug message
                }
            })
            .catch(error => console.error('Error loading header:', error));
    }
    
    // Load footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        fetch(pathPrefix + 'footer.html')
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error('Error loading footer:', error));
    }
}

// Load includes and analytics when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadGTM();
    loadVercelAnalytics();
    // Header is now inlined — only load footer
    var footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        var pathPrefix = window.location.pathname.includes('/blog/') ? '../' : '';
        fetch(pathPrefix + 'footer.html')
            .then(function(r){ return r.text(); })
            .then(function(data){ footerPlaceholder.innerHTML = data; })
            .catch(function(){});
    }
});