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
        var page = location.pathname.split('/').pop() || 'home-1.html';

        var map = {
            'home': ['home-1.html', 'home-2.html'],
            'portfolio': ['portfolio-1.html', 'portfolio-2.html', 'portfolio-3.html'],
            'services': ['services.html', 'service.html'],
            'products': ['products.html'],
            'newsletter': ['blog.html', 'blog-1.html', 'blog-2.html', 'blog-3.html',
                'blog-4.html', 'blog-5.html', 'blog-6.html', 'blog-7.html',
                'blog-8.html', 'blog-9.html', 'blog-10.html', 'publication.html'],
            'other': ['team.html', 'contact.html', '404.html']
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
