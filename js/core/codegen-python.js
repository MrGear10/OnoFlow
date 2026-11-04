/*
 * OnoFlow — generatore di codice Python 3 (fase 3, passo 20, FR-GEN-01, FR-GEN-03, DEC-093).
 *
 * Dipendenze: js/namespace.js, js/core/model.js, js/core/type-check.js, js/core/codegen-common.js.
 * Definisce: OnoFlow.CodegenPython.{generate, RESERVED}
 *
 *     generate(program, options) → testo del file .py
 *         options.title: nome del diagramma, per il commento in cima
 *
 * Codice leggibile, come lo scriverebbe uno studente (DEC-093): per un programma corretto fa
 * ciò che fa OnoFlow, senza riscriverne i controlli d'errore. Dove Python è diverso da OnoFlow
 * c'è una piccola funzione di aiuto in cima al file, e solo se il programma la usa:
 *     testo / formatta   i numeri come li stampa OnoFlow: due decimali, virgola (D-08, §6.10)
 *     resto              mod con il segno del dividendo, come in C++ (FR-GEN-03, §6.4)
 *     leggi_*            l'input con le regole della console (§6.11)
 * Le divisioni sono già reali in Python (/), la potenza è **, che come ^ lega a destra e più
 * del meno unario (-2 ** 2 vale -4, come in OnoFlow).
 *
 * Il for si scrive con range quando la variabile non si scrive nel corpo e non si usa fuori dal
 * ciclo; altrimenti con while, perché in OnoFlow gli estremi si valutano una volta e dopo il
 * ciclo la variabile vale il primo valore oltre la fine (§6.7). Il do diventa while True con
 * un break. Main diventa main(), chiamata in fondo al file.
 */
