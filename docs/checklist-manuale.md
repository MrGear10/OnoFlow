# OnoFlow — Controlli manuali

Controlli da fare a mano, in **Firefox da `file://`** (QA-09), alla fine di ogni passo. Si spuntano copiando la sezione nella descrizione del commit o della consegna.

---

## Passo 1 — Pagina dei test e mini-framework

Aprire `tests.html` con doppio clic dalla cartella del progetto (non da un server).

- [x] La pagina mostra in verde **"Tutti i test superati"**, con il numero dei test superati e la durata; il titolo della scheda inizia con ✓.
- [x] Le suite superate sono chiuse; cliccando sul nome di una suite si apre l'elenco dei suoi test.
- [x] Scrivere `deepEqual` nel campo del filtro e premere **Filtra**: restano solo i test della suite `Framework › deepEqual`, gli altri risultano saltati e compare "mostra tutti".
- [x] **Tutti** riporta all'elenco completo.
- [x] Il link **solo questa** accanto a una suite e il clic sul nome di un test filtrano su quella suite o su quel test.
- [x] Aggiungere `?dimostrazione` all'indirizzo: la pagina diventa rossa (titolo con ✗) e mostra
  - il riquadro **Script non caricati** con `tests/framework/script-inesistente.js` e il consiglio sullo ZIP;
  - cinque test falliti nella suite `Dimostrazione › fallimenti voluti` (0 contro -0, differenza in una struttura con il percorso `$.params.index`, eccezione imprevista, test senza asserzioni, tempo scaduto);
  - la suite `Dimostrazione › suite rotta` con l'errore nella definizione;
  - sotto ogni errore, **Dove** apre lo stack.
- [x] Rinominare temporaneamente `tests/framework/assert.js`: ricaricando, la pagina spiega che il framework non si è caricato e cita lo ZIP. Rimettere il nome giusto.
- [x] Con il tema scuro del sistema la pagina è scura e leggibile.
- [x] A larghezza da telefono (Strumenti di sviluppo → Visualizzazione flessibile, 360 px) non c'è scorrimento orizzontale.

---

## Passo 2 — Localizzazione e formato dei numeri

Questo passo è solo logica: si verifica dalla pagina dei test.

- [x] `tests.html` mostra **"Tutti i test superati"** (95 test).
- [ ] Con il filtro `NumberFormat` restano le suite del formato dei numeri; aprendo `NumberFormat › output Real (§6.10)` si vedono i casi della specifica (`1.005` → `1,01`, `-0.001` → `0`, ...).
- [ ] Con il filtro `Localization` restano le suite della localizzazione, compreso il controllo dei cataloghi (NFR-I18N-06).

---

## Passo 3 — Modello ed espressioni

Anche questo passo è solo logica: si verifica dalla pagina dei test.

- [x] `tests.html` mostra **"Tutti i test superati"** (151 test).
- [x] Con il filtro `precedenze` si vedono i casi della §6.3 (`-2 ^ 2` → `(-(2 ^ 2))`, `not x > 5` → `((not x) > 5)`).
- [x] Con il filtro `tipici` si vedono gli errori della §8.4 (`x = 2,5`, `a AND b`, `'ciao'`, `età`, `.5`, `2x`, ...) con la loro posizione.

---

## Passo 4 — Formato `.fprg`

Anche questo passo è solo logica: si verifica dalla pagina dei test. L'apertura e il salvataggio veri, con i pulsanti, arrivano al passo 6.

- [x] `tests.html` mostra **"Tutti i test superati"** (182 test).
- [x] Con il filtro `round-trip` si vedono i test di QA-05: il campione dell'Appendice A riesportato identico (salvo `saved`), anche con a capo CRLF e BOM.
- [x] Con il filtro `lettura` si vedono le regole FMT-R (file non validi, elementi sconosciuti, avvisi).

---

## Passo 5 — Interprete e scheduler

