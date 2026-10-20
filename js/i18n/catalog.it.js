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
            'ERR_INPUT_NOT_CONVERTIBLE.range.Real': '«{text}» è un numero troppo grande.',

            // Sintassi dei campi (§6.2, §6.3, §8.4).
            'ERR_SYNTAX_EMPTY_EXPRESSION': 'Il campo è vuoto: scrivi qualcosa.',
            'ERR_SYNTAX_UNEXPECTED_CHARACTER': 'Il carattere «{char}» non si può usare qui.',
            'ERR_SYNTAX_UNEXPECTED_CHARACTER.singleQuote': 'Le stringhe si scrivono tra virgolette doppie: "ciao", non \'ciao\'.',
            'ERR_SYNTAX_UNEXPECTED_CHARACTER.typographicQuote': 'Le virgolette «{char}» non vanno bene: usa le virgolette dritte ".',
            'ERR_SYNTAX_UNEXPECTED_CHARACTER.accentedLetter': 'Nei nomi niente lettere accentate o speciali: togli «{char}» (per esempio eta invece di età).',
            'ERR_SYNTAX_UNEXPECTED_CHARACTER.invisible': 'C\'è un carattere invisibile, uno spazio speciale: cancellalo e riscrivi lo spazio.',
            'ERR_SYNTAX_UNTERMINATED_STRING': 'Il testo aperto con le virgolette " non è chiuso: aggiungi " alla fine.',
            'ERR_SYNTAX_INVALID_NUMBER': '«{text}» non è un numero valido.',
            'ERR_SYNTAX_INVALID_NUMBER.leadingPoint': '«{text}» non è un numero valido: scrivi lo zero davanti, {suggestion}.',
            'ERR_SYNTAX_INVALID_NUMBER.trailingPoint': '«{text}» non è un numero valido: dopo il punto servono delle cifre, per esempio {suggestion}.',
            'ERR_SYNTAX_INVALID_NUMBER.exponent': '«{text}»: la notazione scientifica non si può usare, scrivi il numero per esteso.',
            'ERR_SYNTAX_INVALID_NUMBER.missingOperator': '«{text}»: tra un numero e un nome serve un operatore, per esempio {suggestion}.',
            'ERR_SYNTAX_UNEXPECTED_TOKEN': '«{token}» non va bene in questo punto.',
            'ERR_SYNTAX_UNEXPECTED_TOKEN.decimalComma': 'Nelle espressioni i decimali si scrivono con il punto: {suggestion}. La virgola si usa solo nella console.',
            'ERR_SYNTAX_UNEXPECTED_TOKEN.keywordCase': 'Operatori e valori logici si scrivono in minuscolo: {suggestion} invece di {token}.',
            'ERR_SYNTAX_UNEXPECTED_END': 'L\'espressione finisce troppo presto: manca qualcosa alla fine.',
            'ERR_SYNTAX_UNCLOSED': 'La parentesi «{open}» non è chiusa: manca «{close}».',
            'ERR_SYNTAX_CHAINED_COMPARISON': 'I confronti non si possono mettere in fila: invece di a < b < c scrivi a < b and b < c.',
            'ERR_SYNTAX_INVALID_INDEX': 'Indice non valido.',
            'ERR_SYNTAX_INVALID_INDEX.nested': 'Si usa un solo indice, e solo dopo il nome di un array: a[i] va bene, a[i][j] e f(x)[0] no.',
            'ERR_SYNTAX_INVALID_INDEX.empty': 'Tra le parentesi quadre manca l\'indice, per esempio a[0].',
            'ERR_SYNTAX_INVALID_INDEX.multiple': 'Gli array hanno una sola dimensione: usa un solo indice, per esempio a[i].',
            'ERR_SYNTAX_INVALID_TARGET': 'Qui serve il nome di una variabile, oppure un elemento di un array come a[i].',
            'ERR_SYNTAX_TOO_COMPLEX': 'L\'espressione ha troppe parentesi o operatori annidati: dividila in più passaggi.',
            'ERR_INTEGER_LITERAL_OUT_OF_RANGE': '{text} è fuori dall\'intervallo degli Integer, che va da -2147483648 a 2147483647.',
            'ERR_REAL_LITERAL_OUT_OF_RANGE': '{text} è un numero troppo grande.',
            'ERR_NAME_LIST_INVALID': 'Scrivi uno o più nomi separati da virgole, per esempio a, b, c.',
            'ERR_NAME_LIST_INVALID.keyword': '«{name}» è una parola riservata e non si può usare come nome.',
            'ERR_INVALID_NAME': '«{text}» non è un nome valido: usa lettere senza accenti, cifre e _, senza cifra iniziale.',
            'ERR_INVALID_NAME.keyword': '«{text}» è una parola riservata e non si può usare come nome.',
            'ERR_INVALID_NAME.indexed': 'Qui serve solo il nome della variabile, senza indice: «{text}» non va bene.',
            'ERR_FOR_STEP_INVALID': 'Il passo deve essere un numero intero maggiore di zero, senza segno: «{text}» non va bene.'
        }
    });
})(window.OnoFlow.Localization);
