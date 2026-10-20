/*
 * OnoFlow — espressioni: analisi sintattica (parser di Pratt).
 *
 * Dipendenze: js/namespace.js, js/core/expression-lexer.js.
 * Definisce: OnoFlow.Expressions.{parse, parseExpression, parseTarget, parseNameList,
 *            parseName, parseForStep, describe, FIELD_KINDS}
 *
 * Ogni funzione di analisi restituisce { ast, error }: ast è null se c'è un errore.
 * L'errore è il primo nell'ordine di lettura, nella forma
 *     { code, params, position: { start, end, column } }
 * (§8.2: basta il primo errore per espressione). Il parser è una funzione normale,
 * non un generatore (§10.3).
 *
 * Nodi dell'AST (start/end = posizione nel testo):
 *     { kind: 'literal', type: 'Integer'|'Real'|'String'|'Boolean', value, text }
 *     { kind: 'variable', name }
 *     { kind: 'index', name, index }               a[i]
 *     { kind: 'call', name, args }                  f(a, b)
 *     { kind: 'unary', operator: '-'|'+'|'not', operand }
 *     { kind: 'binary', operator, left, right }
 *     { kind: 'nameList', names: [{ name, start, end }] }
 *     { kind: 'name', name }
 * Gli operatori sono in forma canonica: '==' per = e ==, '!=' per != e <>, 'and' per && ,
 * 'or' per ||, 'not' per !, 'mod' per %. Le parentesi non producono nodi (§6.3).
 *
 * Precedenze (§6.3), dalla più forte: chiamata e indice; ^ (a destra); segno e not;
 * * / mod; + -; &; confronti (non associativi); and; or.
 */
