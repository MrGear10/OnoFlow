# OnoFlow — Registro delle decisioni

Decisioni prese durante lo sviluppo che non erano nel [documento di progetto](OnoFlow_progetto.md) o che ne cambiano un punto. Ogni voce indica il passo in cui è stata presa, chi l'ha decisa e quali sezioni del documento tocca. Le voci non si cancellano: una decisione superata si marca come tale e si rimanda a quella nuova.

| Campo | Significato |
|---|---|
| **Decisa da** | *Autore*: scelta tra opzioni proposte. *Sviluppo*: scelta tecnica minore presa durante l'implementazione, che l'autore può rivedere |

---

## DEC-001 — Il meno davanti ai letterali

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** §6.2, §6.3
- **Problema:** la §6.2 diceva che il meno davanti a un letterale fa parte del letterale; con quella regola `-2 ^ 2` varrebbe `4`, mentre la §6.3 vuole `-4`.
- **Decisione:** il `-` è sempre un operatore unario. Solo il letterale `2147483648`, quando è operando diretto di un meno unario, supera il controllo di intervallo, così `-2147483648` resta accettato.
- **Conseguenze:** `-2 ^ 2` → `-4`; `dim -1` resta una sottrazione (L-13).

## DEC-002 — A capo e BOM nel round-trip

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** FMT-W-01, FR-FILE-03
- **Problema:** FMT-W-01 imponeva LF; se Flowgorithm scrive CRLF o il BOM (Q-05 aperta), il round-trip a testo identico sarebbe impossibile.
- **Decisione:** all'import si rilevano tipo di a capo, BOM e a capo finale, e l'export li riproduce. I file nuovi seguono FMT-W-01 (LF, senza BOM, con a capo finale).

## DEC-003 — Scrittura dei blocchi non modificati

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** FMT-W-05, FR-FILE-09
- **Decisione:** gli elementi XML si rigenerano sempre dal modello secondo la §7.6; le espressioni restano col testo originale. Non si conserva il testo sorgente degli elementi.
- **Rischio accettato:** se Flowgorithm scrive un elemento in una forma diversa da quella prevista, il round-trip non sarà identico; QA-05 lo segnala e si corregge la §7.6.

## DEC-004 — Funzioni, `call` e `comment` nella fase 1

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** §7.4, FMT-R-04, FR-EDIT-10, FR-EDIT-11, §8.3
- **Decisione:** nella fase 1 un file con funzioni, `call` o `comment` nel formato presunto della §7.4 si carica, si disegna e si esegue, con l'avviso `WARN_LOAD_UNVERIFIED_FORMAT` (una volta per file). L'editor modifica solo `Main` e i blocchi della §7.3.

## DEC-005 — Strumenti di verifica in `tools/`

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** NFR-DIST-02, QA-09, QA-15
- **Decisione:** la cartella `tools/` ha un proprio `package.json` con Playwright, usato solo per le verifiche automatiche. `tools/node_modules/` è escluso da git. L'app e `tests.html` non dipendono da nulla in `tools/`.
- **Uso:** `cd tools && npm install && npx playwright install && node run-tests.mjs`.

## DEC-006 — Registro delle decisioni in un file separato

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** §0
- **Decisione:** il registro è questo file; il documento di progetto lo richiama.

## DEC-007 — Comportamento del runner dei test

- **Passo:** 1 · **Decisa da:** sviluppo · **Tocca:** QA-01
- **Decisione:**
  - un test che non esegue nessuna asserzione **fallisce**: non potrebbe mai fallire e di solito nasconde una promessa non restituita;
  - un test è asincrono se restituisce una promessa; limite di tempo predefinito 2 secondi, modificabile per test (`{ timeout: ms }`);
  - i test girano uno alla volta, nell'ordine in cui sono definiti; ogni 50 ms il runner restituisce il controllo al browser;
  - il filtro si passa con `?filtro=testo` e cerca, senza distinguere maiuscole, in "suite › test"; i test esclusi risultano *saltati*;
  - `throws`/`rejects` accettano come secondo argomento un costruttore di errore, un predicato o un oggetto da confrontare campo per campo (es. `{ code: 'ERR_DIVISION_BY_ZERO' }`);
  - le suite non si annidano.
- **Limite noto:** un ciclo infinito **sincrono** dentro un test blocca la pagina: JavaScript non può interromperlo dall'esterno. La protezione di QA-10 sta nell'esecuzione sincrona dell'interprete (limite di passi e di tempo), al passo 5.

## DEC-008 — Modalità dimostrazione della pagina dei test

- **Passo:** 1 · **Decisa da:** sviluppo · **Tocca:** QA-01, verifica del passo 1
- **Decisione:** `tests.html?dimostrazione` carica in più `tests/framework/demo-failures.js` (test che falliscono di proposito in ogni modo previsto) e uno script inesistente, per vedere come la pagina mostra i problemi senza modificare il codice.