Ancora solo logica: l'esecuzione con i pulsanti arriva al passo 6.

- [x] `tests.html` mostra **"Tutti i test superati"** (267 test), in pochi secondi.
- [x] Con il filtro `QA-04` si vede il caso di riferimento: l'Appendice A con gli input `5, s, 3, n, 4, 9` produce le tre righe finali attese.
- [x] Con il filtro `Scheduler` passa anche l'ultimo test, quello con i timer veri: un ciclo infinito non blocca la pagina e Ferma risponde subito.

---

## Passo 6 — Interfaccia minima

Aprire `index.html` con doppio clic, in Firefox. Poi le stesse prove da telefono (Android e iPhone), dalla copia pubblicata.

- [x] `tests.html` mostra **"Tutti i test superati"** (292 test).
- [x] All'apertura: foglio a quadretti con Inizio e Fine, lavagna vuota a destra con il suo messaggio; nel piè di pagina "Copia locale".
- [x] **Menu → Esempi → Somma, massimo e minimo**: compare lo schema del diagramma; nel campo in alto `somma-massimo-minimo.fprg`.
- [x] **Esegui**, poi nella console `5`, `s`, `3`, `n`, `4`, `9`, ognuno con Invio: i valori restano in giallo, il blocco in attesa è evidenziato in giallo sul foglio, alla fine le tre righe di QA-04 e "Esecuzione terminata.".
- [x] Durante l'attesa di un valore, Pausa è barrato; Nuovo, Apri ed Esempi nel menu sono barrati.
- [x] Scrivere `2,5` quando il programma chiede un numero: compare il messaggio "accetta solo numeri interi" e il valore viene richiesto di nuovo.
- [x] Cambiare il nome nel campo in alto e scegliere **Menu → Salva**: si scarica un file con quel nome e `.fprg`; riaprendolo con **Menu → Apri…** il diagramma è lo stesso.
- [x] **Apri…** su un file che non è un diagramma (per esempio un `.txt`): barra rossa con il motivo, il diagramma di prima resta.
- [x] Ricaricare la pagina (F5): il diagramma torna, con la barra "Il diagramma è stato ripristinato".
- [x] Un file con un errore di sintassi (per esempio `x = 2,5` in un'assegnazione) si apre con il blocco cerchiato in rosso, l'onda sotto `2,5` e il messaggio sotto il blocco; Esegui elenca gli errori nella console.
- [x] Un ciclo infinito (`while true`): dopo circa 5 secondi la console chiede se continuare; **Continua** riprende, **Ferma** ferma e mostra il blocco e le variabili.
- [x] Tutto da tastiera: Tab arriva ai comandi con le parentesi del focus; nel menu le frecce scorrono le voci, Esc lo chiude.
- [x] Tema scuro del sistema: foglio blu notte, lavagna più scura, tutto leggibile.
- [x] Al proiettore, dal fondo dell'aula: testo del diagramma e della console leggibile.
- [x] **Telefono:** schede Diagramma e Console in basso; Esegui porta da solo alla console; il campo della console resta sopra la tastiera (Android e iPhone); toccando un campo la pagina non si ingrandisce; nessuno scorrimento orizzontale; dopo un errore **Mostra nel diagramma** porta al blocco.
- [x] **iPhone:** Salva mette il file in File → Download con il nome e l'estensione `.fprg` (FR-MOB-20).

---

## Passo 7 — Renderer SVG

Aprire `index.html` con doppio clic, in Firefox. Poi le prove di zoom e inquadratura da telefono (Android e iPhone), dalla copia pubblicata.

- [x] `tests.html` mostra **"Tutti i test superati"** (321 test).
- [x] **Menu → Esempi → Somma, massimo e minimo**: il diagramma è disegnato con le forme classiche, al 100%, con Inizio in alto e al centro. Ogni tipo ha la sua forma e la sua tinta: dichiarazioni lavanda con le due righe, assegnazioni azzurre, input acqua e output verdi a parallelogramma, if lilla a rombo, cicli ciano a esagono.
- [x] Gli `if` hanno **Falso a sinistra e Vero a destra**, e i rami si riuniscono sotto in un punto. Il `do` ha il ritorno a sinistra fino al punto con l'etichetta `do`; il `for` e il `while` hanno il ritorno a sinistra e l'uscita a destra.
- [x] I testi dei blocchi sono esattamente quelli del file, spazi compresi, e stanno dentro le forme.
- [x] **Esegui** con gli input di QA-04: il blocco in attesa diventa giallo al posto della sua tinta; se è fuori vista, il foglio scorre fino a lui.
- [x] Comandi dello zoom in basso a destra: − e + cambiano la percentuale (125%, 156%…), la percentuale riporta al 100%, **Adatta allo schermo** fa entrare tutto il diagramma. I quadretti e il margine rosso crescono con il disegno; la pagina non si ingrandisce mai.
- [x] Sul computer: **Ctrl + rotella** sul foglio ingrandisce attorno al puntatore; con il foglio a fuoco (Tab) i tasti **+**, **−** e **0** fanno lo stesso.
- [x] Un file con errori di sintassi: sopra il foglio l'elenco numerato degli errori, con il messaggio e il testo del blocco; sul disegno il cerchio rosso, lo stesso numero e l'onda sotto il pezzo sbagliato. Toccando un messaggio il suo blocco va al centro.
- [x] Un errore durante l'esecuzione (per esempio `x = 1 / 0` in fondo a un diagramma lungo): l'elenco dice che l'esecuzione si è fermata; il blocco è inquadrato.
- [x] Tema scuro del sistema: tinte scure dello stesso colore, testo e frecce leggibili.
- [x] Al proiettore, dal fondo dell'aula: testi dei blocchi ed etichette Vero/Falso leggibili al 100%.
- [x] **Telefono:** scorrimento del foglio con un dito; **pizzico a due dita** per lo zoom, senza ingrandire la pagina (soprattutto su iPhone, FR-MOB-21); dopo un errore durante l'esecuzione, toccando la scheda **Diagramma** il blocco dell'errore è già inquadrato (FR-MOB-03).

---

## Passo 8 — Nuovo diagramma e stato "modificato"

L'editor non c'è ancora: un diagramma risulta modificato solo se la pagina è stata ricaricata con modifiche non salvate. Per provarlo si usa la console degli strumenti per sviluppatori di Firefox (F12).

- [x] `tests.html` mostra **"Tutti i test superati"** (331 test).
- [x] **Menu → Nuovo**: foglio con Inizio e Fine, nome `diagramma.fprg`, nessun "Non salvato". Cambiare il nome in `esercizio` e **Salva**: aprendo il file scaricato con un editor di testo, gli attributi sono solo `name` = `esercizio`, `authors` e `about` vuoti, `saved` con l'ora; né `created` né `edited`.
- [x] Il file salvato si riapre con **Apri…** senza avvisi.
- [x] Un esempio salvato conserva i suoi attributi (`name` = `test_per_WebApp`, `authors`, `created`, `edited`): cambia solo `saved`.
- [x] Simulare modifiche non salvate: nella console di F12 scrivere
  `sessionStorage.setItem('onoflow.diagram', JSON.stringify({ text: OnoFlow.Examples.list[0].text, fileName: 'compito.fprg', saved: false, origin: 'file' }))`
  e ricaricare: c'è "Non salvato" accanto al nome.
- [x] **Menu → Nuovo**: compare la barra gialla «… ha modifiche non salvate …» con **Salva**, **Non salvare** e **Chiudi**. Chiudi lascia tutto com'è; Non salvare apre il foglio nuovo; Salva scarica `compito.fprg` e poi apre il foglio nuovo. Lo stesso con **Apri…** e con un esempio.
- [x] Con "Non salvato", chiudere la scheda o ricaricare: Firefox chiede conferma.
- [x] Cambiare solo il nome del file non fa comparire "Non salvato".
- [x] **Telefono:** la barra è leggibile, con i pulsanti sotto il testo.

---

## Passo 9 — Inserimento dalle frecce

La finestra di modifica arriva al passo 10: per ora un blocco inserito resta vuoto e segnato in rosso.

- [x] `tests.html` mostra **"Tutti i test superati"** (347 test).
- [x] **Menu → Nuovo**: tra Inizio e Fine c'è un cerchietto con il +, e il messaggio invita a toccarlo.
- [x] Clic sul +: accanto si apre il riquadro "Blocco da inserire" con otto voci, ognuna con la forma e la tinta del suo tipo. Scegliere **If**: il rombo compare con il cerchio rosso e il numero 1, l'elenco sopra il foglio dice che il campo è vuoto, accanto al nome c'è "Non salvato".
- [x] Ogni freccia ha il suo +, anche nei rami vuoti dell'if e nei cicli. Inserire un **Output** nel ramo Vero e un **While** nel ramo Falso: il diagramma si allarga e resta in ordine.
- [x] Clic su un blocco: contorno blu e, in basso a sinistra, **Inserisci dopo**. Il blocco scelto dal menu va subito dopo, nello stesso ramo. Clic sul foglio vuoto o Esc: la selezione si toglie.
- [x] In un esempio con più funzioni, le funzioni diverse da Main non hanno + e non si selezionano.
- [x] **Esegui** con blocchi vuoti: non parte ed elenca gli errori. Con un ciclo infinito che gira, i + spariscono e tornano alla fine.
- [x] Tastiera: Tab arriva ai + e ai blocchi; Invio su un + apre il menu, le frecce scorrono le voci, Invio sceglie, Esc chiude e torna al +.
- [x] Con lo zoom al 50% i + si colpiscono ancora facilmente.
- [x] Ricaricando la pagina dopo qualche inserimento, il diagramma torna con i blocchi inseriti e "Non salvato".
- [x] **Telefono:** il + si colpisce al primo tocco; il menu è un pannello in basso con le voci su due colonne senza parole spezzate; "Inserisci dopo" sta sopra i comandi dello zoom; nessuno scorrimento orizzontale della pagina.
- [x] In fondo al foglio una sola riga piccola con "Copia locale" (online: hosting su GitHub Pages e "Privacy di GitHub") e **Informazioni**. Informazioni (anche da **Menu → Progetto**) apre un pannello con indipendenza, uso dell'IA, hosting, copia di sessione e licenza; Chiudi o Esc lo chiudono.

---

## Passo 10 — Finestra di modifica

- [x] `tests.html` mostra **"Tutti i test superati"** (360 test).
- [x] **Nuovo**, + → **Dichiarazione**: si apre subito la finestra (sul computer al posto della console), con il focus su "Nomi delle variabili" e il suggerimento «es. n, somma». Scrivere `n`: il diagramma si aggiorna mentre si scrive. **Fatto** chiude.
- [x] **Inserisci dopo → Input** `n`; **Inserisci dopo → Output** `n * 2`. **Esegui**, scrivere `21`: la console stampa `42`.
- [x] Nell'output scrivere `n 2,5`: sotto il campo compaiono il messaggio rosso e il testo con l'onda sotto `2,5`; sul diagramma il cerchio rosso. Correggendo spariscono entrambi.
- [x] Un campo lasciato vuoto non è rosso mentre lo si scrive; lo diventa passando al campo successivo.
- [x] Dichiarazione: cambiare il tipo in Real, spuntare **Array**: compare "Numero di elementi". Output: togliere "A capo". For: verso Decrescente, il blocco diventa `for … down to …`.
- [x] Riaprire la modifica: con **Modifica**, con un secondo clic sul blocco selezionato, con un doppio clic. Invio passa al campo dopo, Esc chiude e torna al blocco.
- [x] Con un esempio importato, le funzioni diverse da Main non si modificano; un commento o una chiamata in Main hanno **Modifica** barrato.
- [x] **Telefono:** la finestra è a tutto schermo con il campo in alto; con la tastiera aperta la barra dei simboli sta subito sopra la tastiera e un tocco su un simbolo non la chiude; nessuna correzione automatica o maiuscola iniziale; il campo non fa ingrandire la pagina.
- [x] **iPhone:** scrivere una stringa con le virgolette della tastiera: nel campo diventano subito dritte `"`.

---

## Passo 11 — Cancellazione

- [x] `tests.html` mostra **"Tutti i test superati"** (364 test).
- [x] **Esempi → Somma, massimo e minimo**, clic su un input: nella barra in basso c'è **Elimina** con il cestino. Elimina: il blocco sparisce, le frecce si ricollegano, compare "Non salvato" e l'avviso «Blocco «Input …» eliminato.» con **Annulla**.
- [x] **Annulla**: il blocco torna al suo posto ed è selezionato.
- [x] Selezionare il primo ciclo ed eliminarlo: sparisce con tutto il contenuto; l'avviso dice quanti blocchi conteneva. Annulla lo rimette intero.
- [x] Tastiera: Tab fino a un blocco, **Canc** (o Backspace) lo elimina; il focus resta sul + dove c'era il blocco. Un secondo Canc non cancella altro.
- [x] Dopo una cancellazione, inserire o modificare un blocco: l'avviso con Annulla sparisce.
- [x] Si elimina anche un blocco con la finestra di modifica aperta: la finestra si chiude.
- [x] Durante l'esecuzione la barra della selezione non c'è e Canc non fa nulla.
- [x] Salvare dopo una cancellazione e riaprire il file: il blocco non c'è, il resto è identico.
- [x] **Telefono:** Elimina è un pulsante col solo cestino, nella stessa riga di Modifica e Inserisci dopo, sopra lo zoom; l'avviso ha Annulla e Chiudi sotto il testo.

---

## Passo 12 — Annulla e ripeti

- [x] `tests.html` mostra **"Tutti i test superati"** (374 test).
- [x] **Nuovo**: le due frecce di Annulla e Ripeti (nella barra prima di Esegui; con la finestra stretta, in basso a sinistra del foglio) sono barrate.
- [x] Inserire un **Output**, scrivere `1`, **Fatto**. Modificarlo in `23`, **Fatto**. **Annulla**: torna `1` (tutta la modifica è un passo). **Annulla**: il blocco sparisce e "Non salvato" si spegne. **Ripeti** due volte: torna `23` con "Non salvato".
- [x] **Ctrl + Z** e **Ctrl + Y** (anche **Ctrl + Maiusc + Z**) fanno lo stesso; dentro un campo della finestra di modifica Ctrl + Z annulla solo il testo del campo.
- [x] Menu → Annulla e Ripeti funzionano e sono disabilitati quando non c'è nulla da fare.
- [x] Cancellare un ciclo, poi **Annulla** (dalla barra o dall'avviso): torna con tutto il contenuto.
- [x] Un esempio: fare qualche modifica, salvare, farne un'altra; Annulla spegne "Non salvato", un altro Annulla lo riaccende.
- [x] Durante l'esecuzione Annulla e Ripeti sono barrati. Aprendo un altro diagramma la storia riparte vuota.
- [x] Finestra del browser stretta (circa 900 px): la barra della selezione sta sopra lo zoom, Annulla e Ripeti in basso a sinistra; il nome del file resta leggibile.
- [x] **Telefono:** Annulla e Ripeti in basso a sinistra del foglio, a sinistra dello zoom, si toccano al primo colpo.

---

## Passo 13 — Salvataggio di file creati e modificati

- [x] `tests.html` mostra **"Tutti i test superati"** (377 test).
- [x] **QA-11, sul computer e sul telefono:** **Nuovo**, poi costruire con l'editor il programma dell'Appendice A (vedi **Esempi → Somma, massimo e minimo** su un'altra scheda come modello): nessun errore nell'elenco sopra il foglio. **Esegui** con 5, s, 3, n, 4, 9: le ultime tre righe sono quelle di QA-04.
- [x] Nome `esercizio`, **Salva**; il file scaricato, aperto con un editor di testo, ha il corpo identico all'esempio, gli attributi `name` = `esercizio`, `authors` e `about` vuoti, `saved`; niente `created` né `edited`. **Apri…** quel file: si apre senza avvisi con lo stesso diagramma.
- [x] **QA-12:** **Esempi → Somma, massimo e minimo**; nel `for` cambiare "A" in `dim - 1`; dopo `numeri[i] = n` inserire un output `"Fine dei numeri"`; eliminare `Integer risultato`. **Salva** e confrontare il file con l'esempio (per esempio con `diff`): cambiano solo la riga del `for`, la riga aggiunta, quella tolta e `saved`; `authors`, `created`, `edited` sono uguali.
- [x] Il file modificato si riapre senza avvisi e mostra le tre modifiche.
- [x] **Firefox, tastiera:** con un esempio aperto e il foglio in cima, premere Tab fino a un blocco in fondo: il foglio scorre e il blocco si vede.
- [x] **Flowgorithm (Q-04):** i due file salvati (`esercizio.fprg` e quello modificato) si aprono in Flowgorithm.

---

## Esempi brevi e preparazione alla pubblicazione

- [ ] `tests.html` mostra **"Tutti i test superati"** (385 test).
- [ ] **Menu → Esempi** elenca sette esempi; sul telefono il menu si scorre fino all'ultima voce.
- [ ] Ogni esempio si apre senza avvisi e senza errori sopra il foglio, e con questi valori dà l'ultima riga indicata:
  - **Pari o dispari:** 7 → «7 è dispari»; 4 → «4 è pari».
  - **Tabellina:** 3 → dieci righe, da «3 x 1 = 3» a «3 x 10 = 30».
  - **Media di più numeri:** 2, 1, 2 → «Media: 1,5»; 0 → «Nessun numero inserito».
  - **Fattoriale:** 5 → «5! = 120»; 13 → errore: il risultato è fuori dall'intervallo degli Integer.
  - **Massimo comun divisore:** 12, 18 → «Massimo comun divisore: 6».
  - **Somma fino allo zero:** 3, 4, 0 → «Somma: 7».
- [ ] **Flowgorithm:** i sei esempi nuovi, salvati da OnoFlow, si aprono in Flowgorithm e danno lo stesso risultato.
- [ ] Con un esempio largo (Somma, massimo e minimo) e il foglio scorso a destra, la riga in fondo al foglio parte dal margine e non è tagliata; sul telefono, con un blocco selezionato, non finisce sotto la barra della selezione.
- [ ] **Informazioni** dice «Progettato da MrGear10 e sviluppato con l'assistenza di Claude (Anthropic).»
- [ ] **Telefono:** durante un'esecuzione in attesa di un valore, ruotare il telefono e tornare in verticale: l'esecuzione aspetta ancora il valore, il diagramma è al suo posto.

---

## Passo 14 — Passo-passo

- [ ] `tests.html` mostra **"Tutti i test superati"** (393 test).
- [ ] **Esempi → Pari o dispari**, **Passo** (nella barra, accanto a Esegui): lo stato dice «Passo a passo» e il blocco `Integer n` è giallo; la console è vuota.
- [ ] Ogni **Passo** esegue il blocco giallo e colora il successivo: dopo il secondo la console mostra «Scrivi un numero intero».
- [ ] Al passo dell'input la console chiede il valore; con `7` il giallo passa all'`if`, poi al ramo Falso, poi il programma finisce con «7 è dispari».
- [ ] **F10** fa lo stesso di Passo. In passo-passo, **Riprendi** continua senza fermarsi; **Ferma** ferma.
- [ ] **Esempi → Somma, massimo e minimo** in passo-passo: entrando nel `do` e nel `for` il giallo segue i blocchi e il foglio scorre da solo quando il blocco esce dallo schermo.
- [ ] **Telefono:** Menu → **Esegui passo a passo**: resta il diagramma; in basso a sinistra **Passo** al posto di Annulla e Ripeti. All'input si passa alla console e, dopo il valore, si torna al diagramma. Con un output nuovo la scheda Console ha il pallino.

---

## Passo 15 — Pannello delle variabili

- [ ] `tests.html` mostra **"Tutti i test superati"** (405 test).
- [ ] **Esempi → Somma, massimo e minimo** in passo-passo: in cima alla console compare «Variabili di Main»; dopo le dichiarazioni le variabili ci sono con «nessun valore»; dopo `dim = 0` il valore di `dim` è 0 e sottolineato.
- [ ] A ogni passo è sottolineato solo ciò che è appena cambiato; al passo successivo senza cambiamenti nessuna sottolineatura.
- [ ] Dopo la dichiarazione di `numeri` l'array mostra «Integer, 2 elementi» e gli elementi `0:` e `1:` con «nessun valore»; dopo gli input, i valori, sottolineato solo quello appena assegnato.
- [ ] **Valore completo (D-05):** un programma con `Real x` e `x = 0.1 + 0.2`: il pannello mostra «0,3» e sotto, in piccolo, «0,30000000000000004». Con `x = 2.5` niente valore completo.
- [ ] A programma finito i valori finali restano; una modifica al diagramma li fa sparire.
- [ ] Con l'esecuzione continua (Esegui) il pannello segue i valori; in Pausa mostra quelli del blocco evidenziato.
- [ ] **Telefono:** durante il passo-passo, sotto il diagramma una striscia scura «n = … · …»; un tocco la allarga con tutte le variabili, un altro la richiude. A programma finito la striscia sparisce e i valori sono nella scheda Console.

---

## Passo 16 — Analisi statica completa

- [ ] `tests.html` mostra **"Tutti i test superati"** (428 test).
- [ ] **Nuovo**: `Boolean b`, poi `b = True`. Mentre si scrive, sotto il campo: «La variabile «True» non è stata dichiarata. Forse si intendeva «true»…» con l'onda sotto `True`. Correggendo in `true` sparisce. Lo stesso sul telefono, a tutto schermo.
- [ ] Prima di eseguire, nell'elenco sopra il foglio, con il cerchio rosso sul blocco: `Integer i` e `i = 7 / 2` (suggerimento di `Int`); `output x` senza dichiarare `x`; `output "a" + 1` (suggerimento di `&`); `if i` (la condizione deve essere Boolean); `output len("abc")` (forse `Len`).
- [ ] Un errore in un ramo che non si esegue mai (`if false` → `x = "a"` con `x` Integer) blocca comunque l'esecuzione: «Non eseguito: ci sono errori».
- [ ] Nessun falso allarme: tutti gli esempi del menu si eseguono; `Integer i` con `i = 2 ^ 3` va bene.
- [ ] Una funzione di un file importato con un errore di tipo nel corpo: l'errore è segnato sul blocco dentro la funzione.

---

## Passo 17 — Chiamata e commento nell'editor

- [ ] `tests.html` mostra **"Tutti i test superati"** (432 test).
- [ ] **Nuovo**, + : il menu ha dieci voci, con **Chiamata** e **Commento** in fondo; sul telefono stanno tutte senza scorrere.
- [ ] **Commento** `Somma dei "voti"`: nel diagramma «// Somma dei "voti"». Con le virgolette della tastiera dell'iPhone, nel campo diventano dritte.
- [ ] **Chiamata** `Saluta()`: sotto il campo «Non esiste una funzione chiamata «Saluta»». Con `ToString(1)` l'errore sparisce.
- [ ] **Salva** e apri il file con un editor di testo: `<comment text="Somma dei &quot;voti&quot;"/>` e `<call expression="ToString(1)"/>`. **Flowgorithm (Q-07):** il file si apre e mostra il commento e la chiamata.
- [ ] Un commento o una chiamata selezionati hanno **Modifica** attivo; doppio clic e secondo tocco li aprono.

---

## Passo 18 — Gestione delle funzioni

- [ ] `tests.html` mostra **"Tutti i test superati"** (445 test).
- [ ] **Nuovo**, poi **Menu → Nuova funzione**: si apre la finestra «Funzione» con il nome `Funzione`. Nome `Doppio`, valore restituito Integer, variabile restituita `r`, **Aggiungi parametro** `n`. Il titolo nel diagramma: «Funzione Doppio(Integer n) → Integer r». Sotto «Variabile restituita» l'errore: va dichiarata.
- [ ] Nel corpo di Doppio: `Integer r`, `r = n * 2`. In Main: `Integer x`, `x = Doppio(21)`, `Output x`. **Esegui**: 42. In passo-passo il giallo entra nella funzione e il pannello mostra «Variabili di Doppio».
- [ ] Selezionare l'**Inizio** di Doppio, **Modifica**, rinominarla `Triplo`, **Fatto**: in Main la chiamata diventa `Triplo(21)`. **Annulla**: tornano insieme nome e chiamata.
- [ ] Valore restituito «Nessuno»: la variabile restituita sparisce; in Main `x = Doppio(21)` diventa un errore («non restituisce un valore»).
- [ ] **Togli** un parametro; il nome di un parametro non valido (`2b`) è segnato sotto quel parametro.
- [ ] Selezionare l'Inizio di Doppio, **Elimina**: «Funzione «Doppio» eliminata, con i 2 blocchi che conteneva.»; la chiamata in Main è un errore. **Annulla**: torna con il corpo.
- [ ] L'Inizio di Main non si seleziona.
- [ ] **Salva**: nel file `<function name="Doppio" type="Integer" variable="r">` con `<parameter name="n" type="Integer" array="False"/>`. **Flowgorithm (Q-07):** il file si apre e la funzione è uguale.
- [ ] **Telefono:** la finestra della funzione è a tutto schermo; ogni parametro ha il nome su una riga e tipo, Array e Togli sotto.

---

## Passo 19 — Spostamento dei blocchi

- [ ] `tests.html` mostra **"Tutti i test superati"** (452 test).
- [ ] **Esempi → Pari o dispari**, selezionare `Output "Scrivi un numero intero"`: nella barra c'è **Sposta** (quattro frecce). Sposta: il blocco diventa tratteggiato e tenue, i due + attorno a lui quasi spariscono, l'avviso dice di scegliere il +.
- [ ] Toccare il + del ramo Vero dell'`if`: il blocco va lì; "Non salvato". **Annulla**: torna dov'era.
- [ ] Spostare un ciclo con il suo contenuto dentro un altro ramo, poi in un'altra funzione: arriva intero. Dentro sé stesso non si può: i suoi + sono spenti.
- [ ] Rinunciare: **Non spostare**, **Chiudi**, **Esc**, un tocco su un blocco o sul foglio vuoto.
- [ ] Tastiera: Sposta, poi Tab scorre solo i + possibili, Invio sposta.
- [ ] Sull'Inizio di una funzione Sposta è disabilitato.
- [ ] **Telefono:** la barra della selezione ha Modifica, Sposta ed Elimina con la sola icona e Inserisci dopo con il testo, tutto dentro lo schermo; durante lo spostamento la barra sparisce.
