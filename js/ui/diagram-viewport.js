/*
 * OnoFlow — scorrimento e zoom del diagramma (FR-MOB-06, FR-MOB-21, FR-MOB-03, passo 7).
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.DiagramViewport.{create, clampZoom, fitZoom, gridFactor, MIN_ZOOM, MAX_ZOOM}
 *
 * Lo scorrimento è quello nativo del foglio (con il dito, la rotella, la barra): resta fluido
 * anche sui telefoni lenti (NFR-PERF-04). Lo zoom cambia la misura dell'SVG, del margine e dei
 * quadretti, mai quella della pagina:
 *   - due dita sul foglio (eventi touch, con preventDefault: Safari ignora user-scalable=no);
 *   - gesti di Safari (gesturestart/gesturechange) e Ctrl + rotella o pizzico sul touchpad;
 *   - tasti + − 0 con il foglio a fuoco;
 *   - comandi Riduci, 100%, Ingrandisci, Adatta allo schermo (li collega app.js).
 * Il punto sotto le dita, o sotto il puntatore, resta fermo mentre si ingrandisce.
 * Un diagramma si apre sempre al 100% e lo zoom non si memorizza (DEC-057).
 *
 *     create(scroller, { content, onChange(zoom) }) → {
 *         attach(view), zoom(), setZoom(z, ancora?), zoomBy(fattore, ancora?), reset(), fit(),
 *         reveal(box, { quiet }) → true se il foglio è visibile e il blocco è stato inquadrato
 *     }
 * scroller è il foglio che scorre, content l'elemento con i margini del foglio attorno all'SVG;
 * view è il risultato di DiagramRenderer.render; box è in pixel al 100% rispetto all'SVG.
 */
