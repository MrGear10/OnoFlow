/*
 * OnoFlow — finestra delle variabili (MG-02, DEC-108): tutte le variabili del diagramma con il
 * loro valore in quel momento dell'esecuzione. Solo sul computer (il CSS la toglie sotto i 56rem).
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.VariablesWindow.{create, rowsView, MAX_INLINE}
 *
 * Le righe sono quelle di Model.declaredVariables: fisse durante l'esecuzione, cambiano solo i
 * valori. Il nome porta la funzione tra parentesi quando il programma ne ha più di una, e il
 * livello quando una funzione ha più chiamate attive (ricorsione). Una variabile senza valore,
 * o di una funzione che non è in esecuzione, mostra «–»; un parametro array, che è dell'array
 * del chiamante (per riferimento), dopo il ritorno tiene l'ultimo valore.
 *
 *     rowsView(righe, pila | null, memoria, t, formatValue) → [{ key, label, type, text, full,
 *         elements: [testo] | null }]   (funzione pura; memoria: { chiave: elementi } dei
 *         parametri array visti, che la funzione aggiorna)
 *     create(host, { t, formatValue, formatFull, onToggle(aperta) }) → {
 *         setRows(righe), show(pila | null), open(), close(), toggle(), isOpen(), element
 *     }
 * host è la zona del diagramma (posizione relativa): la finestra ci galleggia sopra e non ne esce.
 */
