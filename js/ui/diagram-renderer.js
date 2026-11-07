/*
 * OnoFlow — disegno SVG del diagramma (FR-VIEW-01…05, passo 7).
 *
 * Dipendenze: js/namespace.js, js/ui/block-text.js, js/ui/diagram-layout.js.
 * Definisce: OnoFlow.DiagramRenderer.{render, createMeasurer}
 *
 * Disegna la disposizione calcolata da DiagramLayout: forme in inchiostro con la tinta del
 * loro tipo (DEC-057), frecce, etichette Vero/Falso. Ogni blocco è un <g> con l'ID del
 * modello in data-id (FR-VIEW-02). Gli stati sono segni con un solo significato (FR-VIEW-03):
 *   - blocco in esecuzione (stile «Segnale», R-22): tiene la sua tinta, con il contorno più
 *     spesso; nel tema chiaro la sua ombra piena diventa verde, nel tema scuro ha un alone;
 *   - impulso (R-23): nel passo a passo un tratto verde corre sulla freccia dal blocco di prima
 *     al successivo e la lascia colorata per un momento (scia);
 *   - penna rossa: cerchio attorno al blocco, numero dell'errore, onda nel punto esatto;
 *   - ramo percorso: nel passo a passo, il ramo preso da un if si ripassa in verde, con
 *     l'etichetta Vero o Falso in verde.
 * Nel tema chiaro ogni blocco ha un'ombra piena: una copia della forma (dg-shadow), mai un filtro.
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
 *           setSelected(id | null), setTaken({ ifId: 'then' | 'else' }, anima), setMoving(id | null, ammesso(punto)), hitTest(punto, raggio), slotBox(indice),
 *           nodeBox(id) → { x, y, width, height } | null, runningBox(id) (con l'ombra e l'alone), hasNode(id),
 *           pulse(daId, aId, ramo?) → true se c'è una freccia tra i due blocchi, clearPulse(),
 *           connection(daId, aId, ramo?) → { points, arrow } | null }
 * pulse anima l'impulso sulla freccia da un blocco al successivo (ramo 'then' o 'else' per
 * scegliere l'uscita di un if); con prefers-reduced-motion la freccia si colora soltanto.
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
        // Angoli appena arrotondati per i rettangoli (R-04): la forma resta quella classica.
        var corner = round(Math.min(h * 0.16, 7));
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
                parts.push(svgElement('rect', { x: x, y: y, width: w, height: h, rx: Math.min(corner, 4) }, 'dg-shape'));
                parts.push(svgElement('path', { d: 'M' + round(x) + ',' + round(y + k * 0.6) + 'h' + round(w) + 'M' + round(x + k * 0.6) + ',' + round(y) + 'v' + round(h) }, 'dg-detail'));
                break;
            case 'call':
                parts.push(svgElement('rect', { x: x, y: y, width: w, height: h, rx: corner }, 'dg-shape'));
                parts.push(svgElement('path', { d: 'M' + round(x + k) + ',' + round(y) + 'v' + round(h) + 'M' + round(x + w - k) + ',' + round(y) + 'v' + round(h) }, 'dg-detail'));
                break;
            case 'comment':
                parts.push(svgElement('rect', { x: x, y: y, width: w, height: h }, 'dg-shape dg-shape--open'));
                parts.push(svgElement('polyline', { points: pointsText([[x + k, y], [x, y], [x, y + h], [x + k, y + h]]) }, 'dg-detail'));
                break;
            default:
                parts.push(svgElement('rect', { x: x, y: y, width: w, height: h, rx: corner }, 'dg-shape'));
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

    function pointKey(point) {
        return Math.round(point[0] * 2) + ',' + Math.round(point[1] * 2);
    }

    /*
     * Angoli delle frecce (R-23): i punti dove due tratti si incontrano con direzioni diverse,
     * dentro una freccia o tra due frecce (uscita di un ciclo, punto d'incontro dei rami).
     */
    function findCorners(lines) {
        var directions = Object.create(null);
        var places = Object.create(null);
        function add(point, dx, dy) {
            var key = pointKey(point);
            var length = Math.hypot(dx, dy);
            if (!length) {
                return;
            }
            places[key] = point;
            (directions[key] = directions[key] || []).push([dx / length, dy / length]);
        }
        lines.forEach(function (entry) {
            for (var i = 1; i < entry.points.length; i++) {
                var a = entry.points[i - 1];
                var b = entry.points[i];
                add(a, b[0] - a[0], b[1] - a[1]);
                add(b, a[0] - b[0], a[1] - b[1]);
            }
        });
        return Object.keys(directions).filter(function (key) {
            var list = directions[key];
            return list.some(function (u) {
                return list.some(function (v) { return Math.abs(u[0] * v[0] + u[1] * v[1]) < 0.99; });
            });
        }).map(function (key) { return places[key]; });
    }

    /* Più frecce di seguito come una sola spezzata; la punta è quella dell'ultima. */
    function joinLines(path) {
        var points = [];
        path.forEach(function (entry) {
            entry.points.forEach(function (point) {
                var last = points[points.length - 1];
                if (!last || last[0] !== point[0] || last[1] !== point[1]) {
                    points.push(point);
                }
            });
        });
        return { points: points, arrow: path[path.length - 1].arrow };
    }

    // --- Disegno --------------------------------------------------------------------

    function render(container, program, options) {
        var t = options.t;
        var measurer = options.measurer;
        var metrics = measurer.metrics();
        var s = metrics.square;
        var result = Layout.layout(program, { t: t, measure: measurer.measure, square: s, fontSize: metrics.fontSize });
        // Margine attorno al disegno: c'è posto per il cerchio rosso e il numero degli errori,
        // per l'ombra piena e per l'alone del blocco in esecuzione.
        var margin = s;
        var marginLeft = s;
        var width = result.width + marginLeft + margin;
        var height = result.height + 2 * margin;

        var svg = svgElement('svg', {
            viewBox: [-marginLeft, -margin, width, height].map(round).join(' '),
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
        // Punta del ramo percorso, in inchiostro.
        var takenMarker = svgElement('marker', {
            id: markerId + '-taken', viewBox: '0 0 10 10', refX: 10, refY: 5,
            markerUnits: 'userSpaceOnUse', markerWidth: round(0.55 * s), markerHeight: round(0.55 * s), orient: 'auto'
        });
        takenMarker.appendChild(svgElement('path', { d: 'M0,0L10,5L0,10z' }, 'dg-arrowhead dg-arrowhead--taken'));
        defs.appendChild(takenMarker);
        // Punta della scia lasciata dall'impulso (R-23).
        var litMarker = svgElement('marker', {
            id: markerId + '-lit', viewBox: '0 0 10 10', refX: 10, refY: 5,
            markerUnits: 'userSpaceOnUse', markerWidth: round(0.55 * s), markerHeight: round(0.55 * s), orient: 'auto'
        });
        litMarker.appendChild(svgElement('path', { d: 'M0,0L10,5L0,10z' }, 'dg-arrowhead dg-arrowhead--lit'));
        defs.appendChild(litMarker);
        // Alone del blocco in esecuzione nel tema scuro (R-24): un filtro SVG, usato solo da quel
        // blocco; il CSS lo prende da --dg-glow, così l'id resta unico per ogni disegno.
        var glow = svgElement('filter', { id: markerId + '-glow', x: '-30%', y: '-80%', width: '160%', height: '260%' });
        glow.appendChild(svgElement('feGaussianBlur', { 'in': 'SourceGraphic', stdDeviation: 4, result: 'blur' }));
        var merge = svgElement('feMerge');
        merge.appendChild(svgElement('feMergeNode', { 'in': 'blur' }));
        merge.appendChild(svgElement('feMergeNode', { 'in': 'SourceGraphic' }));
        glow.appendChild(merge);
        defs.appendChild(glow);
        svg.appendChild(defs);
        svg.style.setProperty('--dg-glow', 'url(#' + markerId + '-glow)');
        var linesLayer = svgElement('g', {}, 'dg-lines');
        var traceLayer = svgElement('g', {}, 'dg-trace');
        var pulseLayer = svgElement('g', { 'aria-hidden': 'true' }, 'dg-pulses');
        var junctionsLayer = svgElement('g', {}, 'dg-junctions');
        var shapesLayer = svgElement('g', {}, 'dg-shapes');
        var selectionLayer = svgElement('g', {}, 'dg-selection');
        // Vero, Falso e «do» sopra il riquadro della selezione, con un alone del colore della tela (R-20).
        var labelsLayer = svgElement('g', {}, 'dg-labels');
        var slotsLayer = svgElement('g', {}, 'dg-slots');
        var marksLayer = svgElement('g', {}, 'dg-marks');
        svg.appendChild(linesLayer);
        svg.appendChild(traceLayer);
        svg.appendChild(pulseLayer);
        svg.appendChild(junctionsLayer);
        svg.appendChild(shapesLayer);
        svg.appendChild(selectionLayer);
        svg.appendChild(labelsLayer);
        svg.appendChild(slotsLayer);
        svg.appendChild(marksLayer);
        var editable = options.editable || function () { return false; };
        var functionIds = Object.create(null);
        program.functions.forEach(function (programFunction) {
            // Il blocco Inizio di una funzione diversa da Main si seleziona: apre la firma (passo 18).
            functionIds[programFunction.id] = programFunction.name === 'Main' ? 'main' : 'function';
        });

        var groupsById = Object.create(null);
        var shapesById = Object.create(null);
        var branches = Object.create(null);    // ifId + '\u0000' + ramo → { points, arrow, label }
        var lines = [];                        // { points, arrow }: le frecce, per l'impulso
        var junctions = Object.create(null);   // punto → [x, y]: angoli e incroci delle frecce

        function branchEntry(ifId, branch) {
            var key = ifId + '\u0000' + branch;
            return branches[key] || (branches[key] = { points: null, arrow: false, label: null });
        }

        result.items.forEach(function (item) {
            if (item.type === 'line') {
                var polyline = svgElement('polyline', { points: pointsText(item.points) }, 'dg-line');
                if (item.arrow) {
                    polyline.setAttribute('marker-end', 'url(#' + markerId + ')');
                }
                linesLayer.appendChild(polyline);
                lines.push({ points: item.points, arrow: item.arrow });
            } else if (item.type === 'junction') {
                junctions[pointKey([item.x, item.y])] = [item.x, item.y];
            } else if (item.type === 'label') {
                var label = svgElement('text', { x: round(item.x), y: round(item.y), 'text-anchor': item.anchor }, 'dg-label');
                if (item.baseline === 'middle') {
                    label.setAttribute('dominant-baseline', 'central');
                }
                label.textContent = item.text;
                labelsLayer.appendChild(label);
                if (item.ifId) {
                    branchEntry(item.ifId, item.branch).label = label;
                }
            } else if (item.type === 'branch') {
                var entry = branchEntry(item.ifId, item.branch);
                entry.points = item.points;
                entry.arrow = item.arrow;
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
                    if (functionIds[item.id] !== 'main' && editable(item.functionId)) {
                        if (functionIds[item.id]) {
                            group.classList.add('is-function');
                        }
                        group.setAttribute('tabindex', '0');
                        group.setAttribute('role', 'button');
                        group.setAttribute('aria-pressed', 'false');
                        group.classList.add('is-selectable');
                    }
                }
                var parts = outline(item);
                if (item.color !== 'comment') {
                    // Ombra piena (tema chiaro): la stessa forma, sotto; il CSS la sposta e la colora.
                    var shadow = parts[0].cloneNode(false);
                    shadow.setAttribute('class', 'dg-shadow');
                    group.appendChild(shadow);
                }
                parts.forEach(function (part) { group.appendChild(part); });
                group.appendChild(textNode(item));
                shapesLayer.appendChild(group);
            }
        });

        findCorners(lines).forEach(function (point) {
            junctions[pointKey(point)] = point;
        });
        Object.keys(junctions).forEach(function (key) {
            var point = junctions[key];
            junctionsLayer.appendChild(svgElement('circle', { cx: round(point[0]), cy: round(point[1]), r: round(0.175 * s) }, 'dg-junction'));
        });

        var slotGroups = [];
        var moving = null;
        var disabledSlots = Object.create(null);

        // Punti di inserimento a metà delle frecce, solo nelle funzioni modificabili (DEC-063).
        var slots = result.slots.filter(function (slot) { return editable(slot.functionId); });
        var slotRadius = 0.45 * s;
        slots.forEach(function (slot, index) {
            var cx = slot.x;
            var cy = (slot.y1 + slot.y2) / 2;
            // Proprietario, elenco e posizione: dicono dove inserisce (anche alle verifiche automatiche).
            var group = svgElement('g', {
                'data-slot': index, 'data-owner': slot.ownerId, 'data-list': slot.list, 'data-index': slot.index,
                tabindex: '0', role: 'button'
            }, 'dg-slot');
            if (options.describeSlot) {
                group.setAttribute('aria-label', options.describeSlot(slot));
            }
            group.appendChild(svgElement('circle', { cx: round(cx), cy: round(cy), r: round(slotRadius) }, 'dg-slot-mark'));
            var arm = slotRadius * 0.5;
            group.appendChild(svgElement('path', {
                d: 'M' + round(cx - arm) + ',' + round(cy) + 'h' + round(2 * arm) + 'M' + round(cx) + ',' + round(cy - arm) + 'v' + round(2 * arm)
            }, 'dg-slot-plus'));
            slotsLayer.appendChild(group);
            slotGroups.push(group);
        });

        container.textContent = '';
        container.appendChild(svg);
        var onlyMain = program.functions.length === 1 && program.functions[0].body.length === 0;
        svg.classList.toggle('is-empty', onlyMain); // i + restano pieni: sono l'unica cosa da fare
        if (onlyMain) {
            var empty = document.createElement('p');
            empty.className = 'diagram-empty';
            empty.textContent = t('ui.diagram.empty');
            container.appendChild(empty);
        }

        var running = null;

        /* Blocco in esecuzione (R-22): contorno più spesso, ombra verde o alone (base.css); null lo toglie. */
        function setRunning(nodeId) {
            if (running) {
                running.classList.remove('is-running');
            }
            running = nodeId && groupsById[nodeId] ? groupsById[nodeId] : null;
            if (running) {
                running.classList.add('is-running');
            }
        }

        // --- Impulso (R-23) ---------------------------------------------------------

        /* Porte di una forma: dove entrano e da dove escono le frecce. */
        function ports(item) {
            var cx = item.x + item.width / 2;
            var middle = item.y + item.height / 2;
            var top = [cx, item.y];
            var bottom = [cx, item.y + item.height];
            var left = [item.x, middle];
            var right = [item.x + item.width, middle];
            if (item.shape === 'diamond') {
                return { entry: [top], exit: { then: [right], 'else': [left], any: [left, right] } };
            }
            if (item.loopTop) {
                // do: si entra dal punto in cima al corpo; dalla verifica si torna su a sinistra o si esce sotto.
                return { entry: [item.loopTop, top], exit: { any: [bottom, left], enter: [item.loopTop] } };
            }
            if (item.shape === 'hexagon') {
                // while e for: ritorno da sinistra, corpo sotto, uscita a destra.
                return { entry: [top, left], exit: { any: [bottom, right] } };
            }
            return { entry: [top], exit: { any: [bottom] } };
        }

        var near = 0.3 * s; // le frecce si toccano in un punto, salvo la punta del ritorno del do

        function close(a, b) {
            return Math.abs(a[0] - b[0]) <= near && Math.abs(a[1] - b[1]) <= near;
        }

        var commentPorts = Object.keys(shapesById).filter(function (id) {
            return shapesById[id].color === 'comment';
        }).map(function (id) { return ports(shapesById[id]); });

        /*
         * La freccia (anche fatta di più tratti) da un blocco al successivo: si parte dalle uscite
         * di fromId e si seguono le frecce, che finiscono sull'entrata di un blocco o proseguono
         * in un'altra freccia; un commento si attraversa. null se non c'è (per esempio una chiamata).
         */
        var entered = null; // il do in cui l'ultimo impulso è appena entrato: il prossimo va nel corpo

        function connection(fromId, toId, branch) {
            var from = shapesById[fromId];
            var to = shapesById[toId];
            if (!from || !to) {
                return null;
            }
            var exits = ports(from).exit;
            if (exits.enter && entered === fromId) {
                branch = 'enter';
            }
            var targets = ports(to).entry;
            var queue = (exits[branch] || exits.any).map(function (point) { return { point: point, path: [] }; });
            var used = Object.create(null);
            while (queue.length) {
                var state = queue.shift();
                for (var index = 0; index < lines.length; index++) {
                    if (used[index] || !close(lines[index].points[0], state.point)) {
                        continue;
                    }
                    used[index] = true;
                    var path = state.path.concat([lines[index]]);
                    var end = lines[index].points[lines[index].points.length - 1];
                    if (targets.some(function (point) { return close(point, end); })) {
                        return joinLines(path);
                    }
                    var next = [end];
                    commentPorts.forEach(function (comment) {
                        if (close(comment.entry[0], end)) {
                            next = comment.exit.any;
                        }
                    });
                    next.forEach(function (point) { queue.push({ point: point, path: path }); });
                }
            }
            return null;
        }

        var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
        var current = null; // { elements, animations }: l'impulso che sta correndo, uno alla volta
        var trails = [];

        function stopPulse() {
            if (!current) {
                return;
            }
            current.animations.forEach(function (animation) { animation.cancel(); });
            current.elements.forEach(function (element) { element.remove(); });
            current = null;
        }

        /* La scia torna grigia in --trail-fade (base.css), poi si toglie. */
        function fadeTrail(trail) {
            trail.classList.remove('is-lit');
            window.setTimeout(function () {
                trail.remove();
                trails = trails.filter(function (other) { return other !== trail; });
            }, 1600);
        }

        /* Annulla impulso e scie (Ferma, Pausa, fine dell'esecuzione). */
        function clearPulse() {
            stopPulse();
            trails.forEach(function (trail) { trail.remove(); });
            trails = [];
        }

        function pulse(fromId, toId, branch) {
            var path = connection(fromId, toId, branch);
            var loopTop = shapesById[toId] && shapesById[toId].loopTop;
            entered = path && loopTop && close(path.points[path.points.length - 1], loopTop) ? toId : null;
            stopPulse();
            trails.forEach(function (trail) {
                if (reducedMotion.matches) {
                    trail.remove(); // senza dissolvenza
                } else if (trail.classList.contains('is-lit')) {
                    fadeTrail(trail);
                }
            });
            if (reducedMotion.matches) {
                trails = [];
            }
            if (!path) {
                return false;
            }
            var points = pointsText(path.points);
            var trail = svgElement('polyline', { points: points }, 'dg-trail is-lit');
            if (path.arrow) {
                trail.setAttribute('marker-end', 'url(#' + markerId + '-lit)');
            }
            pulseLayer.appendChild(trail);
            trails.push(trail);
            if (reducedMotion.matches || typeof trail.animate !== 'function') {
                return true; // la freccia percorsa si colora e resta fino al passo successivo
            }
            var length = 0;
            for (var i = 1; i < path.points.length; i++) {
                length += Math.hypot(path.points[i][0] - path.points[i - 1][0], path.points[i][1] - path.points[i - 1][1]);
            }
            // Velocità fissa (non c'è un comando della velocità): un tratto corto, una durata breve.
            var dash = Math.min(38, Math.max(14, length * 0.55));
            var duration = Math.min(600, Math.max(150, length / 520 * 1000));
            var elements = [
                svgElement('polyline', { points: points }, 'dg-pulse-glow'),
                svgElement('polyline', { points: points }, 'dg-pulse')
            ];
            var active = { elements: elements, animations: [] };
            elements.forEach(function (element) {
                element.style.strokeDasharray = round(dash) + ' ' + round(length + dash);
                element.style.strokeDashoffset = round(-length);
                pulseLayer.appendChild(element);
                active.animations.push(element.animate(
                    [{ strokeDashoffset: round(dash) }, { strokeDashoffset: round(-length) }],
                    { duration: duration, easing: 'linear' }
                ));
            });
            current = active;
            active.animations[1].onfinish = function () {
                if (current === active) {
                    stopPulse();
                }
                if (trail.classList.contains('is-lit')) {
                    fadeTrail(trail);
                }
            };
            return true;
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

        var taken = Object.create(null);

        /*
         * Rami percorsi: { ifId: 'then' | 'else' }. Il tratto si ripassa a penna e l'etichetta
         * va in inchiostro; con animate, i rami nuovi o cambiati si tracciano come con una penna.
         */
        function setTaken(map, animate) {
            var previous = taken;
            taken = Object.create(null);
            traceLayer.textContent = '';
            Object.keys(branches).forEach(function (key) {
                if (branches[key].label) {
                    branches[key].label.classList.remove('is-taken');
                }
            });
            Object.keys(map || {}).forEach(function (ifId) {
                var entry = branches[ifId + '\u0000' + map[ifId]];
                if (!entry || !entry.points) {
                    return;
                }
                taken[ifId] = map[ifId];
                var trace = svgElement('polyline', { points: pointsText(entry.points), pathLength: 1 }, 'dg-taken');
                if (entry.arrow) {
                    trace.setAttribute('marker-end', 'url(#' + markerId + '-taken)');
                }
                if (animate && previous[ifId] !== map[ifId]) {
                    trace.classList.add('is-drawing');
                }
                traceLayer.appendChild(trace);
                if (entry.label) {
                    entry.label.classList.add('is-taken');
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
         * Spostamento (passo 19): il blocco è tratteggiato; i punti dove non può andare si spengono,
         * escono dal giro del Tab e non si colpiscono. allowed(slot) dice dove può andare.
         */
        function setMoving(nodeId, allowed) {
            if (moving) {
                moving.classList.remove('is-moving');
            }
            moving = nodeId && groupsById[nodeId] ? groupsById[nodeId] : null;
            svg.classList.toggle('is-moving', Boolean(moving)); // i + dove può andare restano pieni
            disabledSlots = Object.create(null);
            if (moving) {
                moving.classList.add('is-moving');
            }
            slots.forEach(function (slot, index) {
                var off = Boolean(moving) && !allowed(slot);
                disabledSlots[index] = off;
                slotGroups[index].classList.toggle('is-disabled', off);
                slotGroups[index].setAttribute('tabindex', off ? '-1' : '0');
                if (off) {
                    slotGroups[index].setAttribute('aria-disabled', 'true');
                } else {
                    slotGroups[index].removeAttribute('aria-disabled');
                }
            });
        }

        /*
         * Cosa c'è sotto un punto (pixel al 100% dall'angolo dell'SVG): prima un blocco
         * selezionabile, poi il punto di inserimento più vicino entro radius. Così l'area di
         * tocco dei punti resta di 44 px CSS anche quando lo zoom li rimpicciolisce (FR-MOB-04).
         */
        function hitTest(point, radius) {
            var x = point.x - marginLeft;
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
                if (!disabledSlots[index] && distance <= bestDistance) {
                    best = index;
                    bestDistance = distance;
                }
            });
            return best === null ? null : { slot: best };
        }

        function slotBox(index) {
            var slot = slots[index];
            return slot ? {
                x: slot.x - slotRadius + marginLeft, y: (slot.y1 + slot.y2) / 2 - slotRadius + margin,
                width: 2 * slotRadius, height: 2 * slotRadius
            } : null;
        }

        function nodeBox(nodeId) {
            var box = result.nodes[nodeId];
            if (!box) {
                return null;
            }
            return { x: box.x + marginLeft, y: box.y + margin, width: box.width, height: box.height };
        }

        /* Come nodeBox, con attorno l'ombra e l'alone: per inquadrare il blocco in esecuzione. */
        function runningBox(nodeId) {
            var box = nodeBox(nodeId);
            var pad = 0.5 * s;
            return box && { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
        }

        return {
            element: svg,
            size: { width: width, height: height },
            slots: slots,
            setRunning: setRunning,
            setErrors: setErrors,
            setSelected: setSelected,
            setTaken: setTaken,
            setMoving: setMoving,
            hitTest: hitTest,
            slotBox: slotBox,
            nodeBox: nodeBox,
            runningBox: runningBox,
            pulse: pulse,
            clearPulse: clearPulse,
            connection: connection,
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
