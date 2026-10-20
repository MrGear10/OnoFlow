/*
 * OnoFlow — catalogo italiano. È la lingua di riferimento: ogni altro catalogo
 * deve avere le stesse chiavi e gli stessi segnaposto (NFR-I18N-06).
 *
 * Dipendenze: js/i18n/localization.js.
 *
 * Chiavi degli errori: CODICE, CODICE.reason oppure CODICE.reason.type (§8.2).
 * I nomi dei tipi (Integer, Real, String, Boolean) e le parole del linguaggio
 * restano come nel diagramma.
 */
(function (Localization) {
    'use strict';

    Localization.registerCatalog('it', {
        name: 'Italiano',

        // Formato dei numeri nella console (§6.10, §6.11).
        number: {
            decimalSeparator: ',',
            inputDecimalSeparators: [',', '.']
        },

        messages: {
            // Input da console (§6.11, §8.4).
            'ERR_INPUT_NOT_CONVERTIBLE': '«{text}» non è un valore valido per una variabile {type}.',
            'ERR_INPUT_NOT_CONVERTIBLE.empty': 'Non hai scritto nessun valore: serve un valore {type}.',
            'ERR_INPUT_NOT_CONVERTIBLE.format.Integer': '«{text}» non è un numero intero: scrivi solo cifre, con il segno davanti se serve.',
            'ERR_INPUT_NOT_CONVERTIBLE.format.Real': '«{text}» non è un numero: scrivi solo cifre, con la virgola o il punto per i decimali, senza separatore delle migliaia né notazione scientifica.',
            'ERR_INPUT_NOT_CONVERTIBLE.format.Boolean': '«{text}» non è un valore Boolean: scrivi true oppure false.',
            'ERR_INPUT_NOT_CONVERTIBLE.decimal': 'La variabile accetta solo numeri interi: «{text}» ha una parte decimale.',
            'ERR_INPUT_NOT_CONVERTIBLE.range.Integer': '«{text}» è fuori dall\'intervallo degli Integer, che va da -2147483648 a 2147483647.',
            'ERR_INPUT_NOT_CONVERTIBLE.range.Real': '«{text}» è un numero troppo grande.'
        }
    });
})(window.OnoFlow.Localization);
