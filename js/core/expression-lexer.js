/*
 * OnoFlow — espressioni: analisi lessicale (lexer).
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.Expressions.tokenize, OnoFlow.Expressions.KEYWORDS
 *
 * Trasforma il testo di un campo in un elenco di token. Ogni token ha
 *     { type, text, start, end }
 * con start/end posizioni nel testo (end esclusa). Tipi:
 *     'integer', 'real'  — letterali numerici, con value (e outOfRange per gli Integer)
 *     'string'           — letterale stringa, value senza virgolette
 *     'identifier'       — nome (lettere ASCII, cifre, _; niente cifra iniziale)
 *     'keyword'          — and, or, not, mod, true, false (solo minuscole, §6.2)
 *     'operator'         — simboli: + - * / ^ & % ( ) [ ] , = == != <> < <= > >= && || !
 *     'end'              — fine del testo
 *     'error'            — errore lessicale, con error = { code, params, position }
 * Dopo un token 'error' non ce ne sono altri: il parser lo incontra quando arriva lì,
 * così l'errore riportato è il primo nell'ordine di lettura.
 *
 * I riconoscimenti degli errori tipici (§8.4) danno un "reason" specifico:
 * virgolette semplici o tipografiche, lettere accentate, spazi invisibili,
 * numeri come .5, 5., 1e3, 2x.
 */
