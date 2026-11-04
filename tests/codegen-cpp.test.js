/*
 * OnoFlow — test del generatore C++ (fase 3, passo 21, FR-GEN-01, FR-GEN-02, DEC-093).
 *
 * Qui si controlla la forma del codice; che il codice compili e dia lo stesso output di
 * OnoFlow lo verifica tools/check-codegen.mjs, compilandolo davvero con g++.
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var Cpp = OnoFlow.CodegenCpp;

    /* Righe del corpo di main(), senza il rientro e senza return 0. */
    function mainLines(body, others) {
        var code = Cpp.generate(H.program(body, others));
        var start = code.indexOf('int main() {\n');
        var end = code.indexOf('\n    return 0;\n}', start);
        return code.slice(start + 'int main() {\n'.length, end).split('\n').map(function (line) { return line.replace(/^ {4}/, ''); });
    }

    T.suite('Codice C++ › espressioni (FR-GEN-01, FR-GEN-02)', function () {
        T.test('/ tra Integer diventa reale, mod è %, ^ è std::pow', function (assert) {
            var lines = mainLines([
                H.declare('a, b', 'Integer'),
                H.declare('x', 'Real'),
                H.assign('x', 'a / b'),
                H.assign('x', '7 / 2'),
                H.assign('x', 'x / b'),
                H.assign('a', '-7 mod 3'),
                H.assign('a', '2 ^ 3'),
                H.assign('x', '2 ^ 0.5')
            ]);
            assert.deepEqual(lines, [
                'int a, b;',
                'double x;',
                'x = static_cast<double>(a) / b;',
                'x = 7.0 / 2;',
                'x = x / b;',
                'a = -7 % 3;',
                'a = static_cast<int>(std::pow(2, 3));',
                'x = std::pow(2, 0.5);'
            ]);
        });

        T.test('and, or, not; un && dentro un || tra parentesi; testi letterali confrontati come testi', function (assert) {
            var lines = mainLines([
                H.declare('a', 'Integer'),
                H.declare('ok', 'Boolean'),
                H.assign('ok', 'not (a > 1) or a == 2 and a <> 3'),
                H.assign('ok', '"Z" < "a"')
            ]);
            assert.deepEqual(lines.slice(2), ['ok = !(a > 1) || (a == 2 && a != 3);', 'ok = std::string("Z") < "a";']);
        });

        T.test('& concatena std::string, con i numeri scritti come OnoFlow', function (assert) {
            var lines = mainLines([
                H.declare('n', 'Integer'),
                H.declare('x', 'Real'),
                H.declare('s', 'String'),
                H.assign('s', '"n = " & n & ", x = " & x & ", " & true'),
                H.assign('s', '"a" & "b"')
            ]);
            assert.deepEqual(lines.slice(3), [
                's = "n = " + std::to_string(n) + ", x = " + formatta(x) + ", " + testo(true);',
                's = std::string("a") + "b";'
            ]);
        });
    });

    T.suite('Codice C++ › blocchi', function () {
        T.test('output con <<, e il \\n nello stesso testo quando si può', function (assert) {
            var lines = mainLines([
                H.declare('n', 'Integer'),
                H.declare('x', 'Real'),
                H.output('"Ciao"'),
                H.output('"n = " & n & ", x = " & x'),
                H.output('n', false),
                H.output('""')
            ]);
            assert.deepEqual(lines.slice(2), [
                'std::cout << "Ciao\\n";',
                'std::cout << "n = " << n << ", x = " << formatta(x) << "\\n";',
                'std::cout << n;',
                'std::cout << "\\n";'
            ]);
        });

        T.test('array statici: la misura scritta, oppure MAX_ELEMENTI con la lunghezza se serve Size', function (assert) {
            var code = Cpp.generate(H.program([
                H.declare('n', 'Integer'),
                H.declare('voti', 'Real', '5'),
                H.declare('nomi', 'String', 'n'),
                H.output('Size(voti) + Size(nomi)')
            ]));
            assert.isTrue(code.indexOf('const int MAX_ELEMENTI = 1000;') !== -1, 'la costante in cima');
            assert.isTrue(code.indexOf('    double voti[5] = {};\n') !== -1, 'misura scritta');
            assert.isTrue(code.indexOf('    std::string nomi[MAX_ELEMENTI] = {};  // ne servono n\n    int lunghezza_nomi = n;\n') !== -1, 'misura calcolata');
            assert.isTrue(code.indexOf('std::cout << 5 + lunghezza_nomi << "\\n";') !== -1, 'Size');
        });

        T.test('for: i < n per 0 … n - 1, all\'indietro con il passo, fine copiata se il corpo la cambia', function (assert) {
            var lines = mainLines([
                H.declare('i, n', 'Integer'),
                H.forLoop('i', '0', 'n - 1', [H.output('i')]),
                H.forLoop('i', '10', '1', [H.output('i')], 'dec', '2'),
                H.forLoop('i', '1', 'n', [H.assign('n', 'n + 1')])
            ]);
            assert.deepEqual(lines.slice(1), [
                'for (i = 0; i < n; i++) {',
                '    std::cout << i << "\\n";',
                '}',
                'for (i = 10; i >= 1; i -= 2) {',
                '    std::cout << i << "\\n";',
                '}',
                'int fine_i = n;',
                'for (i = 1; i <= fine_i; i++) {',
                '    n = n + 1;',
                '}'
            ]);
        });

        T.test('do-while, if senza Vero, dichiarazione dentro un if che sale in cima', function (assert) {
            var lines = mainLines([
                H.declare('n', 'Integer'),
                H.repeat([H.input('n')], 'n < 0'),
                H.when('n == 0', [], [H.declare('d', 'Integer'), H.assign('d', 'n * 2'), H.output('d')])
            ]);
            assert.deepEqual(lines, [
                'int d;',
                'int n;',
                'do {',
                '    n = leggi_intero();',
                '} while (n < 0);',
                'if (n != 0) {',
                '    d = n * 2;',
                '    std::cout << d << "\\n";',
                '}'
            ]);
        });
    });

    T.suite('Codice C++ › funzioni e file', function () {
        T.test('parametri, array con la lunghezza, prototipi solo se servono', function (assert) {
            var code = Cpp.generate(H.program([H.declare('v', 'Integer', '3'), H.output('Somma(v)')], [
                H.fn('Somma', 'Integer', 's', [['a', 'Integer', true]], [
                    H.declare('s, k', 'Integer'),
                    H.assign('s', '0'),
                    H.forLoop('k', '0', 'Size(a) - 1', [H.assign('s', 's + a[k]')])
                ])
            ]));
            assert.isTrue(code.indexOf('int Somma(int a[], int lunghezza_a) {') !== -1, 'la lunghezza come parametro');
            assert.isTrue(code.indexOf('for (k = 0; k < lunghezza_a; k++) {') !== -1, 'Size');
            assert.isTrue(code.indexOf('std::cout << Somma(v, 3) << "\\n";') !== -1, 'la lunghezza nella chiamata');
            assert.isTrue(code.indexOf('int Somma(int a[], int lunghezza_a);') === -1, 'niente prototipo');
            var calls = Cpp.generate(H.program([H.call('Primo()')], [
                H.fn('Primo', 'None', '', [], [H.call('Secondo()')]),
                H.fn('Secondo', 'None', '', [], [H.output('1')])
            ]));
            assert.isTrue(calls.indexOf('void Primo();\nvoid Secondo();\n') !== -1, 'prototipi quando una funzione ne chiama una più avanti');
        });

        T.test('include e funzioni di aiuto solo se servono; nomi riservati con il trattino basso', function (assert) {
            var plain = Cpp.generate(H.program([H.output('"ciao"')]), { title: 'prova' });
            assert.equal(plain, [
                '// prova — generato da OnoFlow (C++17)',
                '',
                '#include <iostream>',
                '#include <string>',
                '',
                'int main() {',
                '    std::cout << "ciao\\n";',
                '    return 0;',
                '}',
                ''
            ].join('\n'));
            var lines = mainLines([H.declare('int, double', 'Integer'), H.assign('int', '1'), H.assign('double', 'int')]);
            assert.deepEqual(lines, ['int int_, double_;', 'int_ = 1;', 'double_ = int_;']);
        });
    });
})();
