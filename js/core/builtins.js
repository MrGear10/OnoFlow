/*
 * OnoFlow — funzioni predefinite (§6.9).
 *
 * Dipendenze: js/namespace.js, js/core/number-format.js, js/core/values.js.
 * Definisce: OnoFlow.Builtins.{NAMES, get}
 *
 * Ogni funzione ha:
 *     params: tipi accettati per ogni argomento
 *         'number'  Integer o Real, il risultato dipende dal tipo
 *         'real'    Real, accetta anche Integer (conversione implicita, §6.1)
 *         'integer' solo Integer
 *         'string'  solo String
 *         'simple'  qualunque valore semplice
 *         'array'   il nome di un array, senza indice (§6.6)
 *     call(args, context): restituisce il valore; context = { numberFormat, random }.
 * Il controllo di numero e tipo degli argomenti lo fa l'interprete prima di chiamare.
 * Elenco e firme vanno ancora verificati con Flowgorithm (Q-09). Pow non esiste: si usa ^.
 */
(function (OnoFlow) {
    'use strict';

    var Values = OnoFlow.Values;
    var NumberFormat = OnoFlow.NumberFormat;
    if (!Values) {
        throw new Error('builtins.js richiede values.js, da caricare prima');
    }

    var fail = Values.fail;

    function argumentError(name, reason, params) {
        var all = { name: name, reason: reason };
        Object.keys(params || {}).forEach(function (key) { all[key] = params[key]; });
        fail('ERR_BUILTIN_ARGUMENT', all);
    }

    /* Funzione Real → Real: Sin, Sqrt, Log... Argomento non valido → Real non finito (§6.9). */
    function realFunction(compute) {
        return {
            params: ['real'],
            call: function (args) {
                return Values.real(compute(args[0].value));
            }
        };
    }

    /* Conversione da testo con le regole dell'input da console (§6.11). */
    function conversion(name, type) {
        return {
            params: ['string'],
            call: function (args, context) {
                var result = NumberFormat.parseInput(args[0].value, type, context.numberFormat);
                if (!result.ok) {
                    fail('ERR_CONVERSION_FAILED', {
                        name: name, reason: result.error.params.reason, type: type, text: args[0].value
                    });
                }
                return type === 'Integer' ? Values.integer(result.value) : Values.real(result.value);
            }
        };
    }

    var DEFINITIONS = {
        Abs: {
            params: ['number'],
            call: function (args) {
                var value = args[0];
                // Abs(-2147483648) non sta negli Integer: Values.integer lo segnala.
                return value.type === 'Integer' ? Values.integer(Math.abs(value.value)) : Values.real(Math.abs(value.value));
            }
        },
        Arccos: realFunction(Math.acos),
        Arcsin: realFunction(Math.asin),
        Arctan: realFunction(Math.atan),
        Cos: realFunction(Math.cos),
        Sin: realFunction(Math.sin),
        Tan: realFunction(Math.tan),
        Sqrt: realFunction(Math.sqrt),
        Log: realFunction(Math.log),
        Log10: realFunction(Math.log10),
        Int: {
            params: ['number'],
            call: function (args) {
                // Troncamento verso zero: Int(-2.7) → -2.
                return Values.integer(Math.trunc(args[0].value));
            }
        },
        Sgn: {
            params: ['number'],
            call: function (args) {
                return Values.integer(Math.sign(args[0].value));
            }
        },
        Len: {
            params: ['string'],
            call: function (args) {
                return Values.integer(args[0].value.length);
            }
        },
        Char: {
            params: ['string', 'integer'],
            call: function (args) {
                var text = args[0].value;
                var position = args[1].value;
                if (position < 0 || position >= text.length) {
                    argumentError('Char', 'position', { position: position, length: text.length });
                }
                return Values.string(text.charAt(position));
            }
        },
        Size: {
            params: ['array'],
            call: function (args) {
                return Values.integer(args[0].elements.length);
            }
        },
        Random: {
            params: ['integer'],
            call: function (args, context) {
                var limit = args[0].value;
                if (limit <= 0) {
                    argumentError('Random', 'random', { value: limit });
                }
                return Values.integer(Math.floor(context.random() * limit));
            }
        },
        ToChar: {
            params: ['integer'],
            call: function (args) {
                var code = args[0].value;
                if (code < 0 || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) {
                    argumentError('ToChar', 'charCode', { value: code });
                }
                return Values.string(String.fromCodePoint(code));
            }
        },
        ToCode: {
            params: ['string'],
            call: function (args) {
                if (args[0].value === '') {
                    argumentError('ToCode', 'empty', {});
                }
                return Values.integer(args[0].value.codePointAt(0));
            }
        },
        ToFixed: {
            params: ['real', 'integer'],
            call: function (args, context) {
                var digits = args[1].value;
                if (digits < 0 || digits > NumberFormat.MAX_FIXED_DECIMALS) {
                    argumentError('ToFixed', 'digits', { value: digits, max: NumberFormat.MAX_FIXED_DECIMALS });
                }
                return Values.string(NumberFormat.formatFixed(args[0].value, digits, context.numberFormat));
            }
        },
        ToInteger: conversion('ToInteger', 'Integer'),
        ToReal: conversion('ToReal', 'Real'),
        ToString: {
            params: ['simple'],
            call: function (args, context) {
                return Values.string(Values.toText(args[0], context.numberFormat));
            }
        }
    };

    OnoFlow.Builtins = {
        NAMES: Object.keys(DEFINITIONS),
        get: function (name) {
            return Object.prototype.hasOwnProperty.call(DEFINITIONS, name) ? DEFINITIONS[name] : null;
        }
    };
})(window.OnoFlow);
