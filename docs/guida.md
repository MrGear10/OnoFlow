# OnoFlow — Guida d'uso

Questa guida spiega come si costruisce, si esegue e si salva un diagramma di flusso con OnoFlow. È scritta per studenti e docenti; non serve sapere nulla di Flowgorithm.

OnoFlow si apre all'indirizzo [mrgear10.github.io/OnoFlow](https://mrgear10.github.io/OnoFlow/), sul computer e sul telefono, senza installare nulla e senza account. Sul computer si può usare anche senza rete: vedi [Presentazione](../README.md#come-si-usa).

## La schermata

- **Barra in alto:** il nome del file (si può cambiare scrivendoci sopra), il segno **Non salvato** quando ci sono modifiche, lo stato dell'esecuzione, i pulsanti **Esegui**, **Passo**, **Pausa** e **Ferma**, e il **Menu**. Sugli schermi larghi ci sono anche Annulla, Ripeti, il tema chiaro o scuro e il libro della documentazione.
- **Diagramma:** il foglio a quadretti con i blocchi. In basso ci sono i comandi dello zoom e, sugli schermi stretti, Annulla e Ripeti.
- **Console:** la lavagna dove compaiono l'output del programma e le richieste di input.
- **Menu:** cinque sezioni.
  - **File:** Nuovo, Apri…, Salva.
  - **Esempi:** diagrammi pronti da aprire.
  - **Esecuzione:** Esegui passo a passo.
  - **Modifica:** Nuova funzione, Annulla, Ripeti.
  - **Progetto:** tema chiaro o scuro, Documentazione, Informazioni.

Sul computer diagramma e console stanno affiancati. **Sul telefono** stanno in due schede in basso, **Diagramma** e **Console**: all'avvio dell'esecuzione si passa da soli alla console.

## Il primo programma

Un programma che chiede un numero e ne stampa il doppio.

1. Menu → **Nuovo**. Il diagramma ha solo Inizio e Fine.
2. Toccare il **+** sulla freccia tra Inizio e Fine e scegliere **Dichiarazione**. Nella finestra che si apre scrivere `n` in *Nomi delle variabili* e lasciare il tipo `Integer`. Poi **Fatto**.
3. Toccare il + sotto la dichiarazione e scegliere **Input**; in *Variabile* scrivere `n`.
4. Toccare il + sotto l'input e scegliere **Output**; in *Espressione* scrivere `"Il doppio è " & n * 2`.
5. Premere **Esegui**. La console chiede un valore `Integer`: scrivere `21` e premere Invio. Compare `Il doppio è 42`.
6. Menu → **Salva**: il browser scarica il file `.fprg` con il nome scritto nella barra.

Per vedere programmi più lunghi conviene partire dagli **Esempi** del menu: ogni esempio mostra un costrutto (if, for, while, do).

## Costruire il diagramma

### Inserire un blocco

Ogni freccia ha a metà un piccolo cerchio con il **+**. Toccandolo si apre il menu dei blocchi; il blocco scelto entra in quel punto e si apre subito la sua finestra di modifica. Un blocco lasciato vuoto resta nel diagramma, segnato in rosso, finché non si completa.

In alternativa, con un blocco selezionato, **Inserisci dopo** aggiunge un blocco subito sotto. Il primo blocco di un diagramma e quello di un ramo vuoto si inseriscono solo dal +.

| Blocco | A cosa serve | Esempio |
|---|---|---|
| Dichiarazione | Crea una o più variabili di un tipo, o un array | `Integer n, somma` |
| Assegnazione | Dà un valore a una variabile | `somma = somma + n` |
| Input | Chiede un valore nella console | `Input n` |
| Output | Scrive nella console, con o senza andare a capo | `Output "Somma: " & somma` |
| If | Sceglie tra il ramo Vero (a destra) e il ramo Falso | `if n > 0` |
| While | Ripete finché la condizione è vera, controllandola prima | `while i < 10` |
| Do | Esegue il corpo almeno una volta, poi ripete finché la condizione è vera | `do … while risposta == "s"` |
| For | Conta da un valore a un altro, estremo compreso | `for i = 1 to 10` |
| Chiamata | Esegue una funzione | `Call Stampa(n)` |
| Commento | Una nota nel diagramma; non viene eseguita | `// Calcola la media` |

### Selezionare e modificare

- **Un tocco** (o un clic) su un blocco lo seleziona: compare la barra con **Inserisci dopo**, **Modifica**, **Sposta** ed **Elimina**.
- **Un secondo tocco**, un doppio clic, **Modifica** o Invio aprono la finestra di modifica.
- Le modifiche valgono **mentre si scrive**: il diagramma si aggiorna subito. **Fatto** (o Esc) chiude la finestra. Per tornare indietro c'è Annulla.
- Se un campo contiene un errore, sotto compare il messaggio con il punto esatto sottolineato da un'onda rossa.
- Sul telefono la finestra occupa tutto lo schermo e ha in fondo una **barra dei simboli** (`"`, `&`, `[ ]`, operatori…), comoda perché sulla tastiera del telefono quei segni sono nascosti.

