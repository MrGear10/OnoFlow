/*
 * OnoFlow — test del formato dei numeri (§6.9 ToFixed, §6.10, §6.11).
 *
 * Dipendenze: tests/framework/*, js/core/number-format.js.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var NumberFormat = window.OnoFlow.NumberFormat;

    var ITALIAN = { decimalSeparator: ',', inputDecimalSeparators: [',', '.'] };
    var DOT_ONLY = { decimalSeparator: '.', inputDecimalSeparators: ['.'] };

    /* Esegue una tabella di casi [ingresso, atteso] con una funzione. */
    function table(assert, cases, convert) {
        cases.forEach(function (testCase) {
            assert.equal(convert(testCase[0]), testCase[1], 'caso ' + T.formatValue(testCase[0]));
        });
    }

    T.suite('NumberFormat › output Integer', function () {
        T.test('cifre senza separatori', function (assert) {
            table(assert, [
                [-7, '-7'],
                [0, '0'],
                [2147483647, '2147483647'],
                [-2147483648, '-2147483648']
            ], NumberFormat.formatInteger);
        });

        T.test('-0 si stampa 0', function (assert) {
            assert.equal(NumberFormat.formatInteger(-0), '0');
        });

        T.test('un valore non intero è un difetto interno', function (assert) {
            assert.throws(function () { NumberFormat.formatInteger(1.5); }, TypeError);
        });
    });

    T.suite('NumberFormat › output Real (§6.10)', function () {
        function real(value) {
            return NumberFormat.formatReal(value, ITALIAN);
        }

        T.test('al massimo due decimali, zeri finali tolti', function (assert) {
            table(assert, [
                [7, '7'],
                [2.5, '2,5'],
                [1 / 3, '0,33'],
                [2.1, '2,1'],
                [0.1 + 0.2, '0,3'],
                [1234.5, '1234,5']
            ], real);
        });

        T.test('casi a metà lontano dallo zero', function (assert) {
            table(assert, [
                [2.345, '2,35'],
                [-2.345, '-2,35'],
                [0.125, '0,13'],
                [-0.125, '-0,13'],
                [-0.005, '-0,01'],
                [0.005, '0,01']
            ], real);
        });

        T.test('arrotondamento sulla rappresentazione più corta, non sul valore binario', function (assert) {
            // toFixed darebbe 1.00 e 2.67 (L-03).
            table(assert, [
                [1.005, '1,01'],
                [2.675, '2,68'],
                [1.115, '1,12']
            ], real);
        });

        T.test('il riporto attraversa le cifre', function (assert) {
            table(assert, [
                [0.995, '1'],
                [9.999, '10'],
                [-99.995, '-100'],
                [123456789.125, '123456789,13']
            ], real);
        });

        T.test('mai -0', function (assert) {
            table(assert, [
                [-0, '0'],
                [-0.001, '0'],
                [-0.004999, '0']
            ], real);
        });

        T.test('valori grandi per esteso, mai notazione scientifica', function (assert) {
            assert.equal(real(1e25), '10000000000000000000000000');
            assert.equal(real(-1.5e21), '-1500000000000000000000');
            var largest = real(Number.MAX_VALUE);
            assert.equal(largest.length, 309);
            assert.equal(largest.indexOf('e'), -1);
            assert.equal(largest.slice(0, 17), '17976931348623157');
        });

        T.test('valori piccoli si arrotondano', function (assert) {
            table(assert, [
                [1e-7, '0'],
                [5e-324, '0'],
                [0.0049, '0']
            ], real);
        });

        T.test('il separatore viene dal formato della lingua', function (assert) {
            assert.equal(NumberFormat.formatReal(2.5, DOT_ONLY), '2.5');
            assert.equal(NumberFormat.formatReal(-1 / 3, DOT_ONLY), '-0.33');
        });

        T.test('Infinity e NaN sono un difetto interno', function (assert) {
            assert.throws(function () { real(Infinity); }, RangeError);
            assert.throws(function () { real(-Infinity); }, RangeError);
            assert.throws(function () { real(NaN); }, RangeError);
        });
    });

    T.suite('NumberFormat › ToFixed', function () {
        function fixed(value, decimals) {
            return NumberFormat.formatFixed(value, decimals, ITALIAN);
        }

        T.test('zeri finali conservati, separatore della console', function (assert) {
            assert.equal(fixed(2.5, 2), '2,50');
            assert.equal(fixed(7, 3), '7,000');
            assert.equal(fixed(1 / 3, 5), '0,33333');
            assert.equal(fixed(0, 2), '0,00');
        });

        T.test('stesso arrotondamento dell\'output', function (assert) {
            assert.equal(fixed(1.005, 2), '1,01');
            assert.equal(fixed(2.5, 0), '3');
            assert.equal(fixed(-2.5, 0), '-3');
            assert.equal(fixed(0.0005, 3), '0,001');
        });

        T.test('mai -0, anche con gli zeri', function (assert) {
            assert.equal(fixed(-0.001, 2), '0,00');
            assert.equal(fixed(-0, 0), '0');
        });

        T.test('da 0 a 15 cifre', function (assert) {
            assert.equal(fixed(0.1, 15), '0,100000000000000');
            assert.throws(function () { fixed(1, 16); }, RangeError);
            assert.throws(function () { fixed(1, -1); }, RangeError);
            assert.throws(function () { fixed(1, 1.5); }, RangeError);
        });
    });

    T.suite('NumberFormat › testo di un valore', function () {
        T.test('ogni tipo con le sue regole', function (assert) {
            assert.equal(NumberFormat.formatValue('Integer', -0, ITALIAN), '0');
            assert.equal(NumberFormat.formatValue('Real', 7, ITALIAN), '7');
            assert.equal(NumberFormat.formatValue('Real', 2.5, ITALIAN), '2,5');
            assert.equal(NumberFormat.formatValue('Boolean', true, ITALIAN), 'true');
            assert.equal(NumberFormat.formatValue('Boolean', false, ITALIAN), 'false');
            assert.equal(NumberFormat.formatValue('String', '  ciao ', ITALIAN), '  ciao ');
        });

        T.test('tipo sconosciuto è un difetto interno', function (assert) {
            assert.throws(function () { NumberFormat.formatValue('Char', 'a', ITALIAN); }, TypeError);
        });
    });

    T.suite('NumberFormat › input (§6.11)', function () {
        function value(text, type, format) {
            var result = NumberFormat.parseInput(text, type, format || ITALIAN);
            return result.ok ? result.value : 'errore:' + result.error.params.reason;
        }

        /* Casi della tabella §6.11: [testo, Integer, Real]. */
        var SPEC_TABLE = [
            ['  42  ', 42, 42],
            ['+5', 5, 5],
            ['007', 7, 7],
            ['2,5', 'errore:decimal', 2.5],
            ['2.5', 'errore:decimal', 2.5],
            ['2,0', 'errore:decimal', 2],
            ['2.0', 'errore:decimal', 2],
            ['.5', 'errore:decimal', 0.5],
            ['5.', 'errore:decimal', 5],
            ['1e3', 'errore:format', 'errore:format'],
            ['1.234,5', 'errore:format', 'errore:format'],
            ['', 'errore:empty', 'errore:empty'],
            ['   ', 'errore:empty', 'errore:empty'],
            ['٤٢', 'errore:format', 'errore:format'],
            ['４２', 'errore:format', 'errore:format'],
            ['Infinity', 'errore:format', 'errore:format'],
            ['NaN', 'errore:format', 'errore:format'],
            ['0x10', 'errore:format', 'errore:format']
        ];

        T.test('tabella della specifica, Integer', function (assert) {
            SPEC_TABLE.forEach(function (row) {
                assert.equal(value(row[0], 'Integer'), row[1], 'Integer ' + T.formatValue(row[0]));
            });
        });

        T.test('tabella della specifica, Real', function (assert) {
            SPEC_TABLE.forEach(function (row) {
                assert.equal(value(row[0], 'Real'), row[2], 'Real ' + T.formatValue(row[0]));
            });
        });

        T.test('"-0" dà 0, mai -0', function (assert) {
            assert.equal(value('-0', 'Integer'), 0);
            assert.equal(value('-0', 'Real'), 0);
            assert.equal(value('-0,0', 'Real'), 0);
            assert.equal(value('-0.' + '0'.repeat(400) + '1', 'Real'), 0);
        });

        T.test('limiti degli Integer', function (assert) {
            assert.equal(value('2147483647', 'Integer'), 2147483647);
            assert.equal(value('-2147483648', 'Integer'), -2147483648);
            assert.equal(value('2147483648', 'Integer'), 'errore:range');
            assert.equal(value('-2147483649', 'Integer'), 'errore:range');
            assert.equal(value('99999999999999999999999', 'Integer'), 'errore:range');
            assert.equal(value('000000000000000000000042', 'Integer'), 42);
        });

        T.test('limiti dei Real', function (assert) {
            assert.equal(value('1' + '0'.repeat(400), 'Real'), 'errore:range');
            assert.equal(value('-1' + '0'.repeat(400), 'Real'), 'errore:range');
            assert.equal(value('0,' + '0'.repeat(400) + '1', 'Real'), 0);
        });

        T.test('altri testi non validi', function (assert) {
            assert.equal(value('-', 'Integer'), 'errore:format');
            assert.equal(value('+', 'Real'), 'errore:format');
            assert.equal(value('4 2', 'Integer'), 'errore:format');
            assert.equal(value('2,5,1', 'Real'), 'errore:format');
            assert.equal(value('--5', 'Integer'), 'errore:format');
            assert.equal(value(',', 'Real'), 'errore:format');
        });

        T.test('segno e decimali insieme', function (assert) {
            assert.equal(value('-2,5', 'Real'), -2.5);
            assert.equal(value('+,5', 'Real'), 0.5);
            assert.equal(value('-,5', 'Integer'), 'errore:decimal');
        });

        T.test('con il solo punto come separatore la virgola non è accettata', function (assert) {
            assert.equal(value('2.5', 'Real', DOT_ONLY), 2.5);
            assert.equal(value('2,5', 'Real', DOT_ONLY), 'errore:format');
            assert.equal(value('1,500', 'Real', DOT_ONLY), 'errore:format');
            assert.equal(value('2,5', 'Integer', DOT_ONLY), 'errore:format');
            assert.equal(value('2.5', 'Integer', DOT_ONLY), 'errore:decimal');
        });

        T.test('String conservata esattamente', function (assert) {
            assert.equal(value('  ciao  ', 'String'), '  ciao  ');
            assert.equal(value('', 'String'), '');
        });

        T.test('Boolean senza distinzione di maiuscole, spazi ai bordi ammessi', function (assert) {
            assert.equal(value('true', 'Boolean'), true);
            assert.equal(value(' FALSE ', 'Boolean'), false);
            assert.equal(value('True', 'Boolean'), true);
            assert.equal(value('vero', 'Boolean'), 'errore:format');
            assert.equal(value('1', 'Boolean'), 'errore:format');
            assert.equal(value('', 'Boolean'), 'errore:empty');
        });

        T.test('l\'errore ha codice, motivo, tipo e testo originale', function (assert) {
            var result = NumberFormat.parseInput(' 2,5 ', 'Integer', ITALIAN);
            assert.deepEqual(result, {
                ok: false,
                error: {
                    code: 'ERR_INPUT_NOT_CONVERTIBLE',
                    params: { reason: 'decimal', type: 'Integer', text: ' 2,5 ' }
                }
            });
        });

        T.test('tipo sconosciuto è un difetto interno', function (assert) {
            assert.throws(function () { NumberFormat.parseInput('1', 'Char', ITALIAN); }, TypeError);
        });
    });
})();