(function (OnoFlow) {
    'use strict';

    // 10%: "Adatta allo schermo" deve far entrare anche un diagramma lungo in un telefono.
    var MIN_ZOOM = 0.1;
    var MAX_ZOOM = 3;
    var STEP = 1.25;
    var MIN_GRID_PX = 8; // sotto questa misura i quadretti diventano rumore: se ne disegna uno ogni 2 o 4

    function clampZoom(zoom) {
        return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    }

    /* Zoom che fa entrare tutto il contenuto (larghezza e altezza) nello spazio disponibile. */
    function fitZoom(content, available) {
        var zoom = Math.min(available.width / content.width, available.height / content.height);
        return clampZoom(Math.min(zoom, 2));
    }

    /* Ogni quanti quadretti si disegna una riga del foglio, a questo zoom. */
    function gridFactor(square, zoom) {
        var factor = 1;
        while (square * zoom * factor < MIN_GRID_PX && factor < 8) {
            factor *= 2;
        }
        return factor;
    }

    function distance(a, b) {
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function middle(a, b) {
        return { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 };
    }

    function create(scroller, options) {
        var content = options.content;
        var onChange = options.onChange || function () {};
        var zoom = 1;
        var view = null;

        function svg() {
            return view ? view.element : null;
        }

        function square() {
            var probe = scroller.ownerDocument.querySelector('.diagram-measure-square');
            return probe ? probe.getBoundingClientRect().width : 20;
        }

        function apply() {
            if (view) {
                view.element.setAttribute('width', String(Math.round(view.size.width * zoom * 100) / 100));
                view.element.setAttribute('height', String(Math.round(view.size.height * zoom * 100) / 100));
            }
            scroller.style.setProperty('--zoom', String(zoom));
            scroller.style.setProperty('--grid-zoom', String(zoom * gridFactor(square(), zoom)));
            onChange(zoom);
        }

        /* Punto del disegno (in pixel al 100%) sotto un punto dello schermo. */
        function contentPoint(anchor) {
            var box = svg().getBoundingClientRect();
            return { x: (anchor.clientX - box.left) / zoom, y: (anchor.clientY - box.top) / zoom };
        }

        /* Cambia lo zoom tenendo il punto del disegno point sotto il punto dello schermo anchor. */
        function zoomAround(next, point, anchor) {
            zoom = clampZoom(next);
            apply();
            var box = svg().getBoundingClientRect();
            scroller.scrollLeft += box.left + point.x * zoom - anchor.clientX;
            scroller.scrollTop += box.top + point.y * zoom - anchor.clientY;
        }

        function centerAnchor() {
            var box = scroller.getBoundingClientRect();
            return { clientX: box.left + scroller.clientWidth / 2, clientY: box.top + scroller.clientHeight / 2 };
        }

        function setZoom(next, anchor) {
            if (!view) {
                zoom = clampZoom(next);
                apply();
                return;
            }
            var at = anchor || centerAnchor();
            zoomAround(next, contentPoint(at), at);
        }

        function zoomBy(factor, anchor) {
            setZoom(zoom * factor, anchor);
        }

        /* Spazio occupato dai margini del foglio, che crescono con lo zoom. */
        function paddingAt100() {
            var style = scroller.ownerDocument.defaultView.getComputedStyle(content);
            return {
                width: (parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)) / zoom,
                height: (parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)) / zoom
            };
        }

        function fit() {
            if (!view || scroller.clientWidth === 0) {
                return;
            }
            var padding = paddingAt100();
            zoom = fitZoom(
                { width: view.size.width + padding.width, height: view.size.height + padding.height },
                { width: scroller.clientWidth, height: scroller.clientHeight }
            );
            apply();
            scroller.scrollLeft = 0;
            scroller.scrollTop = 0;
        }

        /* Porta in vista un blocco; quiet: solo se non è già tutto visibile, con lo spostamento minimo. */
        function reveal(box, revealOptions) {
            if (!view || !box || scroller.clientWidth === 0) {
                return false;
            }
            var quiet = revealOptions && revealOptions.quiet;
            var svgBox = svg().getBoundingClientRect();
            var scrollerBox = scroller.getBoundingClientRect();
            var left = svgBox.left - scrollerBox.left + scroller.scrollLeft + box.x * zoom;
            var top = svgBox.top - scrollerBox.top + scroller.scrollTop + box.y * zoom;
            var width = box.width * zoom;
            var height = box.height * zoom;
            if (quiet) {
                var visible = left >= scroller.scrollLeft && left + width <= scroller.scrollLeft + scroller.clientWidth &&
                    top >= scroller.scrollTop && top + height <= scroller.scrollTop + scroller.clientHeight;
                if (visible) {
                    return true;
                }
            }
            scroller.scrollLeft = left + width / 2 - scroller.clientWidth / 2;
            scroller.scrollTop = top + height / 2 - scroller.clientHeight / 2;
            return true;
        }

        // --- Gesti --------------------------------------------------------------------

        // Due dita: lo zoom segue la distanza, il disegno segue il punto di mezzo.
        var pinch = null;
        var pendingFrame = 0;
        var pendingTouches = null;

        function pinchFrame() {
            pendingFrame = 0;
            if (pinch && pendingTouches) {
                var a = pendingTouches[0];
                var b = pendingTouches[1];
                zoomAround(pinch.zoom * distance(a, b) / pinch.distance, pinch.point, middle(a, b));
            }
        }

        scroller.addEventListener('touchstart', function (event) {
            if (event.touches.length === 2 && view) {
                var a = event.touches[0];
                var b = event.touches[1];
                pinch = { zoom: zoom, distance: Math.max(1, distance(a, b)), point: contentPoint(middle(a, b)) };
            }
        }, { passive: true });

        scroller.addEventListener('touchmove', function (event) {
            if (pinch && event.touches.length === 2) {
                event.preventDefault(); // niente ingrandimento della pagina (FR-MOB-06, FR-MOB-21)
                pendingTouches = [
                    { clientX: event.touches[0].clientX, clientY: event.touches[0].clientY },
                    { clientX: event.touches[1].clientX, clientY: event.touches[1].clientY }
                ];
                if (!pendingFrame) {
                    pendingFrame = window.requestAnimationFrame(pinchFrame);
                }
            }
        }, { passive: false });

        function endPinch(event) {
            if (event.touches.length < 2) {
                if (pendingFrame) {
                    // Le dita si staccano prima del disegno successivo: l'ultimo movimento vale lo stesso.
                    window.cancelAnimationFrame(pendingFrame);
                    pinchFrame();
                }
                pinch = null;
                pendingTouches = null;
            }
        }
        scroller.addEventListener('touchend', endPinch);
        scroller.addEventListener('touchcancel', endPinch);

        // Safari: gesti di pizzico (iOS e touchpad del Mac). Su iOS lo zoom lo fanno già gli
        // eventi touch: qui si impedisce solo l'ingrandimento della pagina.
        var gesture = null;
        scroller.addEventListener('gesturestart', function (event) {
            event.preventDefault();
            gesture = pinch || !view ? null : { zoom: zoom, point: contentPoint(event), anchor: { clientX: event.clientX, clientY: event.clientY } };
        });
        scroller.addEventListener('gesturechange', function (event) {
            event.preventDefault();
            if (gesture && !pinch) {
                zoomAround(gesture.zoom * event.scale, gesture.point, gesture.anchor);
            }
        });
        scroller.addEventListener('gestureend', function (event) {
            event.preventDefault();
            gesture = null;
        });

        // Ctrl + rotella, e il pizzico sui touchpad dei computer, che arriva così.
        scroller.addEventListener('wheel', function (event) {
            if (!event.ctrlKey || !view) {
                return;
            }
            event.preventDefault();
            var lines = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
            var delta = Math.max(-50, Math.min(50, event.deltaY * lines));
            zoomBy(Math.exp(-delta * 0.01), event);
        }, { passive: false });

        scroller.addEventListener('keydown', function (event) {
            if (event.target !== scroller || event.altKey || event.metaKey || event.ctrlKey) {
                return;
            }
            if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                zoomBy(STEP);
            } else if (event.key === '-') {
                event.preventDefault();
                zoomBy(1 / STEP);
            } else if (event.key === '0') {
                event.preventDefault();
                setZoom(1);
            }
        });

        return {
            attach: function (nextView) {
                view = nextView;
                apply();
            },
            zoom: function () { return zoom; },
            setZoom: setZoom,
            zoomBy: zoomBy,
            zoomIn: function () { zoomBy(STEP); },
            zoomOut: function () { zoomBy(1 / STEP); },
            /* Apertura di un diagramma: 100%, dall'angolo in alto a sinistra (DEC-057). */
            reset: function () {
                zoom = 1;
                apply();
                scroller.scrollLeft = 0;
                scroller.scrollTop = 0;
            },
            fit: fit,
            reveal: reveal
        };
    }

    OnoFlow.DiagramViewport = {
        create: create,
        clampZoom: clampZoom,
        fitZoom: fitZoom,
        gridFactor: gridFactor,
        MIN_ZOOM: MIN_ZOOM,
        MAX_ZOOM: MAX_ZOOM
    };
})(window.OnoFlow);
