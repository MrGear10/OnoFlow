/*
 * OnoFlow — programmi di prova per la verifica del codice generato (tools/check-codegen.mjs).
 *
 * Oltre agli esempi del menu, ogni programma qui tocca una parte della semantica che i
 * linguaggi trattano in modo diverso da OnoFlow (§6): divisione e mod, potenza, stampa dei
 * Real, concatenazione, funzioni con array, for all'indietro e variabile usata dopo il ciclo,
 * nomi che in Python o in C++ sono parole riservate. Ognuno con i suoi input.
 */

function escape(text) {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Un file .fprg da funzioni scritte come testo XML del corpo (righe già pronte). */
function fprg(name, functions) {
    return [
        '<?xml version="1.0"?>',
        '<flowgorithm fileversion="4.2">',
        '    <attributes>',
        `        <attribute name="name" value="${name}"/>`,
        '        <attribute name="authors" value=""/>',
        '        <attribute name="about" value=""/>',
        '        <attribute name="saved" value="2026-11-04 10:00:00 "/>',
        '    </attributes>',
        ...functions.flatMap((fn) => [
            `    <function name="${fn.name}" type="${fn.type || 'None'}" variable="${fn.variable || ''}">`,
            fn.parameters && fn.parameters.length
                ? '        <parameters>' + fn.parameters.map((p) => `<parameter name="${p.name}" type="${p.type}" array="${p.array ? 'True' : 'False'}"/>`).join('') + '</parameters>'
                : '        <parameters/>',
            '        <body>',
            ...fn.body.map((line) => '            ' + line),
            '        </body>',
            '    </function>'
        ]),
        '</flowgorithm>',
        ''
    ].join('\n');
}

const declare = (names, type, size) => `<declare name="${names}" type="${type}" array="${size ? 'True' : 'False'}" size="${size ? escape(size) : ''}"/>`;
const assign = (variable, expression) => `<assign variable="${escape(variable)}" expression="${escape(expression)}"/>`;
const output = (expression, newline = true) => `<output expression="${escape(expression)}" newline="${newline ? 'True' : 'False'}"/>`;
const input = (variable) => `<input variable="${escape(variable)}"/>`;
const call = (expression) => `<call expression="${escape(expression)}"/>`;
const comment = (text) => `<comment text="${escape(text)}"/>`;
const ifBlock = (expression, then, otherwise = []) =>
    `<if expression="${escape(expression)}"><then>${then.join('')}</then><else>${otherwise.join('')}</else></if>`;
const whileBlock = (expression, body) => `<while expression="${escape(expression)}">${body.join('')}</while>`;
const doBlock = (expression, body) => `<do expression="${escape(expression)}">${body.join('')}</do>`;
const forBlock = (variable, start, end, body, direction = 'inc', step = '1') =>
    `<for variable="${variable}" start="${escape(start)}" end="${escape(end)}" direction="${direction}" step="${step}">${body.join('')}</for>`;

export const PROGRAMS = [
    {
        id: 'operatori',
        inputs: [[]],
        text: fprg('operatori', [{
            name: 'Main',
            body: [
                declare('a, b', 'Integer'),
                declare('x', 'Real'),
                assign('a', '7'),
                assign('b', '2'),
                comment('Divisione sempre reale, mod con il segno del dividendo'),
                output('a / b'),
                output('-7 mod 3'),
                output('7 mod -3'),
                output('-a mod b'),
                output('1 / 3'),
                output('2 / 3'),
                output('-0.001'),
                output('2.345'),
                output('-2.345'),
                output('0.125'),
                output('1.005'),
                output('10 / 4 * 2'),
                comment('Potenza: lega a destra e più del segno'),
                output('2 ^ 3'),
                output('-2 ^ 2'),
                output('2 ^ 3 ^ 2'),
                output('2 ^ -1'),
                output('(a + b) * 2 - a mod b'),
                assign('x', 'a'),
                output('x'),
                output('x / 3'),
                comment('Concatenazione e confronti'),
                output('"a" & 1 + 2'),
                output('"x vale " & x & ", a/b = " & a / b'),
                output('true & "!"'),
                output('"Z" < "a"'),
                output('0.1 + 0.2 == 0.3'),
                output('not (a > b) or a == 7 and b != 2'),
                output('a > b and not false'),
                output('"senza "', false),
                output('"a capo"')
            ]
        }])
    },
    {
        id: 'predefinite',
        inputs: [[]],
        text: fprg('predefinite', [{
            name: 'Main',
            body: [
                declare('s', 'String'),
                assign('s', '"Ciao"'),
                output('Abs(-5) & " " & Abs(-2.5)'),
                output('Int(-2.7) & " " & Int(3.9)'),
                output('Sgn(-4) & Sgn(0) & Sgn(9)'),
                output('Len(s) & " " & Char(s, 1)'),
                output('ToCode("A") & " " & ToChar(66)'),
                output('ToFixed(2.5, 2) & " " & ToFixed(1 / 3, 4) & " " & ToFixed(-0.001, 2)'),
                output('ToInteger("42") + 1'),
                output('ToReal("2,5") * 2'),
                output('ToString(1 / 3) & ToString(true)'),
                output('Sqrt(16) & " " & Log10(1000)'),
                output('Random(1)')
            ]
        }])
    },
    {
        id: 'funzioni-e-array',
        inputs: [['4', '3', '9', '1', '7']],
        text: fprg('funzioni-e-array', [
            {
                name: 'Main',
                body: [
                    declare('n, i', 'Integer'),
                    output('"Quanti numeri?"'),
                    input('n'),
                    declare('numeri', 'Integer', 'n'),
                    forBlock('i', '0', 'n - 1', [input('numeri[i]')]),
                    output('"Massimo: " & Massimo(numeri)'),
                    call('Raddoppia(numeri)'),
                    call('Stampa(numeri, n)'),
                    output('"Media: " & Media(numeri)'),
                    output('"Quadrato di 2,5: " & Quadrato(2.5)')
                ]
            },
            {
                name: 'Massimo', type: 'Integer', variable: 'risultato',
                parameters: [{ name: 'valori', type: 'Integer', array: true }],
                body: [
                    declare('risultato, k', 'Integer'),
                    assign('risultato', 'valori[0]'),
                    forBlock('k', '1', 'Size(valori) - 1', [ifBlock('valori[k] > risultato', [assign('risultato', 'valori[k]')])])
                ]
            },
            {
                name: 'Raddoppia',
                parameters: [{ name: 'valori', type: 'Integer', array: true }],
                body: [
                    declare('k', 'Integer'),
                    forBlock('k', '0', 'Size(valori) - 1', [assign('valori[k]', 'valori[k] * 2')])
                ]
            },
            {
                name: 'Stampa',
                parameters: [{ name: 'valori', type: 'Integer', array: true }, { name: 'quanti', type: 'Integer' }],
                body: [
                    declare('k', 'Integer'),
                    forBlock('k', '0', 'quanti - 1', [output('valori[k] & " "', false)]),
                    output('""')
                ]
            },
            {
                name: 'Media', type: 'Real', variable: 'm',
                parameters: [{ name: 'valori', type: 'Integer', array: true }],
                body: [
                    declare('m', 'Real'),
                    declare('k, somma', 'Integer'),
                    assign('somma', '0'),
                    forBlock('k', '0', 'Size(valori) - 1', [assign('somma', 'somma + valori[k]')]),
                    assign('m', 'somma / Size(valori)')
                ]
            },
            {
                name: 'Quadrato', type: 'Real', variable: 'q',
                parameters: [{ name: 'x', type: 'Real' }],
                body: [declare('q', 'Real'), assign('q', 'x * x')]
            }
        ])
    },
    {
        id: 'cicli',
        inputs: [['2,5', 'true', 'ciao mondo']],
        text: fprg('cicli', [{
            name: 'Main',
            body: [
                declare('i, conta', 'Integer'),
                declare('r', 'Real'),
                declare('ok', 'Boolean'),
                declare('parola', 'String'),
                input('r'),
                input('ok'),
                input('parola'),
                output('r * 2 & " " & ok & " " & parola'),
                comment('for all\'indietro con passo 3'),
                forBlock('i', '10', '1', [output('i & " "', false)], 'dec', '3'),
                output('""'),
                comment('dopo il ciclo la variabile vale il primo valore oltre la fine'),
                forBlock('i', '1', '3', []),
                output('"dopo: " & i'),
                comment('la variabile cambiata nel corpo'),
                forBlock('i', '1', '10', [output('i & " "', false), assign('i', 'i + 2')]),
                output('""'),
                comment('fine valutata una volta sola'),
                assign('conta', '3'),
                forBlock('i', '1', 'conta', [assign('conta', 'conta + 1')]),
                output('conta'),
                assign('conta', '0'),
                doBlock('conta < 3', [assign('conta', 'conta + 1')]),
                output('conta'),
                whileBlock('conta > 0', [assign('conta', 'conta - 1')]),
                output('conta'),
                ifBlock('conta == 0', [], [output('"mai"')]),
                ifBlock('ok', [ifBlock('r > 2', [output('"grande"')], [output('"piccolo"')])])
            ]
        }])
    },
    {
        id: 'nomi-riservati',
        inputs: [['3']],
        text: fprg('nomi-riservati', [
            {
                name: 'Main',
                body: [
                    declare('len, int, print, testo, double, main, std, resto', 'Integer'),
                    declare('lambda', 'String'),
                    input('len'),
                    assign('int', 'len * 2'),
                    assign('print', 'int + 1'),
                    assign('testo', 'print mod 4'),
                    assign('double', 'Doppio(testo)'),
                    assign('main', 'double'),
                    assign('std', 'main'),
                    assign('resto', 'std mod 3'),
                    assign('lambda', '"x" & resto'),
                    output('len & int & print & testo & double & main & std & resto & lambda')
                ]
            },
            {
                name: 'Doppio', type: 'Integer', variable: 'return',
                parameters: [{ name: 'class', type: 'Integer' }],
                body: [declare('return', 'Integer'), assign('return', 'class * 2')]
            }
        ])
    }
];