(function (OnoFlow) {
    'use strict';

    var Expressions = OnoFlow.Expressions || (OnoFlow.Expressions = {});

    var KEYWORDS = ['and', 'or', 'not', 'mod', 'true', 'false'];
    var TWO_CHAR_OPERATORS = ['==', '!=', '<>', '<=', '>=', '&&', '||'];
    var ONE_CHAR_OPERATORS = '+-*/^&%()[],=<>!';
    var WHITESPACE = ' \t\r\n';
    var TYPOGRAPHIC_QUOTES = '\u201C\u201D\u201E\u201F\u2018\u2019\u201A\u201B\u00AB\u00BB';
    var INVISIBLE_SPACES = '\u00A0\u2007\u202F\u200B\u200C\u200D\u2060\uFEFF';
    var INTEGER_MAX = 2147483647n;
    var NON_ASCII_LETTER = /^\p{L}$/u;

    function isDigit(character) {
        return character >= '0' && character <= '9';
    }

    function isIdentifierStart(character) {
        return (character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z') || character === '_';
    }

    function isIdentifierPart(character) {
        return isIdentifierStart(character) || isDigit(character);
    }

    function position(start, end) {
        return { start: start, end: end, column: start + 1 };
    }

    function errorToken(code, params, start, end) {
        return {
            type: 'error', text: '', start: start, end: end,
            error: { code: code, params: params, position: position(start, end) }
        };
    }

    /*
     * Legge un numero che inizia con una cifra in "start".
     * Restituisce un token 'integer', 'real' o 'error' (numero scritto male).
     */
    function readNumber(text, start) {
        var index = start;
        while (isDigit(text.charAt(index))) {
            index++;
        }
        var isReal = false;
        if (text.charAt(index) === '.') {
            if (!isDigit(text.charAt(index + 1))) {
                // "5." : mancano le cifre dopo il punto.
                var digitsOnly = text.slice(start, index);
                return errorToken('ERR_SYNTAX_INVALID_NUMBER',
                    { reason: 'trailingPoint', text: digitsOnly + '.', suggestion: digitsOnly + '.0' },
                    start, index + 1);
            }
            isReal = true;
            index++;
            while (isDigit(text.charAt(index))) {
                index++;
            }
        }

        var next = text.charAt(index);
        if (next === '.') {
            // "1.2.3": troppi punti.
            var extraEnd = index;
            while (isDigit(text.charAt(extraEnd)) || text.charAt(extraEnd) === '.') {
                extraEnd++;
            }
            return errorToken('ERR_SYNTAX_INVALID_NUMBER', { text: text.slice(start, extraEnd) }, start, extraEnd);
        }
        if (isIdentifierPart(next)) {
            var afterE = text.charAt(index + 1);
            var isExponent = (next === 'e' || next === 'E') &&
                (isDigit(afterE) || ((afterE === '+' || afterE === '-') && isDigit(text.charAt(index + 2))));
            var wordEnd = index + 1;
            if (isExponent && (afterE === '+' || afterE === '-')) {
                wordEnd++;
            }
            while (isIdentifierPart(text.charAt(wordEnd))) {
                wordEnd++;
            }
            var wrongText = text.slice(start, wordEnd);
            if (isExponent) {
                return errorToken('ERR_SYNTAX_INVALID_NUMBER', { reason: 'exponent', text: wrongText }, start, wordEnd);
            }
            // "2x": probabilmente manca il segno di moltiplicazione.
            return errorToken('ERR_SYNTAX_INVALID_NUMBER', {
                reason: 'missingOperator', text: wrongText,
                suggestion: text.slice(start, index) + ' * ' + text.slice(index, wordEnd)
            }, start, wordEnd);
        }

        var numberText = text.slice(start, index);
        if (isReal) {
            return { type: 'real', text: numberText, start: start, end: index, value: Number(numberText) };
        }
        var big = BigInt(numberText);
        return {
            type: 'integer', text: numberText, start: start, end: index,
            value: Number(big), outOfRange: big > INTEGER_MAX, magnitude: big
        };
    }

    /* Errore per un carattere non ammesso, con il motivo più utile allo studente. */
    function unexpectedCharacter(text, start) {
        var codePoint = text.codePointAt(start);
        var character = String.fromCodePoint(codePoint);
        var end = start + character.length;
        if (character === '\'') {
            return errorToken('ERR_SYNTAX_UNEXPECTED_CHARACTER', { reason: 'singleQuote', char: character }, start, end);
        }
        if (TYPOGRAPHIC_QUOTES.indexOf(character) !== -1) {
            return errorToken('ERR_SYNTAX_UNEXPECTED_CHARACTER', { reason: 'typographicQuote', char: character }, start, end);
        }
        if (INVISIBLE_SPACES.indexOf(character) !== -1) {
            return errorToken('ERR_SYNTAX_UNEXPECTED_CHARACTER', { reason: 'invisible', char: character }, start, end);
        }
        if (NON_ASCII_LETTER.test(character)) {
            return errorToken('ERR_SYNTAX_UNEXPECTED_CHARACTER', { reason: 'accentedLetter', char: character }, start, end);
        }
        return errorToken('ERR_SYNTAX_UNEXPECTED_CHARACTER', { char: character }, start, end);
    }

    function tokenize(text) {
        var tokens = [];
        var index = 0;
        var length = text.length;

        while (index < length) {
            var character = text.charAt(index);

            if (WHITESPACE.indexOf(character) !== -1) {
                index++;
                continue;
            }

            if (isDigit(character)) {
                var numberToken = readNumber(text, index);
                tokens.push(numberToken);
                if (numberToken.type === 'error') {
                    return tokens;
                }
                index = numberToken.end;
                continue;
            }

            if (character === '.') {
                if (isDigit(text.charAt(index + 1))) {
                    // ".5": manca lo zero davanti.
                    var pointEnd = index + 1;
                    while (isDigit(text.charAt(pointEnd))) {
                        pointEnd++;
                    }
                    var pointText = text.slice(index, pointEnd);
                    tokens.push(errorToken('ERR_SYNTAX_INVALID_NUMBER',
                        { reason: 'leadingPoint', text: pointText, suggestion: '0' + pointText }, index, pointEnd));
                } else {
                    tokens.push(unexpectedCharacter(text, index));
                }
                return tokens;
            }

            if (isIdentifierStart(character)) {
                var wordEnd = index + 1;
                while (isIdentifierPart(text.charAt(wordEnd))) {
                    wordEnd++;
                }
                // Una lettera accentata subito dopo (età) arriva al giro successivo come carattere non ammesso.
                var word = text.slice(index, wordEnd);
                tokens.push({
                    type: KEYWORDS.indexOf(word) !== -1 ? 'keyword' : 'identifier',
                    text: word, start: index, end: wordEnd
                });
                index = wordEnd;
                continue;
            }

            if (character === '"') {
                var closing = text.indexOf('"', index + 1);
                if (closing === -1) {
                    tokens.push(errorToken('ERR_SYNTAX_UNTERMINATED_STRING', {}, index, length));
                    return tokens;
                }
                tokens.push({
                    type: 'string', text: text.slice(index, closing + 1), start: index, end: closing + 1,
                    value: text.slice(index + 1, closing)
                });
                index = closing + 1;
                continue;
            }

            var pair = text.slice(index, index + 2);
            if (TWO_CHAR_OPERATORS.indexOf(pair) !== -1) {
                tokens.push({ type: 'operator', text: pair, start: index, end: index + 2 });
                index += 2;
                continue;
            }
            if (ONE_CHAR_OPERATORS.indexOf(character) !== -1) {
                tokens.push({ type: 'operator', text: character, start: index, end: index + 1 });
                index++;
                continue;
            }

            tokens.push(unexpectedCharacter(text, index));
            return tokens;
        }

        tokens.push({ type: 'end', text: '', start: length, end: length });
        return tokens;
    }

    Expressions.KEYWORDS = KEYWORDS;
    Expressions.tokenize = tokenize;
})(window.OnoFlow);
