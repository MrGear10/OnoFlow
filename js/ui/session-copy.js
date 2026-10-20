/*
 * OnoFlow — copia di sessione del diagramma aperto (NFR-PRIV-08, FR-MOB-15).
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.SessionCopy.{create, defaultStorage, KEY}
 *
 * È l'unica cosa che l'app conserva: il testo .fprg del diagramma aperto, il nome del
 * file e se c'erano modifiche non salvate. Sta in sessionStorage, quindi solo in quella
 * scheda e fino alla sua chiusura; non viene mai inviata. Niente preferenze o cronologia.
 *
 * create(storage) restituisce { save(copia), load(), clear() }; storage è di solito
 * window.sessionStorage, nei test un sostituto. Se lo storage non c'è o rifiuta di
 * scrivere (navigazione privata, spazio finito) l'app funziona lo stesso, senza ripristino:
 * gli errori dello storage non escono mai da qui.
 *
 *     copia = { text, fileName, saved }
 */
(function (OnoFlow) {
    'use strict';

    var KEY = 'onoflow.diagram';

    function isCopy(value) {
        return value !== null && typeof value === 'object' &&
            typeof value.text === 'string' && typeof value.fileName === 'string' &&
            typeof value.saved === 'boolean';
    }

    function create(storage) {
        function save(copy) {
            if (!storage) {
                return false;
            }
            try {
                storage.setItem(KEY, JSON.stringify({ text: copy.text, fileName: copy.fileName, saved: copy.saved }));
                return true;
            } catch (error) {
                return false;
            }
        }

        /* La copia salvata, oppure null se non c'è o non è leggibile. */
        function load() {
            if (!storage) {
                return null;
            }
            try {
                var value = JSON.parse(storage.getItem(KEY));
                return isCopy(value) ? value : null;
            } catch (error) {
                return null;
            }
        }

        function clear() {
            if (!storage) {
                return;
            }
            try {
                storage.removeItem(KEY);
            } catch (error) {
                // Niente da fare: alla peggio la copia resta fino alla chiusura della scheda.
            }
        }

        return { save: save, load: load, clear: clear };
    }

    /* Lo storage della sessione, se il browser lo concede (leggerlo può già lanciare un errore). */
    function defaultStorage() {
        try {
            return window.sessionStorage || null;
        } catch (error) {
            return null;
        }
    }

    OnoFlow.SessionCopy = { create: create, defaultStorage: defaultStorage, KEY: KEY };
})(window.OnoFlow);
