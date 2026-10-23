/*
 * OnoFlow — scheduler: esecuzione continua senza bloccare la pagina (FR-RUN-01…04, §10.3).
 *
 * Dipendenze: js/namespace.js, js/core/values.js, js/core/interpreter.js.
 * Definisce: OnoFlow.Scheduler.{create, DEFAULT_BUDGET, LONG_RUN_MS}
 *
 * create(program, options) restituisce un oggetto con start, pause, resume, stop,
 * provideInput e state(). Esegue al massimo "budget" passi per turno, e comunque non più
 * di circa 25 ms (DEC-042: sui telefoni lenti 10.000 passi possono durare troppo), poi
 * restituisce il controllo al browser con setTimeout(0) (L-11). Dopo 5 secondi di tempo reale di
 * esecuzione continua si mette in pausa e chiama onLongRun: l'interfaccia chiede se
 * continuare o fermare, senza finestre modali. Il conteggio riparte all'avvio, a ogni
 * input fornito e a ogni ripresa (FR-RUN-04, L-07).
 *
 * Passo-passo (FR-RUN-05, passo 14): step() esegue il blocco evidenziato e si ferma prima
 * del successivo, che diventa quello evidenziato; da 'idle' avvia l'esecuzione e si ferma prima
 * del primo blocco. Un input a metà passo si chiede come sempre; dopo il valore il passo
 * continua fino al blocco successivo. resume() torna all'esecuzione continua.
 *
 * Stati: 'idle', 'running', 'paused', 'waitingInput', 'finished'; stepping() dice se
 * l'esecuzione va avanti un passo alla volta.
 * Opzioni (tutte facoltative tranne i gestori che servono):
 *     onOutput(evento), onInput(evento), onStep(nodeId), onStateChange(stato),
 *     onLongRun(), onFinish(esito)
 *     numberFormat, random, invalidInput        passati all'interprete
 *     budget, maxTurnMs, longRunMs              limiti (per i test)
 *     now(), schedule(funzione), cancel(id)     orologio e timer (per i test)
 */
