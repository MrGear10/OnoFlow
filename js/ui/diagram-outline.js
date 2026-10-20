/*
 * OnoFlow — schema del diagramma in forma di elenco (passo 6, provvisorio).
 *
 * Dipendenze: js/namespace.js, js/core/model.js, js/ui/block-text.js.
 * Definisce: OnoFlow.DiagramOutline.render
 *
 * Fino al renderer SVG (passo 7) il diagramma si mostra come elenco rientrato: una riga
 * per blocco, con la forma del suo tipo, il testo esattamente come è scritto (FR-VIEW-05)
 * e l'ID del modello in data-id (FR-VIEW-02). Gli stati sono segni con un solo significato:
 * evidenziatore per il blocco in esecuzione, penna rossa per gli errori (FR-VIEW-03),
 * con la sottolineatura nel punto esatto del campo quando l'errore ha una posizione.
 *
 * render(container, program, options) svuota container, disegna e restituisce
 *     { setRunning(nodeId | null), setErrors(errori), reveal(nodeId, { quiet }), hasNode(nodeId) }
 * options: t (traduttore), formatError(errore).
 * Ogni testo del file entra nella pagina come testo, mai come HTML (NFR-SEC-01).
 */
(function (OnoFlow) {
    'use strict';

    var Model = OnoFlow.Model;
    var BlockText = OnoFlow.BlockText;
    if (!Model || !BlockText) {
        throw new Error('diagram-outline.js richiede model.js e block-text.js, da caricare prima');
    }

    var SVG_NS = 'http://www.w3.org/2000/svg';

    // Forma di ogni tipo di blocco (forme classiche dei diagrammi di flusso, FR-VIEW-01).
    var SHAPES = {
        terminal: [['rect', { x: 1, y: 2, width: 26, height: 14, rx: 7 }]],
        declare: [['rect', { x: 2, y: 2, width: 24, height: 14 }], ['line', { x1: 2, y1: 6, x2: 26, y2: 6 }]],
        assign: [['rect', { x: 2, y: 2, width: 24, height: 14 }]],
        io: [['polygon', { points: '7,2 27,2 21,16 1,16' }]],
        'if': [['polygon', { points: '14,1 27,9 14,17 1,9' }]],
        loop: [['polygon', { points: '7,2 21,2 27,9 21,16 7,16 1,9' }]],
        call: [['rect', { x: 2, y: 2, width: 24, height: 14 }], ['line', { x1: 6, y1: 2, x2: 6, y2: 16 }], ['line', { x1: 22, y1: 2, x2: 22, y2: 16 }]],
        comment: [['polyline', { points: '9,2 3,2 3,16 9,16' }]]
    };
    var SHAPE_OF_KIND = {
        declare: 'declare', assign: 'assign', input: 'io', output: 'io', 'if': 'if',
        'while': 'loop', 'do': 'loop', 'for': 'loop', call: 'call', comment: 'comment'
    };

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

    function shape(name) {
        var svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'row-shape');
        svg.setAttribute('viewBox', '0 0 28 18');
        svg.setAttribute('aria-hidden', 'true');
        SHAPES[name].forEach(function (part) {
            var node = document.createElementNS(SVG_NS, part[0]);
            Object.keys(part[1]).forEach(function (attribute) {
                node.setAttribute(attribute, part[1][attribute]);
            });
            svg.appendChild(node);
        });
        return svg;
    }

    function render(container, program, options) {
        var t = options.t;
        var formatError = options.formatError;
        var rowsById = Object.create(null);
        var running = null;
        var marked = [];

        function remember(id, row) {
            (rowsById[id] || (rowsById[id] = [])).push(row);
        }

        /* Una riga: forma, testo diviso in parti; i campi hanno data-field per gli errori. */
        function line(shapeName, segments, kind) {
            var row = element('div', 'row-line row-line--' + kind);
            row.appendChild(shape(shapeName));
            var text = element('span', 'row-text');
            segments.forEach(function (segment) {
                var part = element('span', 'seg seg--' + segment.role, segment.text);
                if (segment.field) {
                    part.setAttribute('data-field', segment.field);
                }
                text.appendChild(part);
            });
            row.appendChild(text);
            return row;
        }

        function terminal(key) {
            var item = element('li', 'row row--terminal');
            item.appendChild(line('terminal', [{ text: t(key), role: 'keyword' }], 'terminal'));
            return item;
        }

        function blockList(blocks) {
            var list = element('ol', 'outline-list');
            blocks.forEach(function (block) {
                list.appendChild(blockItem(block));
            });
            return list;
        }

        function branch(labelKey, blocks) {
            var wrapper = element('div', 'branch');
            wrapper.appendChild(element('span', 'branch-label', t(labelKey)));
            wrapper.appendChild(blockList(blocks));
            return wrapper;
        }

        function blockItem(block) {
            var item = element('li', 'row row--' + block.kind);
            item.setAttribute('data-id', block.id);
            var head = line(SHAPE_OF_KIND[block.kind], BlockText.segments(block, t, 'head'), block.kind);
            item.appendChild(head);
            remember(block.id, head);
            if (block.kind === 'if') {
                item.appendChild(branch('ui.diagram.then', block.then));
                item.appendChild(branch('ui.diagram.else', block['else']));
            } else if (block.kind === 'while' || block.kind === 'for' || block.kind === 'do') {
                item.appendChild(blockList(block.body));
            }
            if (block.kind === 'do') {
                var tail = line('loop', BlockText.segments(block, t, 'tail'), 'do-tail');
                item.appendChild(tail);
                remember(block.id, tail);
            }
            return item;
        }

        function functionSection(programFunction, showName) {
            var section = element('section', 'outline-function');
            section.setAttribute('data-id', programFunction.id);
            if (showName) {
                var title = element('h2', 'outline-function-name', t('ui.diagram.function', { name: programFunction.name }));
                section.appendChild(title);
                remember(programFunction.id, title);
            }
            var list = element('ol', 'outline-list outline-list--root');
            list.appendChild(terminal('ui.diagram.start'));
            programFunction.body.forEach(function (block) {
                list.appendChild(blockItem(block));
            });
            list.appendChild(terminal('ui.diagram.end'));
            section.appendChild(list);
            if (programFunction.body.length === 0 && programFunction.name === 'Main') {
                section.appendChild(element('p', 'outline-empty', t('ui.diagram.empty')));
            }
            return section;
        }

        container.textContent = '';
        var showNames = program.functions.length > 1;
        program.functions.forEach(function (programFunction) {
            container.appendChild(functionSection(programFunction, showNames));
        });

        function setRunning(nodeId) {
            if (running) {
                (rowsById[running] || []).forEach(function (row) { row.classList.remove('is-running'); });
            }
            running = nodeId && rowsById[nodeId] ? nodeId : null;
            if (running) {
                rowsById[running].forEach(function (row) { row.classList.add('is-running'); });
            }
        }

        /* Sottolinea [start, end) nel testo di un campo; un punto vuoto diventa un segno. */
        function underline(part, position) {
            var text = part.textContent;
            var start = Math.max(0, Math.min(position.start, text.length));
            var end = Math.max(start, Math.min(position.end, text.length));
            var mark = element('span', 'pen-wave');
            if (start === end) {
                mark.classList.add('pen-wave--point'); // segno a larghezza fissa, senza testo
            } else {
                mark.textContent = text.slice(start, end);
            }
            part.textContent = '';
            part.appendChild(document.createTextNode(text.slice(0, start)));
            part.appendChild(mark);
            part.appendChild(document.createTextNode(text.slice(end)));
        }

        function clearErrors() {
            marked.forEach(function (entry) {
                entry.row.classList.remove('is-error');
                if (entry.note) {
                    entry.note.parentNode.removeChild(entry.note);
                }
                if (entry.part) {
                    entry.part.textContent = entry.text;
                }
            });
            marked = [];
        }

        /* Errori { code, params, nodeId, field?, position? }: penna rossa sul blocco e messaggio sotto. */
        function setErrors(errors) {
            clearErrors();
            errors.forEach(function (error) {
                var rows = rowsById[error.nodeId];
                if (!rows) {
                    return;
                }
                var row = rows[0];
                if (error.field) {
                    rows.forEach(function (candidate) {
                        var found = candidate.querySelector('[data-field="' + error.field + '"]');
                        if (found) {
                            row = candidate;
                        }
                    });
                }
                var entry = { row: row, note: null, part: null, text: null };
                row.classList.add('is-error');
                var part = error.field ? row.querySelector('[data-field="' + error.field + '"]') : null;
                if (part && error.position && part.querySelector('.pen-wave') === null) {
                    entry.part = part;
                    entry.text = part.textContent;
                    underline(part, error.position);
                }
                // Più errori sullo stesso blocco: i messaggi restano nell'ordine ricevuto.
                var after = row;
                while (after.nextSibling && after.nextSibling.classList && after.nextSibling.classList.contains('row-error')) {
                    after = after.nextSibling;
                }
                entry.note = element('p', 'row-error', formatError(error));
                row.parentNode.insertBefore(entry.note, after.nextSibling);
                marked.push(entry);
            });
        }

        /* Porta in vista il blocco; quiet: solo se è fuori dalla zona visibile, senza centrarlo. */
        function reveal(nodeId, revealOptions) {
            var rows = rowsById[nodeId];
            if (rows) {
                var quiet = revealOptions && revealOptions.quiet;
                rows[0].scrollIntoView({ block: quiet ? 'nearest' : 'center', inline: 'nearest' });
            }
        }

        return {
            setRunning: setRunning,
            setErrors: setErrors,
            reveal: reveal,
            hasNode: function (nodeId) { return Boolean(rowsById[nodeId]); }
        };
    }

    OnoFlow.DiagramOutline = { render: render };
})(window.OnoFlow);
