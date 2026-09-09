/*  nav-loader.js  –  loads nav.html synchronously and sets the active menu item  */
(function () {
    var placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) return;

    // Synchronous XHR so nav is in the DOM before jQuery / main.js init
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'nav.html', false);
    xhr.send();

    if (xhr.status === 200) {
        placeholder.insertAdjacentHTML('afterend', xhr.responseText);
        placeholder.remove();
        setActiveNav();
    }

    function setActiveNav() {
        var rawPage = location.pathname.split('/').pop() || 'home-1';
        var page = rawPage.replace(/\.html$/, '');

        var map = {
            'home': ['home-1', 'home-2'],
            'portfolio': ['portfolio-1', 'portfolio-2', 'portfolio-3'],
            'services': ['services', 'service'],
            'products': ['products'],
            'portal': ['client-portal', 'portal'],
            'other': ['team', 'contact', 'blog', 'blog-1', 'blog-2', 'blog-3',
                'blog-4', 'blog-5', 'blog-6', 'blog-7',
                'blog-8', 'blog-9', 'blog-10', 'publication', '404']
        };

        var activeKey = null;
        for (var key in map) {
            for (var i = 0; i < map[key].length; i++) {
                if (page === map[key][i]) { activeKey = key; break; }
            }
            if (activeKey) break;
        }

        if (!activeKey && page.indexOf('project-') === 0) activeKey = 'portfolio';

        if (activeKey) {
            var el = document.querySelector('[data-nav="' + activeKey + '"]');
            if (el) el.classList.add('mil-active');
        }
    }
})();
