/*
 * OnoFlow — disposizione del diagramma di flusso (FR-VIEW-01, passo 7).
 *
 * Dipendenze: js/namespace.js, js/core/model.js, js/ui/block-text.js.
 * Definisce: OnoFlow.DiagramLayout.layout
 *
 * Calcola dove va ogni forma, linea e scritta, senza toccare la pagina: il disegno SVG è
 * in js/ui/diagram-renderer.js. Layout automatico ricorsivo, come in Flowgorithm:
 *   - i blocchi di una sequenza stanno in colonna su un asse verticale, uniti da frecce;
 *   - if: rombo, ramo Falso a sinistra e ramo Vero a destra, riuniti sotto in un punto (DEC-057);
 *   - while e for: esagono in alto, corpo sotto, ritorno a sinistra, uscita a destra;
 *   - do: corpo in alto, esagono in fondo, ritorno a sinistra fino all'inizio.
 * Le misure sono in quadretti (la regola del quadretto, DESIGN.md): larghezze arrotondate a
 * due quadretti, così gli assi cadono sulle righe del foglio.
 *
 *     layout(program, { t, measure, square, fontSize }) → {
 *         width, height,
 *         items: [ shape | line | label | junction | title ]  (la forma Inizio porta l'ID della funzione;
 *                 shape.inset è il rientro degli angoli, per disegnarla),
 *         nodes: { id: { x, y, width, height } },   rettangolo da inquadrare (funzioni: Inizio)
 *         slots: [ { functionId, ownerId, list, index, x, y1, y2 } ]  frecce dove si inserisce un blocco
 *     }
 * measure(testo, stile) dà la larghezza del testo; stili: 'keyword', 'code', 'label', 'title'.
 * Tutte le coordinate sono in pixel CSS al 100%; lo zoom le scala tutte insieme.
 */
