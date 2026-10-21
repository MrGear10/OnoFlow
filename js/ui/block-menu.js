/*
 * OnoFlow — menu dei blocchi da inserire (FR-EDIT-01, FR-MOB-05, DEC-063, passo 9).
 *
 * Dipendenze: js/namespace.js, js/core/editor.js, js/ui/diagram-renderer.js.
 * Definisce: OnoFlow.BlockMenu.create
 *
 * Si apre da un punto di inserimento o da "Inserisci dopo". Non è una finestra modale (B1):
 * niente velo, il resto della pagina resta usabile e un tocco fuori lo chiude. Sul telefono
 * è un pannello in basso a tutta larghezza; sul computer un riquadro accanto al punto.
 * Ogni voce ha la forma e la tinta del suo tipo (DEC-057), alta almeno 44 px (FR-MOB-04).
 * Tastiera: le frecce scorrono le voci, Esc chiude e il focus torna da dove si era partiti.
 *
 *     create(host, { t, onChoose(kind) }) → { open(ancora, { sheet, returnFocus }), close(), isOpen() }
 * host è l'elemento posizionato in cui il menu si appoggia (la zona del diagramma);
 * ancora è un rettangolo dello schermo (getBoundingClientRect) vicino a cui aprirlo.
 */
(function (OnoFlow) {
    'use strict';

    var Editor = OnoFlow.Editor;
    var DiagramRenderer = OnoFlow.DiagramRenderer;
    if (!Editor || !DiagramRenderer) {
        throw new Error('block-menu.js richiede editor.js e diagram-renderer.js, da caricare prima');
    }

    var GAP = 8;

    function create(host, options) {
        var t = options.t;
        var menu = document.createElement('div');
        menu.className = 'block-menu';
        menu.hidden = true;
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', t('ui.insert.title'));

        var header = document.createElement('div');
        header.className = 'block-menu-header';
        var title = document.createElement('p');
        title.className = 'block-menu-title';
        title.textContent = t('ui.insert.title');
        header.appendChild(title);
        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'button button--quiet block-menu-close';
        close.textContent = t('ui.notice.close');
        header.appendChild(close);
        menu.appendChild(header);

        var grid = document.createElement('div');
        grid.className = 'block-menu-grid';
        var items = Editor.INSERTABLE_KINDS.map(function (kind) {
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'block-menu-item';
            item.setAttribute('role', 'menuitem');
            item.setAttribute('data-kind', kind);
            item.appendChild(DiagramRenderer.blockIcon(kind));
            var name = document.createElement('span');
            name.textContent = t('block.name.' + kind);
            item.appendChild(name);
            item.addEventListener('click', function () {
                closeMenu({ restoreFocus: false });
                options.onChoose(kind);
            });
            grid.appendChild(item);
            return item;
        });
        menu.appendChild(grid);
        host.appendChild(menu);

        var returnFocus = null;

        function closeMenu(closeOptions) {
            if (menu.hidden) {
                return;
            }
            menu.hidden = true;
            if ((!closeOptions || closeOptions.restoreFocus !== false) && returnFocus && returnFocus.isConnected) {
                returnFocus.focus({ preventScroll: true });
            }
            returnFocus = null;
        }

        /* Sul computer accanto all'ancora, dentro la zona del diagramma. */
        function place(anchor) {
            var hostBox = host.getBoundingClientRect();
            var width = menu.offsetWidth;
            var height = menu.offsetHeight;
            var left = anchor.right + GAP - hostBox.left;
            if (left + width > host.clientWidth - GAP) {
                left = anchor.left - GAP - width - hostBox.left; // a sinistra se a destra non c'è posto
            }
            var top = anchor.top + anchor.height / 2 - height / 2 - hostBox.top;
            menu.style.left = Math.max(GAP, Math.min(left, host.clientWidth - width - GAP)) + 'px';
            menu.style.top = Math.max(GAP, Math.min(top, host.clientHeight - height - GAP)) + 'px';
        }

        function open(anchor, openOptions) {
            returnFocus = openOptions && openOptions.returnFocus ? openOptions.returnFocus : null;
            var sheet = Boolean(openOptions && openOptions.sheet);
            menu.classList.toggle('block-menu--sheet', sheet);
            menu.style.left = '';
            menu.style.top = '';
            menu.hidden = false;
            if (!sheet) {
                place(anchor);
            }
            items[0].focus({ preventScroll: true });
        }

        close.addEventListener('click', function () { closeMenu(); });

        menu.addEventListener('keydown', function (event) {
            var index = items.indexOf(document.activeElement);
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu();
            } else if (index !== -1 && ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].indexOf(event.key) !== -1) {
                event.preventDefault();
                var step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
                items[(index + step + items.length) % items.length].focus();
            } else if (event.key === 'Home' || event.key === 'End') {
                event.preventDefault();
                items[event.key === 'Home' ? 0 : items.length - 1].focus();
            }
        });

        // Un tocco fuori chiude il menu, senza fare altro (niente velo: non è modale).
        document.addEventListener('pointerdown', function (event) {
            if (!menu.hidden && !menu.contains(event.target)) {
                closeMenu({ restoreFocus: false });
            }
        }, true);

        return {
            open: open,
            close: closeMenu,
            isOpen: function () { return !menu.hidden; },
            element: menu
        };
    }

    OnoFlow.BlockMenu = { create: create };
})(window.OnoFlow);
