/*
 * OnoFlow — tema chiaro o scuro scelto a mano (DEC-080).
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.Theme.{create, fromQuery, THEME_COLORS}
 *
 * Senza scelta vale il tema del sistema (prefers-color-scheme, NFR-ACC-02). La scelta si
 * scrive come data-theme="light" | "dark" sull'elemento html, e css/tokens.css la rispetta
 * anche contro il sistema. Non si memorizza (NFR-PRIV-01, NFR-PRIV-04, come la lingua): si
 * può fissare con ?tema=chiaro o ?tema=scuro nell'indirizzo.
 *
 *     create(root, systemDark, metas) → { effective(), set(tema), toggle(), onChange(f) }
 *         root: l'elemento html; systemDark: MediaQueryList di (prefers-color-scheme: dark);
 *         metas: i <meta name="theme-color">, aggiornati con il colore della barra del browser
 *     fromQuery(search) → 'light' | 'dark' | null
 */
(function (OnoFlow) {
    'use strict';

    // Colore della barra del browser per tema: lo stesso di index.html.
    var THEME_COLORS = { light: '#f4f5f7', dark: '#1a1f29' };
    var QUERY_VALUES = { chiaro: 'light', scuro: 'dark', light: 'light', dark: 'dark' };

    function fromQuery(search) {
        var match = /[?&]tema=([^&]*)/.exec(search || '');
        return match ? QUERY_VALUES[decodeURIComponent(match[1]).toLowerCase()] || null : null;
    }

    function create(root, systemDark, metas) {
        var listeners = [];

        function effective() {
            var chosen = root.getAttribute('data-theme');
            if (chosen === 'light' || chosen === 'dark') {
                return chosen;
            }
            return systemDark && systemDark.matches ? 'dark' : 'light';
        }

        function notify() {
            var current = effective();
            listeners.forEach(function (listener) { listener(current); });
        }

        function set(theme) {
            if (theme !== 'light' && theme !== 'dark') {
                throw new RangeError('Theme: tema sconosciuto ' + theme);
            }
            root.setAttribute('data-theme', theme);
            // Con una scelta a mano, la barra del browser segue la scelta e non il sistema.
            Array.prototype.forEach.call(metas || [], function (meta) {
                meta.setAttribute('content', THEME_COLORS[theme]);
            });
            notify();
        }

        // Il sistema cambia: senza una scelta cambia anche il tema; con una scelta resta quella.
        if (systemDark && systemDark.addEventListener) {
            systemDark.addEventListener('change', notify);
        }

        return {
            effective: effective,
            set: set,
            toggle: function () { set(effective() === 'dark' ? 'light' : 'dark'); },
            onChange: function (listener) { listeners.push(listener); }
        };
    }

    OnoFlow.Theme = { create: create, fromQuery: fromQuery, THEME_COLORS: THEME_COLORS };
})(window.OnoFlow);