(function (OnoFlow) {
    'use strict';

    var Codegen = OnoFlow.Codegen;
    if (!Codegen) {
        throw new Error('codegen-python.js richiede codegen-common.js, da caricare prima');
    }

    // Parole che un nome del diagramma non può essere in Python: le parole chiave, i nomi delle
    // funzioni che il codice generato usa e quelli delle funzioni di aiuto. Un nome così prende
    // un trattino basso in fondo (len → len_).
    var RESERVED = [
        'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
        'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
        'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
        'match', 'case', 'type',
        'print', 'input', 'len', 'abs', 'int', 'float', 'str', 'chr', 'ord', 'range', 'isinstance', 'bool',
        'math', 'random', 'Decimal', 'ROUND_HALF_UP', 'main',
        'testo', 'formatta', 'fisso', 'resto', 'segno', 'intero', 'reale',
        'leggi_intero', 'leggi_reale', 'leggi_testo', 'leggi_booleano'
    ];

    var DEFAULTS = { Integer: '0', Real: '0.0', String: '""', Boolean: 'False' };

    // Precedenze di Python, dalla più debole: or, and, not, confronti, + -, * / %, segno, **, chiamata.
    var PRECEDENCE = { or: 1, and: 2, not: 3, comparison: 4, sum: 6, product: 7, unary: 8, power: 9, atom: 10 };
    var BINARY = {
        or: { text: 'or', level: 'or' },
        and: { text: 'and', level: 'and' },
        '==': { text: '==', level: 'comparison' },
        '!=': { text: '!=', level: 'comparison' },
        '<': { text: '<', level: 'comparison' },
        '<=': { text: '<=', level: 'comparison' },
        '>': { text: '>', level: 'comparison' },
        '>=': { text: '>=', level: 'comparison' },
        '+': { text: '+', level: 'sum' },
        '-': { text: '-', level: 'sum' },
        '*': { text: '*', level: 'product' },
        '/': { text: '/', level: 'product' },
        '^': { text: '**', level: 'power' }
    };

    // Testo delle funzioni di aiuto, nell'ordine in cui compaiono nel file.
    var HELPERS = {
        formatta: [
            'def formatta(valore):',
            '    """Un Real come lo stampa OnoFlow: al massimo due decimali, con la virgola."""',
            '    cifre = Decimal(repr(float(valore))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)',
            '    if cifre == 0:',
            '        cifre = Decimal(0)  # mai "-0"',
            '    scritto = format(cifre, "f")',
            '    if "." in scritto:',
            '        scritto = scritto.rstrip("0").rstrip(".")',
            '    return scritto.replace(".", ",")'
        ],
        testo: [
            'def testo(valore):',
            '    """Un valore come lo scrive OnoFlow: true e false, i Real con formatta."""',
            '    if isinstance(valore, bool):',
            '        return "true" if valore else "false"',
            '    if isinstance(valore, float):',
            '        return formatta(valore)',
            '    return str(valore)'
        ],
        fisso: [
            'def fisso(valore, cifre):',
            '    """ToFixed di OnoFlow: esattamente quei decimali, con la virgola."""',
            '    scritto = Decimal(repr(float(valore))).quantize(Decimal(1).scaleb(-cifre), rounding=ROUND_HALF_UP)',
            '    if scritto == 0:',
            '        scritto = abs(scritto)  # mai "-0"',
            '    return format(scritto, "f").replace(".", ",")'
        ],
        resto: [
            'def resto(a, b):',
            '    """mod di OnoFlow: il resto ha il segno del dividendo (-7 mod 3 = -1), come in C++."""',
            '    scritto = abs(a) % abs(b)',
            '    return -scritto if a < 0 else scritto'
        ],
        segno: [
            'def segno(valore):',
            '    """Sgn di OnoFlow: -1, 0 oppure 1."""',
            '    return (valore > 0) - (valore < 0)'
        ],
        intero: [
            'def intero(letto):',
            '    """Un Integer da un testo, come lo legge la console di OnoFlow."""',
            '    return int(letto.strip())'
        ],
        reale: [
            'def reale(letto):',
            '    """Un Real da un testo: i decimali con la virgola o con il punto."""',
            '    return float(letto.strip().replace(",", "."))'
        ],
        leggi_intero: [
            'def leggi_intero():',
            '    """Legge un Integer; se il valore non va bene, lo chiede di nuovo."""',
            '    while True:',
            '        try:',
            '            return int(input().strip())',
            '        except ValueError:',
            '            print("Serve un numero intero: riprovare.")'
        ],
        leggi_reale: [
            'def leggi_reale():',
            '    """Legge un Real, con la virgola o con il punto; se non va bene, lo chiede di nuovo."""',
            '    while True:',
            '        try:',
            '            return float(input().strip().replace(",", "."))',
            '        except ValueError:',
            '            print("Serve un numero: riprovare.")'
        ],
        leggi_testo: [
            'def leggi_testo():',
            '    """Legge una String: il testo così come è scritto."""',
            '    return input()'
        ],
        leggi_booleano: [
            'def leggi_booleano():',
            '    """Legge un Boolean: true o false; se non va bene, lo chiede di nuovo."""',
            '    while True:',
            '        letto = input().strip().lower()',
            '        if letto in ("true", "false"):',
            '            return letto == "true"',
            '        print("Serve true o false: riprovare.")'
        ]
    };
    var HELPER_ORDER = ['formatta', 'testo', 'fisso', 'resto', 'segno', 'intero', 'reale',
        'leggi_intero', 'leggi_reale', 'leggi_testo', 'leggi_booleano'];
    var HELPER_NEEDS = { testo: ['formatta'] };
    var INPUT_HELPERS = { Integer: 'leggi_intero', Real: 'leggi_reale', String: 'leggi_testo', Boolean: 'leggi_booleano' };

    function generate(program, options) {
        var settings = options || {};
        var analysis = Codegen.analyze(program);
        var used = Object.create(null);     // funzioni di aiuto usate
        var imports = Object.create(null);  // moduli da importare
        var currentFunction = null;

        function use(helper) {
            used[helper] = true;
            (HELPER_NEEDS[helper] || []).forEach(use);
            if (helper === 'formatta' || helper === 'fisso') {
                imports.decimal = true;
            }
        }

        function name(text) {
            return RESERVED.indexOf(text) !== -1 ? text + '_' : text;
        }

        function type(ast) {
            return analysis.type(ast, currentFunction);
        }

        /* Testo di un valore per & e ToString: le stringhe come sono, gli Integer con str. */
        function asText(ast) {
            var valueType = type(ast);
            var code = expression(ast, 0);
            if (valueType === 'String') {
                return code;
            }
            if (valueType === 'Integer') {
                return 'str(' + code + ')';
            }
            if (valueType === 'Real') {
                use('formatta');
                return 'formatta(' + code + ')';
            }
            use('testo');
            return 'testo(' + code + ')';
        }

        function wrap(code, level, minimum) {
            return level < minimum ? '(' + code + ')' : code;
        }

        function literal(ast) {
            switch (ast.type) {
                case 'String':
                    return JSON.stringify(ast.value);
                case 'Boolean':
                    return ast.value ? 'True' : 'False';
                case 'Real':
                    return /^[0-9]/.test(ast.text) ? ast.text : '0' + ast.text;
                default:
                    return String(ast.value);
            }
        }

        function call(ast) {
            var args = ast.args;
            var plain = function (index) { return expression(args[index], 0); };
            switch (ast.name) {
                case 'Abs': return 'abs(' + plain(0) + ')';
                case 'Arccos': imports.math = true; return 'math.acos(' + plain(0) + ')';
                case 'Arcsin': imports.math = true; return 'math.asin(' + plain(0) + ')';
                case 'Arctan': imports.math = true; return 'math.atan(' + plain(0) + ')';
                case 'Cos': imports.math = true; return 'math.cos(' + plain(0) + ')';
                case 'Sin': imports.math = true; return 'math.sin(' + plain(0) + ')';
                case 'Tan': imports.math = true; return 'math.tan(' + plain(0) + ')';
                case 'Sqrt': imports.math = true; return 'math.sqrt(' + plain(0) + ')';
                case 'Log': imports.math = true; return 'math.log(' + plain(0) + ')';
                case 'Log10': imports.math = true; return 'math.log10(' + plain(0) + ')';
                case 'Int': return 'int(' + plain(0) + ')';
                case 'Sgn': use('segno'); return 'segno(' + plain(0) + ')';
                case 'Len': return 'len(' + plain(0) + ')';
                case 'Char': return expression(args[0], PRECEDENCE.atom) + '[' + plain(1) + ']';
                case 'Size': return 'len(' + plain(0) + ')';
                case 'Random': imports.random = true; return 'random.randrange(' + plain(0) + ')';
                case 'ToChar': return 'chr(' + plain(0) + ')';
                case 'ToCode': return 'ord(' + expression(args[0], PRECEDENCE.atom) + '[0])';
                case 'ToFixed': use('fisso'); return 'fisso(' + plain(0) + ', ' + plain(1) + ')';
                case 'ToInteger': use('intero'); return 'intero(' + plain(0) + ')';
                case 'ToReal': use('reale'); return 'reale(' + plain(0) + ')';
                case 'ToString': return asText(args[0]);
                default:
                    return name(ast.name) + '(' + args.map(function (argument) { return expression(argument, 0); }).join(', ') + ')';
            }
        }

        /* Codice di un'espressione; minimum è la precedenza sotto la quale servono le parentesi. */
        function expression(ast, minimum) {
            switch (ast.kind) {
                case 'literal': {
                    var text = literal(ast);
                    // Un numero negativo scritto come letterale si comporta come un segno.
                    return text.charAt(0) === '-' ? wrap(text, PRECEDENCE.unary, minimum) : text;
                }
                case 'variable':
                    return name(ast.name);
                case 'index':
                    return name(ast.name) + '[' + expression(ast.index, 0) + ']';
                case 'call':
                    return call(ast);
                case 'unary':
                    if (ast.operator === 'not') {
                        return wrap('not ' + expression(ast.operand, PRECEDENCE.not), PRECEDENCE.not, minimum);
                    }
                    if (ast.operator === '+') {
                        return expression(ast.operand, minimum);
                    }
                    return wrap('-' + expression(ast.operand, PRECEDENCE.unary), PRECEDENCE.unary, minimum);
                case 'binary':
                    return binary(ast, minimum);
                default:
                    throw new Error('CodegenPython: nodo sconosciuto ' + ast.kind);
            }
        }

        function binary(ast, minimum) {
            if (ast.operator === '&') {
                // Concatenazione: + tra testi, con i numeri scritti come li scrive OnoFlow.
                return wrap(concatenation(ast).join(' + '), PRECEDENCE.sum, minimum);
            }
            if (ast.operator === 'mod') {
                use('resto');
                return 'resto(' + expression(ast.left, 0) + ', ' + expression(ast.right, 0) + ')';
            }
            var operator = BINARY[ast.operator];
            var level = PRECEDENCE[operator.level];
            var left;
            var right;
            if (ast.operator === '^') {
                // ** lega a destra, e la sua base non può essere un segno senza parentesi.
                left = expression(ast.left, level + 1);
                right = expression(ast.right, PRECEDENCE.unary);
            } else if (operator.level === 'comparison') {
                left = expression(ast.left, level + 1);
                right = expression(ast.right, level + 1);
            } else {
                left = expression(ast.left, level);
                right = expression(ast.right, level + 1);
            }
            return wrap(left + ' ' + operator.text + ' ' + right, level, minimum);
        }

        /* Parti di una catena di &, già convertite in testo: "a" & n & "b" → ["a", str(n), "b"]. */
        function concatenation(ast) {
            if (ast.kind === 'binary' && ast.operator === '&') {
                return concatenation(ast.left).concat(concatenation(ast.right));
            }
            var valueType = type(ast);
            return [valueType === 'String' ? expression(ast, PRECEDENCE.sum + 1) : asText(ast)];
        }

        function target(ast) {
            return ast.kind === 'index' ? name(ast.name) + '[' + expression(ast.index, 0) + ']' : name(ast.name);
        }

        function targetType(ast) {
            var symbol = analysis.symbols(currentFunction)[ast.name];
            return symbol ? symbol.type : 'Integer';
        }

        // --- Blocchi ---------------------------------------------------------------

        /* Vero se la lista produce almeno una riga di codice (i commenti contano, le dichiarazioni no). */
        function hasCode(list) {
            return list.some(function (block) { return block.kind !== 'declare' || block.array; });
        }

        function blocks(list, out) {
            if (!hasCode(list)) {
                list.forEach(function (block) { statement(block, out); });
                out.line('pass');
                return;
            }
            list.forEach(function (block) { statement(block, out); });
        }

        function statement(block, out) {
            var fields = block.fields;
            switch (block.kind) {
                case 'declare':
                    // In Python una variabile nasce con il primo valore: si dichiarano solo gli array.
                    if (block.array) {
                        fields.names.ast.names.forEach(function (entry) {
                            out.line(name(entry.name) + ' = [' + DEFAULTS[block.type] + '] * ' + expression(fields.size.ast, PRECEDENCE.product + 1));
                        });
                    }
                    break;
                case 'assign':
                    out.line(target(fields.variable.ast) + ' = ' + expression(fields.expression.ast, 0));
                    break;
                case 'input': {
                    var helper = INPUT_HELPERS[targetType(fields.variable.ast)];
                    use(helper);
                    out.line(target(fields.variable.ast) + ' = ' + helper + '()');
                    break;
                }
                case 'output': {
                    var ast = fields.expression.ast;
                    if (ast.kind === 'literal' && ast.type === 'String' && ast.value === '') {
                        if (block.newline) {
                            out.line('print()');
                        }
                        break;
                    }
                    var valueType = type(ast);
                    var shown = valueType === 'String' || valueType === 'Integer' ? expression(ast, 0) : asText(ast);
                    out.line('print(' + shown + (block.newline ? '' : ', end=""') + ')');
                    break;
                }
                case 'if':
                    if (!hasCode(block.then) && hasCode(block['else'])) {
                        // Solo il ramo Falso: la condizione opposta, senza un ramo vuoto.
                        out.line('if ' + expression(Codegen.negate(fields.expression.ast), 0) + ':');
                        out.indent();
                        blocks(block['else'], out);
                        out.dedent();
                        break;
                    }
                    out.line('if ' + expression(fields.expression.ast, 0) + ':');
                    out.indent();
                    blocks(block.then, out);
                    out.dedent();
                    if (hasCode(block['else'])) {
                        out.line('else:');
                        out.indent();
                        blocks(block['else'], out);
                        out.dedent();
                    }
                    break;
                case 'while':
                    out.line('while ' + expression(fields.expression.ast, 0) + ':');
                    out.indent();
                    blocks(block.body, out);
                    out.dedent();
                    break;
                case 'do':
                    // Python non ha do-while: il corpo almeno una volta, poi si esce se la condizione è falsa.
                    out.line('while True:');
                    out.indent();
                    block.body.forEach(function (child) { statement(child, out); });
                    out.line('if ' + expression(Codegen.negate(fields.expression.ast), 0) + ':');
                    out.indent();
                    out.line('break');
                    out.dedent();
                    out.dedent();
                    break;
                case 'for':
                    forLoop(block, out);
                    break;
                case 'call':
                    out.line(expression(fields.expression.ast, 0));
                    break;
                case 'comment':
                    String(block.text).split(/\r?\n/).forEach(function (text) {
                        out.line(text.trim() === '' ? '#' : '# ' + text);
                    });
                    break;
                default:
                    throw new Error('CodegenPython: blocco sconosciuto ' + block.kind);
            }
        }

        /* La fine per range, un passo oltre l'estremo: n - 1 → n, 10 → 11, n → n + 1. */
        function beyond(ast, delta) {
            if (ast.kind === 'literal' && ast.type === 'Integer') {
                return String(ast.value + delta);
            }
            var opposite = delta > 0 ? '-' : '+';
            if (ast.kind === 'binary' && ast.operator === opposite && ast.right.kind === 'literal' &&
                ast.right.type === 'Integer' && ast.right.value === 1) {
                return expression(ast.left, PRECEDENCE.sum);
            }
            return expression(ast, PRECEDENCE.sum) + (delta > 0 ? ' + 1' : ' - 1');
        }

        function forLoop(block, out) {
            var fields = block.fields;
            var variable = name(fields.variable.ast.name);
            var step = fields.step.ast.value;
            var increasing = block.direction !== 'dec';
            var start = expression(fields.start.ast, 0);
            if (analysis.forIsPlain(block, currentFunction)) {
                // range si ferma prima della fine: l'estremo di OnoFlow è incluso.
                var end = beyond(fields.end.ast, increasing ? 1 : -1);
                var range = start + ', ' + end;
                if (!increasing) {
                    range += ', -' + step;
                } else if (step !== 1) {
                    range += ', ' + step;
                } else if (start === '0') {
                    range = end; // range(n) conta da 0 a n - 1
                }
                out.line('for ' + variable + ' in range(' + range + '):');
                out.indent();
                blocks(block.body, out);
                out.dedent();
                return;
            }
            // Forma lunga: gli estremi valutati una volta, la variabile si può usare dopo il ciclo.
            var endCode = expression(fields.end.ast, PRECEDENCE.comparison + 1);
            if (!Codegen.simpleExpression(fields.end.ast) ||
                (fields.end.ast.kind === 'variable' && Codegen.assignsTo(block.body, fields.end.ast.name))) {
                out.line('fine_' + variable + ' = ' + expression(fields.end.ast, 0));
                endCode = 'fine_' + variable;
            }
            out.line(variable + ' = ' + start);
            out.line('while ' + variable + (increasing ? ' <= ' : ' >= ') + endCode + ':');
            out.indent();
            block.body.forEach(function (child) { statement(child, out); });
            out.line(variable + (increasing ? ' += ' : ' -= ') + step);
            out.dedent();
        }

        // --- Funzioni e file -----------------------------------------------------------

        function functionCode(programFunction) {
            currentFunction = programFunction;
            var out = new Codegen.Writer('    ');
            var title = programFunction.name === 'Main' ? 'main' : name(programFunction.name);
            out.line('def ' + title + '(' + programFunction.parameters.map(function (parameter) {
                return name(parameter.name);
            }).join(', ') + '):');
            out.indent();
            var returns = programFunction.type !== 'None' && programFunction.variable;
            if (returns) {
                programFunction.body.forEach(function (block) { statement(block, out); });
                out.line('return ' + name(programFunction.variable));
            } else {
                blocks(programFunction.body, out);
            }
            return out.lines;
        }

        var main = null;
        var others = [];
        program.functions.forEach(function (programFunction) {
            if (programFunction.name === 'Main') {
                main = programFunction;
            } else {
                others.push(programFunction);
            }
        });
        // Le funzioni dell'utente prima di main(), nell'ordine del diagramma.
        var bodies = others.concat(main ? [main] : []).map(functionCode);

        var out = new Codegen.Writer('    ');
        out.line('# ' + (settings.title ? settings.title + ' — ' : '') + 'generato da OnoFlow (Python 3)');
        var modules = [];
        if (imports.math) {
            modules.push('import math');
        }
        if (imports.random) {
            modules.push('import random');
        }
        if (modules.length || imports.decimal) {
            out.blank();
            modules.forEach(function (line) { out.line(line); });
            if (imports.decimal) {
                out.line('from decimal import Decimal, ROUND_HALF_UP');
            }
        }
        HELPER_ORDER.filter(function (helper) { return used[helper]; }).forEach(function (helper) {
            out.blank();
            out.blank();
            out.lines.push('');
            HELPERS[helper].forEach(function (line) { out.line(line); });
        });
        bodies.forEach(function (lines) {
            out.blank();
            out.lines.push('');
            lines.forEach(function (line) { out.lines.push(line); });
        });
        if (main) {
            out.blank();
            out.lines.push('');
            out.line('main()');
        }
        // Mai più di due righe vuote di seguito.
        return out.text().replace(/\n{4,}/g, '\n\n\n');
    }

    OnoFlow.CodegenPython = { generate: generate, RESERVED: RESERVED };
})(window.OnoFlow);
