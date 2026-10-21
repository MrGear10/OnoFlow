/*
 * OnoFlow — disegno SVG del diagramma (FR-VIEW-01…05, passo 7).
 *
 * Dipendenze: js/namespace.js, js/ui/block-text.js, js/ui/diagram-layout.js.
 * Definisce: OnoFlow.DiagramRenderer.{render, createMeasurer}
 *
 * Disegna la disposizione calcolata da DiagramLayout: forme in inchiostro con la tinta del
 * loro tipo (DEC-057), frecce, etichette Vero/Falso. Ogni blocco è un <g> con l'ID del
 * modello in data-id (FR-VIEW-02). Gli stati sono segni con un solo significato (FR-VIEW-03):
 *   - evidenziatore: il blocco in esecuzione prende il giallo al posto della sua tinta;
 *   - penna rossa: cerchio attorno al blocco, numero dell'errore, onda nel punto esatto.
 * I messaggi degli errori non stanno nel disegno ma nell'elenco sopra il foglio
 * (js/ui/diagram-errors.js), con lo stesso numero.
 *
 * Editor (passo 9, DEC-063): nelle funzioni modificabili ogni freccia ha un punto di
 * inserimento (cerchio con il +) e ogni blocco si può selezionare. Punti e blocchi sono
 * raggiungibili da tastiera (tabindex, role="button"); il tocco li trova con hitTest anche
 * quando il disegno è piccolo (FR-MOB-04). La selezione è un contorno d'inchiostro.
 *
 *     createMeasurer(document) → { measure(testo, stile), metrics() → { square, fontSize }, reset() }
 *         misura i testi con un SVG nascosto nella pagina, con gli stessi stili del disegno.
 *     render(container, program, { t, measurer, editable(functionId), describeSlot(slot) })
 *         svuota container, disegna e restituisce
 *         { element, size: { width, height }, slots, setRunning(id | null), setErrors(errori),
 *           setSelected(id | null), hitTest(punto, raggio), slotBox(indice),
 *           nodeBox(id) → { x, y, width, height } | null, hasNode(id) }
 * punto e rettangoli sono in pixel al 100% rispetto all'angolo dell'SVG; hitTest restituisce
 * { slot: indice } o { block: id } o null.
 * nodeBox è in pixel al 100%, rispetto all'angolo in alto a sinistra dell'SVG.
 * Ogni testo del file entra nella pagina come testo, mai come HTML (NFR-SEC-01).
 */