(function (OnoFlow) {
    'use strict';

    var Expressions = OnoFlow.Expressions;
    if (!Expressions || !Expressions.tokenize) {
        throw new Error('expression-parser.js richiede expression-lexer.js, da caricare prima');
    }

    var BP_OR = 10;
    var BP_AND = 20;
    var BP_COMPARISON = 30;
    var BP_CONCAT = 40;
    var BP_ADDITIVE = 50;
    var BP_MULTIPLICATIVE = 60;
    var BP_UNARY = 70;
    var BP_POWER = 80;
    var BP_POSTFIX = 90;

    // Annidamento massimo: protegge da testi patologici che esaurirebbero lo stack.
    var MAX_DEPTH = 100;
    var MIN_INTEGER_MAGNITUDE = 2147483648n; // |-2147483648|, ammesso solo dopo un meno (DEC-001)

    /* Operatori infissi: testo del token → { bp, operator canonico }. */
    var INFIX = {
        'or': { bp: BP_OR, operator: 'or' },
        '||': { bp: BP_OR, operator: 'or' },
        'and': { bp: BP_AND, operator: 'and' },
        '&&': { bp: BP_AND, operator: 'and' },
        '=': { bp: BP_COMPARISON, operator: '==' },
        '==': { bp: BP_COMPARISON, operator: '==' },
        '!=': { bp: BP_COMPARISON, operator: '!=' },
        '<>': { bp: BP_COMPARISON, operator: '!=' },
        '<': { bp: BP_COMPARISON, operator: '<' },
        '<=': { bp: BP_COMPARISON, operator: '<=' },
        '>': { bp: BP_COMPARISON, operator: '>' },
        '>=': { bp: BP_COMPARISON, operator: '>=' },
        '&': { bp: BP_CONCAT, operator: '&' },
        '+': { bp: BP_ADDITIVE, operator: '+' },
        '-': { bp: BP_ADDITIVE, operator: '-' },
        '*': { bp: BP_MULTIPLICATIVE, operator: '*' },
        '/': { bp: BP_MULTIPLICATIVE, operator: '/' },
        'mod': { bp: BP_MULTIPLICATIVE, operator: 'mod' },
        '%': { bp: BP_MULTIPLICATIVE, operator: 'mod' },
        '^': { bp: BP_POWER, operator: '^' },
        // Dopo un'espressione che non è un nome, [ e ( sono errori (a[i][j], f(x)[0], 2(3)).
        '[': { bp: BP_POSTFIX, operator: null },
        '(': { bp: BP_POSTFIX, operator: null }
    };

    var FIELD_KINDS = ['expression', 'target', 'nameList', 'name', 'forStep'];

    /* Errore di analisi: interrompe il parser e risale fino alla funzione pubblica. */
    function ParseFailure(error) {
        this.error = error;
    }

    function makeError(code, params, start, end) {
        return { code: code, params: params || {}, position: { start: start, end: end, column: start + 1 } };
    }

    function fail(code, params, start, end) {
        throw new ParseFailure(makeError(code, params, start, end));
    }

    function isKeyword(token, word) {
        return token.type === 'keyword' && token.text === word;
    }

    function isOperator(token, symbol) {
        return token.type === 'operator' && token.text === symbol;
    }

    function infixOf(token) {
        if (token.type === 'operator' || token.type === 'keyword') {
            return INFIX[token.text] || null;
        }
        return null;
    }

    function isComparison(token) {
        var infix = infixOf(token);
        return Boolean(infix && infix.bp === BP_COMPARISON);
    }

    /* Una parola chiave scritta con le maiuscole (AND, True, Mod...) è un nome, ma quasi sempre è un errore. */
    function miscasedKeyword(token) {
        if (token.type !== 'identifier') {
            return null;
        }
        var lower = token.text.toLowerCase();
        return Expressions.KEYWORDS.indexOf(lower) !== -1 ? lower : null;
    }

    function TokenStream(text) {
        this.tokens = Expressions.tokenize(text);
        this.index = 0;
    }

    TokenStream.prototype.peek = function (offset) {
        var position = Math.min(this.index + (offset || 0), this.tokens.length - 1);
        return this.tokens[position];
    };

    TokenStream.prototype.previous = function () {
        return this.index > 0 ? this.tokens[this.index - 1] : null;
    };

    /* Il prossimo token, se è un errore lessicale lo si segnala adesso. */
    TokenStream.prototype.current = function () {
        var token = this.peek();
        if (token.type === 'error') {
            throw new ParseFailure(token.error);
        }
        return token;
    };

    TokenStream.prototype.advance = function () {
        var token = this.current();
        if (token.type !== 'end') {
            this.index++;
        }
        return token;
    };

    /* Errore per un token che non doveva esserci, con i suggerimenti della §8.4. */
    function unexpected(stream, token) {
        if (token.type === 'end') {
            fail('ERR_SYNTAX_UNEXPECTED_END', {}, token.start, token.end);
        }
        var lower = miscasedKeyword(token);
        if (lower) {
            fail('ERR_SYNTAX_UNEXPECTED_TOKEN', { reason: 'keywordCase', token: token.text, suggestion: lower },
                token.start, token.end);
        }
        var before = stream.tokens[stream.tokens.indexOf(token) - 1];
        var beforeLower = before ? miscasedKeyword(before) : null;
        if (beforeLower) {
            fail('ERR_SYNTAX_UNEXPECTED_TOKEN', { reason: 'keywordCase', token: before.text, suggestion: beforeLower },
                before.start, before.end);
        }
        if (isOperator(token, ',') && before && (before.type === 'integer' || before.type === 'real') &&
            before.end === token.start) {
            // "2,5": la virgola decimale si usa solo nella console.
            var after = stream.tokens[stream.tokens.indexOf(token) + 1];
            if (after && after.type === 'integer' && after.start === token.end) {
                fail('ERR_SYNTAX_UNEXPECTED_TOKEN',
                    { reason: 'decimalComma', token: ',', suggestion: before.text + '.' + after.text },
                    before.start, after.end);
            }
        }
        fail('ERR_SYNTAX_UNEXPECTED_TOKEN', { token: token.text }, token.start, token.end);
    }

    /* Consuma la parentesi di chiusura attesa; se manca, segnala quella aperta o il token sbagliato. */
    function expectClosing(stream, opening, closingSymbol) {
        var token = stream.current();
        if (isOperator(token, closingSymbol)) {
            return stream.advance();
        }
        if (token.type === 'end') {
            fail('ERR_SYNTAX_UNCLOSED', { open: opening.text, close: closingSymbol }, opening.start, opening.end);
        }
        return unexpected(stream, token);
    }

    function Parser(text) {
        this.stream = new TokenStream(text);
        this.depth = 0;
    }

    Parser.prototype.parse = function (rightBindingPower) {
        var stream = this.stream;
        this.depth++;
        if (this.depth > MAX_DEPTH) {
            var here = stream.peek();
            fail('ERR_SYNTAX_TOO_COMPLEX', {}, here.start, here.end);
        }
        var left = this.nud(stream.advance());
        while (true) {
            var infix = infixOf(stream.current());
            if (!infix || infix.bp <= rightBindingPower) {
                break;
            }
            left = this.led(stream.advance(), left, infix);
        }
        this.depth--;
        return left;
    };

    /* Inizio di un'espressione (prefisso). */
    Parser.prototype.nud = function (token) {
        var stream = this.stream;

        switch (token.type) {
            case 'integer':
                if (token.outOfRange) {
                    fail('ERR_INTEGER_LITERAL_OUT_OF_RANGE', { text: token.text }, token.start, token.end);
                }
                return { kind: 'literal', type: 'Integer', value: token.value, text: token.text, start: token.start, end: token.end };
            case 'real':
                if (!isFinite(token.value)) {
                    fail('ERR_REAL_LITERAL_OUT_OF_RANGE', { text: token.text }, token.start, token.end);
                }
                return { kind: 'literal', type: 'Real', value: token.value, text: token.text, start: token.start, end: token.end };
            case 'string':
                return { kind: 'literal', type: 'String', value: token.value, text: token.text, start: token.start, end: token.end };
            case 'identifier':
                return this.name(token);
            case 'end':
                return unexpected(stream, token);
            default:
                break;
        }

        if (isKeyword(token, 'true') || isKeyword(token, 'false')) {
            return {
                kind: 'literal', type: 'Boolean', value: token.text === 'true', text: token.text,
                start: token.start, end: token.end
            };
        }
        if (isKeyword(token, 'not') || isOperator(token, '!')) {
            var negated = this.parse(BP_UNARY);
            return { kind: 'unary', operator: 'not', operand: negated, start: token.start, end: negated.end };
        }
        if (isOperator(token, '-') || isOperator(token, '+')) {
            return this.sign(token);
        }
        if (isOperator(token, '(')) {
            var inner = this.parse(0);
            expectClosing(stream, token, ')');
            return inner;
        }
        return unexpected(stream, token);
    };

    /* Segno unario. -2147483648 è ammesso solo se il letterale è l'operando diretto (DEC-001). */
    Parser.prototype.sign = function (token) {
        var stream = this.stream;
        var operator = token.text;
        var literal = stream.peek();
        var following = stream.peek(1);
        if (operator === '-' && literal.type === 'integer' && literal.magnitude === MIN_INTEGER_MAGNITUDE &&
            !isOperator(following, '^') && !isOperator(following, '[') && !isOperator(following, '(')) {
            stream.advance();
            return {
                kind: 'unary', operator: '-', start: token.start, end: literal.end,
                operand: { kind: 'literal', type: 'Integer', value: literal.value, text: literal.text, start: literal.start, end: literal.end }
            };
        }
        var operand = this.parse(BP_UNARY);
        return { kind: 'unary', operator: operator, operand: operand, start: token.start, end: operand.end };
    };

    /* Nome: variabile, elemento di array o chiamata di funzione. */
    Parser.prototype.name = function (token) {
        var stream = this.stream;
        var next = stream.current();

        if (isOperator(next, '(')) {
            var opening = stream.advance();
            var args = [];
            if (isOperator(stream.current(), ')')) {
                var emptyClose = stream.advance();
                return { kind: 'call', name: token.text, args: args, start: token.start, end: emptyClose.end };
            }
            while (true) {
                args.push(this.parse(0));
                var separator = stream.current();
                if (isOperator(separator, ',')) {
                    stream.advance();
                    continue;
                }
                var close = expectClosing(stream, opening, ')');
                return { kind: 'call', name: token.text, args: args, start: token.start, end: close.end };
            }
        }

        if (isOperator(next, '[')) {
            var bracket = stream.advance();
            if (isOperator(stream.current(), ']')) {
                var emptyIndexEnd = stream.peek();
                fail('ERR_SYNTAX_INVALID_INDEX', { reason: 'empty' }, bracket.start, emptyIndexEnd.end);
            }
            var index = this.parse(0);
            var afterIndex = stream.current();
            if (isOperator(afterIndex, ',')) {
                fail('ERR_SYNTAX_INVALID_INDEX', { reason: 'multiple' }, afterIndex.start, afterIndex.end);
            }
            var closeBracket = expectClosing(stream, bracket, ']');
            return { kind: 'index', name: token.text, index: index, start: token.start, end: closeBracket.end };
        }

        return { kind: 'variable', name: token.text, start: token.start, end: token.end };
    };

    /* Operatore dopo un'espressione (infisso o postfisso). */
    Parser.prototype.led = function (token, left, infix) {
        var stream = this.stream;
        if (isOperator(token, '[')) {
            fail('ERR_SYNTAX_INVALID_INDEX', { reason: 'nested' }, token.start, token.end);
        }
        if (isOperator(token, '(')) {
            fail('ERR_SYNTAX_UNEXPECTED_TOKEN', { token: '(' }, token.start, token.end);
        }
        // ^ associa a destra: l'operando destro si legge con una precedenza appena più bassa.
        var rightPower = infix.operator === '^' ? BP_POWER - 1 : infix.bp;
        var right = this.parse(rightPower);
        if (infix.bp === BP_COMPARISON && isComparison(stream.current())) {
            var chained = stream.current();
            fail('ERR_SYNTAX_CHAINED_COMPARISON', {}, chained.start, chained.end);
        }
        return { kind: 'binary', operator: infix.operator, left: left, right: right, start: left.start, end: right.end };
    };

    /* Esegue un'analisi e converte i fallimenti in { ast: null, error }. */
    function run(text, analyze) {
        if (String(text).trim() === '') {
            var length = String(text).length;
            return { ast: null, error: makeError('ERR_SYNTAX_EMPTY_EXPRESSION', {}, 0, length) };
        }
        var parser = new Parser(String(text));
        try {
            return { ast: analyze(parser), error: null };
        } catch (failure) {
            if (failure instanceof ParseFailure) {
                return { ast: null, error: failure.error };
            }
            throw failure;
        }
    }

    function wholeExpression(parser) {
        var ast = parser.parse(0);
        var rest = parser.stream.current();
        if (rest.type !== 'end') {
            unexpected(parser.stream, rest);
        }
        return ast;
    }

    /* Espressione completa: condizioni, valori, argomenti di output, dimensioni... */
    function parseExpression(text) {
        return run(text, wholeExpression);
    }

    /* Bersaglio di assegnazione e input: nome oppure nome[espressione] (§6.5). */
    function parseTarget(text) {
        return run(text, function (parser) {
            var ast = wholeExpression(parser);
            if (ast.kind !== 'variable' && ast.kind !== 'index') {
                fail('ERR_SYNTAX_INVALID_TARGET', {}, ast.start, ast.end);
            }
            return ast;
        });
    }

    /* Elenco di nomi di una dichiarazione: a, b, c (§7.3). */
    function parseNameList(text) {
        return run(text, function (parser) {
            var stream = parser.stream;
            var names = [];
            while (true) {
                var token = stream.current();
                if (token.type === 'keyword') {
                    fail('ERR_NAME_LIST_INVALID', { reason: 'keyword', name: token.text }, token.start, token.end);
                }
                if (token.type !== 'identifier') {
                    fail('ERR_NAME_LIST_INVALID', {}, token.start, token.end);
                }
                stream.advance();
                names.push({ name: token.text, start: token.start, end: token.end });
                var after = stream.current();
                if (after.type === 'end') {
                    break;
                }
                if (!isOperator(after, ',')) {
                    fail('ERR_NAME_LIST_INVALID', {}, after.start, after.end);
                }
                stream.advance();
            }
            return { kind: 'nameList', names: names, start: names[0].start, end: names[names.length - 1].end };
        });
    }

    /* Un solo nome, senza indice: variabile del for, nomi di funzioni e parametri. */
    function parseName(text) {
        return run(text, function (parser) {
            var stream = parser.stream;
            var token = stream.current();
            if (token.type === 'keyword') {
                fail('ERR_INVALID_NAME', { reason: 'keyword', text: token.text }, token.start, token.end);
            }
            var after = stream.peek(1);
            if (token.type === 'identifier' && isOperator(after, '[')) {
                var last = stream.tokens[stream.tokens.length - 1];
                fail('ERR_INVALID_NAME', { reason: 'indexed', text: String(text).trim() }, token.start, last.start);
            }
            if (token.type !== 'identifier') {
                fail('ERR_INVALID_NAME', { text: String(text).trim() }, token.start, token.end);
            }
            stream.advance();
            var rest = stream.current();
            if (rest.type !== 'end') {
                fail('ERR_INVALID_NAME', { text: String(text).trim() }, rest.start, rest.end);
            }
            return { kind: 'name', name: token.text, start: token.start, end: token.end };
        });
    }

    /* Passo del for: letterale Integer maggiore di zero, senza segno (§6.7). */
    function parseForStep(text) {
        return run(text, function () {
            var source = String(text);
            var trimmed = source.trim();
            var start = source.indexOf(trimmed);
            var end = start + trimmed.length;
            if (!/^[0-9]+$/.test(trimmed)) {
                fail('ERR_FOR_STEP_INVALID', { text: trimmed }, start, end);
            }
            var big = BigInt(trimmed);
            if (big < 1n || big > 2147483647n) {
                fail('ERR_FOR_STEP_INVALID', { text: trimmed }, start, end);
            }
            return { kind: 'literal', type: 'Integer', value: Number(big), text: trimmed, start: start, end: end };
        });
    }

    var PARSERS = {
        expression: parseExpression,
        target: parseTarget,
        nameList: parseNameList,
        name: parseName,
        forStep: parseForStep
    };

    /* Analizza il testo di un campo del tipo indicato (uno di FIELD_KINDS). */
    function parse(kind, text) {
        var parser = PARSERS[kind];
        if (!parser) {
            throw new TypeError('Expressions.parse: tipo di campo sconosciuto ' + kind);
        }
        return parser(text);
    }

    /*
     * Forma canonica e completamente parentesizzata di un AST: serve ai test e ai
     * messaggi, che mostrano gli operatori sempre nello stesso modo (§8.4).
     */
    function describe(node) {
        switch (node.kind) {
            case 'literal':
                return node.text;
            case 'variable':
            case 'name':
                return node.name;
            case 'index':
                return node.name + '[' + describe(node.index) + ']';
            case 'call':
                return node.name + '(' + node.args.map(describe).join(', ') + ')';
            case 'unary':
                return '(' + (node.operator === 'not' ? 'not ' : node.operator) + describe(node.operand) + ')';
            case 'binary':
                return '(' + describe(node.left) + ' ' + node.operator + ' ' + describe(node.right) + ')';
            case 'nameList':
                return node.names.map(function (entry) { return entry.name; }).join(', ');
            default:
                throw new TypeError('Expressions.describe: nodo sconosciuto ' + node.kind);
        }
    }

    Expressions.FIELD_KINDS = FIELD_KINDS;
    Expressions.parse = parse;
    Expressions.parseExpression = parseExpression;
    Expressions.parseTarget = parseTarget;
    Expressions.parseNameList = parseNameList;
    Expressions.parseName = parseName;
    Expressions.parseForStep = parseForStep;
    Expressions.describe = describe;
})(window.OnoFlow);
