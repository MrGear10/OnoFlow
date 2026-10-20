/*
 * OnoFlow — catalogo italiano. È la lingua di riferimento: ogni altro catalogo
 * deve avere le stesse chiavi e gli stessi segnaposto (NFR-I18N-06).
 *
 * Dipendenze: js/i18n/localization.js.
 *
 * Chiavi degli errori: CODICE, CODICE.reason oppure CODICE.reason.type (§8.2).
 * I nomi dei tipi (Integer, Real, String, Boolean) e le parole del linguaggio
 * restano come nel diagramma.
 */
(function (Localization) {
    'use strict';

    Localization.registerCatalog('it', {
        name: 'Italiano',

        // Formato dei numeri nella console (§6.10, §6.11).
        number: {
            decimalSeparator: ',',
            inputDecimalSeparators: [',', '.']
        },

        messages: {
            // Input da console (§6.11, §8.4).
            'ERR_INPUT_NOT_CONVERTIBLE': '«{text}» non è un valore valido per una variabile {type}.',
            'ERR_INPUT_NOT_CONVERTIBLE.empty': 'Non hai scritto nessun valore: serve un valore {type}.',
            'ERR_INPUT_NOT_CONVERTIBLE.format.Integer': '«{text}» non è un numero intero: scrivi solo cifre, con il segno davanti se serve.',
            'ERR_INPUT_NOT_CONVERTIBLE.format.Real': '«{text}» non è un numero: scrivi solo cifre, con la virgola o il punto per i decimali, senza separatore delle migliaia né notazione scientifica.',
            'ERR_INPUT_NOT_CONVERTIBLE.format.Boolean': '«{text}» non è un valore Boolean: scrivi true oppure false.',
            'ERR_INPUT_NOT_CONVERTIBLE.decimal': 'La variabile accetta solo numeri interi: «{text}» ha una parte decimale.',
            'ERR_INPUT_NOT_CONVERTIBLE.range.Integer': '«{text}» è fuori dall\'intervallo degli Integer, che va da -2147483648 a 2147483647.',
            'ERR_INPUT_NOT_CONVERTIBLE.range.Real': '«{text}» è un numero troppo grande.',

            // Sintassi dei campi (§6.2, §6.3, §8.4).
            'ERR_SYNTAX_EMPTY_EXPRESSION': 'Il campo è vuoto: scrivi qualcosa.',
            'ERR_SYNTAX_UNEXPECTED_CHARACTER': 'Il carattere «{char}» non si può usare qui.',
            'ERR_SYNTAX_UNEXPECTED_CHARACTER.singleQuote': 'Le stringhe si scrivono tra virgolette doppie: "ciao", non \'ciao\'.',
            'ERR_SYNTAX_UNEXPECTED_CHARACTER.typographicQuote': 'Le virgolette «{char}» non vanno bene: usa le virgolette dritte ".',
            'ERR_SYNTAX_UNEXPECTED_CHARACTER.accentedLetter': 'Nei nomi niente lettere accentate o speciali: togli «{char}» (per esempio eta invece di età).',
            'ERR_SYNTAX_UNEXPECTED_CHARACTER.invisible': 'C\'è un carattere invisibile, uno spazio speciale: cancellalo e riscrivi lo spazio.',
            'ERR_SYNTAX_UNTERMINATED_STRING': 'Il testo aperto con le virgolette " non è chiuso: aggiungi " alla fine.',
            'ERR_SYNTAX_INVALID_NUMBER': '«{text}» non è un numero valido.',
            'ERR_SYNTAX_INVALID_NUMBER.leadingPoint': '«{text}» non è un numero valido: scrivi lo zero davanti, {suggestion}.',
            'ERR_SYNTAX_INVALID_NUMBER.trailingPoint': '«{text}» non è un numero valido: dopo il punto servono delle cifre, per esempio {suggestion}.',
            'ERR_SYNTAX_INVALID_NUMBER.exponent': '«{text}»: la notazione scientifica non si può usare, scrivi il numero per esteso.',
            'ERR_SYNTAX_INVALID_NUMBER.missingOperator': '«{text}»: tra un numero e un nome serve un operatore, per esempio {suggestion}.',
            'ERR_SYNTAX_UNEXPECTED_TOKEN': '«{token}» non va bene in questo punto.',
            'ERR_SYNTAX_UNEXPECTED_TOKEN.decimalComma': 'Nelle espressioni i decimali si scrivono con il punto: {suggestion}. La virgola si usa solo nella console.',
            'ERR_SYNTAX_UNEXPECTED_TOKEN.keywordCase': 'Operatori e valori logici si scrivono in minuscolo: {suggestion} invece di {token}.',
            'ERR_SYNTAX_UNEXPECTED_END': 'L\'espressione finisce troppo presto: manca qualcosa alla fine.',
            'ERR_SYNTAX_UNCLOSED': 'La parentesi «{open}» non è chiusa: manca «{close}».',
            'ERR_SYNTAX_CHAINED_COMPARISON': 'I confronti non si possono mettere in fila: invece di a < b < c scrivi a < b and b < c.',
            'ERR_SYNTAX_INVALID_INDEX': 'Indice non valido.',
            'ERR_SYNTAX_INVALID_INDEX.nested': 'Si usa un solo indice, e solo dopo il nome di un array: a[i] va bene, a[i][j] e f(x)[0] no.',
            'ERR_SYNTAX_INVALID_INDEX.empty': 'Tra le parentesi quadre manca l\'indice, per esempio a[0].',
            'ERR_SYNTAX_INVALID_INDEX.multiple': 'Gli array hanno una sola dimensione: usa un solo indice, per esempio a[i].',
            'ERR_SYNTAX_INVALID_TARGET': 'Qui serve il nome di una variabile, oppure un elemento di un array come a[i].',
            'ERR_SYNTAX_TOO_COMPLEX': 'L\'espressione ha troppe parentesi o operatori annidati: dividila in più passaggi.',
            'ERR_INTEGER_LITERAL_OUT_OF_RANGE': '{text} è fuori dall\'intervallo degli Integer, che va da -2147483648 a 2147483647.',
            'ERR_REAL_LITERAL_OUT_OF_RANGE': '{text} è un numero troppo grande.',
            'ERR_NAME_LIST_INVALID': 'Scrivi uno o più nomi separati da virgole, per esempio a, b, c.',
            'ERR_NAME_LIST_INVALID.keyword': '«{name}» è una parola riservata e non si può usare come nome.',
            'ERR_INVALID_NAME': '«{text}» non è un nome valido: usa lettere senza accenti, cifre e _, senza cifra iniziale.',
            'ERR_INVALID_NAME.keyword': '«{text}» è una parola riservata e non si può usare come nome.',
            'ERR_INVALID_NAME.indexed': 'Qui serve solo il nome della variabile, senza indice: «{text}» non va bene.',
            'ERR_FOR_STEP_INVALID': 'Il passo deve essere un numero intero maggiore di zero, senza segno: «{text}» non va bene.',

            // Caricamento dei file .fprg (§7.5).
            'ERR_LOAD_INVALID_XML': 'Il file non si può aprire: non è un diagramma .fprg, oppure è rovinato.',
            'ERR_LOAD_NOT_FLOWGORITHM': 'Il file non si può aprire: contiene dati XML, ma non è un diagramma .fprg (inizia con <{element}>).',
            'ERR_LOAD_FILE_TOO_LARGE': 'Il file è troppo grande per essere un diagramma: il massimo è {max} MB.',
            'ERR_LOAD_UNKNOWN_ELEMENT': 'Il file non si può aprire: contiene l\'elemento sconosciuto <{element}> dentro <{parent}>.',
            'ERR_LOAD_MISSING_ELEMENT': 'Il file non si può aprire: manca l\'elemento <{element}> dentro <{parent}>.',
            'ERR_LOAD_DUPLICATE_ELEMENT': 'Il file non si può aprire: l\'elemento <{element}> compare più volte dentro <{parent}>.',
            'ERR_LOAD_MISSING_ATTRIBUTE': 'Il file non si può aprire: all\'elemento <{element}> manca l\'attributo {attribute}.',
            'ERR_LOAD_INVALID_VALUE': 'Il file non si può aprire: l\'attributo {attribute} di <{element}> ha un valore non valido, «{value}».',
            'ERR_LOAD_NO_MAIN': 'Il file non si può aprire: manca la funzione Main, da cui parte il programma.',
            'WARN_LOAD_UNSUPPORTED_VERSION': 'Il file è della versione «{version}» del formato, diversa da quella prevista (4.x): controlla che il diagramma sia giusto.',
            'WARN_LOAD_UNKNOWN_ATTRIBUTE': 'L\'attributo {attribute} di <{element}> non è riconosciuto: andrà perso al salvataggio.',
            'WARN_LOAD_IGNORED_SIZE': 'La dichiarazione di «{names}» non è un array ma ha una dimensione («{size}»): la dimensione è stata ignorata.',
            'WARN_LOAD_UNVERIFIED_FORMAT': 'Il file contiene elementi <{element}>, il cui formato non è ancora stato verificato: controlla il diagramma dopo averlo salvato.',

            // Controlli prima dell'esecuzione (§8.1, livello 2).
            'ERR_DUPLICATE_DECLARATION': '«{name}» è già dichiarata in questa funzione: ogni nome si dichiara una volta sola.',
            'ERR_DUPLICATE_FUNCTION': 'Esiste già una funzione chiamata «{name}».',
            'ERR_FUNCTION_NAME_RESERVED': '«{name}» è il nome di una funzione predefinita: scegline un altro.',
            'ERR_MAIN_SIGNATURE': 'La funzione Main non può avere parametri né restituire un valore.',
            'ERR_CALL_BLOCK_NOT_CALL': 'Un blocco di chiamata deve contenere la chiamata di una funzione, per esempio Stampa(x).',

            // Esecuzione (§8.1, livello 3; §8.4).
            'ERR_UNDECLARED_VARIABLE': 'La variabile «{name}» non è stata dichiarata: aggiungi un blocco di dichiarazione prima di usarla.',
            'ERR_UNINITIALIZED_VARIABLE': 'La variabile «{name}» non ha ancora un valore: assegnale un valore prima di usarla.',
            'ERR_UNINITIALIZED_VARIABLE.element': 'L\'elemento {name}[{index}] non ha ancora un valore: assegnagli un valore prima di usarlo.',
            'ERR_ARRAY_WITHOUT_INDEX': '«{name}» è un array: indica quale elemento, per esempio {name}[0].',
            'ERR_NOT_AN_ARRAY': '«{name}» non è un array: non si può usare con le parentesi quadre.',
            'ERR_INDEX_TYPE': 'L\'indice di «{name}» deve essere un Integer, non un {type}.',
            'ERR_INDEX_OUT_OF_BOUNDS': 'L\'indice {index} è fuori dall\'array «{name}», che ha {size} elementi: gli indici vanno da 0 a {last}.',
            'ERR_ARRAY_SIZE_TYPE': 'La dimensione di un array deve essere un Integer, non un {type}.',
            'ERR_ARRAY_SIZE_INVALID': 'La dimensione di un array deve essere almeno 1, invece vale {size}.',
            'ERR_ARRAY_TOO_LARGE': 'L\'array è troppo grande ({size} elementi): il massimo è {max}.',
            'ERR_ASSIGN_TYPE': 'Non si può mettere un valore {given} nella variabile «{name}», che è {expected}.',
            'ERR_ASSIGN_TYPE.realToInteger': 'Non si può mettere un valore Real nella variabile «{name}», che è Integer. Ricorda che / dà sempre un Real: per avere un intero usa Int(...).',
            'ERR_CONDITION_TYPE': 'La condizione deve essere vera o falsa (Boolean), invece è un {type}.',
            'ERR_LOGICAL_OPERAND': '«{operator}» si usa solo tra valori Boolean, invece c\'è un {type}.',
            'ERR_BINARY_OPERATOR_TYPES': '«{operator}» non si può usare tra un {left} e un {right}.',
            'ERR_BINARY_OPERATOR_TYPES.stringPlus': 'Per unire dei testi si usa &, non +.',
            'ERR_BINARY_OPERATOR_TYPES.booleanOrder': 'I valori Boolean si confrontano solo con == e !=.',
            'ERR_UNARY_OPERATOR_TYPE': '«{operator}» si usa solo con i numeri, invece c\'è un {type}.',
            'ERR_UNARY_OPERATOR_TYPE.not': 'not si usa solo con valori Boolean, invece c\'è un {type}. Per negare un confronto usa le parentesi: not (x > 5).',
            'ERR_DIVISION_BY_ZERO': 'Divisione per zero: il divisore vale 0.',
            'ERR_INTEGER_OVERFLOW': 'Il risultato è fuori dall\'intervallo degli Integer, che va da -2147483648 a 2147483647.',
            'ERR_REAL_NOT_FINITE': 'Il risultato non è un numero valido: è troppo grande, oppure l\'operazione non si può fare (per esempio la radice di un numero negativo).',
            'ERR_UNKNOWN_FUNCTION': 'Non esiste una funzione chiamata «{name}».',
            'ERR_ARGUMENT_COUNT': '{name} vuole {expected} argomenti, invece ne ha {given}.',
            'ERR_ARGUMENT_TYPE': 'L\'argomento {position} di {name} deve essere un {expected}, invece è un {given}.',
            'ERR_ARGUMENT_TYPE.number': 'L\'argomento {position} di {name} deve essere un numero, invece è un {given}.',
            'ERR_ARRAY_ARGUMENT': 'L\'argomento {position} di {name} deve essere il nome di un array del tipo giusto, senza indice.',
            'ERR_FUNCTION_NO_VALUE': 'La funzione «{name}» non restituisce un valore: non si può usare in un\'espressione, solo in un blocco di chiamata.',
            'ERR_RETURN_UNDECLARED': 'La funzione «{function}» deve dichiarare la variabile «{name}», che contiene il valore da restituire.',
            'ERR_RETURN_NOT_SET': 'La funzione «{function}» è finita senza dare un valore a «{name}», che contiene il valore da restituire.',
            'ERR_RETURN_TYPE': 'La funzione «{function}» deve restituire un {expected}, ma «{name}» è {given}.',
            'ERR_RECURSION_LIMIT': 'Troppe chiamate di funzione una dentro l\'altra (più di {max}): probabilmente una funzione ricorsiva non si ferma.',
            'ERR_FOR_VARIABLE_TYPE': 'La variabile del ciclo, «{name}», deve essere un Integer, invece è {type}.',
            'ERR_FOR_VARIABLE_TYPE.array': 'La variabile del ciclo, «{name}», non può essere un array.',
            'ERR_FOR_BOUND_TYPE': 'Gli estremi di un ciclo for devono essere Integer, invece c\'è un {type}.',
            'ERR_BUILTIN_ARGUMENT': 'Argomento non valido per {name}.',
            'ERR_BUILTIN_ARGUMENT.position': 'Char: la posizione {position} è fuori dal testo, che ha {length} caratteri (le posizioni partono da 0).',
            'ERR_BUILTIN_ARGUMENT.random': 'Random vuole un numero maggiore di zero, invece ha {value}.',
            'ERR_BUILTIN_ARGUMENT.charCode': 'ToChar: {value} non è il codice di un carattere.',
            'ERR_BUILTIN_ARGUMENT.empty': 'ToCode: il testo è vuoto, non ha un primo carattere.',
            'ERR_BUILTIN_ARGUMENT.digits': 'ToFixed: il numero di cifre deve essere tra 0 e {max}, invece è {value}.',
            'ERR_CONVERSION_FAILED': '{name}: «{text}» non si può convertire in {type}.',
            'ERR_CONVERSION_FAILED.decimal': '{name}: «{text}» ha una parte decimale, ma serve un numero intero.',
            'ERR_CONVERSION_FAILED.empty': '{name}: il testo è vuoto, non contiene un numero.',
            'ERR_CONVERSION_FAILED.format': '{name}: «{text}» non è un numero {type} scritto correttamente.',
            'ERR_CONVERSION_FAILED.range': '{name}: «{text}» è un numero troppo grande per un {type}.',
            'ERR_STOPPED': 'Esecuzione fermata.',
            'ERR_INTERNAL': 'Si è verificato un problema interno di OnoFlow ({detail}). Non è un errore del diagramma: segnalalo.',

            // Esempi (FR-FILE-06).
            'examples.sumMaxMin.title': 'Somma, massimo e minimo'
        }
    });
})(window.OnoFlow.Localization);