(function (OnoFlow) {
    'use strict';

    var Layout = OnoFlow.DiagramLayout;
    if (!Layout) {
        throw new Error('diagram-renderer.js richiede diagram-layout.js, da caricare prima');
    }

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var XML_NS = 'http://www.w3.org/XML/1998/namespace';
    var STYLE_CLASSES = { keyword: 'dg-keyword', code: 'dg-code', label: 'dg-label', title: 'dg-title' };
    var markerCount = 0;

    function svgElement(tag, attributes, className) {
        var node = document.createElementNS(SVG_NS, tag);
        if (className) {
            node.setAttribute('class', className);
        }
        Object.keys(attributes || {}).forEach(function (name) {
            node.setAttribute(name, attributes[name]);
        });
        return node;
    }

    function round(value) {
        return Math.round(value * 100) / 100;
    }

    function pointsText(points) {
        return points.map(function (point) { return round(point[0]) + ',' + round(point[1]); }).join(' ');
    }

    /* Testo SVG che conserva gli spazi così come sono scritti (FR-VIEW-05). */
    function preserveSpaces(node) {
        node.setAttributeNS(XML_NS, 'xml:space', 'preserve');
        return node;
    }

    // --- Misura dei testi ------------------------------------------------------------

    function createMeasurer(doc) {
        var host = doc.createElementNS(SVG_NS, 'svg');
        host.setAttribute('class', 'diagram diagram-measure');
        host.setAttribute('aria-hidden', 'true');
        host.setAttribute('width', '1');
        host.setAttribute('height', '1');
        // Fuori dalla vista ma disegnato: un elemento con display: none misura zero.
        host.style.position = 'absolute';
        host.style.left = '-10000px';
        host.style.top = '0';
        host.style.visibility = 'hidden';
        var probes = {};
        Object.keys(STYLE_CLASSES).forEach(function (style) {
            var text = preserveSpaces(svgElement('text', {}, style === 'label' || style === 'title' ? STYLE_CLASSES[style] : 'dg-text'));
            var span = svgElement('tspan', {}, style === 'keyword' || style === 'code' ? STYLE_CLASSES[style] : '');
            text.appendChild(span);
            host.appendChild(text);
            probes[style] = span;
        });
        var square = doc.createElement('div');
        square.className = 'diagram-measure-square';
        square.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;width:var(--square, 20px);height:1px';
        var cache = Object.create(null);
        var attached = false;

        function attach() {
            if (!attached) {
                doc.body.appendChild(host);
                doc.body.appendChild(square);
                attached = true;
            }
        }

        function fontSize() {
            attach();
            return parseFloat(doc.defaultView.getComputedStyle(host).fontSize) || 16;
        }

        function measure(text, style) {
            var key = style + '\u0000' + text;
            if (key in cache) {
                return cache[key];
            }
            attach();
            var probe = probes[style];
            probe.textContent = text;
            var width = text === '' ? 0 : probe.getComputedTextLength();
            if (!(width > 0) && text !== '') {
                width = text.length * fontSize() * 0.6; // pagina senza stili: una stima prudente
            }
            cache[key] = width;
            return width;
        }

        return {
            measure: measure,
            metrics: function () {
                attach();
                return { square: square.getBoundingClientRect().width || 20, fontSize: fontSize() };
            },
            reset: function () {
                cache = Object.create(null);
            }
        };
    }

    // --- Forme ----------------------------------------------------------------------

    /* Contorno di ogni forma classica (FR-VIEW-01); item: { shape, x, y, width, height, inset }. */
    function outline(item) {
        var x = item.x;
        var y = item.y;
        var w = item.width;
        var h = item.height;
        var k = item.inset;
        var parts = [];
        switch (item.shape) {
            case 'terminal':
                parts.push(svgElement('rect', { x: x, y: y, width: w, height: h, rx: h / 2 }, 'dg-shape'));
                break;
            case 'parallelogram':
                parts.push(svgElement('polygon', { points: pointsText([[x + k, y], [x + w, y], [x + w - k, y + h], [x, y + h]]) }, 'dg-shape'));
                break;
            case 'diamond':
                parts.push(svgElement('polygon', { points: pointsText([[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]]) }, 'dg-shape'));
                break;
            case 'hexagon':
                parts.push(svgElement('polygon', {
                    points: pointsText([[x + k, y], [x + w - k, y], [x + w, y + h / 2], [x + w - k, y + h], [x + k, y + h], [x, y + h / 2]])
                }, 'dg-shape'));
                break;
            case 'declare':
                // Simbolo della memoria interna: una riga in alto e una a sinistra.
                parts.push(svgElement('rect', { x: x, y: y, width: w, height: h }, 'dg-shape'));
                parts.push(svgElement('path', { d: 'M' + round(x) + ',' + round(y + k * 0.6) + 'h' + round(w) + 'M' + round(x + k * 0.6) + ',' + round(y) + 'v' + round(h) }, 'dg-detail'));
                break;
            case 'call':
                parts.push(svgElement('rect', { x: x, y: y, width: w, height: h }, 'dg-shape'));
                parts.push(svgElement('path', { d: 'M' + round(x + k) + ',' + round(y) + 'v' + round(h) + 'M' + round(x + w - k) + ',' + round(y) + 'v' + round(h) }, 'dg-detail'));
                break;
            case 'comment':
                parts.push(svgElement('rect', { x: x, y: y, width: w, height: h }, 'dg-shape dg-shape--open'));
                parts.push(svgElement('polyline', { points: pointsText([[x + k, y], [x, y], [x, y + h], [x + k, y + h]]) }, 'dg-detail'));
                break;
            default:
                parts.push(svgElement('rect', { x: x, y: y, width: w, height: h }, 'dg-shape'));
        }
        return parts;
    }

    function textNode(item) {
        var text = preserveSpaces(svgElement('text', { y: round(item.text.y), 'dominant-baseline': 'central' }, 'dg-text'));
        item.text.segments.forEach(function (segment) {
            var span = svgElement('tspan', { x: round(item.text.x + segment.x) }, segment.role === 'keyword' ? 'dg-keyword' : 'dg-code');
            if (segment.field) {
                span.setAttribute('data-field', segment.field);
            }
            span.textContent = segment.text;
            text.appendChild(span);
        });
        return text;
    }

    // --- Disegno --------------------------------------------------------------------

    function render(container, program, options) {
        var t = options.t;
        var measurer = options.measurer;
        var metrics = measurer.metrics();
        var s = metrics.square;
        var result = Layout.layout(program, { t: t, measure: measurer.measure, square: s, fontSize: metrics.fontSize });
        // Margine attorno al disegno: c'è posto per il cerchio rosso e il numero degli errori.
        var margin = s;
        var width = result.width + 2 * margin;
        var height = result.height + 2 * margin;

        var svg = svgElement('svg', {
            viewBox: [-margin, -margin, width, height].map(round).join(' '),
            width: round(width),
            height: round(height),
            role: 'group'
        }, 'diagram');
        svg.setAttribute('aria-label', t('ui.tab.diagram'));
        var markerId = 'dg-arrow-' + (++markerCount);
        var defs = svgElement('defs');
        var marker = svgElement('marker', {
            id: markerId, viewBox: '0 0 10 10', refX: 10, refY: 5,
            markerUnits: 'userSpaceOnUse', markerWidth: round(0.55 * s), markerHeight: round(0.55 * s), orient: 'auto'
        });
        marker.appendChild(svgElement('path', { d: 'M0,0L10,5L0,10z' }, 'dg-arrowhead'));
        defs.appendChild(marker);
        svg.appendChild(defs);
        var linesLayer = svgElement('g', {}, 'dg-lines');
        var shapesLayer = svgElement('g', {}, 'dg-shapes');
        var selectionLayer = svgElement('g', {}, 'dg-selection');
        var slotsLayer = svgElement('g', {}, 'dg-slots');
        var marksLayer = svgElement('g', {}, 'dg-marks');
        svg.appendChild(linesLayer);
        svg.appendChild(shapesLayer);
        svg.appendChild(selectionLayer);
        svg.appendChild(slotsLayer);
        svg.appendChild(marksLayer);
        var editable = options.editable || function () { return false; };
        var functionIds = Object.create(null);
        program.functions.forEach(function (programFunction) { functionIds[programFunction.id] = true; });

        var groupsById = Object.create(null);
        var shapesById = Object.create(null);

        result.items.forEach(function (item) {
            if (item.type === 'line') {
                var polyline = svgElement('polyline', { points: pointsText(item.points) }, 'dg-line');
                if (item.arrow) {
                    polyline.setAttribute('marker-end', 'url(#' + markerId + ')');
                }
                linesLayer.appendChild(polyline);
            } else if (item.type === 'junction') {
                linesLayer.appendChild(svgElement('circle', { cx: round(item.x), cy: round(item.y), r: round(0.2 * s) }, 'dg-junction'));
            } else if (item.type === 'label') {
                var label = svgElement('text', { x: round(item.x), y: round(item.y), 'text-anchor': item.anchor }, 'dg-label');
                if (item.baseline === 'middle') {
                    label.setAttribute('dominant-baseline', 'central');
                }
                label.textContent = item.text;
                linesLayer.appendChild(label);
            } else if (item.type === 'title') {
                var title = svgElement('text', { x: round(item.x), y: round(item.y), 'dominant-baseline': 'central' }, 'dg-title');
                title.textContent = item.text;
                shapesLayer.appendChild(title);
            } else if (item.type === 'shape') {
                var group = svgElement('g', {}, 'dg-block dg-block--' + item.color);
                if (item.id) {
                    group.setAttribute('data-id', item.id);
                    groupsById[item.id] = group;
                    shapesById[item.id] = item;
                    if (!functionIds[item.id] && editable(item.functionId)) {
                        group.setAttribute('tabindex', '0');
                        group.setAttribute('role', 'button');
                        group.setAttribute('aria-pressed', 'false');
                        group.classList.add('is-selectable');
                    }
                }
                outline(item).forEach(function (part) { group.appendChild(part); });
                group.appendChild(textNode(item));
                shapesLayer.appendChild(group);
            }
        });

        // Punti di inserimento a metà delle frecce, solo nelle funzioni modificabili (DEC-063).
        var slots = result.slots.filter(function (slot) { return editable(slot.functionId); });
        var slotRadius = 0.45 * s;
        slots.forEach(function (slot, index) {
            var cx = slot.x;
            var cy = (slot.y1 + slot.y2) / 2;
            var group = svgElement('g', { 'data-slot': index, tabindex: '0', role: 'button' }, 'dg-slot');
            if (options.describeSlot) {
                group.setAttribute('aria-label', options.describeSlot(slot));
            }
            group.appendChild(svgElement('circle', { cx: round(cx), cy: round(cy), r: round(slotRadius) }, 'dg-slot-mark'));
            var arm = slotRadius * 0.5;
            group.appendChild(svgElement('path', {
                d: 'M' + round(cx - arm) + ',' + round(cy) + 'h' + round(2 * arm) + 'M' + round(cx) + ',' + round(cy - arm) + 'v' + round(2 * arm)
            }, 'dg-slot-plus'));
            slotsLayer.appendChild(group);
        });

        container.textContent = '';
        container.appendChild(svg);
        var onlyMain = program.functions.length === 1 && program.functions[0].body.length === 0;
        if (onlyMain) {
            var empty = document.createElement('p');
            empty.className = 'diagram-empty';
            empty.textContent = t('ui.diagram.empty');
            container.appendChild(empty);
        }

        var running = null;

        function setRunning(nodeId) {
            if (running) {
                running.classList.remove('is-running');
            }
            running = nodeId && groupsById[nodeId] ? groupsById[nodeId] : null;
            if (running) {
                running.classList.add('is-running');
            }
        }

        /* Onda di penna rossa sotto [start, end) del campo; un punto vuoto diventa un trattino. */
        function wave(item, fieldName, position) {
            var segment = null;
            item.text.segments.forEach(function (candidate) {
                if (candidate.field === fieldName) {
                    segment = candidate;
                }
            });
            if (!segment) {
                return;
            }
            var text = segment.text;
            var start = Math.max(0, Math.min(position.start, text.length));
            var end = Math.max(start, Math.min(position.end, text.length));
            var x0 = item.text.x + segment.x + measurer.measure(text.slice(0, start), 'code');
            var baseline = item.text.y + 0.62 * metrics.fontSize;
            if (start === end) {
                marksLayer.appendChild(svgElement('path', {
                    d: 'M' + round(x0) + ',' + round(baseline) + 'h' + round(0.75 * metrics.fontSize)
                }, 'dg-point'));
                return;
            }
            var x1 = x0 + measurer.measure(text.slice(start, end), 'code');
            var step = 3;
            var d = 'M' + round(x0) + ',' + round(baseline) + 'q' + step / 2 + ',-2.5 ' + step + ',0';
            for (var x = x0 + step; x < x1 - 0.5; x += step) {
                d += 't' + step + ',0';
            }
            marksLayer.appendChild(svgElement('path', { d: d }, 'dg-wave'));
        }

        /* Errori { code, params, nodeId, field?, position? }: il numero è la posizione nell'elenco. */
        function setErrors(errors) {
            marksLayer.textContent = '';
            Object.keys(groupsById).forEach(function (id) {
                groupsById[id].classList.remove('is-error');
            });
            var perNode = Object.create(null);
            var waved = Object.create(null);
            errors.forEach(function (error, index) {
                var item = shapesById[error.nodeId];
                if (!item) {
                    return;
                }
                var pad = 0.3 * s;
                var count = perNode[error.nodeId] || 0;
                perNode[error.nodeId] = count + 1;
                if (count === 0) {
                    groupsById[error.nodeId].classList.add('is-error');
                    marksLayer.appendChild(svgElement('rect', {
                        x: round(item.x - pad), y: round(item.y - pad),
                        width: round(item.width + 2 * pad), height: round(item.height + 2 * pad),
                        rx: round(item.height / 2 + pad)
                    }, 'dg-ring'));
                }
                // Numeri in fila sull'angolo in alto a destra del cerchio.
                var radius = 0.55 * s;
                var cx = item.x + item.width + pad + radius * (0.2 + 2.2 * count);
                var cy = item.y - pad;
                var badge = svgElement('g', { 'data-error': index + 1 }, 'dg-badge');
                badge.appendChild(svgElement('circle', { cx: round(cx), cy: round(cy), r: round(radius) }));
                var number = svgElement('text', { x: round(cx), y: round(cy), 'text-anchor': 'middle', 'dominant-baseline': 'central' });
                number.textContent = String(index + 1);
                badge.appendChild(number);
                marksLayer.appendChild(badge);
                var key = error.nodeId + '\u0000' + error.field;
                if (error.field && error.position && !waved[key]) {
                    waved[key] = true;
                    wave(item, error.field, error.position);
                }
            });
        }

        var selected = null;

        /* Selezione (B3): contorno d'inchiostro attorno al blocco; null la toglie. */
        function setSelected(nodeId) {
            selectionLayer.textContent = '';
            if (selected) {
                selected.classList.remove('is-selected');
                selected.setAttribute('aria-pressed', 'false');
            }
            selected = nodeId && groupsById[nodeId] && groupsById[nodeId].classList.contains('is-selectable') ? groupsById[nodeId] : null;
            if (selected) {
                var item = shapesById[nodeId];
                var pad = 0.3 * s;
                selected.classList.add('is-selected');
                selected.setAttribute('aria-pressed', 'true');
                selectionLayer.appendChild(svgElement('rect', {
                    x: round(item.x - pad), y: round(item.y - pad),
                    width: round(item.width + 2 * pad), height: round(item.height + 2 * pad), rx: round(0.25 * s)
                }, 'dg-selected'));
            }
        }

        /*
         * Cosa c'è sotto un punto (pixel al 100% dall'angolo dell'SVG): prima un blocco
         * selezionabile, poi il punto di inserimento più vicino entro radius. Così l'area di
         * tocco dei punti resta di 44 px CSS anche quando lo zoom li rimpicciolisce (FR-MOB-04).
         */
        function hitTest(point, radius) {
            var x = point.x - margin;
            var y = point.y - margin;
            var ids = Object.keys(groupsById);
            for (var i = 0; i < ids.length; i++) {
                var item = shapesById[ids[i]];
                if (groupsById[ids[i]].classList.contains('is-selectable') &&
                        x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height) {
                    return { block: ids[i] };
                }
            }
            var best = null;
            var bestDistance = radius;
            slots.forEach(function (slot, index) {
                var distance = Math.hypot(x - slot.x, y - (slot.y1 + slot.y2) / 2);
                if (distance <= bestDistance) {
                    best = index;
                    bestDistance = distance;
                }
            });
            return best === null ? null : { slot: best };
        }

        function slotBox(index) {
            var slot = slots[index];
            return slot ? {
                x: slot.x - slotRadius + margin, y: (slot.y1 + slot.y2) / 2 - slotRadius + margin,
                width: 2 * slotRadius, height: 2 * slotRadius
            } : null;
        }

        function nodeBox(nodeId) {
            var box = result.nodes[nodeId];
            if (!box) {
                return null;
            }
            return { x: box.x + margin, y: box.y + margin, width: box.width, height: box.height };
        }

        return {
            element: svg,
            size: { width: width, height: height },
            slots: slots,
            setRunning: setRunning,
            setErrors: setErrors,
            setSelected: setSelected,
            hitTest: hitTest,
            slotBox: slotBox,
            nodeBox: nodeBox,
            hasNode: function (nodeId) { return Boolean(result.nodes[nodeId]); }
        };
    }

    /* Piccola forma di un tipo di blocco, con la sua tinta, per il menu dei blocchi. */
    function blockIcon(kind) {
        var svg = svgElement('svg', { viewBox: '-2 -2 52 28', 'aria-hidden': 'true' }, 'block-icon');
        var group = svgElement('g', {}, 'dg-block dg-block--' + Layout.COLOR_OF_KIND[kind]);
        var shape = Layout.SHAPE_OF_KIND[kind];
        outline({ shape: shape, x: 0, y: shape === 'diamond' ? 0 : 3, width: 48, height: shape === 'diamond' ? 24 : 18, inset: shape === 'hexagon' ? 8 : 6 })
            .forEach(function (part) { group.appendChild(part); });
        svg.appendChild(group);
        return svg;
    }

    OnoFlow.DiagramRenderer = { render: render, createMeasurer: createMeasurer, blockIcon: blockIcon };
})(window.OnoFlow);