(function (OnoFlow) {
    'use strict';

    var MAX_INLINE = 10; // elementi di un array scritti nella cella; gli altri con un clic
    var MAX_ELEMENTS = 50; // elementi nell'elenco aperto, come nel pannello
    var NONE = '–';
    var KEY_STEP = 20; // un quadretto
    var KEY_STEP_LARGE = 80;

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        if (text !== undefined) {
            node.textContent = text;
        }
        return node;
    }

    function rowKey(row) {
        return row.functionName + '\u0000' + row.name;
    }

    function valueText(type, value, formatValue) {
        return value === undefined || value === null ? NONE : formatValue({ type: type, value: value });
    }

    function rowsView(rows, frames, memory, t, formatValue) {
        var byFunction = Object.create(null);
        (frames || []).forEach(function (frame) {
            (byFunction[frame.functionName] = byFunction[frame.functionName] || []).push(frame);
        });
        var functions = Object.create(null);
        rows.forEach(function (row) { functions[row.functionName] = true; });
        var named = Object.keys(functions).length > 1 || Object.keys(functions).some(function (name) { return name !== 'Main'; });

        return rows.map(function (row) {
            var key = rowKey(row);
            var calls = byFunction[row.functionName];
            var level = calls && calls.length > 1 ? calls.length : 0;
            var variable = null;
            if (calls) {
                variable = calls[calls.length - 1].variables.filter(function (entry) { return entry.name === row.name; })[0] || null;
                if (variable && row.parameter && variable.array) {
                    memory[key] = variable.elements.slice();
                }
            }
            var elements = variable && variable.array ? variable.elements
                : !calls && row.parameter && row.array && memory[key] ? memory[key] : null;
            var label = !named ? row.name
                : level ? t('ui.variablesWindow.nameLevel', { name: row.name, 'function': row.functionName, level: String(level) })
                : t('ui.variablesWindow.name', { name: row.name, 'function': row.functionName });
            var view = {
                key: key,
                label: label,
                type: row.array ? t('ui.variablesWindow.arrayType', { type: row.type }) : row.type,
                text: NONE,
                full: null,
                elements: null
            };
            if (elements) {
                var texts = [];
                for (var i = 0; i < elements.length; i++) {
                    texts.push(valueText(row.type, elements[i], formatValue));
                }
                view.elements = texts;
                view.text = '[' + texts.slice(0, MAX_INLINE).join('; ') + (texts.length > MAX_INLINE ? '; …' : '') + ']';
            } else if (variable && !variable.array) {
                view.text = valueText(row.type, variable.value, formatValue);
                view.value = variable.value;
            }
            return view;
        });
    }

    function create(host, options) {
        var t = options.t;
        var formatValue = options.formatValue;
        var formatFull = options.formatFull;
        var onToggle = options.onToggle || function () {};

        var rows = [];
        var frames = null;
        var memory = Object.create(null);
        var previous = Object.create(null); // chiave → valore mostrato, per segnare ciò che cambia
        var lastChanged = Object.create(null); // chiave → cambiata nell'ultimo aggiornamento
        var expanded = Object.create(null); // chiave → elenco degli elementi aperto
        var position = null; // { left, top } scelti trascinando; null = in alto a destra
        var minimized = false;

        var root = element('section', 'variables-window');
        root.id = 'variables-window';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'false');
        root.setAttribute('aria-labelledby', 'variables-window-title');
        root.hidden = true;

        var header = element('div', 'variables-window-header');
        header.tabIndex = 0;
        header.setAttribute('aria-describedby', 'variables-window-hint');
        var title = element('h2', 'variables-window-title');
        title.id = 'variables-window-title';
        var titleText = element('span', '', t('ui.variablesWindow.title'));
        var count = element('span', 'variables-window-count');
        title.appendChild(titleText);
        title.appendChild(count);
        var hint = element('span', 'visually-hidden', t('ui.variablesWindow.moveHint'));
        hint.id = 'variables-window-hint';
        var minimize = element('button', 'button button--quiet variables-window-button');
        minimize.type = 'button';
        minimize.setAttribute('aria-expanded', 'true');
        minimize.setAttribute('aria-controls', 'variables-window-body');
        var close = element('button', 'button button--quiet variables-window-button');
        close.type = 'button';
        close.setAttribute('aria-label', t('ui.variablesWindow.close'));
        close.title = t('ui.variablesWindow.close');
        close.innerHTML = '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/></svg>';
        header.appendChild(title);
        header.appendChild(hint);
        header.appendChild(minimize);
        header.appendChild(close);

        var body = element('div', 'variables-window-body');
        body.id = 'variables-window-body';
        var table = element('table', 'variables-window-table');
        var head = element('thead');
        var headRow = element('tr');
        [t('ui.variablesWindow.variable'), t('ui.variables.value')].forEach(function (text) {
            var cell = element('th', '', text);
            cell.scope = 'col';
            headRow.appendChild(cell);
        });
        head.appendChild(headRow);
        var tbody = element('tbody');
        table.appendChild(head);
        table.appendChild(tbody);
        var empty = element('p', 'variables-window-empty', t('ui.variablesWindow.empty'));
        body.appendChild(table);
        body.appendChild(empty);

        root.appendChild(header);
        root.appendChild(body);
        host.appendChild(root);

        function setMinimized(next) {
            minimized = next;
            body.hidden = minimized;
            root.classList.toggle('is-minimized', minimized);
            minimize.setAttribute('aria-expanded', String(!minimized));
            var label = t(minimized ? 'ui.variablesWindow.restore' : 'ui.variablesWindow.minimize');
            minimize.setAttribute('aria-label', label);
            minimize.title = label;
            minimize.innerHTML = minimized
                ? '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 12.5L10 8l4.5 4.5"/></svg>'
                : '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 8L10 12.5 14.5 8"/></svg>';
            place();
        }

        // --- Contenuto -------------------------------------------------------------------

        /* quiet: si ridisegna senza un nuovo passo (si apre l'elenco di un array): i segni restano
           quelli dell'ultimo aggiornamento. */
        function render(quiet) {
            var views = rowsView(rows, frames, memory, t, formatValue);
            count.textContent = ' · ' + rows.length;
            tbody.textContent = '';
            table.hidden = rows.length === 0;
            empty.hidden = rows.length > 0;
            var next = Object.create(null);
            var marks = Object.create(null);
            views.forEach(function (view) {
                var compared = view.elements ? view.elements.join('\u0001') : view.text;
                var changed = quiet ? Boolean(lastChanged[view.key])
                    : frames !== null && view.key in previous && previous[view.key] !== compared;
                next[view.key] = compared;
                marks[view.key] = changed;
                var tr = element('tr', 'variables-window-row' + (changed ? ' is-changed' : '') + (view.elements ? ' is-array' : ''));
                tr.setAttribute('data-key', view.key);
                var name = element('th', 'variables-window-name', view.label);
                name.scope = 'row';
                name.title = view.type;
                name.appendChild(element('span', 'visually-hidden', ', ' + view.type));
                var value = element('td', 'variables-window-value');
                if (view.elements) {
                    var toggle = element('button', 'variables-window-array');
                    toggle.type = 'button';
                    toggle.setAttribute('aria-expanded', String(Boolean(expanded[view.key])));
                    toggle.title = t(expanded[view.key] ? 'ui.variablesWindow.collapseArray' : 'ui.variablesWindow.expandArray');
                    toggle.textContent = view.text;
                    value.appendChild(toggle);
                    if (expanded[view.key]) {
                        var list = element('ol', 'variables-window-elements');
                        view.elements.slice(0, MAX_ELEMENTS).forEach(function (text, index) {
                            var item = element('li');
                            item.appendChild(element('span', 'variable-index', String(index)));
                            item.appendChild(element('span', 'variable-element', text));
                            list.appendChild(item);
                        });
                        if (view.elements.length > MAX_ELEMENTS) {
                            list.appendChild(element('li', 'variable-more', t('ui.value.more', { count: String(view.elements.length - MAX_ELEMENTS) })));
                        }
                        value.appendChild(list);
                    }
                } else if (view.text === NONE) {
                    value.appendChild(element('span', '', NONE)).setAttribute('aria-hidden', 'true');
                    value.appendChild(element('span', 'visually-hidden', t('ui.value.none')));
                } else {
                    value.textContent = view.text;
                    if (typeof view.value === 'number' && view.type === 'Real' && formatFull(view.value) !== view.text) {
                        value.title = t('ui.variablesPanel.full', { value: formatFull(view.value) });
                    }
                }
                if (changed) {
                    value.appendChild(element('span', 'visually-hidden', ' (' + t('ui.variablesPanel.changed') + ')'));
                }
                tr.appendChild(name);
                tr.appendChild(value);
                tbody.appendChild(tr);
            });
            if (!quiet) {
                previous = frames === null ? Object.create(null) : next;
                lastChanged = marks;
            }
        }

        tbody.addEventListener('click', function (event) {
            var button = event.target.closest ? event.target.closest('.variables-window-array') : null;
            if (!button) {
                return;
            }
            var key = button.closest('tr').getAttribute('data-key');
            expanded[key] = !expanded[key];
            render(true); // aprire un elenco non è un cambiamento
            var again = tbody.querySelector('tr[data-key="' + CSS.escape(key) + '"] .variables-window-array');
            if (again) {
                again.focus();
            }
            place();
        });

        // --- Posizione: dentro la zona del diagramma, sotto i suoi avvisi ------------------

        function bounds() {
            var errors = host.querySelector('.diagram-errors');
            var top = errors && !errors.hidden ? errors.offsetHeight : 0;
            return {
                minTop: top + 8,
                maxLeft: Math.max(8, host.clientWidth - root.offsetWidth - 8),
                maxTop: Math.max(top + 8, host.clientHeight - root.offsetHeight - 8)
            };
        }

        function place() {
            if (root.hidden) {
                return;
            }
            var limits = bounds();
            var left = position ? position.left : limits.maxLeft;
            var top = position ? position.top : limits.minTop;
            root.style.left = Math.round(Math.min(Math.max(left, 8), limits.maxLeft)) + 'px';
            root.style.top = Math.round(Math.min(Math.max(top, limits.minTop), limits.maxTop)) + 'px';
        }

        /* Posizione voluta (lo stile), non quella misurata: una transizione la farebbe restare indietro. */
        function current() {
            return { left: parseFloat(root.style.left) || 0, top: parseFloat(root.style.top) || 0 };
        }

        function moveTo(left, top) {
            position = { left: left, top: top };
            place();
            // Ciò che si vede è la posizione da cui ripartire (già riportata dentro i bordi).
            position = current();
        }

        if (typeof window.ResizeObserver === 'function') {
            new window.ResizeObserver(place).observe(host);
        } else {
            window.addEventListener('resize', place);
        }

        // Trascinare la barra del titolo (non dai pulsanti).
        var drag = null;
        header.addEventListener('pointerdown', function (event) {
            if (event.button !== 0 || (event.target.closest && event.target.closest('button'))) {
                return;
            }
            event.preventDefault();
            header.focus({ preventScroll: true });
            var at = current();
            drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: at.left, top: at.top };
            try {
                header.setPointerCapture(event.pointerId);
            } catch (error) {
                // il puntatore non c'è più
            }
            root.classList.add('is-dragging');
        });
        header.addEventListener('pointermove', function (event) {
            if (drag && event.pointerId === drag.id) {
                moveTo(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
            }
        });
        function endDrag(event) {
            if (drag && event.pointerId === drag.id) {
                drag = null;
                root.classList.remove('is-dragging');
            }
        }
        header.addEventListener('pointerup', endDrag);
        header.addEventListener('pointercancel', endDrag);
        header.addEventListener('lostpointercapture', endDrag);

        // Da tastiera: con il focus sulla barra del titolo le frecce la spostano.
        header.addEventListener('keydown', function (event) {
            var moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
            var move = event.target === header ? moves[event.key] : null;
            if (!move) {
                return;
            }
            event.preventDefault();
            var step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
            var at = current();
            moveTo(at.left + move[0] * step, at.top + move[1] * step);
        });

        root.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
            }
        });

        minimize.addEventListener('click', function () {
            setMinimized(!minimized);
        });
        close.addEventListener('click', function () {
            setOpen(false);
        });

        function setOpen(open) {
            if (open === !root.hidden) {
                return;
            }
            var hadFocus = root.contains(document.activeElement);
            root.hidden = !open;
            if (open) {
                // Appena aperta niente è "cambiato": i valori di adesso sono il punto di partenza.
                previous = Object.create(null);
                render();
                place();
            }
            onToggle(open, hadFocus);
        }

        setMinimized(false);
        render();

        return {
            setRows: function (next) {
                rows = next;
                render();
                place();
            },
            show: function (nextFrames) {
                if (nextFrames === null) {
                    memory = Object.create(null);
                }
                frames = nextFrames;
                if (root.hidden) {
                    // Chiusa: niente disegno, ma gli array per riferimento si ricordano lo stesso.
                    rowsView(rows, frames, memory, t, formatValue);
                    return;
                }
                render();
                place();
            },
            open: function () { setOpen(true); },
            close: function () { setOpen(false); },
            toggle: function () { setOpen(root.hidden); },
            isOpen: function () { return !root.hidden; },
            element: root
        };
    }

    OnoFlow.VariablesWindow = { create: create, rowsView: rowsView, MAX_INLINE: MAX_INLINE };
})(window.OnoFlow);
