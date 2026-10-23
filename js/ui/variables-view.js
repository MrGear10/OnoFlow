/*
 * OnoFlow — pannello delle variabili (passo 15, FR-RUN-06, D-05, DEC-075).
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.VariablesView.{create, summary, MAX_ELEMENTS}
 *
 * Mostra le variabili della chiamata in corso, come le fotografa l'interprete:
 *     { functionName, variables: [{ name, type, array, value, elements }] }
 * Ogni variabile: nome, tipo (per un array anche il numero di elementi), valore come lo
 * stampa la console; per un Real il cui valore stampato è arrotondato, sotto in piccolo il
 * valore completo (D-05). Un array mostra gli elementi con l'indice. Ciò che è cambiato
 * rispetto alla fotografia precedente della stessa funzione è segnato (is-changed).
 *
 *     create(container, { t, formatValue(valore tipizzato), formatFull(numero) })
 *         → { show(fotografia | null), reset(), element }
 *     summary(fotografia, t, formatValue) → "n = 7 · i = 2" (striscia del telefono)
 */
(function (OnoFlow) {
    'use strict';

    // Elementi di un array mostrati al massimo: oltre, "e altri N".
    var MAX_ELEMENTS = 50;

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

    /* Testo di un valore; undefined = mai assegnato. */
    function valueText(type, value, t, formatValue) {
        return value === undefined || value === null ? t('ui.value.none') : formatValue({ type: type, value: value });
    }

    function sameValue(a, b) {
        return a === b || (a !== a && b !== b); // NaN non dovrebbe esserci, ma non è "cambiato"
    }

    function summary(snapshot, t, formatValue) {
        if (!snapshot || snapshot.variables.length === 0) {
            return t('ui.variablesPanel.empty');
        }
        return snapshot.variables.map(function (variable) {
            if (variable.array) {
                var shown = [];
                for (var i = 0; i < Math.min(variable.elements.length, 5); i++) {
                    shown.push(valueText(variable.type, variable.elements[i], t, formatValue));
                }
                return variable.name + ' = [' + shown.join('; ') + (variable.elements.length > 5 ? '; …' : '') + ']';
            }
            return variable.name + ' = ' + valueText(variable.type, variable.value, t, formatValue);
        }).join(' · ');
    }

    function create(container, options) {
        var t = options.t;
        var formatValue = options.formatValue;
        var formatFull = options.formatFull;
        var root = element('div', 'variables');
        container.appendChild(root);
        var previous = null; // { functionName, byName: { nome: variabile } }

        function changedSince(variable) {
            if (!previous) {
                return { variable: false, elements: [] };
            }
            var before = previous.byName[variable.name];
            if (!before || before.type !== variable.type || before.array !== variable.array) {
                return { variable: true, elements: [] };
            }
            if (!variable.array) {
                return { variable: !sameValue(before.value, variable.value), elements: [] };
            }
            var elements = [];
            for (var i = 0; i < variable.elements.length; i++) {
                if (!sameValue(before.elements[i], variable.elements[i])) {
                    elements.push(i);
                }
            }
            return { variable: elements.length > 0 || before.elements.length !== variable.elements.length, elements: elements };
        }

        function changedMark(node) {
            node.appendChild(element('span', 'visually-hidden', ' (' + t('ui.variablesPanel.changed') + ')'));
        }

        function valueNode(variable, changes) {
            if (!variable.array) {
                var box = element('span', 'variable-value', valueText(variable.type, variable.value, t, formatValue));
                if (variable.type === 'Real' && typeof variable.value === 'number') {
                    var full = formatFull(variable.value);
                    if (full !== box.textContent) {
                        var fullNode = element('span', 'variable-full', full);
                        fullNode.title = t('ui.variablesPanel.full', { value: full });
                        box.appendChild(fullNode);
                    }
                }
                return box;
            }
            var list = element('ol', 'variable-elements');
            for (var i = 0; i < Math.min(variable.elements.length, MAX_ELEMENTS); i++) {
                var item = element('li', changes.elements.indexOf(i) !== -1 ? 'is-changed' : '');
                item.appendChild(element('span', 'variable-index', String(i)));
                item.appendChild(element('span', 'variable-element', valueText(variable.type, variable.elements[i], t, formatValue)));
                if (changes.elements.indexOf(i) !== -1) {
                    changedMark(item);
                }
                list.appendChild(item);
            }
            if (variable.elements.length > MAX_ELEMENTS) {
                list.appendChild(element('li', 'variable-more', t('ui.value.more', { count: String(variable.elements.length - MAX_ELEMENTS) })));
            }
            return list;
        }

        function show(snapshot) {
            root.textContent = '';
            if (!snapshot) {
                previous = null;
                return;
            }
            if (previous && previous.functionName !== snapshot.functionName) {
                previous = null; // un'altra funzione: niente da confrontare
            }
            root.appendChild(element('p', 'variables-title', t('ui.variablesPanel.title', { name: snapshot.functionName })));
            if (snapshot.variables.length === 0) {
                root.appendChild(element('p', 'variables-empty', t('ui.variablesPanel.empty')));
            } else {
                var list = element('ul', 'variables-list');
                snapshot.variables.forEach(function (variable) {
                    var changes = changedSince(variable);
                    var row = element('li', 'variable' + (changes.variable ? ' is-changed' : ''));
                    row.setAttribute('data-name', variable.name);
                    row.appendChild(element('span', 'variable-name', variable.name));
                    row.appendChild(element('span', 'variable-type', variable.array
                        ? t('ui.variables.arrayType', { type: variable.type, size: String(variable.elements.length) })
                        : variable.type));
                    row.appendChild(valueNode(variable, changes));
                    if (changes.variable && !variable.array) {
                        changedMark(row);
                    }
                    list.appendChild(row);
                });
                root.appendChild(list);
            }
            var byName = Object.create(null);
            snapshot.variables.forEach(function (variable) { byName[variable.name] = variable; });
            previous = { functionName: snapshot.functionName, byName: byName };
        }

        return {
            show: show,
            reset: function () { show(null); },
            element: root
        };
    }

    OnoFlow.VariablesView = { create: create, summary: summary, MAX_ELEMENTS: MAX_ELEMENTS };
})(window.OnoFlow);