(function (OnoFlow) {
    'use strict';

    var BlockText = OnoFlow.BlockText;
    if (!OnoFlow.Model || !BlockText) {
        throw new Error('diagram-layout.js richiede model.js e block-text.js, da caricare prima');
    }

    // Forma e colore di ogni tipo di blocco (forme classiche dei diagrammi di flusso).
    var SHAPE_OF_KIND = {
        declare: 'declare', assign: 'rect', input: 'parallelogram', output: 'parallelogram',
        'if': 'diamond', 'while': 'hexagon', 'do': 'hexagon', 'for': 'hexagon', call: 'call', comment: 'comment',
        'function': 'terminal' // l'icona della finestra di una funzione (passo 18)
    };
    var COLOR_OF_KIND = {
        declare: 'declare', assign: 'assign', input: 'input', output: 'output',
        'if': 'if', 'while': 'loop', 'do': 'loop', 'for': 'loop', call: 'call', comment: 'comment',
        'function': 'terminal'
    };

    function layout(program, options) {
        var t = options.t;
        var measure = options.measure;
        var s = options.square;

        // Misure in quadretti.
        var BOX_HEIGHT = 2 * s;
        var DIAMOND_HEIGHT = 3 * s;
        var PAD_X = 0.75 * s;
        var MIN_WIDTH = 4 * s;
        var ARROW = 2 * s;               // freccia tra due blocchi: lì si inserirà un blocco
        var SLANT = 0.8 * s;             // inclinazione del parallelogramma
        var POINT = s;                   // punta dell'esagono
        var LABEL_GAP = 0.25 * s;
        var TEXT_HEIGHT_RATIO = 1.25;    // altezza del testo rispetto al corpo, per il rombo
        var FUNCTION_GAP = 3 * s;
        // Tre quadretti: tra il titolo e Inizio c'è posto per il cerchio di un errore sulla funzione.
        var TITLE_HEIGHT = 3 * s;

        var labelThen = t('ui.diagram.then');
        var labelElse = t('ui.diagram.else');
        var labelWidth = Math.max(measure(labelThen, 'label'), measure(labelElse, 'label'));

        var items = [];
        var nodes = Object.create(null);
        var slots = [];
        var currentFunctionId = null; // la funzione che si sta disponendo, per i punti di inserimento

        /* Arrotonda per eccesso a un multiplo di passo (due quadretti per le larghezze). */
        function ceilTo(value, step) {
            return Math.ceil(value / step - 1e-9) * step;
        }

        /* Testo di una forma: parti con la loro posizione da sinistra. */
        function textOf(parts) {
            var x = 0;
            var segments = parts.map(function (part) {
                var style = part.role === 'keyword' ? 'keyword' : 'code';
                var width = measure(part.text, style);
                var segment = { text: part.text, role: part.role, field: part.field, x: x, width: width };
                x += width;
                return segment;
            });
            return { segments: segments, width: x };
        }

        /* Larghezza di una forma che contiene un testo largo textWidth. */
        function shapeWidth(shape, textWidth) {
            var inner = textWidth + 2 * PAD_X;
            if (shape === 'parallelogram') {
                inner += 2 * SLANT;
            } else if (shape === 'hexagon') {
                inner += 2 * POINT;
            } else if (shape === 'call') {
                inner += 2 * (0.5 * s);
            } else if (shape === 'terminal') {
                inner += BOX_HEIGHT / 2;
            } else if (shape === 'diamond') {
                // Il testo sta nella fascia centrale del rombo: a metà altezza c'è tutta la larghezza.
                var ratio = 1 - (TEXT_HEIGHT_RATIO * (options.fontSize || s)) / DIAMOND_HEIGHT;
                inner = (textWidth + 2 * PAD_X) / Math.max(ratio, 0.3);
            }
            return Math.max(MIN_WIDTH, ceilTo(inner, 2 * s));
        }

        /* Rientro degli angoli: inclinazione del parallelogramma, punta dell'esagono, righe interne. */
        function insetOf(shape) {
            if (shape === 'parallelogram') {
                return SLANT;
            }
            if (shape === 'hexagon') {
                return POINT;
            }
            return shape === 'call' || shape === 'comment' || shape === 'declare' ? 0.5 * s : 0;
        }

        /* Forma semplice: { width, height, left, right, place(asse, y) }. */
        function shapeBox(id, color, shape, parts) {
            var text = textOf(parts);
            var width = shapeWidth(shape, text.width);
            var height = shape === 'diamond' ? DIAMOND_HEIGHT : BOX_HEIGHT;
            return {
                width: width,
                height: height,
                left: width / 2,
                right: width / 2,
                place: function (axis, top) {
                    var item = {
                        type: 'shape', id: id, color: color, shape: shape,
                        functionId: currentFunctionId,
                        x: axis - width / 2, y: top, width: width, height: height, inset: insetOf(shape),
                        text: { x: axis - text.width / 2, y: top + height / 2, segments: text.segments }
                    };
                    items.push(item);
                    return item;
                }
            };
        }

        function line(points, arrow) {
            items.push({ type: 'line', points: points, arrow: Boolean(arrow) });
        }

        /* Scritta piccola; y è la linea di base, oppure il centro con baseline 'middle'. */
        function label(text, x, y, anchor, baseline) {
            items.push({ type: 'label', text: text, x: x, y: y, anchor: anchor, baseline: baseline || 'alphabetic' });
        }

        function remember(id, item) {
            nodes[id] = { x: item.x, y: item.y, width: item.width, height: item.height };
        }

        /*
         * Sequenza di blocchi: una freccia prima di ogni blocco e una dopo l'ultimo, quindi
         * n + 1 frecce per n blocchi; ognuna è un punto dove si potrà inserire (slot).
         * place(asse, y, arrowAtEnd): l'ultima freccia ha la punta solo se entra in un blocco.
         */
        function measureSequence(blocks, ownerId, listName) {
            var measured = blocks.map(measureBlock);
            var height = ARROW * (measured.length + 1);
            var left = s;
            var right = s;
            measured.forEach(function (child) {
                height += child.height;
                left = Math.max(left, child.left);
                right = Math.max(right, child.right);
            });
            return {
                height: height,
                left: left,
                right: right,
                place: function (axis, top, arrowAtEnd) {
                    var y = top;
                    for (var index = 0; index <= measured.length; index++) {
                        var last = index === measured.length;
                        line([[axis, y], [axis, y + ARROW]], !last || arrowAtEnd);
                        slots.push({
                            functionId: currentFunctionId, ownerId: ownerId, list: listName, index: index,
                            x: axis, y1: y, y2: y + ARROW
                        });
                        y += ARROW;
                        if (!last) {
                            measured[index].place(axis, y);
                            y += measured[index].height;
                        }
                    }
                }
            };
        }

        function measureBlock(block) {
            if (block.kind === 'if') {
                return measureIf(block);
            }
            if (block.kind === 'while' || block.kind === 'for') {
                return measurePreTestLoop(block);
            }
            if (block.kind === 'do') {
                return measureDo(block);
            }
            var box = shapeBox(block.id, COLOR_OF_KIND[block.kind], SHAPE_OF_KIND[block.kind], BlockText.segments(block, t, 'head'));
            var place = box.place;
            box.place = function (axis, top) {
                remember(block.id, place(axis, top));
            };
            return box;
        }

        function measureIf(block) {
            var diamond = shapeBox(block.id, 'if', 'diamond', BlockText.segments(block, t, 'head'));
            var whenTrue = measureSequence(block.then, block.id, 'then');
            var whenFalse = measureSequence(block['else'], block.id, 'else');
            var half = diamond.width / 2;
            // Distanza degli assi dei rami dal centro: fuori dal rombo, con posto per l'etichetta.
            var reach = half + Math.max(s, labelWidth + 2 * LABEL_GAP);
            var rightAxis = ceilTo(Math.max(reach, whenTrue.left + s), s);
            var leftAxis = ceilTo(Math.max(reach, whenFalse.right + s), s);
            var branchesHeight = Math.max(whenTrue.height, whenFalse.height);
            return {
                height: DIAMOND_HEIGHT / 2 + branchesHeight,
                left: leftAxis + whenFalse.left,
                right: rightAxis + whenTrue.right,
                place: function (axis, top) {
                    remember(block.id, diamond.place(axis, top));
                    var middle = top + DIAMOND_HEIGHT / 2;
                    var bottom = middle + branchesHeight;
                    var xTrue = axis + rightAxis;
                    var xFalse = axis - leftAxis;
                    line([[axis + half, middle], [xTrue, middle]], false);
                    line([[axis - half, middle], [xFalse, middle]], false);
                    label(labelThen, axis + half + LABEL_GAP, middle - LABEL_GAP, 'start');
                    label(labelElse, axis - half - LABEL_GAP, middle - LABEL_GAP, 'end');
                    whenTrue.place(xTrue, middle, false);
                    whenFalse.place(xFalse, middle, false);
                    // Il ramo più corto scende fino al punto in cui i due rami si riuniscono.
                    line([[xTrue, middle + whenTrue.height], [xTrue, bottom], [axis, bottom]], false);
                    line([[xFalse, middle + whenFalse.height], [xFalse, bottom], [axis, bottom]], false);
                    items.push({ type: 'junction', x: axis, y: bottom });
                }
            };
        }

        /* while e for: la condizione si verifica prima del corpo. */
        function measurePreTestLoop(block) {
            var hexagon = shapeBox(block.id, 'loop', 'hexagon', BlockText.segments(block, t, 'head'));
            var body = measureSequence(block.body, block.id, 'body');
            var half = hexagon.width / 2;
            var leftLane = ceilTo(Math.max(half, body.left) + s, s);
            var rightLane = ceilTo(Math.max(half + labelWidth + 2 * LABEL_GAP, body.right + s), s);
            return {
                height: BOX_HEIGHT + body.height + s,
                left: leftLane,
                right: rightLane,
                place: function (axis, top) {
                    remember(block.id, hexagon.place(axis, top));
                    var middle = top + BOX_HEIGHT / 2;
                    var bodyTop = top + BOX_HEIGHT;
                    var bodyBottom = bodyTop + body.height;
                    var exit = bodyBottom + s;
                    body.place(axis, bodyTop, false);
                    // A destra del punto di inserimento, che sta a metà della freccia (raggio 0,45 quadretti).
                    label(labelThen, axis + 0.7 * s, bodyTop + s, 'start', 'middle');
                    // Ritorno: dalla fine del corpo, a sinistra e su fino alla condizione.
                    line([[axis, bodyBottom], [axis - leftLane, bodyBottom], [axis - leftLane, middle], [axis - half, middle]], true);
                    // Uscita: a destra, giù oltre il corpo e di nuovo sull'asse.
                    line([[axis + half, middle], [axis + rightLane, middle], [axis + rightLane, exit], [axis, exit]], false);
                    label(labelElse, axis + half + LABEL_GAP, middle - LABEL_GAP, 'start');
                }
            };
        }

        /* do: il corpo si esegue prima della verifica; Vero torna all'inizio. */
        function measureDo(block) {
            var hexagon = shapeBox(block.id, 'loop', 'hexagon', BlockText.segments(block, t, 'tail'));
            var body = measureSequence(block.body, block.id, 'body');
            var half = hexagon.width / 2;
            var keyword = BlockText.plainText(block, t, 'head');
            var leftLane = ceilTo(Math.max(half + labelWidth + 2 * LABEL_GAP, body.left + s), s);
            return {
                height: body.height + BOX_HEIGHT,
                left: leftLane,
                right: Math.max(half, body.right, measure(keyword, 'label') + 1.5 * s, 0.7 * s + labelWidth),
                place: function (axis, top) {
                    items.push({ type: 'junction', x: axis, y: top });
                    label(keyword, axis + 0.5 * s, top, 'start', 'middle');
                    body.place(axis, top, true);
                    var hexagonTop = top + body.height;
                    var middle = hexagonTop + BOX_HEIGHT / 2;
                    remember(block.id, hexagon.place(axis, hexagonTop));
                    // La punta si ferma sul bordo del punto d'incontro (raggio 0,2 quadretti, diagram-renderer.js).
                    line([[axis - half, middle], [axis - leftLane, middle], [axis - leftLane, top], [axis - 0.2 * s, top]], true);
                    label(labelThen, axis - half - LABEL_GAP, middle - LABEL_GAP, 'end');
                    label(labelElse, axis + 0.7 * s, hexagonTop + BOX_HEIGHT + s, 'start', 'middle');
                }
            };
        }

        function terminal(key) {
            return shapeBox(null, 'terminal', 'terminal', [{ text: t(key), role: 'keyword', field: null }]);
        }

        /* Titolo con la firma: «Funzione Doppio(Integer n, Real v[]) → Integer r» (passo 18). */
        function signatureText(programFunction) {
            var parameters = programFunction.parameters.map(function (parameter) {
                return parameter.type + ' ' + parameter.name + (parameter.array ? '[]' : '');
            }).join(', ');
            if (programFunction.name === 'Main' || programFunction.type === 'None') {
                return t('ui.diagram.function', { name: programFunction.name, parameters: parameters });
            }
            return t('ui.diagram.functionReturns', {
                name: programFunction.name, parameters: parameters, type: programFunction.type, variable: programFunction.variable
            });
        }

        // Le funzioni stanno una sotto l'altra, ognuna con il suo asse; il nome solo se sono più d'una.
        var showNames = program.functions.length > 1;
        var top = 0;
        var width = 0;
        program.functions.forEach(function (programFunction, index) {
            var start = terminal('ui.diagram.start');
            var end = terminal('ui.diagram.end');
            var body = measureSequence(programFunction.body, programFunction.id, 'body');
            var left = ceilTo(Math.max(start.left, body.left, end.left), s);
            var right = Math.max(start.right, body.right, end.right);
            var title = showNames ? signatureText(programFunction) : '';
            if (index > 0) {
                top += FUNCTION_GAP;
            }
            if (showNames) {
                items.push({ type: 'title', text: title, x: 0, y: top + TITLE_HEIGHT / 2 });
                top += TITLE_HEIGHT;
                width = Math.max(width, measure(title, 'title'));
            }
            var axis = left;
            currentFunctionId = programFunction.id;
            var startItem = start.place(axis, top);
            startItem.id = programFunction.id;
            remember(programFunction.id, startItem);
            top += start.height;
            body.place(axis, top, true);
            top += body.height;
            end.place(axis, top);
            top += end.height;
            width = Math.max(width, left + right);
        });

        return { width: Math.ceil(width), height: top, items: items, nodes: nodes, slots: slots };
    }

    OnoFlow.DiagramLayout = { layout: layout, SHAPE_OF_KIND: SHAPE_OF_KIND, COLOR_OF_KIND: COLOR_OF_KIND };
})(window.OnoFlow);
