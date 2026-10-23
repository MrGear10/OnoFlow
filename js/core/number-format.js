/*
 * OnoFlow — formato dei numeri: stampa dei valori nella console e lettura dell'input.
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.NumberFormat
 *
 * Ogni funzione riceve il formato numerico della lingua (dal catalogo, NFR-I18N-04):
 *     { decimalSeparator: ',', inputDecimalSeparators: [',', '.'] }
 * così il modulo non dipende dalla localizzazione e si prova da solo.
 *
 * Regole (§6.10, §6.11):
 *   - Real: al massimo due decimali, zeri finali tolti, casi a metà lontano dallo zero;
 *     l'arrotondamento parte dalla rappresentazione decimale più corta del numero
 *     (quella di String(x)), non dal valore binario: 1.005 → 1,01. Per questo non si usa
 *     toFixed (L-03) ma si lavora sulle cifre di toExponential();
 *   - mai -0, mai separatore delle migliaia, mai notazione scientifica;
 *   - l'input accetta spazi ai bordi, segno, zeri iniziali, e i separatori decimali della lingua.
 */
(function (OnoFlow) {
    'use strict';

    var INTEGER_MIN = -2147483648;
    var INTEGER_MAX = 2147483647;
    var OUTPUT_DECIMALS = 2;
    var MAX_FIXED_DECIMALS = 15;

    var TYPE_INTEGER = 'Integer';
    var TYPE_REAL = 'Real';
    var TYPE_STRING = 'String';
    var TYPE_BOOLEAN = 'Boolean';

    /* -0 diventa 0; ogni altro valore resta com'è (L-04). */
    function normalizeZero(value) {
        return value === 0 ? 0 : value;
    }

    /*
     * Scompone |x| nelle cifre decimali della sua rappresentazione più corta.
     * Restituisce { integerDigits, fractionDigits } come stringhe di cifre ASCII.
     * Esempi: 0.125 → { '0', '125' }; 1e25 → { '1000…0', '' }; 1e-7 → { '0', '0000001' }.
     */
    function decimalDigits(absoluteValue) {
        // toExponential() senza argomento usa le cifre minime che identificano il numero.
        var parts = absoluteValue.toExponential().split('e');
        var digits = parts[0].replace('.', '');
        var pointIndex = parseInt(parts[1], 10) + 1; // cifre prima della virgola
        if (pointIndex <= 0) {
            digits = '0'.repeat(1 - pointIndex) + digits;
            pointIndex = 1;
        }
        if (digits.length < pointIndex) {
            digits = digits + '0'.repeat(pointIndex - digits.length);
        }
        return { integerDigits: digits.slice(0, pointIndex), fractionDigits: digits.slice(pointIndex) };
    }

    /* Aggiunge 1 a una stringa di cifre decimali, con il riporto: '0999' → '1000'. */
    function incrementDigits(digits) {
        var result = digits.split('');
        for (var i = result.length - 1; i >= 0; i--) {
            if (result[i] === '9') {
                result[i] = '0';
            } else {
                result[i] = String.fromCharCode(result[i].charCodeAt(0) + 1);
                return result.join('');
            }
        }
        return '1' + result.join('');
    }

    /*
     * Arrotonda x a "decimals" cifre decimali, a metà lontano dallo zero, partendo dalla
     * rappresentazione più corta. Restituisce { negative, integerDigits, fractionDigits }
     * con fractionDigits lungo esattamente "decimals".
     */
    function roundToDecimals(value, decimals) {
        if (!isFinite(value)) {
            throw new RangeError('NumberFormat: valore non finito ' + value);
        }
        var split = decimalDigits(Math.abs(value));
        var integerDigits = split.integerDigits;
        var fractionDigits = split.fractionDigits;

        if (fractionDigits.length > decimals) {
            // Basta la prima cifra scartata: se è 5 o più si arrotonda lontano dallo zero.
            var roundUp = fractionDigits.charAt(decimals) >= '5';
            fractionDigits = fractionDigits.slice(0, decimals);
            if (roundUp) {
                var incremented = incrementDigits(integerDigits + fractionDigits);
                var cut = incremented.length - decimals;
                integerDigits = incremented.slice(0, cut);
                fractionDigits = incremented.slice(cut);
            }
        } else {
            fractionDigits = fractionDigits + '0'.repeat(decimals - fractionDigits.length);
        }

        integerDigits = integerDigits.replace(/^0+(?=\d)/, '');
        return { negative: value < 0, integerDigits: integerDigits, fractionDigits: fractionDigits };
    }

    function joinNumber(rounded, fractionDigits, format) {
        var isZero = /^0*$/.test(rounded.integerDigits + fractionDigits);
        // Mai "-0": un risultato che si arrotonda a zero si scrive senza segno.
        var sign = rounded.negative && !isZero ? '-' : '';
        return sign + rounded.integerDigits + (fractionDigits ? format.decimalSeparator + fractionDigits : '');
    }

    /* Integer: cifre senza separatori, mai -0. */
    function formatInteger(value) {
        if (!Number.isInteger(value)) {
            throw new TypeError('NumberFormat.formatInteger: non è un intero: ' + value);
        }
        return String(normalizeZero(value));
    }

    /* Real: al massimo due decimali, zeri finali tolti (§6.10). */
    function formatReal(value, format) {
        var rounded = roundToDecimals(value, OUTPUT_DECIMALS);
        return joinNumber(rounded, rounded.fractionDigits.replace(/0+$/, ''), format);
    }

    /*
     * Real con tutte le cifre della rappresentazione più corta (D-05, DEC-073): il "valore
     * completo" del pannello delle variabili, es. 0.1 + 0.2 → "0,30000000000000004".
     * Stesso separatore e stesse regole dell'output, tranne il numero di decimali.
     */
    function formatRealFull(value, format) {
        var digits = decimalDigits(Math.abs(value));
        var fraction = digits.fractionDigits.replace(/0+$/, '');
        return joinNumber({ negative: value < 0, integerDigits: digits.integerDigits }, fraction, format);
    }

    /* Testo di ToFixed: "decimals" cifre, zeri finali conservati (§6.9). */
    function formatFixed(value, decimals, format) {
        if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_FIXED_DECIMALS) {
            throw new RangeError('NumberFormat.formatFixed: cifre non valide: ' + decimals);
        }
        var rounded = roundToDecimals(value, decimals);
        return joinNumber(rounded, rounded.fractionDigits, format);
    }

    /* Testo di un valore semplice, con le regole dell'output (§6.10, usate anche da & e ToString). */
    function formatValue(type, value, format) {
        switch (type) {
            case TYPE_INTEGER:
                return formatInteger(value);
            case TYPE_REAL:
                return formatReal(value, format);
            case TYPE_BOOLEAN:
                return value ? 'true' : 'false';
            case TYPE_STRING:
                return value;
            default:
                throw new TypeError('NumberFormat.formatValue: tipo sconosciuto ' + type);
        }
    }

    function escapeForClass(character) {
        return character.replace(/[\\\]\-^]/g, '\\$&');
    }

    function separatorClass(format) {
        return '[' + format.inputDecimalSeparators.map(escapeForClass).join('') + ']';
    }

    function inputError(reason, type, text) {
        return {
            ok: false,
            error: { code: 'ERR_INPUT_NOT_CONVERTIBLE', params: { reason: reason, type: type, text: text } }
        };
    }

    function inputValue(value) {
        return { ok: true, value: value };
    }

    var INTEGER_PATTERN = /^[+-]?[0-9]+$/;

    function parseInteger(text, format) {
        var trimmed = text.trim();
        if (trimmed === '') {
            return inputError('empty', TYPE_INTEGER, text);
        }
        if (INTEGER_PATTERN.test(trimmed)) {
            // BigInt controlla l'intervallo anche per testi molto lunghi (L-05).
            var big = BigInt(trimmed);
            if (big < BigInt(INTEGER_MIN) || big > BigInt(INTEGER_MAX)) {
                return inputError('range', TYPE_INTEGER, text);
            }
            return inputValue(normalizeZero(Number(big)));
        }
        // Un numero con la parte decimale merita un messaggio dedicato (§8.4).
        var decimalPattern = new RegExp('^[+-]?([0-9]+' + separatorClass(format) + '[0-9]*|' +
            separatorClass(format) + '[0-9]+)$');
        if (decimalPattern.test(trimmed)) {
            return inputError('decimal', TYPE_INTEGER, text);
        }
        return inputError('format', TYPE_INTEGER, text);
    }

    function parseReal(text, format) {
        var trimmed = text.trim();
        if (trimmed === '') {
            return inputError('empty', TYPE_REAL, text);
        }
        var separators = separatorClass(format);
        var realPattern = new RegExp('^[+-]?([0-9]+(' + separators + '[0-9]*)?|' + separators + '[0-9]+)$');
        if (!realPattern.test(trimmed)) {
            return inputError('format', TYPE_REAL, text);
        }
        var normalized = trimmed.replace(new RegExp(separators), '.');
        var value = Number(normalized);
        if (!isFinite(value)) {
            return inputError('range', TYPE_REAL, text);
        }
        // Un valore troppo piccolo per un double diventa 0, senza errore.
        return inputValue(normalizeZero(value));
    }

    function parseBoolean(text) {
        var trimmed = text.trim();
        if (trimmed === '') {
            return inputError('empty', TYPE_BOOLEAN, text);
        }
        var lower = trimmed.toLowerCase();
        if (lower === 'true') {
            return inputValue(true);
        }
        if (lower === 'false') {
            return inputValue(false);
        }
        return inputError('format', TYPE_BOOLEAN, text);
    }

    /*
     * Converte il testo digitato nella console nel tipo atteso (§6.11).
     * Restituisce { ok: true, value } oppure { ok: false, error: { code, params } }:
     * l'interprete aggiunge all'errore il blocco coinvolto.
     */
    function parseInput(text, type, format) {
        switch (type) {
            case TYPE_INTEGER:
                return parseInteger(text, format);
            case TYPE_REAL:
                return parseReal(text, format);
            case TYPE_BOOLEAN:
                return parseBoolean(text);
            case TYPE_STRING:
                return inputValue(text); // conservata esattamente, spazi compresi
            default:
                throw new TypeError('NumberFormat.parseInput: tipo sconosciuto ' + type);
        }
    }

    OnoFlow.NumberFormat = {
        INTEGER_MIN: INTEGER_MIN,
        INTEGER_MAX: INTEGER_MAX,
        MAX_FIXED_DECIMALS: MAX_FIXED_DECIMALS,
        normalizeZero: normalizeZero,
        formatInteger: formatInteger,
        formatReal: formatReal,
        formatFixed: formatFixed,
        formatValue: formatValue,
        formatRealFull: formatRealFull,
        parseInput: parseInput
    };
})(window.OnoFlow);