(function (OnoFlow) {
    'use strict';

    var Interpreter = OnoFlow.Interpreter;
    var Values = OnoFlow.Values;
    if (!Interpreter) {
        throw new Error('scheduler.js richiede interpreter.js, da caricare prima');
    }

    var DEFAULT_BUDGET = 10000;
    var MAX_TURN_MS = 25;
    var CLOCK_CHECK_EVERY = 256; // passi tra due letture dell'orologio dentro un turno
    var LONG_RUN_MS = 5000;

    function noop() {}

    function create(program, options) {
        var settings = options || {};
        var handlers = {
            onOutput: settings.onOutput || noop,
            onInput: settings.onInput || noop,
            onStep: settings.onStep || noop,
            onStateChange: settings.onStateChange || noop,
            onLongRun: settings.onLongRun || noop,
            onFinish: settings.onFinish || noop
        };
        var budget = settings.budget || DEFAULT_BUDGET;
        var maxTurnMs = settings.maxTurnMs || MAX_TURN_MS;
        var longRunMs = settings.longRunMs || LONG_RUN_MS;
        var now = settings.now || function () { return window.performance.now(); };
        var schedule = settings.schedule || function (callback) { return window.setTimeout(callback, 0); };
        var cancel = settings.cancel || function (id) { window.clearTimeout(id); };

        var generator = null;
        var state = 'idle';
        var timer = null;
        var runningSince = 0;
        var pendingInput;
        var hasPendingInput = false;
        var currentNodeId = null;
        var stepping = false;

        function setState(next) {
            if (state !== next) {
                state = next;
                handlers.onStateChange(next);
            }
        }

        function finish(outcome) {
            if (timer !== null) {
                cancel(timer);
                timer = null;
            }
            setState('finished');
            handlers.onFinish(outcome);
        }

        function scheduleTurn() {
            if (timer === null) {
                timer = schedule(turn);
            }
        }

        /* Gestisce un risultato del generatore; restituisce false se il turno deve finire. */
        function handle(result) {
            if (result.done) {
                finish(result.value);
                return false;
            }
            var event = result.value;
            if (event.type === 'step') {
                currentNodeId = event.nodeId;
                if (stepping) {
                    // Passo-passo: ci si ferma prima di eseguire questo blocco.
                    setState('paused');
                    handlers.onStep(currentNodeId);
                    return false;
                }
                return true;
            }
            if (event.type === 'output') {
                handlers.onOutput(event);
                return true;
            }
            // Input: si aspetta il valore, senza consumare tempo (FR-RUN-04).
            setState('waitingInput');
            handlers.onInput(event);
            return false;
        }

        function turn() {
            timer = null;
            if (state !== 'running') {
                return;
            }
            var steps = 0;
            var turnStartedAt = now();
            while (steps < budget) {
                if (steps % CLOCK_CHECK_EVERY === CLOCK_CHECK_EVERY - 1 && now() - turnStartedAt > maxTurnMs) {
                    break;
                }
                var result;
                if (hasPendingInput) {
                    var text = pendingInput;
                    hasPendingInput = false;
                    pendingInput = undefined;
                    result = generator.next(text);
                } else {
                    result = generator.next();
                }
                if (!result.done && result.value.type === 'step') {
                    steps++;
                }
                if (!handle(result)) {
                    return;
                }
            }
            handlers.onStep(currentNodeId);
            if (now() - runningSince >= longRunMs) {
                setState('paused');
                handlers.onLongRun();
                return;
            }
            scheduleTurn();
        }

        function start() {
            if (state !== 'idle') {
                return;
            }
            stepping = false;
            begin();
        }

        function begin() {
            generator = Interpreter.execute(program, {
                numberFormat: settings.numberFormat,
                random: settings.random,
                invalidInput: settings.invalidInput
            });
            runningSince = now();
            setState('running');
            scheduleTurn();
        }

        function pause() {
            if (state !== 'running') {
                return; // Pausa non ha effetto mentre si attende un input (§11.1).
            }
            if (timer !== null) {
                cancel(timer);
                timer = null;
            }
            setState('paused');
            handlers.onStep(currentNodeId);
        }

        function resume() {
            if (state !== 'paused') {
                return;
            }
            stepping = false;
            runningSince = now();
            setState('running');
            scheduleTurn();
        }

        /* Un passo: dall'inizio, oppure da una pausa (anche dopo Pausa nell'esecuzione continua). */
        function step() {
            if (state === 'idle') {
                stepping = true;
                begin();
            } else if (state === 'paused') {
                stepping = true;
                runningSince = now();
                setState('running');
                scheduleTurn();
            }
        }

        function provideInput(text) {
            if (state !== 'waitingInput') {
                return;
            }
            pendingInput = text;
            hasPendingInput = true;
            runningSince = now();
            setState('running');
            scheduleTurn();
        }

        /*
         * Ferma l'esecuzione: l'errore ERR_STOPPED entra nel generatore nel punto in cui era
         * fermo, così riceve il blocco e le variabili di quel momento.
         */
        function stop() {
            if (state === 'idle' || state === 'finished') {
                return;
            }
            if (timer !== null) {
                cancel(timer);
                timer = null;
            }
            var result;
            try {
                result = generator.throw(new Values.RuntimeFailure('ERR_STOPPED', {}));
            } catch (error) {
                result = { done: true, value: { status: 'error', error: { code: 'ERR_STOPPED', params: {}, nodeId: currentNodeId, functionName: null, variables: null } } };
            }
            if (!result.done) {
                // Non dovrebbe succedere: chiude comunque il generatore.
                generator.return();
                result = { done: true, value: { status: 'error', error: { code: 'ERR_STOPPED', params: {}, nodeId: currentNodeId, functionName: null, variables: null } } };
            }
            finish(result.value);
        }

        return {
            start: start,
            pause: pause,
            resume: resume,
            step: step,
            stop: stop,
            stepping: function () { return stepping; },
            provideInput: provideInput,
            state: function () { return state; },
            currentNodeId: function () { return currentNodeId; }
        };
    }

    OnoFlow.Scheduler = { create: create, DEFAULT_BUDGET: DEFAULT_BUDGET, MAX_TURN_MS: MAX_TURN_MS, LONG_RUN_MS: LONG_RUN_MS };
})(window.OnoFlow);
