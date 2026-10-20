/*
 * OnoFlow — valori durante l'esecuzione ed errori di runtime.
 *
 * Dipendenze: js/namespace.js, js/core/number-format.js.
 * Definisce: OnoFlow.Values
 *
 * Un valore semplice è { type, value } con type tra Integer, Real, String, Boolean
 * (tipizzazione forte, §6.1). Gli Integer sono numeri JavaScript interi a 32 bit;
 * -0 non esiste mai (L-04). Un array è
 *     { type, array: true, elements: [...] }
 * con elementi grezzi (non tipizzati) oppure undefined se non inizializzati (§6.6).
 *
 * Gli errori di runtime si lanciano come RuntimeFailure(code, params); l'interprete
 * aggiunge il blocco coinvolto e la fotografia delle variabili (§8.2).
 */
(function (OnoFlow) {
    'use strict';

    var NumberFormat = OnoFlow.NumberFormat;
    if (!NumberFormat) {
        throw new Error('values.js richiede number-format.js, da caricare prima');
    }

    var INTEGER_MIN = NumberFormat.INTEGER_MIN;
    var INTEGER_MAX = NumberFormat.INTEGER_MAX;

    function RuntimeFailure(code, params) {
        this.code = code;
        this.params = params || {};
        this.nodeId = null;
        this.variables = null;
        this.functionName = null;
    }

    function fail(code, params) {
        throw new RuntimeFailure(code, params);
    }

    /* Integer con controllo dell'intervallo: fuori dai 32 bit è un errore (§6.4). */
    function integer(value) {
        if (value < INTEGER_MIN || value > INTEGER_MAX) {
            fail('ERR_INTEGER_OVERFLOW', {});
        }
        return { type: 'Integer', value: NumberFormat.normalizeZero(value) };
    }

    /* Real finito: Infinity e NaN sono errori di runtime (§6.4). */
    function real(value) {
        if (!isFinite(value)) {
            fail('ERR_REAL_NOT_FINITE', {});
        }
        return { type: 'Real', value: NumberFormat.normalizeZero(value) };
    }

    function string(value) {
        return { type: 'String', value: value };
    }

    function boolean(value) {
        return { type: 'Boolean', value: value };
    }

    function isNumeric(type) {
        return type === 'Integer' || type === 'Real';
    }

    /* Valore grezzo con il suo tipo dichiarato, es. un elemento di array. */
    function typed(type, raw) {
        return { type: type, value: raw };
    }

    /*
     * Adatta un valore al tipo di destinazione (assegnazioni, input, argomenti, ritorno):
     * stesso tipo, oppure Integer → Real (§6.1). Restituisce null se non compatibile.
     */
    function convertTo(value, targetType) {
        if (value.type === targetType) {
            return value;
        }
        if (value.type === 'Integer' && targetType === 'Real') {
            return { type: 'Real', value: value.value };
        }
        return null;
    }

    /* Testo di un valore con le regole dell'output (§6.10), usato da output, & e ToString. */
    function toText(value, numberFormat) {
        return NumberFormat.formatValue(value.type, value.value, numberFormat);
    }

    OnoFlow.Values = {
        INTEGER_MIN: INTEGER_MIN,
        INTEGER_MAX: INTEGER_MAX,
        RuntimeFailure: RuntimeFailure,
        fail: fail,
        integer: integer,
        real: real,
        string: string,
        boolean: boolean,
        typed: typed,
        isNumeric: isNumeric,
        convertTo: convertTo,
        toText: toText
    };
})(window.OnoFlow);