### Spostare, eliminare, annullare

- **Sposta:** il blocco diventa tratteggiato; un tocco su un + lo porta lì con tutto il contenuto, anche in un ramo, in un ciclo o in un'altra funzione. **Non spostare** (o Esc) rinuncia.
- **Elimina** (o Canc): toglie il blocco. Un if o un ciclo si eliminano con tutto quello che contengono; l'avviso che compare ha **Annulla** per rimetterli.
- **Annulla** e **Ripeti** (anche Ctrl + Z e Ctrl + Y) tornano indietro e avanti di un passo, fino a 100 passi. Tutto quello che si cambia in una stessa apertura della finestra di modifica è un passo solo.
- Durante l'esecuzione il diagramma non si può modificare: i + spariscono e i comandi di modifica sono disattivati.

### Funzioni

- Menu → Modifica → **Nuova funzione** aggiunge una funzione in fondo al diagramma e apre la sua finestra: nome, valore restituito, variabile restituita, parametri.
- Una funzione che restituisce un valore deve **dichiarare nel suo corpo** la variabile restituita e darle un valore prima della fine.
- Toccando l'**Inizio** della funzione si seleziona la funzione intera: **Modifica** cambia nome e parametri, **Elimina** la toglie con tutto il corpo. Cambiando il nome, le chiamate nel resto del programma si aggiornano da sole.
- Una funzione con valore si usa dentro un'espressione (`m = Media(a, b)`); una senza valore con un blocco **Chiamata**.
- `Main` è la funzione da cui parte il programma: non ha parametri e non si può eliminare.

### Zoom e spostamento nel foglio

- Due dita per ingrandire e per spostarsi sul telefono; Ctrl + rotella o i pulsanti **−** e **+** sul computer.
- Il pulsante con la percentuale torna al 100%; **Adatta allo schermo** mostra tutto il diagramma.
- Con il foglio selezionato funzionano anche i tasti `+`, `-` e `0`.

## Eseguire

- **Esegui** avvia il programma. Se il diagramma contiene errori non parte: gli errori sono numerati sopra il foglio e segnati in rosso sui blocchi; un tocco su un errore porta al suo blocco.
- Quando il programma chiede un valore, nella console compare un campo con il tipo atteso: si scrive il valore e si preme Invio. Se il valore non va bene (per esempio `2,5` per un `Integer`), la console lo spiega e lo chiede di nuovo.
- **Pausa** e **Riprendi** fermano e fanno ripartire l'esecuzione; **Ferma** la interrompe del tutto.
- Dopo **5 secondi** di esecuzione l'app mette in pausa e chiede se **Continua** o **Ferma**: di solito è un ciclo che non finisce.
- Se l'esecuzione si ferma per un errore, nella console compaiono il messaggio, il blocco e i valori delle variabili in quel momento; **Mostra nel diagramma** porta al blocco.

### Passo a passo

- **Passo** (o **F10**, o Menu → Esecuzione → **Esegui passo a passo**) esegue un blocco alla volta. Il blocco evidenziato in giallo è il **prossimo** che verrà eseguito.
- Il **pannello delle variabili** mostra il valore di ogni variabile: sul computer in cima alla console, sul telefono in una striscia sotto il diagramma, che si allarga con un tocco. Il valore cambiato nell'ultimo passo è sottolineato.
- **Riprendi** continua senza fermarsi; **Ferma** termina.
- Sul telefono, durante il passo a passo, il pulsante **Passo** sta in basso a sinistra del foglio.

## Aprire e salvare

- Menu → **Apri…**, oppure trascinare un file `.fprg` sulla pagina. Si aprono i file creati con OnoFlow e con Flowgorithm.
- Menu → **Salva** scarica il file con il nome scritto nella barra. Sul telefono il file finisce nella cartella dei download.
- Un file aperto e salvato cambia **solo nelle parti modificate**: il resto resta identico, quindi si riapre anche in Flowgorithm.
- Prima di aprire un altro diagramma con modifiche non salvate, una barra chiede se **Salva**, **Non salvare** o **Chiudi**.
- Se la pagina si ricarica o il telefono chiude la scheda, il diagramma viene **ripristinato** all'apertura successiva della stessa scheda. È una rete di sicurezza, non un salvataggio: per conservare il lavoro serve **Salva**.

## Scrivere le espressioni

### Tipi

| Tipo | Valori | Esempi |
|---|---|---|
| `Integer` | Numeri interi, da −2147483648 a 2147483647 | `0`, `-7`, `100` |
| `Real` | Numeri con la virgola | `2.5`, `0.1` |
| `String` | Testo, tra virgolette doppie | `"ciao"` |
| `Boolean` | Vero o falso | `true`, `false` |

Un **array** è una fila di valori dello stesso tipo, numerati da 0: con `Integer v[10]` gli elementi vanno da `v[0]` a `v[9]`.

### Operatori

