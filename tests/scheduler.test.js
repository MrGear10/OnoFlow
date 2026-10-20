/*
 * OnoFlow — test dello scheduler (FR-RUN-01…04, NFR-PERF-01, L-07).
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*.
 *
 * Quasi tutti i test usano un orologio e dei timer finti: ogni turno si esegue a mano
 * e il tempo avanza quanto si vuole, così il comportamento è deterministico.
 * L'ultimo test usa i timer veri per verificare che la pagina resti reattiva.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var Scheduler = window.OnoFlow.Scheduler;

    /* Scheduler con timer finti; registra tutto ciò che succede. */
    function fakeRun(program, extra) {
        var fake = { time: 0, queue: [], log: [], outputs: [], inputs: [], finished: null, longRuns: 0, states: [] };
        var options = {
            budget: 100,
            longRunMs: 5000,
            now: function () { return fake.time; },
            schedule: function (callback) { fake.queue.push(callback); return fake.queue.length; },
            cancel: function () { fake.queue = []; },
            onOutput: function (event) { fake.outputs.push(event.text); },
            onInput: function (event) { fake.inputs.push(event); },
            onStateChange: function (state) { fake.states.push(state); },
            onLongRun: function () { fake.longRuns++; },
            onFinish: function (outcome) { fake.finished = outcome; }
        };
        Object.keys(extra || {}).forEach(function (key) { options[key] = extra[key]; });
        fake.scheduler = Scheduler.create(program, options);
        /* Esegue il prossimo turno in coda; restituisce false se non ce n'erano. */
        fake.turn = function () {
            var callback = fake.queue.shift();
            if (!callback) {
                return false;
            }
            callback();
            return true;
        };
        return fake;
    }

    function infiniteLoop() {
        return H.program([H.declare('i', 'Integer'), H.assign('i', '0'), H.loop('true', [H.assign('i', 'i + 1')])]);
    }

    T.suite('Scheduler', function () {
        T.test('un programma breve arriva alla fine', function (assert) {
            var fake = fakeRun(H.program([H.output('"a"'), H.output('"b"', false)]));
            fake.scheduler.start();
            assert.equal(fake.scheduler.state(), 'running');
            while (fake.turn()) { /* turni fino alla fine */ }
            assert.deepEqual(fake.outputs, ['a', 'b']);
            assert.deepEqual(fake.finished, { status: 'done' });
            assert.deepEqual(fake.states, ['running', 'finished']);
        });

        T.test('al massimo "budget" passi per turno, poi si cede il controllo', function (assert) {
            var counted = [];
            var fake = fakeRun(infiniteLoop(), { onStep: function (nodeId) { counted.push(nodeId); } });
            fake.scheduler.start();
            fake.turn();
            assert.equal(fake.queue.length, 1, 'un nuovo turno è in coda');
            assert.equal(fake.finished, null);
            assert.equal(counted.length, 1);
        });

        T.test('un turno finisce anche quando supera il tempo massimo, prima del budget', function (assert) {
            var reads = 0;
            var clock = { value: 0 };
            var fake = fakeRun(infiniteLoop(), {
                budget: 1000000,
                maxTurnMs: 25,
                // Ogni lettura dell'orologio fa avanzare il tempo di 10 ms.
                now: function () { reads++; clock.value += 10; return clock.value; }
            });
            fake.scheduler.start();
            fake.turn();
            assert.equal(fake.queue.length, 1, 'il turno è finito e ne è stato messo in coda un altro');
            assert.isTrue(reads < 10, 'letture dell\'orologio: ' + reads);
        });

        T.test('dopo 5 secondi reali si mette in pausa e chiede (FR-RUN-04)', function (assert) {
            var fake = fakeRun(infiniteLoop());
            fake.scheduler.start();
            for (var i = 0; i < 4; i++) {
                fake.time += 1000;
                fake.turn();
            }
            assert.equal(fake.scheduler.state(), 'running');
            assert.equal(fake.longRuns, 0);
            fake.time += 1000;
            fake.turn();
            assert.equal(fake.scheduler.state(), 'paused');
            assert.equal(fake.longRuns, 1);
            assert.equal(fake.queue.length, 0, 'nessun turno in coda durante la pausa');
        });

        T.test('il conteggio riparte a ogni ripresa', function (assert) {
            var fake = fakeRun(infiniteLoop());
            fake.scheduler.start();
            fake.time = 5000;
            fake.turn();
            assert.equal(fake.scheduler.state(), 'paused');
            fake.scheduler.resume();
            fake.time = 9000;
            fake.turn();
            assert.equal(fake.scheduler.state(), 'running');
            fake.time = 10000;
            fake.turn();
            assert.equal(fake.scheduler.state(), 'paused');
            assert.equal(fake.longRuns, 2);
        });

        T.test('il conteggio riparte dopo un input; l\'attesa non conta', function (assert) {
            var program = H.program([
                H.declare('n', 'Integer'), H.input('n'), H.output('n * 2'),
                H.declare('i', 'Integer'), H.assign('i', '0'), H.loop('i < 1000', [H.assign('i', 'i + 1')]),
                H.output('"fine"')
            ]);
            var fake = fakeRun(program);
            fake.scheduler.start();
            fake.turn();
            assert.equal(fake.scheduler.state(), 'waitingInput');
            assert.equal(fake.inputs[0].valueType, 'Integer');
            fake.time = 60000; // lo studente ci mette un minuto a rispondere
            fake.scheduler.provideInput('21');
            while (fake.turn()) {
                fake.time += 100;
            }
            assert.equal(fake.longRuns, 0);
            assert.deepEqual(fake.outputs, ['42', 'fine']);
            assert.equal(fake.finished.status, 'done');
        });

        T.test('pausa e ripresa', function (assert) {
            var fake = fakeRun(infiniteLoop());
            fake.scheduler.start();
            fake.turn();
            fake.scheduler.pause();
            assert.equal(fake.scheduler.state(), 'paused');
            assert.equal(fake.turn(), false, 'nessun turno in coda');
            fake.scheduler.resume();
            assert.equal(fake.scheduler.state(), 'running');
            assert.equal(fake.turn(), true);
        });

        T.test('la pausa non ha effetto mentre si attende un input', function (assert) {
            var fake = fakeRun(H.program([H.declare('n', 'Integer'), H.input('n')]));
            fake.scheduler.start();
            fake.turn();
            fake.scheduler.pause();
            assert.equal(fake.scheduler.state(), 'waitingInput');
        });

        T.test('Ferma: ERR_STOPPED con il blocco in esecuzione e le variabili', function (assert) {
            var program = infiniteLoop();
            var fake = fakeRun(program);
            fake.scheduler.start();
            fake.turn();
            fake.scheduler.stop();
            assert.equal(fake.scheduler.state(), 'finished');
            assert.equal(fake.finished.error.code, 'ERR_STOPPED');
            var loopIds = [program.functions[0].body[2].id, program.functions[0].body[2].body[0].id];
            assert.isTrue(loopIds.indexOf(fake.finished.error.nodeId) !== -1);
            assert.equal(fake.finished.error.variables[0].name, 'i');
            assert.equal(fake.queue.length, 0);
        });

        T.test('Ferma mentre si attende un input', function (assert) {
            var program = H.program([H.declare('n', 'Integer'), H.input('n')]);
            var fake = fakeRun(program);
            fake.scheduler.start();
            fake.turn();
            fake.scheduler.stop();
            assert.equal(fake.finished.error.code, 'ERR_STOPPED');
            assert.equal(fake.finished.error.nodeId, program.functions[0].body[1].id);
        });

        T.test('un programma con errori statici finisce subito senza eseguire', function (assert) {
            var fake = fakeRun(H.program([H.output('"mai"'), H.output('2,5')]));
            fake.scheduler.start();
            fake.turn();
            assert.equal(fake.finished.status, 'invalid');
            assert.deepEqual(fake.outputs, []);
        });

        T.test('un errore di runtime arriva a onFinish', function (assert) {
            var fake = fakeRun(H.program([H.output('1 / 0')]));
            fake.scheduler.start();
            fake.turn();
            assert.equal(fake.finished.error.code, 'ERR_DIVISION_BY_ZERO');
        });

        T.test('con i timer veri la pagina resta reattiva e Ferma risponde subito (NFR-PERF-01)', function (assert) {
            return new Promise(function (resolve) {
                var finished = null;
                var scheduler = Scheduler.create(infiniteLoop(), {
                    onFinish: function (outcome) { finished = outcome; }
                });
                var startedAt = performance.now();
                scheduler.start();
                // Se il ciclo bloccasse la pagina, questo timer partirebbe solo alla fine.
                setTimeout(function () {
                    var lateness = performance.now() - startedAt;
                    assert.equal(scheduler.state(), 'running');
                    assert.isTrue(lateness < 500, 'timer in ritardo di ' + Math.round(lateness) + ' ms');
                    var stopAt = performance.now();
                    scheduler.stop();
                    assert.isTrue(performance.now() - stopAt < 100, 'Ferma immediato');
                    assert.equal(finished.error.code, 'ERR_STOPPED');
                    resolve();
                }, 100);
            });
        }, { timeout: 3000 });
    });
})();
