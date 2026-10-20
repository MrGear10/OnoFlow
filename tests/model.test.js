/*
 * OnoFlow — test del modello del programma (§10.2, §10.3, FR-VIEW-02).
 *
 * Dipendenze: tests/framework/*, js/core/expression-*.js, js/core/model.js.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var Model = window.OnoFlow.Model;

    function block(kind, values) {
        return Model.createBlock(kind, values);
    }

    /* Il programma dell'Appendice A costruito con il modello (servirà anche per QA-11). */
    function appendixProgram() {
        var body = [
            block('declare', { names: 'n, max, min, dim, i', type: 'Integer' }),
            block('declare', { names: 'risultato', type: 'Integer' }),
            block('declare', { names: 'risposta', type: 'String' }),
            block('assign', { variable: 'dim', expression: '0' }),
            block('assign', { variable: 'risultato', expression: '0' }),
            block('do', {
                expression: 'risposta == "s"',
                body: [
                    block('output', { expression: '"Quale numero vuoi sommare?"' }),
                    block('input', { variable: 'n' }),
                    block('assign', { variable: 'dim', expression: 'dim + 1' }),
                    block('assign', { variable: 'risultato', expression: 'risultato + n' }),
                    block('output', { expression: '"Vuoi continuare? s/n"' }),
                    block('input', { variable: 'risposta' })
                ]
            }),
            block('declare', { names: 'numeri', type: 'Integer', array: true, size: 'dim' }),
            block('for', {
                variable: 'i', start: '0', end: 'dim -1', direction: 'inc', step: '1',
                body: [
                    block('output', { expression: '"Inserisci un numero"' }),
                    block('input', { variable: 'n' }),
                    block('assign', { variable: 'numeri[i]', expression: 'n' })
                ]
            }),
            block('assign', { variable: 'i', expression: '0' }),
            block('assign', { variable: 'max', expression: 'numeri[0]' }),
            block('assign', { variable: 'min', expression: 'numeri[0]' }),
            block('while', {
                expression: 'i<dim',
                body: [
                    block('if', { expression: 'max < numeri[i]', then: [block('assign', { variable: 'max', expression: 'numeri[i]' })] }),
                    block('if', { expression: 'min > numeri[i]', then: [block('assign', { variable: 'min', expression: 'numeri[i]' })] }),
                    block('assign', { variable: 'i', expression: 'i + 1' })
                ]
            }),
            block('output', { expression: '"Somma del primo set di numeri: " & risultato' }),
            block('output', { expression: '"Numero massimo trovato nel secondo set di numeri: " & max' }),
            block('output', { expression: '"Numero minimo trovato nel secondo set di numeri: " & min' })
        ];
        return Model.createProgram({ functions: [Model.createFunction({ name: 'Main', body: body })] });
    }

    T.suite('Modello › blocchi', function () {
        T.test('ogni tipo di blocco si crea con i valori predefiniti', function (assert) {
            Model.BLOCK_KINDS.forEach(function (kind) {
                var created = block(kind);
                assert.equal(created.kind, kind);
                assert.equal(typeof created.id, 'string', 'id di ' + kind);
            });
            var declare = block('declare');
            assert.equal(declare.type, 'Integer');
            assert.equal(declare.array, false);
            assert.equal(block('output').newline, true);
            assert.equal(block('for').direction, 'inc');
            assert.equal(block('for').fields.step.text, '1');
            assert.deepEqual(block('if').then, []);
            assert.deepEqual(block('if').else, []);
            assert.equal(block('comment').text, '');
        });

        T.test('gli ID sono tutti diversi', function (assert) {
            var ids = {};
            for (var i = 0; i < 200; i++) {
                var id = block('assign').id;
                assert.isFalse(Object.prototype.hasOwnProperty.call(ids, id), 'id ripetuto ' + id);
                ids[id] = true;
            }
        });

        T.test('il campo conserva il testo, l\'AST e l\'errore', function (assert) {
            var good = block('assign', { variable: 'x', expression: 'x <> 1' });
            assert.equal(good.fields.expression.text, 'x <> 1');
            assert.equal(good.fields.expression.ast.operator, '!=');
            assert.equal(good.fields.expression.error, null);

            var bad = block('output', { expression: 'x = 2,5' });
            assert.equal(bad.fields.expression.text, 'x = 2,5');
            assert.equal(bad.fields.expression.ast, null);
            assert.equal(bad.fields.expression.error.code, 'ERR_SYNTAX_UNEXPECTED_TOKEN');
        });

        T.test('ogni campo usa il suo tipo di analisi', function (assert) {
            var created = block('for', { variable: 'i', start: '0', end: 'n', step: '2' });
            assert.equal(created.fields.variable.kind, 'name');
            assert.equal(created.fields.step.kind, 'forStep');
            assert.equal(created.fields.step.ast.value, 2);
            assert.equal(block('declare', { names: 'a, b' }).fields.names.ast.names.length, 2);
            assert.equal(block('input', { variable: 'v[0]' }).fields.variable.ast.kind, 'index');
        });

        T.test('chiavi e valori non validi sono difetti di chi chiama', function (assert) {
            assert.throws(function () { block('ripeti'); }, TypeError);
            assert.throws(function () { block('assign', { colore: 'rosso' }); }, TypeError);
            assert.throws(function () { block('declare', { type: 'Char' }); }, TypeError);
            assert.throws(function () { block('declare', { array: 'True' }); }, TypeError);
            assert.throws(function () { block('for', { direction: 'up' }); }, TypeError);
            assert.throws(function () { Model.createFunction({ type: 'Void' }); }, TypeError);
        });

        T.test('setFieldText rianalizza e non cambia l\'ID', function (assert) {
            var created = block('assign', { variable: 'x', expression: '1 +' });
            var id = created.id;
            assert.notEqual(created.fields.expression.error, null);
            Model.setFieldText(created, 'expression', '1 + 2');
            assert.equal(created.id, id);
            assert.equal(created.fields.expression.text, '1 + 2');
            assert.equal(created.fields.expression.error, null);
            assert.throws(function () { Model.setFieldText(created, 'colore', 'x'); }, TypeError);
        });
    });

    T.suite('Modello › programma', function () {
        T.test('un programma nuovo ha solo Main, vuota (FR-FILE-07)', function (assert) {
            var program = Model.createEmptyProgram();
            assert.equal(program.functions.length, 1);
            assert.equal(program.functions[0].name, 'Main');
            assert.equal(program.functions[0].type, 'None');
            assert.deepEqual(program.functions[0].parameters, []);
            assert.deepEqual(program.functions[0].body, []);
            assert.deepEqual(Model.collectFieldErrors(program), []);
        });

        T.test('il programma dell\'Appendice A non ha errori', function (assert) {
            assert.deepEqual(Model.collectFieldErrors(appendixProgram()), []);
        });

        T.test('la visita segue l\'ordine di lettura, then prima di else', function (assert) {
            var program = Model.createProgram({
                functions: [Model.createFunction({
                    body: [
                        block('assign', { variable: 'a', expression: '1' }),
                        block('if', {
                            expression: 'a > 0',
                            then: [block('output', { expression: '"sì"' })],
                            else: [block('while', { expression: 'false', body: [block('input', { variable: 'a' })] })]
                        }),
                        block('output', { expression: 'a' })
                    ]
                })]
            });
            var visited = [];
            Model.walk(program, function (visitedBlock, context) {
                visited.push(visitedBlock.kind + ':' + context.depth);
            });
            assert.deepEqual(visited, ['assign:0', 'if:0', 'output:1', 'while:1', 'input:2', 'output:0']);
        });

        T.test('la visita si ferma quando il visitatore restituisce false', function (assert) {
            var count = 0;
            Model.walk(appendixProgram(), function () {
                count++;
                return count < 3;
            });
            assert.equal(count, 3);
        });

        T.test('findById trova funzioni e blocchi annidati con il loro contesto', function (assert) {
            var program = appendixProgram();
            var main = program.functions[0];
            var loop = main.body[11];
            var inner = loop.body[0].then[0];

            var foundFunction = Model.findById(program, main.id);
            assert.equal(foundFunction.node, main);

            var foundInner = Model.findById(program, inner.id);
            assert.equal(foundInner.node, inner);
            assert.equal(foundInner.parent, loop.body[0]);
            assert.equal(foundInner.list, loop.body[0].then);
            assert.equal(foundInner.index, 0);
            assert.equal(foundInner.function, main);

            assert.equal(Model.findById(program, 'n-inesistente'), null);
        });

        T.test('gli errori dei campi si raccolgono nell\'ordine dei blocchi', function (assert) {
            var first = block('assign', { variable: 'x + 1', expression: '2,5' });
            var nested = block('output', { expression: 'a AND b' });
            var loop = block('for', { variable: 'i[0]', start: '1', end: 'n', step: '0', body: [nested] });
            var last = block('input', { variable: '' });
            var program = Model.createProgram({ functions: [Model.createFunction({ body: [first, loop, last] })] });

            var errors = Model.collectFieldErrors(program);
            assert.deepEqual(errors.map(function (error) {
                return error.nodeId + '.' + error.field + ':' + error.code;
            }), [
                first.id + '.variable:ERR_SYNTAX_INVALID_TARGET',
                first.id + '.expression:ERR_SYNTAX_UNEXPECTED_TOKEN',
                loop.id + '.variable:ERR_INVALID_NAME',
                loop.id + '.step:ERR_FOR_STEP_INVALID',
                nested.id + '.expression:ERR_SYNTAX_UNEXPECTED_TOKEN',
                last.id + '.variable:ERR_SYNTAX_EMPTY_EXPRESSION'
            ]);
            assert.deepEqual(errors[0].position, { start: 0, end: 5, column: 1 });
        });

        T.test('la dimensione conta solo per gli array', function (assert) {
            var scalar = block('declare', { names: 'a', size: '' });
            var array = block('declare', { names: 'v', array: true, size: '' });
            var program = Model.createProgram({ functions: [Model.createFunction({ body: [scalar, array] })] });
            var errors = Model.collectFieldErrors(program);
            assert.equal(errors.length, 1);
            assert.equal(errors[0].nodeId, array.id);
            assert.equal(errors[0].field, 'size');
        });

        T.test('le funzioni conservano tipo, variabile di ritorno e parametri', function (assert) {
            var created = Model.createFunction({
                name: 'Somma', type: 'Integer', variable: 'totale',
                parameters: [{ name: 'v', type: 'Integer', array: true }, { name: 'n', type: 'Integer' }]
            });
            assert.equal(created.type, 'Integer');
            assert.equal(created.variable, 'totale');
            assert.deepEqual(created.parameters, [
                { name: 'v', type: 'Integer', array: true },
                { name: 'n', type: 'Integer', array: false }
            ]);
        });
    });
})();
