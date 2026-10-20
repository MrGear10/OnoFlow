/*
 * OnoFlow — funzioni di comodo per i test: costruzione rapida di programmi.
 *
 * Dipendenze: js/core/model.js.
 * Definisce: window.OnoFlowTestHelpers
 *
 * Esempio:
 *     var H = OnoFlowTestHelpers;
 *     var program = H.program([H.declare('x', 'Integer'), H.assign('x', '7 / 2')]);
 */
(function () {
    'use strict';

    var Model = window.OnoFlow.Model;

    function block(kind, values) {
        return Model.createBlock(kind, values);
    }

    var H = {
        declare: function (names, type, size) {
            return size === undefined
                ? block('declare', { names: names, type: type })
                : block('declare', { names: names, type: type, array: true, size: size });
        },
        assign: function (target, expression) {
            return block('assign', { variable: target, expression: expression });
        },
        input: function (target) {
            return block('input', { variable: target });
        },
        output: function (expression, newline) {
            return block('output', { expression: expression, newline: newline !== false });
        },
        when: function (condition, thenBlocks, elseBlocks) {
            return block('if', { expression: condition, then: thenBlocks || [], 'else': elseBlocks || [] });
        },
        loop: function (condition, body) {
            return block('while', { expression: condition, body: body || [] });
        },
        repeat: function (body, condition) {
            return block('do', { expression: condition, body: body || [] });
        },
        forLoop: function (variable, start, end, body, direction, step) {
            return block('for', {
                variable: variable, start: start, end: end, body: body || [],
                direction: direction || 'inc', step: step || '1'
            });
        },
        call: function (expression) {
            return block('call', { expression: expression });
        },
        comment: function (text) {
            return block('comment', { text: text });
        },
        /* Funzione utente: H.fn('Somma', 'Integer', 'r', [['a', 'Integer'], ['v', 'Real', true]], corpo). */
        fn: function (name, type, variable, parameters, body) {
            return Model.createFunction({
                name: name, type: type, variable: variable || '',
                parameters: (parameters || []).map(function (entry) {
                    return { name: entry[0], type: entry[1], array: Boolean(entry[2]) };
                }),
                body: body || []
            });
        },
        /* Programma con Main = body e altre funzioni facoltative. */
        program: function (body, otherFunctions) {
            return Model.createProgram({
                functions: [Model.createFunction({ name: 'Main', body: body })].concat(otherFunctions || [])
            });
        }
    };

    window.OnoFlowTestHelpers = H;
})();
