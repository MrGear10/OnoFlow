/*
 * OnoFlow — test del tema scelto a mano (DEC-080): sistema, scelta, ?tema=, colore della barra.
 *
 * Dipendenze: tests/framework/*, js/ui/theme.js.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var Theme = window.OnoFlow.Theme;

    /* Un "sistema" finto, per non dipendere dal computer che esegue i test. */
    function system(dark) {
        var listeners = [];
        return {
            matches: dark,
            addEventListener: function (type, listener) { listeners.push(listener); },
            change: function (value) { this.matches = value; listeners.forEach(function (listener) { listener(); }); }
        };
    }

    function setup(dark) {
        var root = document.createElement('div');
        var meta = document.createElement('meta');
        meta.setAttribute('content', 'x');
        var sys = system(dark);
        var seen = [];
        var theme = Theme.create(root, sys, [meta]);
        theme.onChange(function (current) { seen.push(current); });
        return { root: root, meta: meta, sys: sys, theme: theme, seen: seen };
    }

    T.suite('Tema (DEC-080)', function () {
        T.test('senza scelta vale quello del sistema, e lo segue', function (assert) {
            var s = setup(true);
            assert.equal(s.theme.effective(), 'dark');
            s.sys.change(false);
            assert.equal(s.theme.effective(), 'light');
            assert.deepEqual(s.seen, ['light'], 'chi mostra il comando lo sa');
        });

        T.test('una scelta vince sul sistema; il cambio va al tema opposto', function (assert) {
            var s = setup(true);
            s.theme.toggle();
            assert.equal(s.root.getAttribute('data-theme'), 'light');
            assert.equal(s.theme.effective(), 'light');
            assert.equal(s.meta.getAttribute('content'), Theme.THEME_COLORS.light, 'anche la barra del browser');
            s.sys.change(false);
            s.sys.change(true);
            assert.equal(s.theme.effective(), 'light', 'il sistema non la cambia più');
            s.theme.toggle();
            assert.equal(s.theme.effective(), 'dark');
            assert.throws(function () { s.theme.set('blu'); }, RangeError);
        });

        T.test('?tema= nell\'indirizzo, in italiano o in inglese', function (assert) {
            assert.equal(Theme.fromQuery('?tema=chiaro'), 'light');
            assert.equal(Theme.fromQuery('?lang=it&tema=SCURO'), 'dark');
            assert.equal(Theme.fromQuery('?tema=dark'), 'dark');
            assert.equal(Theme.fromQuery('?tema=blu'), null);
            assert.equal(Theme.fromQuery(''), null);
        });
    });
})();
