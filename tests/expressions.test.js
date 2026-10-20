/*
 * OnoFlow — test delle espressioni: lexer e parser (§6.2, §6.3, §8.2, §8.4, DEC-001).
 *
 * Dipendenze: tests/framework/*, js/core/expression-lexer.js, js/core/expression-parser.js,
 * js/i18n/* (per verificare che ogni errore abbia un messaggio, QA-07).
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var Expressions = window.OnoFlow.Expressions;
    var Localization = window.OnoFlow.Localization;

    /* Forma canonica dell'AST, oppure "ERRORE:codice.motivo@inizio-fine". */
    function shape(kind, text) {
        var result = Expressions.parse(kind, text);
        if (result.error) {
            var reason = result.error.params.reason ? '.' + result.error.params.reason : '';
            return 'ERRORE:' + result.error.code + reason + '@' + result.error.position.start + '-' + result.error.position.end;
        }
        return Expressions.describe(result.ast);
    }

    function expression(text) {
        return shape('expression', text);
    }

    function table(assert, cases, convert) {
        cases.forEach(function (testCase) {
            assert.equal(convert(testCase[0]), testCase[1], 'caso ' + T.formatValue(testCase[0]));
        });
    }

    // Ogni testo usato nei test degli errori: alla fine si controlla che abbiano tutti un messaggio.
    var ERROR_SAMPLES = [];

    function errorOf(kind, text) {
        ERROR_SAMPLES.push([kind, text]);
        return Expressions.parse(kind, text).error;
    }

    T.suite('Espressioni › letterali e nomi', function () {
        T.test('letterali di ogni tipo', function (assert) {
            var integer = Expressions.parseExpression('007').ast;
            assert.deepEqual(integer, { kind: 'literal', type: 'Integer', value: 7, text: '007', start: 0, end: 3 });
            var real = Expressions.parseExpression('123.45').ast;
            assert.equal(real.type, 'Real');
            assert.equal(real.value, 123.45);
            var text = Expressions.parseExpression('"ciao mondo"').ast;
            assert.equal(text.type, 'String');
            assert.equal(text.value, 'ciao mondo');
            assert.equal(Expressions.parseExpression('""').ast.value, '');
            assert.equal(Expressions.parseExpression('true').ast.value, true);
            assert.equal(Expressions.parseExpression('false').ast.value, false);
        });

        T.test('una stringa può contenere qualunque carattere tranne "', function (assert) {
            assert.equal(Expressions.parseExpression('"età: \'x\' & y < 3"').ast.value, 'età: \'x\' & y < 3');
        });

        T.test('le parole chiave sono solo minuscole: True e AND sono nomi (§6.2)', function (assert) {
            assert.deepEqual(Expressions.parseExpression('True').ast,
                { kind: 'variable', name: 'True', start: 0, end: 4 });
            assert.equal(expression('AND'), 'AND');
        });

        T.test('i nomi distinguono maiuscole e minuscole', function (assert) {
            assert.equal(expression('Somma + somma'), '(Somma + somma)');
        });

        T.test('struttura completa con posizioni', function (assert) {
            assert.deepEqual(Expressions.parseExpression('a[i] + f(1, "x")').ast, {
                kind: 'binary', operator: '+', start: 0, end: 16,
                left: {
                    kind: 'index', name: 'a', start: 0, end: 4,
                    index: { kind: 'variable', name: 'i', start: 2, end: 3 }
                },
                right: {
                    kind: 'call', name: 'f', start: 7, end: 16,
                    args: [
                        { kind: 'literal', type: 'Integer', value: 1, text: '1', start: 9, end: 10 },
                        { kind: 'literal', type: 'String', value: 'x', text: '"x"', start: 12, end: 15 }
                    ]
                }
            });
        });

        T.test('chiamate con zero, uno o più argomenti', function (assert) {
            table(assert, [
                ['f()', 'f()'],
                ['Sqrt(x)', 'Sqrt(x)'],
                ['f(2,5)', 'f(2, 5)'],
                ['f(a + 1, g(b), c[0])', 'f((a + 1), g(b), c[0])']
            ], expression);
        });

        T.test('spazi, tabulazioni e a capo sono separatori', function (assert) {
            assert.equal(expression('  a\t+\nb  '), '(a + b)');
        });
    });

    T.suite('Espressioni › due stili, stesso nodo (§6.3)', function () {
        T.test('ogni coppia di operatori produce lo stesso AST', function (assert) {
            [
                ['a = b', 'a == b'],
                ['a <> b', 'a != b'],
                ['a and b', 'a && b'],
                ['a or b', 'a || b'],
                ['not a', '!a'],
                ['a mod b', 'a % b']
            ].forEach(function (pair) {
                var first = Expressions.parseExpression(pair[0]).ast;
                var second = Expressions.parseExpression(pair[1]).ast;
                assert.equal(Expressions.describe(first), Expressions.describe(second), pair[0] + ' / ' + pair[1]);
                assert.equal(first.operator, second.operator, 'operatore canonico di ' + pair[0]);
            });
        });

        T.test('gli operatori sono in forma canonica', function (assert) {
            table(assert, [
                ['a = b', '(a == b)'],
                ['a <> b', '(a != b)'],
                ['a && b', '(a and b)'],
                ['a || b', '(a or b)'],
                ['!a', '(not a)'],
                ['a % b', '(a mod b)']
            ], expression);
        });
    });

    T.suite('Espressioni › precedenze', function () {
        T.test('casi della specifica (§6.3)', function (assert) {
            table(assert, [
                ['-2 ^ 2', '(-(2 ^ 2))'],
                ['not x > 5', '((not x) > 5)'],
                ['"Somma: " & a + b', '("Somma: " & (a + b))']
            ], expression);
        });

        T.test('livelli dal più forte al più debole', function (assert) {
            table(assert, [
                ['a ^ b * c', '((a ^ b) * c)'],
                ['-a * b', '((-a) * b)'],
                ['a * b + c', '((a * b) + c)'],
                ['a + b * c', '(a + (b * c))'],
                ['a mod b + c', '((a mod b) + c)'],
                ['a + b & c', '((a + b) & c)'],
                ['a & b < c', '((a & b) < c)'],
                ['a + b < c * d', '((a + b) < (c * d))'],
                ['a < b and c > d', '((a < b) and (c > d))'],
                ['a or b and c', '(a or (b and c))'],
                ['not a and b', '((not a) and b)'],
                ['a = b or c <> d', '((a == b) or (c != d))']
            ], expression);
        });

        T.test('associatività', function (assert) {
            table(assert, [
                ['2 ^ 3 ^ 2', '(2 ^ (3 ^ 2))'],
                ['a - b - c', '((a - b) - c)'],
                ['a / b / c', '((a / b) / c)'],
                ['a & b & c', '((a & b) & c)'],
                ['a or b or c', '((a or b) or c)']
            ], expression);
        });

        T.test('segni unari', function (assert) {
            table(assert, [
                ['2 ^ -1', '(2 ^ (-1))'],
                ['- -2', '(-(-2))'],
                ['+5', '(+5)'],
                ['-(a + b)', '(-(a + b))'],
                ['not not a', '(not (not a))'],
                ['a * -b', '(a * (-b))']
            ], expression);
        });

        T.test('le parentesi raggruppano senza produrre nodi', function (assert) {
            assert.equal(expression('(a + b) * c'), '((a + b) * c)');
            assert.deepEqual(Expressions.parseExpression('((a))').ast, { kind: 'variable', name: 'a', start: 2, end: 3 });
        });

        T.test('"dim -1" è una sottrazione (L-13)', function (assert) {
            assert.equal(expression('dim -1'), '(dim - 1)');
            assert.equal(expression('dim - 1'), '(dim - 1)');
        });
    });

    T.suite('Espressioni › limite degli Integer (DEC-001)', function () {
        T.test('-2147483648 è accettato', function (assert) {
            assert.equal(expression('-2147483648'), '(-2147483648)');
            assert.equal(expression('- 2147483648'), '(-2147483648)');
            assert.equal(expression('x * -2147483648'), '(x * (-2147483648))');
            assert.equal(expression('-2147483648 + 1'), '((-2147483648) + 1)');
            assert.equal(expression('2147483647'), '2147483647');
        });

        T.test('2147483648 senza meno davanti è fuori intervallo', function (assert) {
            assert.equal(errorOf('expression', '2147483648').code, 'ERR_INTEGER_LITERAL_OUT_OF_RANGE');
            assert.equal(errorOf('expression', '0 - 2147483648').code, 'ERR_INTEGER_LITERAL_OUT_OF_RANGE');
            assert.equal(errorOf('expression', '+2147483648').code, 'ERR_INTEGER_LITERAL_OUT_OF_RANGE');
        });

        T.test('il letterale deve essere l\'operando diretto del meno', function (assert) {
            // In -2147483648 ^ 2 l'operando del meno è la potenza, non il letterale.
            assert.equal(errorOf('expression', '-2147483648 ^ 2').code, 'ERR_INTEGER_LITERAL_OUT_OF_RANGE');
            assert.equal(errorOf('expression', '-2147483649').code, 'ERR_INTEGER_LITERAL_OUT_OF_RANGE');
            assert.equal(errorOf('expression', '-(2147483648)').code, 'ERR_INTEGER_LITERAL_OUT_OF_RANGE');
        });

        T.test('letterale Real troppo grande', function (assert) {
            var error = errorOf('expression', '1' + '0'.repeat(400) + '.0');
            assert.equal(error.code, 'ERR_REAL_LITERAL_OUT_OF_RANGE');
        });

        T.test('zeri iniziali in base dieci', function (assert) {
            assert.equal(Expressions.parseExpression('0010').ast.value, 10);
            assert.equal(errorOf('expression', '0002147483648').code, 'ERR_INTEGER_LITERAL_OUT_OF_RANGE');
        });
    });

    T.suite('Espressioni › errori con posizione', function () {
        function errorShape(text) {
            ERROR_SAMPLES.push(['expression', text]);
            return shape('expression', text);
        }

        T.test('campo vuoto', function (assert) {
            table(assert, [
                ['', 'ERRORE:ERR_SYNTAX_EMPTY_EXPRESSION@0-0'],
                ['   ', 'ERRORE:ERR_SYNTAX_EMPTY_EXPRESSION@0-3']
            ], errorShape);
        });

        T.test('errori tipici degli studenti (§8.4)', function (assert) {
            table(assert, [
                ['x = 2,5', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN.decimalComma@4-7'],
                ['a AND b', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN.keywordCase@2-5'],
                ['NOT a', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN.keywordCase@0-3'],
                ['a Mod 2', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN.keywordCase@2-5'],
                ['\'ciao\'', 'ERRORE:ERR_SYNTAX_UNEXPECTED_CHARACTER.singleQuote@0-1'],
                ['\u201Cciao\u201D', 'ERRORE:ERR_SYNTAX_UNEXPECTED_CHARACTER.typographicQuote@0-1'],
                ['età + 1', 'ERRORE:ERR_SYNTAX_UNEXPECTED_CHARACTER.accentedLetter@2-3'],
                ['àb', 'ERRORE:ERR_SYNTAX_UNEXPECTED_CHARACTER.accentedLetter@0-1'],
                ['.5', 'ERRORE:ERR_SYNTAX_INVALID_NUMBER.leadingPoint@0-2'],
                ['5.', 'ERRORE:ERR_SYNTAX_INVALID_NUMBER.trailingPoint@0-2'],
                ['1e3', 'ERRORE:ERR_SYNTAX_INVALID_NUMBER.exponent@0-3'],
                ['1.5E-3 + a', 'ERRORE:ERR_SYNTAX_INVALID_NUMBER.exponent@0-6'],
                ['2x', 'ERRORE:ERR_SYNTAX_INVALID_NUMBER.missingOperator@0-2'],
                ['a < b < c', 'ERRORE:ERR_SYNTAX_CHAINED_COMPARISON@6-7'],
                ['a == b != c', 'ERRORE:ERR_SYNTAX_CHAINED_COMPARISON@7-9']
            ], errorShape);
        });

        T.test('i suggerimenti hanno il testo corretto', function (assert) {
            assert.equal(errorOf('expression', 'x = 2,5').params.suggestion, '2.5');
            assert.equal(errorOf('expression', 'a AND b').params.suggestion, 'and');
            assert.equal(errorOf('expression', 'a AND b').params.token, 'AND');
            assert.equal(errorOf('expression', '.5').params.suggestion, '0.5');
            assert.equal(errorOf('expression', '5.').params.suggestion, '5.0');
            assert.equal(errorOf('expression', '2x').params.suggestion, '2 * x');
            assert.equal(errorOf('expression', 'età').params.char, 'à');
        });

        T.test('la virgola tra argomenti non è un errore, quella dopo un numero sì', function (assert) {
            assert.equal(expression('Max(2,5)'), 'Max(2, 5)');
            assert.equal(errorShape('2, 5'), 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN@1-2');
        });

        T.test('indici non validi', function (assert) {
            table(assert, [
                ['a[i][j]', 'ERRORE:ERR_SYNTAX_INVALID_INDEX.nested@4-5'],
                ['f(x)[0]', 'ERRORE:ERR_SYNTAX_INVALID_INDEX.nested@4-5'],
                ['(a)[0]', 'ERRORE:ERR_SYNTAX_INVALID_INDEX.nested@3-4'],
                ['a[]', 'ERRORE:ERR_SYNTAX_INVALID_INDEX.empty@1-3'],
                ['a[1, 2]', 'ERRORE:ERR_SYNTAX_INVALID_INDEX.multiple@3-4']
            ], errorShape);
        });

        T.test('parentesi non chiuse: si indica quella aperta', function (assert) {
            table(assert, [
                ['(a + b', 'ERRORE:ERR_SYNTAX_UNCLOSED@0-1'],
                ['a[1', 'ERRORE:ERR_SYNTAX_UNCLOSED@1-2'],
                ['f(1, 2', 'ERRORE:ERR_SYNTAX_UNCLOSED@1-2'],
                ['((a)', 'ERRORE:ERR_SYNTAX_UNCLOSED@0-1']
            ], errorShape);
            assert.deepEqual(errorOf('expression', 'a[1').params, { open: '[', close: ']' });
        });

        T.test('token inattesi e fine anticipata', function (assert) {
            table(assert, [
                ['a +', 'ERRORE:ERR_SYNTAX_UNEXPECTED_END@3-3'],
                ['* 3', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN@0-1'],
                ['a b', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN@2-3'],
                ['f(1,)', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN@4-5'],
                ['(a + b))', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN@7-8'],
                ['2(3)', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN@1-2'],
                ['a and', 'ERRORE:ERR_SYNTAX_UNEXPECTED_END@5-5'],
                ['mod 3', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN@0-3'],
                ['(a b)', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN@3-4']
            ], errorShape);
        });

        T.test('caratteri non ammessi', function (assert) {
            table(assert, [
                ['"abc', 'ERRORE:ERR_SYNTAX_UNTERMINATED_STRING@0-4'],
                ['a | b', 'ERRORE:ERR_SYNTAX_UNEXPECTED_CHARACTER@2-3'],
                ['a\u00A0+ b', 'ERRORE:ERR_SYNTAX_UNEXPECTED_CHARACTER.invisible@1-2'],
                ['a . b', 'ERRORE:ERR_SYNTAX_UNEXPECTED_CHARACTER@2-3'],
                ['1.2.3', 'ERRORE:ERR_SYNTAX_INVALID_NUMBER@0-5'],
                ['a # b', 'ERRORE:ERR_SYNTAX_UNEXPECTED_CHARACTER@2-3']
            ], errorShape);
        });

        T.test('si riporta il primo errore nell\'ordine di lettura', function (assert) {
            table(assert, [
                ['a b età', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN@2-3'],
                ['(a + 2x', 'ERRORE:ERR_SYNTAX_INVALID_NUMBER.missingOperator@5-7'],
                ['a + * età', 'ERRORE:ERR_SYNTAX_UNEXPECTED_TOKEN@4-5']
            ], errorShape);
        });

        T.test('la colonna parte da 1', function (assert) {
            assert.deepEqual(errorOf('expression', 'a + * b').position, { start: 4, end: 5, column: 5 });
        });

        T.test('annidamento eccessivo: errore, non blocco della pagina', function (assert) {
            assert.equal(expression('('.repeat(50) + 'a' + ')'.repeat(50)), 'a');
            var deep = '('.repeat(5000) + 'a' + ')'.repeat(5000);
            assert.equal(errorOf('expression', deep).code, 'ERR_SYNTAX_TOO_COMPLEX');
            assert.equal(errorOf('expression', '-'.repeat(5000) + '1').code, 'ERR_SYNTAX_TOO_COMPLEX');
        });
    });

    T.suite('Espressioni › bersagli, nomi, passo del for', function () {
        T.test('bersagli validi: nome o nome[espressione]', function (assert) {
            table(assert, [
                ['x', 'x'],
                ['numeri[i]', 'numeri[i]'],
                ['v[i + 1]', 'v[(i + 1)]']
            ], function (text) { return shape('target', text); });
        });

        T.test('bersagli non validi', function (assert) {
            table(assert, [
                ['x + 1', 'ERRORE:ERR_SYNTAX_INVALID_TARGET@0-5'],
                ['f(x)', 'ERRORE:ERR_SYNTAX_INVALID_TARGET@0-4'],
                ['3', 'ERRORE:ERR_SYNTAX_INVALID_TARGET@0-1'],
                ['-x', 'ERRORE:ERR_SYNTAX_INVALID_TARGET@0-2'],
                ['', 'ERRORE:ERR_SYNTAX_EMPTY_EXPRESSION@0-0'],
                ['a[i][j]', 'ERRORE:ERR_SYNTAX_INVALID_INDEX.nested@4-5']
            ], function (text) { ERROR_SAMPLES.push(['target', text]); return shape('target', text); });
        });

        T.test('elenco di nomi', function (assert) {
            var result = Expressions.parseNameList('n, max, min, dim, i');
            assert.deepEqual(result.ast.names.map(function (entry) { return entry.name; }), ['n', 'max', 'min', 'dim', 'i']);
            assert.deepEqual(result.ast.names[1], { name: 'max', start: 3, end: 6 });
            assert.equal(shape('nameList', 'a,b'), 'a, b');
            assert.equal(shape('nameList', 'risultato'), 'risultato');
        });

        T.test('elenchi di nomi non validi', function (assert) {
            table(assert, [
                ['a,', 'ERRORE:ERR_NAME_LIST_INVALID@2-2'],
                [', a', 'ERRORE:ERR_NAME_LIST_INVALID@0-1'],
                ['a b', 'ERRORE:ERR_NAME_LIST_INVALID@2-3'],
                ['a, and', 'ERRORE:ERR_NAME_LIST_INVALID.keyword@3-6'],
                ['a[3]', 'ERRORE:ERR_NAME_LIST_INVALID@1-2'],
                ['età', 'ERRORE:ERR_SYNTAX_UNEXPECTED_CHARACTER.accentedLetter@2-3'],
                ['', 'ERRORE:ERR_SYNTAX_EMPTY_EXPRESSION@0-0']
            ], function (text) { ERROR_SAMPLES.push(['nameList', text]); return shape('nameList', text); });
        });

        T.test('un solo nome', function (assert) {
            assert.equal(shape('name', ' i '), 'i');
            table(assert, [
                ['i[0]', 'ERRORE:ERR_INVALID_NAME.indexed@0-4'],
                ['and', 'ERRORE:ERR_INVALID_NAME.keyword@0-3'],
                ['3', 'ERRORE:ERR_INVALID_NAME@0-1'],
                ['a b', 'ERRORE:ERR_INVALID_NAME@2-3'],
                ['a + 1', 'ERRORE:ERR_INVALID_NAME@2-3']
            ], function (text) { ERROR_SAMPLES.push(['name', text]); return shape('name', text); });
        });

        T.test('passo del for: Integer maggiore di zero, senza segno', function (assert) {
            assert.deepEqual(Expressions.parseForStep(' 2 ').ast,
                { kind: 'literal', type: 'Integer', value: 2, text: '2', start: 1, end: 2 });
            assert.equal(shape('forStep', '1'), '1');
            assert.equal(shape('forStep', '2147483647'), '2147483647');
            table(assert, [
                ['0', 'ERRORE:ERR_FOR_STEP_INVALID@0-1'],
                ['-1', 'ERRORE:ERR_FOR_STEP_INVALID@0-2'],
                ['+1', 'ERRORE:ERR_FOR_STEP_INVALID@0-2'],
                ['1.5', 'ERRORE:ERR_FOR_STEP_INVALID@0-3'],
                ['x', 'ERRORE:ERR_FOR_STEP_INVALID@0-1'],
                ['2147483648', 'ERRORE:ERR_FOR_STEP_INVALID@0-10'],
                ['', 'ERRORE:ERR_SYNTAX_EMPTY_EXPRESSION@0-0']
            ], function (text) { ERROR_SAMPLES.push(['forStep', text]); return shape('forStep', text); });
        });

        T.test('tipo di campo sconosciuto è un difetto interno', function (assert) {
            assert.throws(function () { Expressions.parse('formula', 'x'); }, TypeError);
        });
    });

    T.suite('Espressioni › file campione (Appendice A)', function () {
        T.test('tutte le espressioni del campione si analizzano', function (assert) {
            [
                ['expression', '0'], ['expression', 'risposta == "s"'], ['expression', '"Quale numero vuoi sommare?"'],
                ['expression', 'dim + 1'], ['expression', 'risultato + n'], ['expression', 'dim'],
                ['expression', 'dim -1'], ['expression', 'numeri[0]'], ['expression', 'i<dim'],
                ['expression', 'max < numeri[i]'], ['expression', 'min > numeri[i]'],
                ['expression', '"Somma del primo set di numeri: " & risultato'],
                ['target', 'numeri[i]'], ['target', 'n'], ['nameList', 'n, max, min, dim, i'],
                ['name', 'i'], ['forStep', '1']
            ].forEach(function (entry) {
                var result = Expressions.parse(entry[0], entry[1]);
                assert.equal(result.error, null, entry[0] + ' ' + entry[1]);
            });
        });
    });

    T.suite('Espressioni › messaggi degli errori (QA-07)', function () {
        // Un esempio per ogni codice e motivo: il controllo vale anche quando un filtro
        // esclude gli altri test, che aggiungono i loro casi a ERROR_SAMPLES.
        var BASELINE = [
            ['expression', ''], ['expression', '\'a\''], ['expression', '\u201Ca'], ['expression', 'è'],
            ['expression', '\u00A0'], ['expression', '#'], ['expression', '"a'], ['expression', '1.2.3'],
            ['expression', '.5'], ['expression', '5.'], ['expression', '1e3'], ['expression', '2x'],
            ['expression', 'a b'], ['expression', '2,5'], ['expression', 'a AND b'], ['expression', 'a +'],
            ['expression', '(a'], ['expression', 'a < b < c'], ['expression', 'a[i][j]'], ['expression', 'a[]'],
            ['expression', 'a[1, 2]'], ['expression', '('.repeat(200)], ['expression', '2147483648'],
            ['expression', '1' + '0'.repeat(400) + '.0'], ['target', 'a + 1'], ['nameList', 'a,'],
            ['nameList', 'and'], ['name', '3'], ['name', 'or'], ['name', 'i[0]'], ['forStep', '0']
        ];

        T.test('ogni errore prodotto nei test ha un messaggio completo', function (assert) {
            var italian = Localization.createTranslator('it');
            BASELINE.concat(ERROR_SAMPLES).forEach(function (sample) {
                var error = Expressions.parse(sample[0], sample[1]).error;
                assert.notEqual(error, null, 'errore atteso per ' + sample[0] + ' ' + T.formatValue(sample[1]));
                var message = italian.formatError(error);
                assert.notEqual(message, error.code, 'messaggio per ' + error.code);
                assert.equal(message.indexOf('{'), -1, 'segnaposto rimasto in: ' + message);
            });
        });

        T.test('ogni motivo specifico ha il suo messaggio, non quello generico', function (assert) {
            var italian = Localization.createTranslator('it');
            BASELINE.concat(ERROR_SAMPLES).forEach(function (sample) {
                var error = Expressions.parse(sample[0], sample[1]).error;
                if (error && error.params.reason) {
                    var keys = italian.errorKeys(error);
                    var specific = keys.filter(function (key) { return key !== error.code; });
                    var found = specific.some(function (key) { return italian.t(key) !== key; });
                    assert.isTrue(found, 'messaggio per ' + specific[specific.length - 1]);
                }
            });
        });

        T.test('i messaggi dei casi tipici contengono il suggerimento', function (assert) {
            var italian = Localization.createTranslator('it');
            assert.equal(italian.formatError(Expressions.parseExpression('x = 2,5').error),
                'Nelle espressioni i decimali si scrivono con il punto: 2.5. La virgola si usa solo nella console.');
            assert.equal(italian.formatError(Expressions.parseExpression('a AND b').error),
                'Operatori e valori logici si scrivono in minuscolo: and invece di AND.');
        });
    });
})();
