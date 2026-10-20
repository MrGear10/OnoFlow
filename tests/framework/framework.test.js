/*
 * OnoFlow — test del mini-framework di test (QA-02).
 *
 * Dipendenze: tests/framework/assert.js, tests/framework/runner.js.
 *
 * Verificano soprattutto che le asserzioni FALLISCANO quando devono: un framework che
 * non fallisce mai darebbe sempre "tutto superato". Il comportamento del runner
 * (fallimenti, eccezioni, tempo scaduto, filtro) si verifica su runner creati in memoria.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;

    /* Esegue un'asserzione su un oggetto nuovo e restituisce l'errore lanciato, o null. */
    function failureOf(useAssert) {
        var assert = T.createAssert();
        try {
            useAssert(assert);
        } catch (error) {
            return error;
        }
        return null;
    }

    function assertFails(assert, useAssert, label) {
        var error = failureOf(useAssert);
        assert.isTrue(error instanceof T.AssertionError, label + ': doveva fallire con AssertionError');
        return error;
    }

    function assertPasses(assert, useAssert, label) {
        var error = failureOf(useAssert);
        assert.equal(error, null, label + ': non doveva fallire');
    }

    /* Crea un runner in memoria con una sola suite, lo esegue e restituisce i risultati. */
    function runIsolated(defineTests, options) {
        var runner = T.createRunner();
        runner.suite('isolata', function () {
            defineTests(runner.test);
        });
        return runner.run(options);
    }

    T.suite('Framework › equal', function () {
        T.test('valori identici passano', function (assert) {
            assertPasses(assert, function (a) { a.equal(3, 3); }, '3 e 3');
            assertPasses(assert, function (a) { a.equal('ciao', 'ciao'); }, 'stringhe uguali');
            assertPasses(assert, function (a) { a.equal(null, null); }, 'null');
        });

        T.test('valori diversi falliscono', function (assert) {
            assertFails(assert, function (a) { a.equal(3, 4); }, '3 e 4');
            assertFails(assert, function (a) { a.equal('3', 3); }, 'stringa e numero');
            assertFails(assert, function (a) { a.equal(null, undefined); }, 'null e undefined');
        });

        T.test('0 e -0 sono diversi (Object.is)', function (assert) {
            assertFails(assert, function (a) { a.equal(-0, 0); }, '-0 e 0');
            assertFails(assert, function (a) { a.equal(0, -0); }, '0 e -0');
            assertPasses(assert, function (a) { a.equal(-0, -0); }, '-0 e -0');
        });

        T.test('NaN è uguale a NaN', function (assert) {
            assertPasses(assert, function (a) { a.equal(NaN, NaN); }, 'NaN');
        });

        T.test('oggetti uguali ma distinti sono diversi per equal', function (assert) {
            assertFails(assert, function (a) { a.equal({ x: 1 }, { x: 1 }); }, 'due oggetti');
        });

        T.test('il messaggio mostra atteso, ottenuto e -0', function (assert) {
            var error = assertFails(assert, function (a) { a.equal(-0, 0, 'segno'); }, '-0');
            assert.equal(error.message, 'segno — atteso 0, ottenuto -0');
        });
    });

    T.suite('Framework › notEqual, isTrue, isFalse, fail', function () {
        T.test('notEqual', function (assert) {
            assertPasses(assert, function (a) { a.notEqual(1, 2); }, '1 e 2');
            assertPasses(assert, function (a) { a.notEqual(0, -0); }, '0 e -0');
            assertFails(assert, function (a) { a.notEqual(1, 1); }, '1 e 1');
        });

        T.test('isTrue accetta solo true', function (assert) {
            assertPasses(assert, function (a) { a.isTrue(true); }, 'true');
            assertFails(assert, function (a) { a.isTrue(1); }, '1 non è true');
            assertFails(assert, function (a) { a.isTrue('true'); }, '"true" non è true');
            assertFails(assert, function (a) { a.isTrue(false); }, 'false');
        });

        T.test('isFalse accetta solo false', function (assert) {
            assertPasses(assert, function (a) { a.isFalse(false); }, 'false');
            assertFails(assert, function (a) { a.isFalse(0); }, '0 non è false');
            assertFails(assert, function (a) { a.isFalse(null); }, 'null non è false');
        });

        T.test('fail fallisce sempre', function (assert) {
            var error = assertFails(assert, function (a) { a.fail('motivo'); }, 'fail');
            assert.equal(error.message, 'motivo');
        });
    });

    T.suite('Framework › deepEqual', function () {
        T.test('strutture uguali passano', function (assert) {
            assertPasses(assert, function (a) {
                a.deepEqual({ code: 'ERR_X', params: { index: 5, list: [1, 2, { b: true }] } },
                    { params: { list: [1, 2, { b: true }], index: 5 }, code: 'ERR_X' });
            }, 'oggetti annidati, chiavi in ordine diverso');
            assertPasses(assert, function (a) { a.deepEqual([], []); }, 'array vuoti');
            assertPasses(assert, function (a) { a.deepEqual([NaN], [NaN]); }, 'NaN');
        });

        T.test('-0 dentro una struttura è diverso da 0', function (assert) {
            var error = assertFails(assert, function (a) { a.deepEqual({ v: [0] }, { v: [-0] }); }, '[0] e [-0]');
            assert.isTrue(error.message.indexOf('$.v[0]') !== -1, 'il messaggio indica il percorso');
        });

        T.test('valori, lunghezze e chiavi diverse falliscono', function (assert) {
            assertFails(assert, function (a) { a.deepEqual({ a: 1 }, { a: 2 }); }, 'valore diverso');
            assertFails(assert, function (a) { a.deepEqual([1, 2], [1, 2, 3]); }, 'lunghezza');
            assertFails(assert, function (a) { a.deepEqual({ a: 1 }, { a: 1, b: 2 }); }, 'chiave mancante');
            assertFails(assert, function (a) { a.deepEqual({ a: 1, b: 2 }, { a: 1 }); }, 'chiave in più');
            assertFails(assert, function (a) { a.deepEqual({ a: undefined }, {}); }, 'chiave undefined in più');
            assertFails(assert, function (a) { a.deepEqual('1', 1); }, 'stringa e numero');
        });

        T.test('array e oggetto con le stesse chiavi sono diversi', function (assert) {
            assertFails(assert, function (a) { a.deepEqual(['x'], { 0: 'x' }); }, 'array e oggetto');
            assertFails(assert, function (a) { a.deepEqual({ 0: 'x' }, ['x']); }, 'oggetto e array');
        });

        T.test('oggetti con prototipi diversi sono diversi', function (assert) {
            function Point() { this.x = 1; }
            assertFails(assert, function (a) { a.deepEqual(new Point(), { x: 1 }); }, 'classe e oggetto');
        });

        T.test('Map, Set e Date si confrontano per contenuto', function (assert) {
            assertPasses(assert, function (a) { a.deepEqual(new Map([['a', 1]]), new Map([['a', 1]])); }, 'Map uguali');
            assertFails(assert, function (a) { a.deepEqual(new Map([['a', 1]]), new Map([['a', 2]])); }, 'Map diverse');
            assertFails(assert, function (a) { a.deepEqual(new Set([1]), new Set([2])); }, 'Set diversi');
            assertFails(assert, function (a) { a.deepEqual(new Date(0), new Date(1)); }, 'Date diverse');
        });

        T.test('i riferimenti circolari non bloccano il confronto', function (assert) {
            var first = { name: 'a' };
            first.self = first;
            var second = { name: 'a' };
            second.self = second;
            assertPasses(assert, function (a) { a.deepEqual(first, second); }, 'cicli uguali');
            var third = { name: 'b' };
            third.self = third;
            assertFails(assert, function (a) { a.deepEqual(first, third); }, 'cicli diversi');
        });
    });

    T.suite('Framework › throws e rejects', function () {
        T.test('throws fallisce se non viene lanciato nulla', function (assert) {
            assertFails(assert, function (a) { a.throws(function () {}); }, 'nessuna eccezione');
        });

        T.test('throws restituisce il valore lanciato', function (assert) {
            var thrown = T.createAssert().throws(function () { throw new RangeError('fuori'); });
            assert.isTrue(thrown instanceof RangeError);
            assert.equal(thrown.message, 'fuori');
        });

        T.test('throws controlla il tipo di errore', function (assert) {
            assertPasses(assert, function (a) {
                a.throws(function () { throw new TypeError('x'); }, TypeError);
            }, 'TypeError atteso');
            assertFails(assert, function (a) {
                a.throws(function () { throw new Error('x'); }, TypeError);
            }, 'Error al posto di TypeError');
        });

        T.test('throws confronta i campi di un errore-oggetto', function (assert) {
            function throwDivision() {
                throw { code: 'ERR_DIVISION_BY_ZERO', params: {}, nodeId: 'n7' };
            }
            assertPasses(assert, function (a) {
                a.throws(throwDivision, { code: 'ERR_DIVISION_BY_ZERO' });
            }, 'codice uguale');
            assertFails(assert, function (a) {
                a.throws(throwDivision, { code: 'ERR_INTEGER_OVERFLOW' });
            }, 'codice diverso');
            assertFails(assert, function (a) {
                a.throws(function () { throw 'testo'; }, { code: 'ERR_X' });
            }, 'lanciata una stringa');
        });

        T.test('throws con un predicato', function (assert) {
            assertPasses(assert, function (a) {
                a.throws(function () { throw 42; }, function (value) { return value === 42; });
            }, 'predicato vero');
            assertFails(assert, function (a) {
                a.throws(function () { throw 41; }, function (value) { return value === 42; });
            }, 'predicato falso');
        });

        T.test('rejects passa con una promessa rifiutata', function (assert) {
            return assert.rejects(Promise.reject({ code: 'ERR_STOPPED' }), { code: 'ERR_STOPPED' });
        });

        T.test('rejects fallisce con una promessa risolta', function (assert) {
            return T.createAssert().rejects(Promise.resolve(1)).then(function () {
                assert.fail('doveva fallire');
            }, function (error) {
                assert.isTrue(error instanceof T.AssertionError);
            });
        });

        T.test('rejects fallisce se il rifiuto non corrisponde', function (assert) {
            return T.createAssert().rejects(Promise.reject({ code: 'A' }), { code: 'B' }).then(function () {
                assert.fail('doveva fallire');
            }, function (error) {
                assert.isTrue(error instanceof T.AssertionError);
            });
        });
    });

    T.suite('Framework › formatValue', function () {
        T.test('distingue i valori che si confondono', function (assert) {
            assert.equal(T.formatValue(-0), '-0');
            assert.equal(T.formatValue(0), '0');
            assert.equal(T.formatValue('5'), '"5"');
            assert.equal(T.formatValue(5), '5');
            assert.equal(T.formatValue(5n), '5n');
            assert.equal(T.formatValue(undefined), 'undefined');
            assert.equal(T.formatValue(null), 'null');
        });

        T.test('rappresenta strutture annidate', function (assert) {
            assert.equal(T.formatValue({ a: [1, -0], b: 'x' }), '{a: [1, -0], b: "x"}');
        });
    });

    T.suite('Framework › runner', function () {
        T.test('conta superati e falliti', function (assert) {
            return runIsolated(function (test) {
                test('passa', function (a) { a.equal(1, 1); });
                test('fallisce', function (a) { a.equal(1, 2); });
            }).then(function (results) {
                assert.equal(results.passed, 1);
                assert.equal(results.failed, 1);
                assert.equal(results.tests[1].status, 'failed');
                assert.isTrue(results.tests[1].error instanceof T.AssertionError);
            });
        });

        T.test('un\'eccezione qualunque fa fallire il test', function (assert) {
            return runIsolated(function (test) {
                test('lancia', function () { throw new TypeError('rotto'); });
            }).then(function (results) {
                assert.equal(results.failed, 1);
                assert.isTrue(results.tests[0].error instanceof TypeError);
            });
        });

        T.test('un test senza asserzioni fallisce', function (assert) {
            return runIsolated(function (test) {
                test('vuoto', function () {});
            }).then(function (results) {
                assert.equal(results.failed, 1);
            });
        });

        T.test('una promessa dimenticata non salva il test', function (assert) {
            // L'asserzione arriva dopo la fine del test: il test risulta senza asserzioni.
            return runIsolated(function (test) {
                test('dimentica il return', function (a) {
                    Promise.resolve().then(function () { a.equal(1, 1); });
                });
            }).then(function (results) {
                assert.equal(results.failed, 1);
            });
        });

        T.test('un test asincrono che non termina scade', function (assert) {
            return runIsolated(function (test) {
                test('non termina', function () {
                    return new Promise(function () {});
                }, { timeout: 30 });
            }).then(function (results) {
                assert.equal(results.failed, 1);
                assert.isTrue(results.tests[0].error.message.indexOf('tempo scaduto') === 0);
            });
        });

        T.test('un test asincrono rifiutato fallisce, anche senza motivo', function (assert) {
            return runIsolated(function (test) {
                test('rifiutato', function () { return Promise.reject(new Error('no')); });
                test('senza motivo', function () { return Promise.reject(); });
            }).then(function (results) {
                assert.equal(results.failed, 2);
                assert.isTrue(results.tests[1].error instanceof Error);
            });
        });

        T.test('un test asincrono riuscito passa', function (assert) {
            return runIsolated(function (test) {
                test('attende', function (a) {
                    return new Promise(function (resolve) { setTimeout(resolve, 5); }).then(function () {
                        a.equal(2, 2);
                    });
                });
            }).then(function (results) {
                assert.equal(results.passed, 1);
                assert.equal(results.failed, 0);
            });
        });

        T.test('il filtro salta i test che non corrispondono', function (assert) {
            return runIsolated(function (test) {
                test('alfa', function (a) { a.equal(1, 1); });
                test('beta', function (a) { a.equal(1, 2); });
            }, { filter: 'ALFA' }).then(function (results) {
                assert.equal(results.passed, 1);
                assert.equal(results.failed, 0);
                assert.equal(results.skipped, 1);
                assert.equal(results.tests[1].status, 'skipped');
            });
        });

        T.test('il filtro considera "suite › test"', function (assert) {
            assert.isTrue(T.matchesFilter('isolata › al', 'Isolata', 'alfa'));
            assert.isFalse(T.matchesFilter('beta', 'Isolata', 'alfa'));
            assert.isTrue(T.matchesFilter('', 'Isolata', 'alfa'));
        });

        T.test('un errore mentre si definisce una suite viene registrato', function (assert) {
            var runner = T.createRunner();
            runner.suite('rotta', function () {
                runner.test('prima', function (a) { a.equal(1, 1); });
                throw new Error('errore nella definizione');
            });
            return runner.run().then(function (results) {
                assert.equal(results.suiteErrors.length, 1);
                assert.equal(results.suiteErrors[0].suite, 'rotta');
                assert.equal(results.passed, 1);
            });
        });

        T.test('test() fuori da suite() è un errore', function (assert) {
            var runner = T.createRunner();
            assert.throws(function () {
                runner.test('orfano', function () {});
            }, Error);
        });

        T.test('i test vengono eseguiti in ordine, uno alla volta', function (assert) {
            var order = [];
            return runIsolated(function (test) {
                test('primo, lento', function (a) {
                    return new Promise(function (resolve) { setTimeout(resolve, 10); }).then(function () {
                        order.push(1);
                        a.equal(1, 1);
                    });
                });
                test('secondo', function (a) {
                    order.push(2);
                    a.equal(1, 1);
                });
            }).then(function () {
                assert.deepEqual(order, [1, 2]);
            });
        });
    });
})();