## DEC-009 — Oggetto globale del framework di test

- **Passo:** 1 · **Decisa da:** sviluppo · **Tocca:** §10.1
- **Decisione:** il framework di test vive in `window.OnoFlowTest`, separato da `window.OnoFlow`, perché `index.html` non lo carica mai. La pagina dei test usa anche `window.OnoFlowTestBoot` per raccogliere gli script non caricati prima che il framework esista.

## DEC-010 — Testi della pagina dei test

- **Passo:** 1 · **Decisa da:** sviluppo · **Tocca:** NFR-I18N-01
- **Decisione:** `tests.html` è uno strumento per chi sviluppa, non parte dell'interfaccia: i suoi testi sono in italiano direttamente nel codice e non passano dal catalogo.

## DEC-011 — `Random` sostituibile nei test

- **Passo:** prima del passo 1 (si applica al passo 5) · **Decisa da:** sviluppo · **Tocca:** §6.9
- **Decisione:** l'interprete riceve la sorgente casuale come opzione; l'app usa `Math.random`, i test una sequenza nota.

## DEC-012 — Un branch per passo

- **Passo:** 1 · **Decisa da:** sviluppo
- **Decisione:** ogni passo si sviluppa su un branch `fase1/passo-NN`, con un commit a fine passo.

## DEC-013 — Struttura dei cataloghi e del modulo dei numeri

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** NFR-I18N-03, NFR-I18N-04, §10.2
- **Decisione:** un catalogo è `{ name, number: { decimalSeparator, inputDecimalSeparators }, messages }`, in `js/i18n/catalog.<lingua>.js`, e si registra con `OnoFlow.Localization.registerCatalog`. Le chiavi sono piatte con i punti (`ERR_INPUT_NOT_CONVERTIBLE.decimal`). Il modulo dei numeri è `OnoFlow.NumberFormat` e riceve il formato numerico come argomento, così non dipende dalla localizzazione.
- **Motivazione:** ogni modulo si prova da solo; aggiungere una lingua = aggiungere un file.

## DEC-014 — Parametri dei messaggi

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** NFR-I18N-02, QA-07
- **Decisione:** i parametri si inseriscono con `String()`; chi chiama passa i numeri già formattati quando serve il separatore della lingua. Un parametro mancante lascia `{nome}` visibile nel testo.
- **Motivazione:** un segnaposto rimasto si vede e i test (QA-07) lo trovano; un testo vuoto passerebbe inosservato.

## DEC-015 — Chiave più specifica tra lingua attiva e italiano

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** §8.2, NFR-I18N-05
- **Decisione:** per un errore si prova ogni chiave, dalla più specifica, prima nella lingua attiva e poi in italiano; vince la prima trovata. Un messaggio specifico in italiano batte quindi uno generico nella lingua attiva. `type` senza `reason` non sceglie una chiave (la §8.2 elenca solo `CODICE.reason.type` → `CODICE.reason` → `CODICE`).
- **Motivazione:** con NFR-I18N-06 i cataloghi hanno le stesse chiavi, quindi il caso si presenta solo con un catalogo incompleto; meglio il messaggio più preciso.

## DEC-016 — Forma degli errori di input

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** §6.11, §8.3
- **Decisione:** `parseInput` restituisce `{ ok: true, value }` oppure `{ ok: false, error: { code: 'ERR_INPUT_NOT_CONVERTIBLE', params: { reason, type, text } } }`, con `text` esattamente come digitato. L'interprete aggiunge `nodeId`. Un `Boolean` non valido ha `reason` `format`.

## DEC-017 — `"2,5"` per un `Integer` nelle lingue col punto

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** §6.11
- **Decisione:** nelle lingue con il solo punto come separatore, `"2,5"` per un `Integer` è errore `format` (la virgola lì non è un separatore decimale), non `decimal`.

## DEC-018 — Arrotondamento di `ToFixed`

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** §6.9
- **Decisione:** `ToFixed` usa lo stesso arrotondamento dell'output (rappresentazione più corta, metà lontano dallo zero) e non scrive mai `-0` (`ToFixed(-0.001, 2)` → `"0,00"`). Un numero di cifre fuori da 0–15 è un errore che l'interprete trasformerà in `ERR_BUILTIN_ARGUMENT` (passo 5).
- **Da verificare:** il comportamento di Flowgorithm (Q-09).

## DEC-019 — Spazi ai bordi dell'input

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** §6.11
- **Decisione:** si tolgono con `String.prototype.trim`, quindi anche tabulazioni, a capo e spazio non separabile. Le stringhe (`String`) restano esattamente come digitate.

