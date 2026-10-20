/*
 * OnoFlow — mini-framework di test: asserzioni.
 *
 * Dipendenze: nessuna. Va caricato per primo in tests.html.
 * Definisce: window.OnoFlowTest.{AssertionError, createAssert, formatValue, findDifference}
 *
 * Il framework di test vive in un oggetto globale separato (OnoFlowTest) per non
 * mescolare strumenti di sviluppo e applicazione: index.html non lo carica mai.
 *
 * Regole importanti:
 *   - l'uguaglianza usa Object.is, quindi 0 e -0 sono diversi e NaN è uguale a NaN;
 *   - l'uguaglianza strutturale applica Object.is a ogni valore che confronta.
 */
(function (global) {
    'use strict';

    var OnoFlowTest = global.OnoFlowTest || (global.OnoFlowTest = {});

    /* Errore lanciato da un'asserzione fallita. */
    function AssertionError(message, details) {
        this.name = 'AssertionError';
        this.message = message;
        this.details = details || {};
        // Lo stack serve a capire quale riga del test è fallita.
        this.stack = new Error(message).stack;
    }
    AssertionError.prototype = Object.create(Error.prototype);
    AssertionError.prototype.constructor = AssertionError;

    var MAX_FORMAT_DEPTH = 4;
    var MAX_FORMAT_ITEMS = 20;

    /* Rappresenta un valore come testo leggibile, distinguendo -0, stringhe, BigInt. */
    function formatValue(value, depth) {
        depth = depth || 0;
        if (Object.is(value, -0)) {
            return '-0';
        }
        switch (typeof value) {
            case 'string':
                return JSON.stringify(value);
            case 'bigint':
                return String(value) + 'n';
            case 'undefined':
                return 'undefined';
            case 'function':
                return 'function ' + (value.name || '(anonima)');
            case 'symbol':
                return String(value);
            case 'object':
                break;
            default:
                return String(value);
        }
        if (value === null) {
            return 'null';
        }
        if (depth >= MAX_FORMAT_DEPTH) {
            return Array.isArray(value) ? '[…]' : '{…}';
        }
        if (value instanceof Error) {
            return (value.name || 'Error') + ': ' + value.message;
        }
        if (value instanceof Date) {
            return 'Date(' + value.toISOString() + ')';
        }
        if (value instanceof Map) {
            return 'Map(' + formatValue(Array.from(value.entries()), depth + 1) + ')';
        }
        if (value instanceof Set) {
            return 'Set(' + formatValue(Array.from(value.values()), depth + 1) + ')';
        }
        if (Array.isArray(value)) {
            var items = value.slice(0, MAX_FORMAT_ITEMS).map(function (item) {
                return formatValue(item, depth + 1);
            });
            if (value.length > MAX_FORMAT_ITEMS) {
                items.push('… altri ' + (value.length - MAX_FORMAT_ITEMS));
            }
            return '[' + items.join(', ') + ']';
        }
        var keys = Object.keys(value);
        var parts = keys.slice(0, MAX_FORMAT_ITEMS).map(function (key) {
            return key + ': ' + formatValue(value[key], depth + 1);
        });
        if (keys.length > MAX_FORMAT_ITEMS) {
            parts.push('… altre ' + (keys.length - MAX_FORMAT_ITEMS) + ' chiavi');
        }
        return '{' + parts.join(', ') + '}';
    }

    function describeKind(value) {
        if (value === null) {
            return 'null';
        }
        if (Array.isArray(value)) {
            return 'array';
        }
        return typeof value;
    }

    /*
     * Cerca la prima differenza tra due valori, confrontandoli in profondità.
     * Restituisce null se sono uguali, altrimenti { path, actual, expected, reason }.
     * Gestisce array, oggetti semplici, Map, Set, Date e riferimenti circolari.
     */
    function findDifference(actual, expected, path, seen) {
        path = path || '$';
        seen = seen || [];

        if (Object.is(actual, expected)) {
            return null;
        }
        var bothObjects = typeof actual === 'object' && actual !== null &&
            typeof expected === 'object' && expected !== null;
        if (!bothObjects) {
            return { path: path, actual: actual, expected: expected, reason: 'valori diversi' };
        }

        // Riferimenti circolari: una coppia già in esame si considera uguale.
        for (var i = 0; i < seen.length; i++) {
            if (seen[i][0] === actual && seen[i][1] === expected) {
                return null;
            }
        }
        seen = seen.concat([[actual, expected]]);

        if (Array.isArray(actual) !== Array.isArray(expected) ||
            Object.getPrototypeOf(actual) !== Object.getPrototypeOf(expected)) {
            return {
                path: path, actual: actual, expected: expected,
                reason: 'tipi diversi (' + describeKind(actual) + ' / ' + describeKind(expected) + ')'
            };
        }

        if (actual instanceof Date) {
            return findDifference(actual.getTime(), expected.getTime(), path + '.getTime()', seen);
        }
        if (actual instanceof Map || actual instanceof Set) {
            return findDifference(Array.from(actual.entries()), Array.from(expected.entries()),
                path + '.entries()', seen);
        }

        if (Array.isArray(actual)) {
            if (actual.length !== expected.length) {
                return {
                    path: path + '.length', actual: actual.length, expected: expected.length,
                    reason: 'lunghezze diverse'
                };
            }
            for (var index = 0; index < actual.length; index++) {
                var itemDifference = findDifference(actual[index], expected[index], path + '[' + index + ']', seen);
                if (itemDifference) {
                    return itemDifference;
                }
            }
            return null;
        }

        var actualKeys = Object.keys(actual).sort();
        var expectedKeys = Object.keys(expected).sort();
        for (var k = 0; k < expectedKeys.length; k++) {
            if (!Object.prototype.hasOwnProperty.call(actual, expectedKeys[k])) {
                return {
                    path: path + '.' + expectedKeys[k], actual: undefined, expected: expected[expectedKeys[k]],
                    reason: 'chiave mancante'
                };
            }
        }
        for (var j = 0; j < actualKeys.length; j++) {
            if (!Object.prototype.hasOwnProperty.call(expected, actualKeys[j])) {
                return {
                    path: path + '.' + actualKeys[j], actual: actual[actualKeys[j]], expected: undefined,
                    reason: 'chiave in più'
                };
            }
        }
        for (var n = 0; n < expectedKeys.length; n++) {
            var key = expectedKeys[n];
            var valueDifference = findDifference(actual[key], expected[key], path + '.' + key, seen);
            if (valueDifference) {
                return valueDifference;
            }
        }
        return null;
    }

    function withMessage(prefix, message) {
        return message ? message + ' — ' + prefix : prefix;
    }

    function isErrorConstructor(candidate) {
        return candidate === Error || (candidate.prototype instanceof Error);
    }

    /*
     * Verifica che il valore lanciato corrisponda a quanto atteso.
     * expected può essere:
     *   - undefined: va bene qualunque eccezione;
     *   - un costruttore di errore (Error, TypeError, ...): controllo con instanceof;
     *   - una funzione: predicato che deve restituire true;
     *   - un oggetto: ogni sua chiave deve essere uguale (in profondità) a quella lanciata,
     *     es. { code: 'ERR_DIVISION_BY_ZERO' }.
     * Restituisce null se corrisponde, altrimenti la spiegazione.
     */
    function checkThrown(thrown, expected) {
        if (expected === undefined) {
            return null;
        }
        if (typeof expected === 'function') {
            if (isErrorConstructor(expected)) {
                return thrown instanceof expected
                    ? null
                    : 'atteso un ' + (expected.name || 'errore') + ', lanciato ' + formatValue(thrown);
            }
            return expected(thrown) === true
                ? null
                : 'il controllo sull\'eccezione non è soddisfatto; lanciato ' + formatValue(thrown);
        }
        if (typeof expected === 'object' && expected !== null) {
            if (typeof thrown !== 'object' || thrown === null) {
                return 'atteso un oggetto, lanciato ' + formatValue(thrown);
            }
            var keys = Object.keys(expected);
            for (var i = 0; i < keys.length; i++) {
                var difference = findDifference(thrown[keys[i]], expected[keys[i]], '.' + keys[i]);
                if (difference) {
                    return 'eccezione diversa in ' + difference.path + ': atteso ' +
                        formatValue(difference.expected) + ', ottenuto ' + formatValue(difference.actual) +
                        '; lanciato ' + formatValue(thrown);
                }
            }
            return null;
        }
        throw new TypeError('assert.throws: secondo argomento non valido');
    }

    /*
     * Crea un oggetto di asserzioni che conta quante ne vengono eseguite:
     * il runner considera fallito un test che non ne esegue nessuna.
     */
    function createAssert() {
        var assert = { count: 0 };

        function fail(message, details) {
            throw new AssertionError(message, details);
        }

        assert.fail = function (message) {
            assert.count++;
            fail(message || 'fallimento esplicito');
        };

        assert.equal = function (actual, expected, message) {
            assert.count++;
            if (!Object.is(actual, expected)) {
                fail(withMessage('atteso ' + formatValue(expected) + ', ottenuto ' + formatValue(actual), message),
                    { actual: actual, expected: expected });
            }
        };

        assert.notEqual = function (actual, unexpected, message) {
            assert.count++;
            if (Object.is(actual, unexpected)) {
                fail(withMessage('il valore non doveva essere ' + formatValue(unexpected), message),
                    { actual: actual });
            }
        };

        assert.isTrue = function (value, message) {
            assert.count++;
            if (value !== true) {
                fail(withMessage('atteso true, ottenuto ' + formatValue(value), message), { actual: value });
            }
        };

        assert.isFalse = function (value, message) {
            assert.count++;
            if (value !== false) {
                fail(withMessage('atteso false, ottenuto ' + formatValue(value), message), { actual: value });
            }
        };

        assert.deepEqual = function (actual, expected, message) {
            assert.count++;
            var difference = findDifference(actual, expected);
            if (difference) {
                fail(withMessage('differenza in ' + difference.path + ' (' + difference.reason + '): atteso ' +
                    formatValue(difference.expected) + ', ottenuto ' + formatValue(difference.actual), message),
                    difference);
            }
        };

        assert.throws = function (action, expected, message) {
            assert.count++;
            var thrown;
            var didThrow = false;
            try {
                action();
            } catch (error) {
                didThrow = true;
                thrown = error;
            }
            if (!didThrow) {
                fail(withMessage('attesa un\'eccezione, non è stata lanciata', message));
            }
            var problem = checkThrown(thrown, expected);
            if (problem) {
                fail(withMessage(problem, message), { actual: thrown });
            }
            return thrown;
        };

        /* Versione asincrona di throws: accetta una promessa o una funzione che la restituisce. */
        assert.rejects = function (promiseOrAction, expected, message) {
            assert.count++;
            var promise;
            try {
                promise = typeof promiseOrAction === 'function' ? promiseOrAction() : promiseOrAction;
            } catch (error) {
                promise = Promise.reject(error);
            }
            return Promise.resolve(promise).then(function () {
                fail(withMessage('attesa una promessa rifiutata, è stata risolta', message));
            }, function (thrown) {
                var problem = checkThrown(thrown, expected);
                if (problem) {
                    fail(withMessage(problem, message), { actual: thrown });
                }
                return thrown;
            });
        };

        return assert;
    }

    OnoFlowTest.AssertionError = AssertionError;
    OnoFlowTest.createAssert = createAssert;
    OnoFlowTest.formatValue = formatValue;
    OnoFlowTest.findDifference = findDifference;
})(window);