| Operatori | Significato |
|---|---|
| `+` `-` `*` `/` | Operazioni; `/` dà **sempre** un `Real`: `7 / 2` vale `3.5` |
| `mod` | Resto della divisione tra interi: `7 mod 2` vale `1` |
| `^` | Potenza: `2 ^ 3` vale `8` |
| `&` | Unisce testi e valori: `"Somma: " & s` |
| `==` `!=` `<` `<=` `>` `>=` | Confronti |
| `and` `or` `not` | Condizioni composte: `n > 0 and n < 10` |

### Funzioni predefinite

| Funzione | Cosa fa |
|---|---|
| `Abs(x)`, `Sgn(x)` | Valore assoluto; segno (−1, 0, 1) |
| `Sqrt(x)`, `Log(x)`, `Log10(x)` | Radice quadrata, logaritmo naturale e in base 10 |
| `Sin(x)`, `Cos(x)`, `Tan(x)`, `Arcsin(x)`, `Arccos(x)`, `Arctan(x)` | Trigonometria, in radianti |
| `Int(x)` | Parte intera, verso lo zero: `Int(-2.7)` vale `-2` |
| `Random(n)` | Un intero a caso da 0 a n − 1 |
| `Len(s)`, `Char(s, i)` | Lunghezza di un testo; carattere in posizione i, da 0 |
| `ToCode(s)`, `ToChar(n)` | Codice del primo carattere; carattere di un codice |
| `ToInteger(s)`, `ToReal(s)`, `ToString(x)` | Conversioni tra testo e numeri |
| `ToFixed(x, n)` | Un numero come testo con n decimali: `ToFixed(2.5, 2)` dà `"2,50"` |
| `Size(v)` | Numero di elementi di un array |

### Attenzione a…

- **Punto nelle espressioni, virgola nella console.** Nel diagramma si scrive `2.5`; quando la console chiede un valore si può scrivere `2,5` o `2.5`.
- **La console stampa al massimo due decimali**: `1 / 3` si stampa `0,33` e `0.001` si stampa `0`. Per più cifre c'è `ToFixed`.
- **Un `Real` con valore intero si stampa senza decimali**: `7`, non `7,0`. Il tipo si vede nel pannello delle variabili.
- **Per unire testi si usa `&`, non `+`.**
- **Maiuscole e minuscole contano**: `Somma` e `somma` sono due nomi diversi; `true`, `and`, `mod` si scrivono in minuscolo.
- **Nei nomi niente lettere accentate**: `eta`, non `età`.
- **Le virgolette sono dritte e doppie**: `"ciao"`. Sul telefono le virgolette curve diventano dritte da sole.
- **`-2 ^ 2` vale `-4`**: prima la potenza, poi il segno.
- **I confronti non si mettono in fila**: invece di `a < b < c` si scrive `a < b and b < c`.
- **Una variabile va dichiarata e riempita prima di usarla**: altrimenti l'errore lo dice e indica il blocco.

## Per i docenti

- **Al proiettore:** **Adatta allo schermo** mostra tutto il diagramma; il passo a passo con il pannello delle variabili fa vedere alla classe cosa succede a ogni blocco.
- **Tema fisso:** per avere sempre il tema chiaro (o scuro) sul computer dell'aula, si salva nei preferiti l'indirizzo con `?tema=chiaro` (o `?tema=scuro`), per esempio `https://mrgear10.github.io/OnoFlow/?tema=chiaro`. OnoFlow non ricorda le preferenze.
- **Esercizi:** si distribuiscono come file `.fprg`; gli studenti li aprono dal disco o dai download del telefono e li riconsegnano salvati. I file si aprono anche in Flowgorithm.
- **Senza rete:** si scarica lo ZIP del repository, si estrae e si apre `index.html` con un doppio clic. Vedi [Presentazione](../README.md#come-si-usa).
- **Privacy:** i file non lasciano il dispositivo e l'app non salva dati. Un file creato con Flowgorithm contiene però il nome utente e il nome del computer di chi l'ha creato, e OnoFlow non li toglie: vedi [Presentazione](../README.md#privacy).

## Problemi frequenti

| Problema | Cosa fare |
|---|---|
| Esegui non parte | Ci sono errori nel diagramma: sono elencati sopra il foglio, un tocco porta al blocco. |
| Il programma sembra bloccato | Probabilmente un ciclo che non finisce: dopo 5 secondi l'app chiede se continuare; **Ferma** lo interrompe. |
| Il + non c'è | Durante l'esecuzione le frecce non hanno il +: prima serve **Ferma** o la fine del programma. |
| Il file non si apre | Il messaggio spiega il motivo; il diagramma di prima resta aperto. OnoFlow apre solo file `.fprg`. |
| All'apertura compare un avviso su `<function>`, `<call>` o `<comment>` | Il formato di questi elementi non è ancora stato verificato su un file di Flowgorithm: il diagramma si apre, conviene controllarlo dopo il salvataggio. |
| Il diagramma è sparito dopo aver chiuso il browser | Il ripristino vale solo per la stessa scheda: il lavoro va salvato con **Salva**. |
