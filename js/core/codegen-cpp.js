/*
 * OnoFlow — generatore di codice C++17 (fase 3, passo 21, FR-GEN-01, FR-GEN-02, DEC-093).
 *
 * Dipendenze: js/namespace.js, js/core/model.js, js/core/type-check.js, js/core/codegen-common.js.
 * Definisce: OnoFlow.CodegenCpp.{generate, RESERVED, MAX_ELEMENTS}
 *
 *     generate(program, options) → testo del file .cpp
 *         options.title: nome del diagramma, per il commento in cima
 *
 * Codice leggibile, come lo scriverebbe uno studente (DEC-093): per un programma corretto fa
 * ciò che fa OnoFlow, senza riscriverne i controlli d'errore.
 *   - Tipi: Integer → int, Real → double, String → std::string, Boolean → bool.
 *   - / tra due Integer diventa static_cast<double>(a) / b, perché in OnoFlow / dà sempre un
 *     Real (FR-GEN-02); % ha già il segno del dividendo, come mod; ^ diventa std::pow.
 *   - I numeri si stampano come in OnoFlow con formatta (due decimali, virgola: D-08); l'input
 *     si legge una riga alla volta con le regole della console (§6.11).
 *   - Array statici (D-07): con una dimensione scritta come numero, quella; con una dimensione
 *     calcolata, MAX_ELEMENTI, una costante in cima al file. Un array passato a una funzione
 *     non porta con sé la lunghezza: se la funzione usa Size, riceve anche lunghezza_<nome>.
 *   - Le dichiarazioni restano dove sono; quelle dentro un if o un ciclo salgono in cima alla
 *     funzione, perché in OnoFlow una variabile vale in tutta la funzione.
 * Le funzioni di aiuto compaiono solo se il programma le usa, in fondo al file, con i prototipi in
 * cima: chi legge trova subito il programma del diagramma.
 */
