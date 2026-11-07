/*
 * OnoFlow — app installabile dal browser (PWA, DEC-111).
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.Install.create
 *
 * Solo installabile: c'è il manifest (manifest.webmanifest), non un service worker. L'app
 * installata prende i file dal sito come la pagina, quindi è sempre l'ultima versione e senza
 * rete non si apre; nel browser non si conserva nulla di nuovo (NFR-PRIV-01).
 *
 *     create({ item, onFile }) → { available() }
 *         item: la voce «Installa OnoFlow» del menu, nascosta finché il browser non propone
 *             l'installazione (beforeinstallprompt: Chrome, Edge, Android) e di nuovo nascosta
 *             a installazione fatta o rifiutata; nessun avviso che compare da solo (P-3);
 *         onFile(file): un .fprg aperto con un doppio clic nell'app installata (File Handling
 *             API, Chrome ed Edge sul computer, P-2).
 *
 * Dove le API non ci sono (Firefox, Safari, copia da file://) la voce resta nascosta e non
 * cambia nulla.
 */
(function (OnoFlow) {
    'use strict';

    // L'evento può arrivare prima dell'avvio dell'app: lo si tiene da parte.
    var pending = null;
    var listener = null;
    window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault(); // niente barra o avviso del browser: solo la voce del menu
        pending = event;
        if (listener) {
            listener();
        }
    });

    function create(options) {
        var item = options.item;

        function show() {
            item.hidden = !pending;
        }

        listener = show;
        show();

        window.addEventListener('appinstalled', function () {
            pending = null;
            show();
        });

        item.addEventListener('click', function () {
            var event = pending;
            if (!event) {
                return;
            }
            // La richiesta del browser vale una volta sola, accettata o no.
            pending = null;
            show();
            event.prompt();
        });

        var queue = window.launchQueue;
        if (queue && typeof queue.setConsumer === 'function' && options.onFile) {
            queue.setConsumer(function (params) {
                var handle = params && params.files && params.files[0];
                if (handle && typeof handle.getFile === 'function') {
                    handle.getFile().then(options.onFile, function () {});
                }
            });
        }

        return { available: function () { return Boolean(pending); } };
    }

    OnoFlow.Install = { create: create };
})(window.OnoFlow);
