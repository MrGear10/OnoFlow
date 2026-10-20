/*
 * OnoFlow — oggetto globale dell'applicazione.
 *
 * Dipendenze: nessuna. È il primo script dell'applicazione, in index.html e in tests.html.
 * Definisce: window.OnoFlow
 *
 * Ogni modulo aggiunge qui il proprio sotto-oggetto con il nome per esteso
 * (OnoFlow.Localization, OnoFlow.NumberFormat, ...). Niente moduli ES: da file://
 * non funzionano (§10.1).
 */
(function (global) {
    'use strict';

    global.OnoFlow = global.OnoFlow || {};
})(window);
