/*
 * OnoFlow — pagina della documentazione (documentazione.html, DEC-081).
 *
 * Dipendenze: js/namespace.js, js/ui/theme.js.
 *
 * La pagina funziona anche senza questo script: è un solo documento lungo con le ancore, e la
 * ricerca del browser (Ctrl + F) trova tutto. Lo script aggiunge:
 *   - il tema chiaro o scuro, con lo stesso pulsante e lo stesso ?tema= dell'app (DEC-080);
 *   - l'indice a scomparsa sul telefono (pulsante Indice, Esc, un tocco su una voce);
 *   - il filtro dei titoli dell'indice;
 *   - la voce dell'indice del capitolo che si sta leggendo;
 *   - «Torna all'app»: la documentazione si apre in una scheda nuova, quindi la si chiude e si
 *     torna alla scheda dell'app con il diagramma aperto (la copia di sessione è di quella
 *     scheda); se il browser non lascia chiudere, si apre l'app.
 */
(function (OnoFlow) {
    'use strict';

    function byId(id) {
        return document.getElementById(id);
    }

    function start() {
        // Tema, come nell'app.
        var theme = OnoFlow.Theme.create(document.documentElement, window.matchMedia('(prefers-color-scheme: dark)'),
            document.querySelectorAll('meta[name="theme-color"]'));
        var themeButton = byId('theme-toggle');
        function showTheme(current) {
            var target = current === 'dark' ? 'light' : 'dark';
            var label = target === 'light' ? 'Tema chiaro' : 'Tema scuro';
            themeButton.setAttribute('data-target', target);
            themeButton.setAttribute('aria-label', label);
            themeButton.title = label;
        }
        theme.onChange(showTheme);
        if (OnoFlow.Theme.fromQuery(window.location.search)) {
            theme.set(OnoFlow.Theme.fromQuery(window.location.search));
        }
        showTheme(theme.effective());
        themeButton.addEventListener('click', function () { theme.toggle(); });

        Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (link) {
            link.addEventListener('click', function (event) {
                if (window.history.length > 1) {
                    return; // aperta nella stessa scheda: il collegamento va bene così
                }
                event.preventDefault();
                window.close();
                window.setTimeout(function () { window.location.href = link.href; }, 150);
            });
        });

        // Indice a scomparsa sugli schermi stretti.
        var nav = byId('docs-nav');
        var indexButton = byId('docs-index-button');
        function setIndex(open) {
            document.body.classList.toggle('is-index-open', open);
            indexButton.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                // Non il filtro: sul telefono aprirebbe la tastiera e farebbe scorrere la pagina.
                nav.querySelector('a').focus({ preventScroll: true });
            }
        }
        indexButton.addEventListener('click', function () {
            setIndex(!document.body.classList.contains('is-index-open'));
        });
        nav.addEventListener('click', function (event) {
            if (event.target.closest && event.target.closest('a')) {
                setIndex(false);
            }
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && document.body.classList.contains('is-index-open')) {
                setIndex(false);
                indexButton.focus();
            }
        });

        // Filtro dei titoli: un documento resta se il suo nome o un suo capitolo contiene il testo.
        var filter = byId('docs-filter');
        var empty = byId('docs-filter-empty');
        filter.addEventListener('input', function () {
            var wanted = filter.value.trim().toLowerCase();
            var shown = 0;
            Array.prototype.forEach.call(nav.querySelectorAll('.nav-doc'), function (doc) {
                var docMatch = doc.querySelector('.nav-doc-link').textContent.toLowerCase().indexOf(wanted) !== -1;
                var any = false;
                Array.prototype.forEach.call(doc.querySelectorAll('ul li'), function (item) {
                    var match = !wanted || docMatch || item.textContent.toLowerCase().indexOf(wanted) !== -1;
                    item.hidden = !match;
                    any = any || match;
                });
                doc.hidden = Boolean(wanted) && !docMatch && !any;
                shown += doc.hidden ? 0 : 1;
            });
            empty.hidden = shown > 0;
        });
        filter.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                // Il primo capitolo trovato; se il testo è nel nome di un documento, quel documento.
                var first = nav.querySelector('.nav-doc:not([hidden]) li:not([hidden]) a') || nav.querySelector('.nav-doc:not([hidden]) a');
                if (first) {
                    event.preventDefault();
                    window.location.hash = first.getAttribute('href');
                    setIndex(false);
                }
            }
        });

        // Il capitolo che si sta leggendo è segnato nell'indice.
        var links = {};
        Array.prototype.forEach.call(nav.querySelectorAll('a[href^="#"]'), function (link) {
            links[link.getAttribute('href').slice(1)] = link;
        });
        var current = null;
        if (window.IntersectionObserver) {
            var observer = new window.IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting && links[entry.target.id]) {
                        if (current) {
                            current.removeAttribute('aria-current');
                        }
                        current = links[entry.target.id];
                        current.setAttribute('aria-current', 'location');
                    }
                });
            }, { rootMargin: '0px 0px -70% 0px' });
            Object.keys(links).forEach(function (id) {
                var target = byId(id);
                if (target) {
                    observer.observe(target);
                }
            });
        }
    }

    start();
})(window.OnoFlow);