## DEC-020 — Forma dell'AST e operatori canonici

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §6.3, §8.4, §10.2
- **Decisione:** nodi `literal` (con `type`, `value` e `text` originale), `variable`, `index`, `call`, `unary`, `binary`, più `nameList` e `name` per i campi dei nomi; ogni nodo ha `start`/`end` nel testo. Gli operatori sono canonici: `==` (per `=`), `!=` (per `<>`), `and`, `or`, `not`, `mod`. Le parentesi non producono nodi. `Expressions.describe(ast)` dà la forma canonica completamente parentesizzata, usata dai test e, in seguito, dai messaggi.

## DEC-021 — Tipi di campo e variabile del `for`

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §6.5, §6.7, §7.3, §8.3
- **Decisione:** cinque tipi di campo: `expression`, `target` (nome o `nome[espr]`), `nameList`, `name` (un solo nome, per la variabile del `for` e in futuro per funzioni e parametri), `forStep`. Un errore nel campo `name` usa `ERR_INVALID_NAME`, con i motivi `keyword` e `indexed` (`i[0]` come variabile del `for`).

## DEC-022 — Forma e ordine degli errori di sintassi

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §8.2
- **Decisione:** `{ code, params, position: { start, end, column } }`, con `start`/`end` in unità del testo JavaScript e `column = start + 1`. Si riporta il primo errore nell'ordine di lettura: il lexer si ferma al primo carattere sbagliato e il parser lo incontra solo quando ci arriva, quindi un errore di sintassi prima di quel punto ha la precedenza.
- **Esempio:** in `(a + 2x` l'errore è `2x`, non la parentesi non chiusa.

## DEC-023 — Annidamento massimo: `ERR_SYNTAX_TOO_COMPLEX`

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §8.3, NFR-PERF-03
- **Decisione:** oltre 100 livelli di annidamento (parentesi, segni, operatori) l'analisi si ferma con il nuovo codice `ERR_SYNTAX_TOO_COMPLEX`.
- **Motivazione:** un testo patologico in un file (migliaia di parentesi) esaurirebbe lo stack e bloccherebbe il caricamento.

## DEC-024 — Riconoscimento degli errori tipici (§8.4)

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §8.4
- **Decisione:** i suggerimenti si esprimono con `params.reason`:
  - `ERR_SYNTAX_UNEXPECTED_CHARACTER`: `singleQuote`, `typographicQuote`, `accentedLetter`, `invisible`;
  - `ERR_SYNTAX_INVALID_NUMBER`: `leadingPoint` (`.5`), `trailingPoint` (`5.`), `exponent` (`1e3`), `missingOperator` (`2x`), con `suggestion`; `1.2.3` resta generico;
  - `ERR_SYNTAX_UNEXPECTED_TOKEN`: `decimalComma` solo se numero, virgola e intero sono attaccati (`2,5`, non `2, 5` né `f(2,5)`); `keywordCase` se il token inatteso, o quello prima, è una parola chiave con le maiuscole (`AND`, `NOT a`);
  - `ERR_SYNTAX_INVALID_INDEX`: `nested` (`a[i][j]`, `f(x)[0]`), `empty` (`a[]`), `multiple` (`a[1, 2]`).
- `x = True` non è un errore di sintassi (`True` è un nome): il suggerimento resta alla D-06, fase 2.
- Un test verifica che ogni motivo abbia un proprio messaggio nel catalogo.

## DEC-025 — Spazi ammessi nelle espressioni

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §6.2
- **Decisione:** separano i token solo spazio, tabulazione, CR e LF. Gli spazi speciali (non separabile, a larghezza zero, BOM) sono errore con il motivo `invisible`.
- **Motivazione:** principio di prudenza (Flowgorithm potrebbe rifiutarli) e messaggio chiaro per un errore invisibile.

## DEC-026 — Identificativi e campi del modello

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §10.2, §10.3, FR-VIEW-02
- **Decisione:** gli ID sono `n1`, `n2`, ... da un contatore unico per la sessione: restano validi anche tra programmi diversi e dopo annulla/ripeti, perché i comandi conserveranno gli oggetti. Ogni campo si analizza alla creazione e quando cambia (`setFieldText`), conservando il testo anche con errore. La dimensione di una dichiarazione conta solo se `array` è vero. Il passo di un `for` nuovo vale `1`; gli altri campi di un blocco nuovo sono vuoti finché non si decide D-09.
- **Rinviato:** i controlli statici che non sono di sintassi (dichiarazioni e funzioni duplicate, firma di `Main`, blocchi `call` senza chiamata) si fanno al passo 5, insieme all'interprete.

## DEC-027 — Ordine dei blocchi

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** FR-RUN-02, L-12
- **Decisione:** "ordine dei blocchi" = funzioni nell'ordine del file, e in ciascuna i blocchi in ordine di lettura: prima il blocco, poi i suoi figli, `then` prima di `else`. Gli errori si raccolgono in quest'ordine, campo per campo nell'ordine della definizione del blocco.