(function (OnoFlow) {
    'use strict';

    var Codegen = OnoFlow.Codegen;
    var Model = OnoFlow.Model;
    if (!Codegen) {
        throw new Error('codegen-cpp.js richiede codegen-common.js, da caricare prima');
    }

    var MAX_ELEMENTS = 1000;

    // Parole chiave del C++ e nomi che il codice generato usa senza std::: un nome del
    // diagramma uguale prende un trattino basso in fondo (int → int_).
    var RESERVED = [
        'alignas', 'alignof', 'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor', 'bool', 'break', 'case',
        'catch', 'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'compl', 'concept', 'const', 'consteval',
        'constexpr', 'constinit', 'const_cast', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype',
        'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit', 'export', 'extern',
        'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable', 'namespace', 'new',
        'noexcept', 'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq', 'private', 'protected', 'public',
        'register', 'reinterpret_cast', 'requires', 'return', 'short', 'signed', 'sizeof', 'static',
        'static_assert', 'static_cast', 'struct', 'switch', 'template', 'this', 'thread_local', 'throw', 'true',
        'try', 'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile',
        'wchar_t', 'while', 'xor', 'xor_eq', 'std', 'main', 'NULL', 'EOF', 'assert', 'errno',
        'MAX_ELEMENTI', 'formatta', 'fisso', 'arrotonda', 'testo', 'segno', 'intero', 'reale',
        'leggi_intero', 'leggi_reale', 'leggi_testo', 'leggi_booleano'
    ];

    var TYPES = { Integer: 'int', Real: 'double', String: 'std::string', Boolean: 'bool' };

    // Precedenze del C++, dalla più debole: ||, &&, == !=, < <= > >=, + -, * / %, ! e segno, chiamata.
    var PRECEDENCE = { or: 1, and: 2, equality: 3, relational: 4, sum: 5, product: 6, unary: 7, atom: 8 };
    var BINARY = {
        or: { text: '||', level: 'or' },
        and: { text: '&&', level: 'and' },
        '==': { text: '==', level: 'equality' },
        '!=': { text: '!=', level: 'equality' },
        '<': { text: '<', level: 'relational' },
        '<=': { text: '<=', level: 'relational' },
        '>': { text: '>', level: 'relational' },
        '>=': { text: '>=', level: 'relational' },
        '+': { text: '+', level: 'sum' },
        '-': { text: '-', level: 'sum' },
        '*': { text: '*', level: 'product' },
        '/': { text: '/', level: 'product' },
        mod: { text: '%', level: 'product' }
    };

    var HELPERS = {
        arrotonda: {
            includes: ['charconv', 'cmath'],
            lines: [
                '// Le cifre di un Real arrotondate a "decimali" cifre, a metà lontano dallo zero,',
                '// partendo dalla scrittura più corta del numero, come OnoFlow: 1.005 → "1.01".',
                'std::string arrotonda(double valore, int decimali) {',
                '    char cifre[400];',
                '    char* fine = std::to_chars(cifre, cifre + sizeof cifre, std::fabs(valore), std::chars_format::fixed).ptr;',
                '    std::string intera(cifre, fine);',
                '    std::string frazione;',
                '    std::size_t punto = intera.find(\'.\');',
                '    if (punto != std::string::npos) {',
                '        frazione = intera.substr(punto + 1);',
                '        intera = intera.substr(0, punto);',
                '    }',
                '    bool suPerUno = frazione.size() > static_cast<std::size_t>(decimali) && frazione[decimali] >= \'5\';',
                '    frazione.resize(decimali, \'0\');',
                '    std::string tutte = intera + frazione;',
                '    if (suPerUno) {',
                '        int i = static_cast<int>(tutte.size()) - 1;',
                '        while (i >= 0 && tutte[i] == \'9\') {',
                '            tutte[i] = \'0\';',
                '            i--;',
                '        }',
                '        if (i < 0) {',
                '            tutte.insert(tutte.begin(), \'1\');',
                '        } else {',
                '            tutte[i]++;',
                '        }',
                '    }',
                '    std::string scritto = tutte.substr(0, tutte.size() - decimali);',
                '    if (decimali > 0) {',
                '        scritto += "." + tutte.substr(tutte.size() - decimali);',
                '    }',
                '    bool zero = tutte.find_first_not_of(\'0\') == std::string::npos;',
                '    return (valore < 0 && !zero ? "-" : "") + scritto;  // mai "-0"',
                '}'
            ]
        },
        formatta: {
            needs: ['arrotonda'],
            lines: [
                '// Un Real come lo stampa OnoFlow: al massimo due decimali, con la virgola.',
                'std::string formatta(double valore) {',
                '    std::string scritto = arrotonda(valore, 2);',
                '    scritto.erase(scritto.find_last_not_of(\'0\') + 1);',
                '    if (scritto.back() == \'.\') {',
                '        scritto.pop_back();',
                '    }',
                '    std::size_t punto = scritto.find(\'.\');',
                '    if (punto != std::string::npos) {',
                '        scritto[punto] = \',\';',
                '    }',
                '    return scritto;',
                '}'
            ]
        },
        fisso: {
            needs: ['arrotonda'],
            lines: [
                '// ToFixed di OnoFlow: esattamente quei decimali, con la virgola.',
                'std::string fisso(double valore, int decimali) {',
                '    std::string scritto = arrotonda(valore, decimali);',
                '    std::size_t punto = scritto.find(\'.\');',
                '    if (punto != std::string::npos) {',
                '        scritto[punto] = \',\';',
                '    }',
                '    return scritto;',
                '}'
            ]
        },
        testo: {
            lines: [
                '// Un Boolean come lo scrive OnoFlow.',
                'std::string testo(bool valore) {',
                '    return valore ? "true" : "false";',
                '}'
            ]
        },
        segno: {
            lines: [
                '// Sgn di OnoFlow: -1, 0 oppure 1.',
                'int segno(double valore) {',
                '    return (valore > 0) - (valore < 0);',
                '}'
            ]
        },
        intero: {
            lines: [
                '// Un Integer da un testo, come lo legge la console di OnoFlow.',
                'int intero(const std::string& letto) {',
                '    return std::stoi(letto);',
                '}'
            ]
        },
        reale: {
            lines: [
                '// Un Real da un testo: i decimali con la virgola o con il punto.',
                'double reale(std::string letto) {',
                '    for (char& c : letto) {',
                '        if (c == \',\') {',
                '            c = \'.\';',
                '        }',
                '    }',
                '    return std::stod(letto);',
                '}'
            ]
        },
        leggi_intero: {
            lines: [
                '// Legge un Integer su una riga; se il valore non va bene, lo chiede di nuovo.',
                'int leggi_intero() {',
                '    std::string riga;',
                '    while (std::getline(std::cin, riga)) {',
                '        try {',
                '            std::size_t letti;',
                '            int valore = std::stoi(riga, &letti);',
                '            if (riga.find_first_not_of(" \\t\\r", letti) == std::string::npos) {',
                '                return valore;',
                '            }',
                '        } catch (const std::exception&) {',
                '        }',
                '        std::cout << "Serve un numero intero: riprovare.\\n";',
                '    }',
                '    return 0;',
                '}'
            ]
        },
        leggi_reale: {
            lines: [
                '// Legge un Real su una riga, con la virgola o con il punto; se non va bene, lo chiede di nuovo.',
                'double leggi_reale() {',
                '    std::string riga;',
                '    while (std::getline(std::cin, riga)) {',
                '        for (char& c : riga) {',
                '            if (c == \',\') {',
                '                c = \'.\';',
                '            }',
                '        }',
                '        try {',
                '            std::size_t letti;',
                '            double valore = std::stod(riga, &letti);',
                '            if (riga.find_first_not_of(" \\t\\r", letti) == std::string::npos) {',
                '                return valore;',
                '            }',
                '        } catch (const std::exception&) {',
                '        }',
                '        std::cout << "Serve un numero: riprovare.\\n";',
                '    }',
                '    return 0;',
                '}'
            ]
        },
        leggi_testo: {
            lines: [
                '// Legge una String: la riga così come è scritta.',
                'std::string leggi_testo() {',
                '    std::string riga;',
                '    std::getline(std::cin, riga);',
                '    return riga;',
                '}'
            ]
        },
        leggi_booleano: {
            lines: [
                '// Legge un Boolean: true o false; se non va bene, lo chiede di nuovo.',
                'bool leggi_booleano() {',
                '    std::string riga;',
                '    while (std::getline(std::cin, riga)) {',
                '        for (char& c : riga) {',
                '            c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));',
                '        }',
                '        riga.erase(0, riga.find_first_not_of(" \\t"));',
                '        riga.erase(riga.find_last_not_of(" \\t\\r") + 1);',
                '        if (riga == "true" || riga == "false") {',
                '            return riga == "true";',
                '        }',
                '        std::cout << "Serve true o false: riprovare.\\n";',
                '    }',
                '    return false;',
                '}'
            ]
        }
    };
    var HELPER_ORDER = ['arrotonda', 'formatta', 'fisso', 'testo', 'segno', 'intero', 'reale',
        'leggi_intero', 'leggi_reale', 'leggi_testo', 'leggi_booleano'];
    var HELPER_INCLUDES = { leggi_booleano: ['cctype'] };
    var INPUT_HELPERS = { Integer: 'leggi_intero', Real: 'leggi_reale', String: 'leggi_testo', Boolean: 'leggi_booleano' };

    function eachBlock(blocks, visitor, depth) {
        blocks.forEach(function (block) {
            visitor(block, depth || 0);
            Model.childListsOf(block).forEach(function (list) { eachBlock(block[list], visitor, (depth || 0) + 1); });
        });
    }

    function generate(program, options) {
        var settings = options || {};
        var analysis = Codegen.analyze(program);
        var used = Object.create(null);
        var includes = { iostream: true, string: true };
        var currentFunction = null;
        var needsMaximum = false;
        var functionsByName = Object.create(null);
        program.functions.forEach(function (programFunction) {
            if (!(programFunction.name in functionsByName)) {
                functionsByName[programFunction.name] = programFunction;
            }
        });

        function use(helper) {
            used[helper] = true;
            var definition = HELPERS[helper];
            (definition.needs || []).forEach(use);
            (definition.includes || []).concat(HELPER_INCLUDES[helper] || []).forEach(function (header) { includes[header] = true; });
        }

        function name(text) {
            return RESERVED.indexOf(text) !== -1 ? text + '_' : text;
        }

        function type(ast) {
            return analysis.type(ast, currentFunction);
        }

        function symbol(variableName) {
            return analysis.symbols(currentFunction)[variableName];
        }

        // --- Lunghezze degli array (Size) -----------------------------------------------

        // Parametri array che vogliono anche la lunghezza: usano Size, o passano l'array a una
        // funzione che la vuole. Si ripete finché l'insieme non cresce più.
        var lengthParameters = Object.create(null); // "Funzione/parametro" → true
        (function () {
            var changed = true;
            while (changed) {
                changed = false;
                program.functions.forEach(function (programFunction) {
                    programFunction.parameters.forEach(function (parameter, index) {
                        var key = programFunction.name + '/' + index;
                        if (parameter.array && !lengthParameters[key] && arrayNeedsLength(programFunction, parameter.name)) {
                            lengthParameters[key] = true;
                            changed = true;
                        }
                    });
                });
            }
        })();

        /* La funzione chiede la lunghezza dell'array: con Size o passandolo a chi la vuole. */
        function arrayNeedsLength(programFunction, arrayName) {
            if (analysis.usesSize(programFunction, arrayName)) {
                return true;
            }
            var needed = false;
            function look(ast) {
                if (!ast || needed) {
                    return;
                }
                if (ast.kind === 'call') {
                    var callee = functionsByName[ast.name];
                    ast.args.forEach(function (argument, index) {
                        if (callee && argument.kind === 'variable' && argument.name === arrayName && lengthParameters[callee.name + '/' + index]) {
                            needed = true;
                        }
                        look(argument);
                    });
                } else if (ast.kind === 'binary') {
                    look(ast.left);
                    look(ast.right);
                } else if (ast.kind === 'unary') {
                    look(ast.operand);
                } else if (ast.kind === 'index') {
                    look(ast.index);
                }
            }
            eachBlock(programFunction.body, function (block) {
                Object.keys(block.fields).forEach(function (field) { look(block.fields[field].ast); });
            });
            return needed;
        }

        /* Lunghezza di un array della funzione corrente: un numero, un parametro o una variabile. */
        var arraySizes = Object.create(null); // nome → testo della dimensione, per la funzione corrente
        function lengthOf(arrayName) {
            return arraySizes[arrayName] || 'lunghezza_' + name(arrayName);
        }

        // --- Espressioni ---------------------------------------------------------------

        function wrap(code, level, minimum) {
            return level < minimum ? '(' + code + ')' : code;
        }

        function literal(ast) {
            switch (ast.type) {
                case 'String':
                    return JSON.stringify(ast.value);
                case 'Boolean':
                    return ast.value ? 'true' : 'false';
                case 'Real':
                    return /[.eE]/.test(ast.text) ? ast.text : ast.text + '.0';
                default:
                    return String(ast.value);
            }
        }

        /* Un'espressione dove serve un int: un risultato di ^ (double in C++) si converte. */
        function integer(ast, minimum) {
            if (type(ast) === 'Number') {
                return 'static_cast<int>(' + expression(ast, 0) + ')';
            }
            return expression(ast, minimum);
        }

        /* Testo di un valore per & e ToString, come lo scrive OnoFlow. */
        function asText(ast) {
            var valueType = type(ast);
            if (valueType === 'String') {
                return expression(ast, PRECEDENCE.sum + 1);
            }
            if (valueType === 'Integer') {
                return 'std::to_string(' + expression(ast, 0) + ')';
            }
            if (valueType === 'Boolean') {
                use('testo');
                return 'testo(' + expression(ast, 0) + ')';
            }
            use('formatta');
            return 'formatta(' + expression(ast, 0) + ')';
        }

        function call(ast) {
            var args = ast.args;
            var plain = function (index) { return expression(args[index], 0); };
            var math = function (functionName) {
                includes.cmath = true;
                return 'std::' + functionName + '(' + plain(0) + ')';
            };
            switch (ast.name) {
                case 'Abs': includes.cmath = true; return 'std::abs(' + plain(0) + ')';
                case 'Arccos': return math('acos');
                case 'Arcsin': return math('asin');
                case 'Arctan': return math('atan');
                case 'Cos': return math('cos');
                case 'Sin': return math('sin');
                case 'Tan': return math('tan');
                case 'Sqrt': return math('sqrt');
                case 'Log': return math('log');
                case 'Log10': return math('log10');
                case 'Int': return 'static_cast<int>(' + plain(0) + ')';
                case 'Sgn': use('segno'); return 'segno(' + plain(0) + ')';
                case 'Len': return 'static_cast<int>(' + expression(args[0], PRECEDENCE.atom) + '.length())';
                case 'Char': return 'std::string(1, ' + expression(args[0], PRECEDENCE.atom) + '[' + integer(args[1], 0) + '])';
                case 'Size': return lengthOf(args[0].name);
                case 'Random': includes.cstdlib = true; return 'std::rand() % ' + integer(args[0], PRECEDENCE.product + 1);
                case 'ToChar': return 'std::string(1, static_cast<char>(' + integer(args[0], 0) + '))';
                case 'ToCode': return 'static_cast<int>(static_cast<unsigned char>(' + expression(args[0], PRECEDENCE.atom) + '[0]))';
                case 'ToFixed': use('fisso'); return 'fisso(' + plain(0) + ', ' + integer(args[1], 0) + ')';
                case 'ToInteger': use('intero'); return 'intero(' + plain(0) + ')';
                case 'ToReal': use('reale'); return 'reale(' + plain(0) + ')';
                case 'ToString': {
                    var text = asText(args[0]);
                    return type(args[0]) === 'String' ? 'std::string(' + plain(0) + ')' : text;
                }
                default: {
                    var callee = functionsByName[ast.name];
                    var codes = [];
                    args.forEach(function (argument, index) {
                        var parameter = callee ? callee.parameters[index] : null;
                        codes.push(parameter && parameter.type === 'Integer' && !parameter.array ? integer(argument, 0) : expression(argument, 0));
                        if (callee && lengthParameters[callee.name + '/' + index]) {
                            codes.push(lengthOf(argument.name));
                        }
                    });
                    return name(ast.name) + '(' + codes.join(', ') + ')';
                }
            }
        }

        function expression(ast, minimum) {
            switch (ast.kind) {
                case 'literal': {
                    var text = literal(ast);
                    return text.charAt(0) === '-' ? wrap(text, PRECEDENCE.unary, minimum) : text;
                }
                case 'variable':
                    return name(ast.name);
                case 'index':
                    return name(ast.name) + '[' + integer(ast.index, 0) + ']';
                case 'call':
                    return call(ast);
                case 'unary':
                    if (ast.operator === 'not') {
                        return wrap('!' + expression(ast.operand, PRECEDENCE.unary), PRECEDENCE.unary, minimum);
                    }
                    if (ast.operator === '+') {
                        return expression(ast.operand, minimum);
                    }
                    return wrap('-' + expression(ast.operand, PRECEDENCE.unary), PRECEDENCE.unary, minimum);
                case 'binary':
                    return binary(ast, minimum);
                default:
                    throw new Error('CodegenCpp: nodo sconosciuto ' + ast.kind);
            }
        }

        function binary(ast, minimum) {
            var operator = ast.operator;
            if (operator === '&') {
                return wrap(concatenation(ast), PRECEDENCE.sum, minimum);
            }
            if (operator === '^') {
                includes.cmath = true;
                return 'std::pow(' + expression(ast.left, 0) + ', ' + expression(ast.right, 0) + ')';
            }
            var level = PRECEDENCE[BINARY[operator].level];
            var left;
            var right;
            if (operator === 'mod') {
                left = integer(ast.left, level);
                right = integer(ast.right, level + 1);
            } else if (operator === '/' && type(ast.left) === 'Integer' && type(ast.right) === 'Integer') {
                // In OnoFlow / dà sempre un Real (FR-GEN-02): uno dei due diventa double.
                left = ast.left.kind === 'literal' ? ast.left.value + '.0' : 'static_cast<double>(' + expression(ast.left, 0) + ')';
                right = expression(ast.right, level + 1);
            } else if (operator === 'or') {
                // Un && dentro un || sempre tra parentesi: si legge senza ricordare le precedenze.
                left = expression(ast.left, ast.left.operator === 'and' ? level + 2 : level);
                right = expression(ast.right, ast.right.operator === 'and' ? level + 2 : level + 1);
            } else {
                left = expression(ast.left, level);
                right = expression(ast.right, level + 1);
                // Due testi letterali: "Z" < "a" confronterebbe gli indirizzi, non le lettere.
                if (ast.left.kind === 'literal' && ast.left.type === 'String' && BINARY[operator].level !== 'sum') {
                    left = 'std::string(' + left + ')';
                }
            }
            return wrap(left + ' ' + BINARY[operator].text + ' ' + right, level, minimum);
        }

        /* Catena di &: + tra std::string, con i numeri scritti come OnoFlow. */
        function concatenation(ast) {
            var parts = [];
            (function collect(node) {
                if (node.kind === 'binary' && node.operator === '&') {
                    collect(node.left);
                    collect(node.right);
                } else {
                    parts.push({ node: node, code: asText(node) });
                }
            })(ast);
            // Due letterali all'inizio non si sommano in C++: il primo diventa una std::string.
            var first = parts[0];
            var isLiteral = function (part) { return part.node.kind === 'literal' && part.node.type === 'String'; };
            if (isLiteral(first) && (parts.length === 1 || isLiteral(parts[1]))) {
                first.code = 'std::string(' + first.code + ')';
            }
            return parts.map(function (part) { return part.code; }).join(' + ');
        }

        function target(ast) {
            return ast.kind === 'index' ? name(ast.name) + '[' + integer(ast.index, 0) + ']' : name(ast.name);
        }

        // --- Dichiarazioni ---------------------------------------------------------------

        /* Righe di una dichiarazione; insideBlock: dentro un if o un ciclo (sale in cima). */
        function declaration(block) {
            var cppType = TYPES[block.type];
            var names = block.fields.names.ast.names.map(function (entry) { return entry.name; });
            if (!block.array) {
                return [cppType + ' ' + names.map(name).join(', ') + ';'];
            }
            var sizeAst = block.fields.size.ast;
            var literalSize = sizeAst.kind === 'literal' && sizeAst.type === 'Integer';
            var lines = [];
            names.forEach(function (arrayName) {
                if (literalSize) {
                    arraySizes[arrayName] = String(sizeAst.value);
                    lines.push(cppType + ' ' + name(arrayName) + '[' + sizeAst.value + '] = {};');
                    return;
                }
                needsMaximum = true;
                lines.push(cppType + ' ' + name(arrayName) + '[MAX_ELEMENTI] = {};  // ne servono ' + expression(sizeAst, 0));
            });
            return lines;
        }

        /* Lunghezze da ricordare per gli array con una dimensione calcolata, se servono. */
        function lengthAssignments(block, declareHere) {
            if (!block.array) {
                return [];
            }
            var sizeAst = block.fields.size.ast;
            if (sizeAst.kind === 'literal') {
                return [];
            }
            var lines = [];
            block.fields.names.ast.names.forEach(function (entry) {
                if (arrayNeedsLength(currentFunction, entry.name)) {
                    lines.push((declareHere ? 'int ' : '') + 'lunghezza_' + name(entry.name) + ' = ' + integer(sizeAst, 0) + ';');
                }
            });
            return lines;
        }

        // --- Blocchi ---------------------------------------------------------------------

        function hasCode(list) {
            return list.some(function (block) {
                return block.kind !== 'declare' || lengthAssignments(block, false).length > 0;
            });
        }

        function body(list, out) {
            list.forEach(function (block) { statement(block, out, true); });
        }

        function statement(block, out, nested) {
            var fields = block.fields;
            switch (block.kind) {
                case 'declare':
                    if (!nested) {
                        declaration(block).forEach(function (line) { out.line(line); });
                        lengthAssignments(block, true).forEach(function (line) { out.line(line); });
                    } else {
                        // La dichiarazione è già in cima alla funzione; qui resta la lunghezza.
                        lengthAssignments(block, false).forEach(function (line) { out.line(line); });
                    }
                    break;
                case 'assign': {
                    var assigned = symbol(fields.variable.ast.name);
                    var value = assigned && assigned.type === 'Integer' ? integer(fields.expression.ast, 0) : expression(fields.expression.ast, 0);
                    out.line(target(fields.variable.ast) + ' = ' + value + ';');
                    break;
                }
                case 'input': {
                    var read = symbol(fields.variable.ast.name);
                    var helper = INPUT_HELPERS[read ? read.type : 'Integer'];
                    use(helper);
                    out.line(target(fields.variable.ast) + ' = ' + helper + '();');
                    break;
                }
                case 'output': {
                    // Una catena di & diventa una catena di <<: ogni parte scritta come in OnoFlow.
                    var parts = [];
                    (function collect(node) {
                        if (node.kind === 'binary' && node.operator === '&') {
                            collect(node.left);
                            collect(node.right);
                        } else if (!(node.kind === 'literal' && node.type === 'String' && node.value === '')) {
                            var partType = type(node);
                            parts.push(partType === 'String' || partType === 'Integer' ? expression(node, PRECEDENCE.sum) : asText(node));
                        }
                    })(fields.expression.ast);
                    if (block.newline) {
                        var last = parts[parts.length - 1];
                        if (last && /^"(?:[^"\\]|\\.)*"$/.test(last)) {
                            parts[parts.length - 1] = last.slice(0, -1) + '\\n"'; // "Ciao" << "\n" → "Ciao\n"
                        } else {
                            parts.push('"\\n"');
                        }
                    }
                    if (parts.length) {
                        out.line('std::cout << ' + parts.join(' << ') + ';');
                    }
                    break;
                }
                case 'if': {
                    var condition = fields.expression.ast;
                    var thenList = block.then;
                    var elseList = block['else'];
                    if (!hasCode(thenList) && hasCode(elseList)) {
                        condition = Codegen.negate(condition);
                        thenList = elseList;
                        elseList = [];
                    }
                    out.line('if (' + expression(condition, 0) + ') {');
                    out.indent();
                    body(thenList, out);
                    out.dedent();
                    if (hasCode(elseList)) {
                        out.line('} else {');
                        out.indent();
                        body(elseList, out);
                        out.dedent();
                    }
                    out.line('}');
                    break;
                }
                case 'while':
                    out.line('while (' + expression(fields.expression.ast, 0) + ') {');
                    out.indent();
                    body(block.body, out);
                    out.dedent();
                    out.line('}');
                    break;
                case 'do':
                    out.line('do {');
                    out.indent();
                    body(block.body, out);
                    out.dedent();
                    out.line('} while (' + expression(fields.expression.ast, 0) + ');');
                    break;
                case 'for':
                    forLoop(block, out);
                    break;
                case 'call':
                    out.line(expression(fields.expression.ast, 0) + ';');
                    break;
                case 'comment':
                    String(block.text).split(/\r?\n/).forEach(function (text) {
                        out.line(text.trim() === '' ? '//' : '// ' + text);
                    });
                    break;
                default:
                    throw new Error('CodegenCpp: blocco sconosciuto ' + block.kind);
            }
        }

        function forLoop(block, out) {
            var fields = block.fields;
            var variable = name(fields.variable.ast.name);
            var step = fields.step.ast.value;
            var increasing = block.direction !== 'dec';
            // In OnoFlow la fine si valuta una volta: se il corpo può cambiarla (o è una chiamata), la si
            // copia prima del ciclo.
            var endAst = fields.end.ast;
            var end = integer(endAst, PRECEDENCE.relational + 1);
            var changing = hasCalls(endAst) || Codegen.variablesIn(endAst).some(function (used) {
                return Codegen.assignsTo(block.body, used);
            });
            if (changing) {
                out.line('int fine_' + variable + ' = ' + integer(endAst, 0) + ';');
                end = 'fine_' + variable;
            }
            // i <= n - 1 si scrive i < n, come si fa di solito in C++.
            var below = increasing && step === 1 && endAst.kind === 'binary' && endAst.operator === '-' &&
                endAst.right.kind === 'literal' && endAst.right.type === 'Integer' && endAst.right.value === 1;
            var comparison = below ? ' < ' + (end.indexOf('fine_') === 0 ? end : integer(endAst.left, PRECEDENCE.relational + 1))
                : (increasing ? ' <= ' : ' >= ') + end;
            if (below && end.indexOf('fine_') === 0) {
                comparison = ' <= ' + end;
            }
            var update = step === 1 ? variable + (increasing ? '++' : '--') : variable + (increasing ? ' += ' : ' -= ') + step;
            out.line('for (' + variable + ' = ' + integer(fields.start.ast, 0) + '; ' + variable + comparison + '; ' + update + ') {');
            out.indent();
            body(block.body, out);
            out.dedent();
            out.line('}');
        }

        /* Vero se l'espressione chiama una funzione dell'utente o Random: valutarla di nuovo cambia qualcosa. */
        function hasCalls(ast) {
            if (!ast) {
                return false;
            }
            switch (ast.kind) {
                case 'call':
                    return Boolean(functionsByName[ast.name]) || ast.name === 'Random' || ast.args.some(hasCalls);
                case 'index':
                    return hasCalls(ast.index);
                case 'unary':
                    return hasCalls(ast.operand);
                case 'binary':
                    return hasCalls(ast.left) || hasCalls(ast.right);
                default:
                    return false;
            }
        }

        // --- Funzioni e file -----------------------------------------------------------------

        function signature(programFunction) {
            var returned = programFunction.name === 'Main' ? 'int' : (programFunction.type === 'None' ? 'void' : TYPES[programFunction.type]);
            var title = programFunction.name === 'Main' ? 'main' : name(programFunction.name);
            var parameters = [];
            programFunction.parameters.forEach(function (parameter, index) {
                if (parameter.array) {
                    parameters.push(TYPES[parameter.type] + ' ' + name(parameter.name) + '[]');
                    if (lengthParameters[programFunction.name + '/' + index]) {
                        parameters.push('int lunghezza_' + name(parameter.name));
                    }
                } else {
                    parameters.push(TYPES[parameter.type] + ' ' + name(parameter.name));
                }
            });
            return returned + ' ' + title + '(' + parameters.join(', ') + ')';
        }

        function functionCode(programFunction) {
            currentFunction = programFunction;
            arraySizes = Object.create(null);
            var out = new Codegen.Writer('    ');
            out.line(signature(programFunction) + ' {');
            out.indent();
            // Le dichiarazioni dentro un if o un ciclo salgono qui: in OnoFlow valgono in tutta la funzione.
            eachBlock(programFunction.body, function (block, depth) {
                if (block.kind === 'declare' && depth > 0) {
                    declaration(block).forEach(function (line) { out.line(line); });
                    lengthAssignments(block, false).forEach(function (line) {
                        out.line('int ' + line.split(' = ')[0] + ';');
                    });
                }
            });
            programFunction.body.forEach(function (block) { statement(block, out, false); });
            if (programFunction.name === 'Main') {
                out.line('return 0;');
            } else if (programFunction.type !== 'None' && programFunction.variable) {
                out.line('return ' + name(programFunction.variable) + ';');
            }
            out.dedent();
            out.line('}');
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
        var ordered = others.concat(main ? [main] : []);
        var bodies = ordered.map(functionCode);

        // Prototipi solo se una funzione ne chiama una scritta più avanti.
        var needsPrototypes = others.some(function (programFunction, position) {
            var later = others.slice(position);
            var calls = false;
            eachBlock(programFunction.body, function (block) {
                Object.keys(block.fields).forEach(function (field) {
                    (function look(ast) {
                        if (!ast || calls) {
                            return;
                        }
                        if (ast.kind === 'call' && later.some(function (other) { return other.name === ast.name; })) {
                            calls = true;
                        }
                        (ast.args || []).forEach(look);
                        ['left', 'right', 'operand', 'index'].forEach(function (key) { look(ast[key]); });
                    })(block.fields[field].ast);
                });
            });
            return calls;
        });

        var out = new Codegen.Writer('    ');
        out.line('// ' + (settings.title ? settings.title + ' — ' : '') + 'generato da OnoFlow (C++17)');
        out.blank();
        Object.keys(includes).sort().forEach(function (header) { out.line('#include <' + header + '>'); });
        if (needsMaximum) {
            out.blank();
            out.line('// Gli array con una dimensione calcolata (in OnoFlow, durante l\'esecuzione) hanno');
            out.line('// questa misura fissa: va aumentata se servono più elementi.');
            out.line('const int MAX_ELEMENTI = ' + MAX_ELEMENTS + ';');
        }
        // Prima il programma del diagramma, poi le funzioni di aiuto: chi legge trova subito il suo
        // codice. In C++ una funzione va dichiarata prima dell'uso: in cima ci sono i prototipi.
        var helpers = HELPER_ORDER.filter(function (helper) { return used[helper]; });
        if (helpers.length) {
            out.blank();
            out.line('// Funzioni di aiuto, scritte in fondo al file: fanno come OnoFlow dove il C++ fa diversamente.');
            helpers.forEach(function (helper) {
                var lines = HELPERS[helper].lines;
                out.line(lines.filter(function (line) { return line.indexOf('//') !== 0; })[0].replace(/ \{$/, ';'));
            });
        }
        if (needsPrototypes) {
            out.blank();
            others.forEach(function (programFunction) { out.line(signature(programFunction) + ';'); });
        }
        bodies.forEach(function (lines) {
            out.blank();
            lines.forEach(function (line) { out.lines.push(line); });
        });
        if (helpers.length) {
            out.blank();
            out.line('// --- Funzioni di aiuto ---');
        }
        helpers.forEach(function (helper) {
            out.blank();
            HELPERS[helper].lines.forEach(function (line) { out.line(line); });
        });
        return out.text();
    }

    OnoFlow.CodegenCpp = { generate: generate, RESERVED: RESERVED, MAX_ELEMENTS: MAX_ELEMENTS };
})(window.OnoFlow);
