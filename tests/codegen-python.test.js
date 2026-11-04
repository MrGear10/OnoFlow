/*
 * OnoFlow — test del generatore Python (fase 3, passo 20, FR-GEN-01, FR-GEN-03, DEC-093).
 *
 * Qui si controlla la forma del codice; che il codice dia lo stesso output di OnoFlow lo
 * verifica tools/check-codegen.mjs, eseguendolo davvero con python3.
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var Python = OnoFlow.CodegenPython;

    /* Codice di main(), senza il rientro, riga per riga. */
    function mainLines(body, others) {
        var code = Python.generate(H.program(body, others));
        var start = code.indexOf('def main():\n');
        var end = code.indexOf('\n\n', start);
        return code.slice(start + 'def main():\n'.length, end).split('\n').map(function (line) { return line.replace(/^ {4}/, ''); });
    }

    T.suite('Codice Python › espressioni (FR-GEN-01, FR-GEN-03)', function () {
        T.test('/ resta /, mod diventa resto(), ^ diventa ** con le stesse precedenze', function (assert) {
            var lines = mainLines([
                H.declare('a, b', 'Integer'),
                H.assign('a', '7 / 2 * 3'),
                H.assign('b', '-7 mod 3'),
                H.assign('a', '-2 ^ 2'),
                H.assign('a', '(2 ^ 3) ^ 2'),
                H.assign('a', '2 ^ -1'),
                H.assign('a', '(a + b) * 2')
            ]);
            assert.deepEqual(lines, [
                'a = 7 / 2 * 3',
                'b = resto(-7, 3)',
                'a = -2 ** 2',
                'a = (2 ** 3) ** 2',
                'a = 2 ** -1',
                'a = (a + b) * 2'
            ]);
        });

        T.test('& concatena con + e scrive i numeri come OnoFlow', function (assert) {
            var lines = mainLines([
                H.declare('n', 'Integer'),
                H.declare('x', 'Real'),
                H.declare('ok', 'Boolean'),
                H.output('"n = " & n & ", x = " & x & ", ok = " & ok')
            ]);
            assert.deepEqual(lines, ['print("n = " + str(n) + ", x = " + formatta(x) + ", ok = " + testo(ok))']);
        });

        T.test('and, or, not, confronti e letterali', function (assert) {
            var lines = mainLines([
                H.declare('a', 'Integer'),
                H.output('not (a > 1) or a == 2 && a <> 3'),
                H.output('true'),
                H.output('2.50')
            ]);
            assert.deepEqual(lines, ['print(testo(not a > 1 or a == 2 and a != 3))', 'print(testo(True))', 'print(formatta(2.50))']);
        });
    });

    T.suite('Codice Python › blocchi', function () {
        T.test('le dichiarazioni spariscono, gli array diventano liste', function (assert) {
            var lines = mainLines([
                H.declare('n', 'Integer'),
                H.declare('nomi', 'String', '10'),
                H.declare('v', 'Real', 'n + 1'),
                H.assign('n', '3')
            ]);
            assert.deepEqual(lines, ['nomi = [""] * 10', 'v = [0.0] * (n + 1)', 'n = 3']);
        });

        T.test('input con la funzione del tipo, output con o senza a capo', function (assert) {
            var lines = mainLines([
                H.declare('n', 'Integer'),
                H.declare('x', 'Real'),
                H.declare('s', 'String'),
                H.input('n'),
                H.input('x'),
                H.input('s'),
                H.output('s', false)
            ]);
            assert.deepEqual(lines, ['n = leggi_intero()', 'x = leggi_reale()', 's = leggi_testo()', 'print(s, end="")']);
        });

        T.test('for con range quando si può, con while quando la variabile serve dopo', function (assert) {
            var lines = mainLines([
                H.declare('i, n', 'Integer'),
                H.forLoop('i', '0', 'n - 1', [H.output('i')]),
                H.forLoop('i', '10', '1', [H.output('i')], 'dec', '2'),
                H.forLoop('i', '1', 'n', [H.output('i')]),
                H.output('i')
            ]);
            assert.deepEqual(lines, [
                'for i in range(n):',
                '    print(i)',
                'for i in range(10, 0, -2):',
                '    print(i)',
                'i = 1',
                'while i <= n:',
                '    print(i)',
                '    i += 1',
                'print(i)'
            ]);
        });

        T.test('do diventa while True con break, un if senza Vero inverte la condizione', function (assert) {
            var lines = mainLines([
                H.declare('n', 'Integer'),
                H.repeat([H.input('n')], 'n < 0'),
                H.when('n == 0', [], [H.output('"diverso da zero"')])
            ]);
            assert.deepEqual(lines, [
                'while True:',
                '    n = leggi_intero()',
                '    if n >= 0:',
                '        break',
                'if n != 0:',
                '    print("diverso da zero")'
            ]);
        });

        T.test('commenti e rami vuoti', function (assert) {
            var lines = mainLines([H.comment('Calcolo'), H.when('true', [], [])]);
            assert.deepEqual(lines, ['# Calcolo', 'if True:', '    pass']);
        });
    });

    T.suite('Codice Python › funzioni e file', function () {
        T.test('una funzione restituisce la sua variabile; main() in fondo', function (assert) {
            var code = Python.generate(H.program([H.output('Doppio(3)')], [
                H.fn('Doppio', 'Integer', 'r', [['n', 'Integer']], [H.declare('r', 'Integer'), H.assign('r', 'n * 2')])
            ]), { title: 'prova' });
            assert.equal(code, [
                '# prova — generato da OnoFlow (Python 3)',
                '',
                '',
                'def Doppio(n):',
                '    r = n * 2',
                '    return r',
                '',
                '',
                'def main():',
                '    print(Doppio(3))',
                '',
                '',
                'main()',
                ''
            ].join('\n'));
        });

        T.test('solo le funzioni di aiuto e i moduli che servono', function (assert) {
            var plain = Python.generate(H.program([H.output('"ciao"')]));
            assert.isFalse(/def |import/.test(plain.replace('def main', '')), plain);
            var code = Python.generate(H.program([H.declare('x', 'Real'), H.assign('x', 'Sqrt(2)'), H.output('x')]));
            assert.isTrue(code.indexOf('import math') !== -1 && code.indexOf('from decimal import') !== -1, 'math e decimal');
            assert.isTrue(code.indexOf('def formatta') !== -1 && code.indexOf('def testo') === -1, 'formatta sì, testo no');
        });

        T.test('un nome riservato in Python prende un trattino basso', function (assert) {
            var lines = mainLines([H.declare('len, resto, valore', 'Integer'), H.assign('len', '1'), H.assign('resto', 'len mod 2'), H.assign('valore', 'resto')]);
            assert.deepEqual(lines, ['len_ = 1', 'resto_ = resto(len_, 2)', 'valore = resto_']);
        });
    });
})();
