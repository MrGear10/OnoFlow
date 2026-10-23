# OnoFlow — Controlli manuali

Controlli da fare a mano, in **Firefox da `file://`** (QA-09), alla fine di ogni passo. Si spuntano copiando la sezione nella descrizione del commit o della consegna.

---

## Passo 1 — Pagina dei test e mini-framework

Aprire `tests.html` con doppio clic dalla cartella del progetto (non da un server).

- [ ] La pagina mostra in verde **"Tutti i test superati"**, con il numero dei test superati e la durata; il titolo della scheda inizia con ✓.
- [ ] Le suite superate sono chiuse; cliccando sul nome di una suite si apre l'elenco dei suoi test.
- [ ] Scrivere `deepEqual` nel campo del filtro e premere **Filtra**: restano solo i test della suite `Framework › deepEqual`, gli altri risultano saltati e compare "mostra tutti".
- [ ] **Tutti** riporta all'elenco completo.
- [ ] Il link **solo questa** accanto a una suite e il clic sul nome di un test filtrano su quella suite o su quel test.
- [ ] Aggiungere `?dimostrazione` all'indirizzo: la pagina diventa rossa (titolo con ✗) e mostra
  - il riquadro **Script non caricati** con `tests/framework/script-inesistente.js` e il consiglio sullo ZIP;
  - cinque test falliti nella suite `Dimostrazione › fallimenti voluti` (0 contro -0, differenza in una struttura con il percorso `$.params.index`, eccezione imprevista, test senza asserzioni, tempo scaduto);
  - la suite `Dimostrazione › suite rotta` con l'errore nella definizione;
  - sotto ogni errore, **Dove** apre lo stack.
- [ ] Rinominare temporaneamente `tests/framework/assert.js`: ricaricando, la pagina spiega che il framework non si è caricato e cita lo ZIP. Rimettere il nome giusto.
- [ ] Con il tema scuro del sistema la pagina è scura e leggibile.
- [ ] A larghezza da telefono (Strumenti di sviluppo → Visualizzazione flessibile, 360 px) non c'è scorrimento orizzontale.

---

## Passo 2 — Localizzazione e formato dei numeri

Questo passo è solo logica: si verifica dalla pagina dei test.

- [ ] `tests.html` mostra **"Tutti i test superati"** (95 test).
- [ ] Con il filtro `NumberFormat` restano le suite del formato dei numeri; aprendo `NumberFormat › output Real (§6.10)` si vedono i casi della specifica (`1.005` → `1,01`, `-0.001` → `0`, ...).
- [ ] Con il filtro `Localization` restano le suite della localizzazione, compreso il controllo dei cataloghi (NFR-I18N-06).

---

## Passo 3 — Modello ed espressioni

Anche questo passo è solo logica: si verifica dalla pagina dei test.

- [ ] `tests.html` mostra **"Tutti i test superati"** (151 test).
- [ ] Con il filtro `precedenze` si vedono i casi della §6.3 (`-2 ^ 2` → `(-(2 ^ 2))`, `not x > 5` → `((not x) > 5)`).
- [ ] Con il filtro `tipici` si vedono gli errori della §8.4 (`x = 2,5`, `a AND b`, `'ciao'`, `età`, `.5`, `2x`, ...) con la loro posizione.

---

## Passo 4 — Formato `.fprg`

Anche questo passo è solo logica: si verifica dalla pagina dei test. L'apertura e il salvataggio veri, con i pulsanti, arrivano al passo 6.

- [ ] `tests.html` mostra **"Tutti i test superati"** (182 test).
- [ ] Con il filtro `round-trip` si vedono i test di QA-05: il campione dell'Appendice A riesportato identico (salvo `saved`), anche con a capo CRLF e BOM.
- [ ] Con il filtro `lettura` si vedono le regole FMT-R (file non validi, elementi sconosciuti, avvisi).

---

## Passo 5 — Interprete e scheduler

Ancora solo logica: l'esecuzione con i pulsanti arriva al passo 6.

- [ ] `tests.html` mostra **"Tutti i test superati"** (267 test), in pochi secondi.
- [ ] Con il filtro `QA-04` si vede il caso di riferimento: l'Appendice A con gli input `5, s, 3, n, 4, 9` produce le tre righe finali attese.
- [ ] Con il filtro `Scheduler` passa anche l'ultimo test, quello con i timer veri: un ciclo infinito non blocca la pagina e Ferma risponde subito.

---

## Passo 6 — Interfaccia minima

Aprire `index.html` con doppio clic, in Firefox. Poi le stesse prove da telefono (Android e iPhone), dalla copia pubblicata.

- [ ] `tests.html` mostra **"Tutti i test superati"** (292 test).
- [ ] All'apertura: foglio a quadretti con Inizio e Fine, lavagna vuota a destra con il suo messaggio; nel piè di pagina "Copia locale".
- [ ] **Menu → Esempi → Somma, massimo e minimo**: compare lo schema del diagramma; nel campo in alto `somma-massimo-minimo.fprg`.
- [ ] **Esegui**, poi nella console `5`, `s`, `3`, `n`, `4`, `9`, ognuno con Invio: i valori restano in giallo, il blocco in attesa è evidenziato in giallo sul foglio, alla fine le tre righe di QA-04 e "Esecuzione terminata.".
- [ ] Durante l'attesa di un valore, Pausa è barrato; Nuovo, Apri ed Esempi nel menu sono barrati.
- [ ] Scrivere `2,5` quando il programma chiede un numero: compare il messaggio "accetta solo numeri interi" e il valore viene richiesto di nuovo.
- [ ] Cambiare il nome nel campo in alto e scegliere **Menu → Salva**: si scarica un file con quel nome e `.fprg`; riaprendolo con **Menu → Apri…** il diagramma è lo stesso.
- [ ] **Apri…** su un file che non è un diagramma (per esempio un `.txt`): barra rossa con il motivo, il diagramma di prima resta.
- [ ] Ricaricare la pagina (F5): il diagramma torna, con la barra "Il diagramma è stato ripristinato".
- [ ] Un file con un errore di sintassi (per esempio `x = 2,5` in un'assegnazione) si apre con il blocco cerchiato in rosso, l'onda sotto `2,5` e il messaggio sotto il blocco; Esegui elenca gli errori nella console.
- [ ] Un ciclo infinito (`while true`): dopo circa 5 secondi la console chiede se continuare; **Continua** riprende, **Ferma** ferma e mostra il blocco e le variabili.
- [ ] Tutto da tastiera: Tab arriva ai comandi con le parentesi del focus; nel menu le frecce scorrono le voci, Esc lo chiude.
- [ ] Tema scuro del sistema: foglio blu notte, lavagna più scura, tutto leggibile.
- [ ] Al proiettore, dal fondo dell'aula: testo del diagramma e della console leggibile.
- [ ] **Telefono:** schede Diagramma e Console in basso; Esegui porta da solo alla console; il campo della console resta sopra la tastiera (Android e iPhone); toccando un campo la pagina non si ingrandisce; nessuno scorrimento orizzontale; dopo un errore **Mostra nel diagramma** porta al blocco.
- [ ] **iPhone:** Salva mette il file in File → Download con il nome e l'estensione `.fprg` (FR-MOB-20).

---

## Passo 7 — Renderer SVG

Aprire `index.html` con doppio clic, in Firefox. Poi le prove di zoom e inquadratura da telefono (Android e iPhone), dalla copia pubblicata.

- [ ] `tests.html` mostra **"Tutti i test superati"** (321 test).
- [ ] **Menu → Esempi → Somma, massimo e minimo**: il diagramma è disegnato con le forme classiche, al 100%, con Inizio in alto e al centro. Ogni tipo ha la sua forma e la sua tinta: dichiarazioni lavanda con le due righe, assegnazioni azzurre, input acqua e output verdi a parallelogramma, if lilla a rombo, cicli ciano a esagono.
- [ ] Gli `if` hanno **Falso a sinistra e Vero a destra**, e i rami si riuniscono sotto in un punto. Il `do` ha il ritorno a sinistra fino al punto con l'etichetta `do`; il `for` e il `while` hanno il ritorno a sinistra e l'uscita a destra.
- [ ] I testi dei blocchi sono esattamente quelli del file, spazi compresi, e stanno dentro le forme.
- [ ] **Esegui** con gli input di QA-04: il blocco in attesa diventa giallo al posto della sua tinta; se è fuori vista, il foglio scorre fino a lui.
- [ ] Comandi dello zoom in basso a destra: − e + cambiano la percentuale (125%, 156%…), la percentuale riporta al 100%, **Adatta allo schermo** fa entrare tutto il diagramma. I quadretti e il margine rosso crescono con il disegno; la pagina non si ingrandisce mai.
- [ ] Sul computer: **Ctrl + rotella** sul foglio ingrandisce attorno al puntatore; con il foglio a fuoco (Tab) i tasti **+**, **−** e **0** fanno lo stesso.
- [ ] Un file con errori di sintassi: sopra il foglio l'elenco numerato degli errori, con il messaggio e il testo del blocco; sul disegno il cerchio rosso, lo stesso numero e l'onda sotto il pezzo sbagliato. Toccando un messaggio il suo blocco va al centro.
- [ ] Un errore durante l'esecuzione (per esempio `x = 1 / 0` in fondo a un diagramma lungo): l'elenco dice che l'esecuzione si è fermata; il blocco è inquadrato.
- [ ] Tema scuro del sistema: tinte scure dello stesso colore, testo e frecce leggibili.
- [ ] Al proiettore, dal fondo dell'aula: testi dei blocchi ed etichette Vero/Falso leggibili al 100%.
- [ ] **Telefono:** scorrimento del foglio con un dito; **pizzico a due dita** per lo zoom, senza ingrandire la pagina (soprattutto su iPhone, FR-MOB-21); dopo un errore durante l'esecuzione, toccando la scheda **Diagramma** il blocco dell'errore è già inquadrato (FR-MOB-03).

---

## Passo 8 — Nuovo diagramma e stato "modificato"

L'editor non c'è ancora: un diagramma risulta modificato solo se la pagina è stata ricaricata con modifiche non salvate. Per provarlo si usa la console degli strumenti per sviluppatori di Firefox (F12).

- [ ] `tests.html` mostra **"Tutti i test superati"** (331 test).
- [ ] **Menu → Nuovo**: foglio con Inizio e Fine, nome `diagramma.fprg`, nessun "Non salvato". Cambiare il nome in `esercizio` e **Salva**: aprendo il file scaricato con un editor di testo, gli attributi sono solo `name` = `esercizio`, `authors` e `about` vuoti, `saved` con l'ora; né `created` né `edited`.
- [ ] Il file salvato si riapre con **Apri…** senza avvisi.
- [ ] Un esempio salvato conserva i suoi attributi (`name` = `test_per_WebApp`, `authors`, `created`, `edited`): cambia solo `saved`.
- [ ] Simulare modifiche non salvate: nella console di F12 scrivere
  `sessionStorage.setItem('onoflow.diagram', JSON.stringify({ text: OnoFlow.Examples.list[0].text, fileName: 'compito.fprg', saved: false, origin: 'file' }))`
  e ricaricare: c'è "Non salvato" accanto al nome.
- [ ] **Menu → Nuovo**: compare la barra gialla «… ha modifiche non salvate …» con **Salva**, **Non salvare** e **Chiudi**. Chiudi lascia tutto com'è; Non salvare apre il foglio nuovo; Salva scarica `compito.fprg` e poi apre il foglio nuovo. Lo stesso con **Apri…** e con un esempio.
- [ ] Con "Non salvato", chiudere la scheda o ricaricare: Firefox chiede conferma.
- [ ] Cambiare solo il nome del file non fa comparire "Non salvato".
- [ ] **Telefono:** la barra è leggibile, con i pulsanti sotto il testo.

---

## Passo 9 — Inserimento dalle frecce

La finestra di modifica arriva al passo 10: per ora un blocco inserito resta vuoto e segnato in rosso.

- [ ] `tests.html` mostra **"Tutti i test superati"** (347 test).
- [ ] **Menu → Nuovo**: tra Inizio e Fine c'è un cerchietto con il +, e il messaggio invita a toccarlo.
- [ ] Clic sul +: accanto si apre il riquadro "Blocco da inserire" con otto voci, ognuna con la forma e la tinta del suo tipo. Scegliere **If**: il rombo compare con il cerchio rosso e il numero 1, l'elenco sopra il foglio dice che il campo è vuoto, accanto al nome c'è "Non salvato".
- [ ] Ogni freccia ha il suo +, anche nei rami vuoti dell'if e nei cicli. Inserire un **Output** nel ramo Vero e un **While** nel ramo Falso: il diagramma si allarga e resta in ordine.
- [ ] Clic su un blocco: contorno blu e, in basso a sinistra, **Inserisci dopo**. Il blocco scelto dal menu va subito dopo, nello stesso ramo. Clic sul foglio vuoto o Esc: la selezione si toglie.
- [ ] In un esempio con più funzioni, le funzioni diverse da Main non hanno + e non si selezionano.
- [ ] **Esegui** con blocchi vuoti: non parte ed elenca gli errori. Con un ciclo infinito che gira, i + spariscono e tornano alla fine.
- [ ] Tastiera: Tab arriva ai + e ai blocchi; Invio su un + apre il menu, le frecce scorrono le voci, Invio sceglie, Esc chiude e torna al +.
- [ ] Con lo zoom al 50% i + si colpiscono ancora facilmente.
- [ ] Ricaricando la pagina dopo qualche inserimento, il diagramma torna con i blocchi inseriti e "Non salvato".
- [ ] **Telefono:** il + si colpisce al primo tocco; il menu è un pannello in basso con le voci su due colonne senza parole spezzate; "Inserisci dopo" sta sopra i comandi dello zoom; nessuno scorrimento orizzontale della pagina.
- [ ] In fondo al foglio una sola riga piccola con "Copia locale" (online: hosting su GitHub Pages e "Privacy di GitHub") e **Informazioni**. Informazioni (anche da **Menu → Progetto**) apre un pannello con indipendenza, uso dell'IA, hosting, copia di sessione e licenza; Chiudi o Esc lo chiudono.

---

## Passo 10 — Finestra di modifica

- [ ] `tests.html` mostra **"Tutti i test superati"** (360 test).
- [ ] **Nuovo**, + → **Dichiarazione**: si apre subito la finestra (sul computer al posto della console), con il focus su "Nomi delle variabili" e il suggerimento «es. n, somma». Scrivere `n`: il diagramma si aggiorna mentre si scrive. **Fatto** chiude.
- [ ] **Inserisci dopo → Input** `n`; **Inserisci dopo → Output** `n * 2`. **Esegui**, scrivere `21`: la console stampa `42`.
- [ ] Nell'output scrivere `n 2,5`: sotto il campo compaiono il messaggio rosso e il testo con l'onda sotto `2,5`; sul diagramma il cerchio rosso. Correggendo spariscono entrambi.
- [ ] Un campo lasciato vuoto non è rosso mentre lo si scrive; lo diventa passando al campo successivo.
- [ ] Dichiarazione: cambiare il tipo in Real, spuntare **Array**: compare "Numero di elementi". Output: togliere "A capo". For: verso Decrescente, il blocco diventa `for … down to …`.
- [ ] Riaprire la modifica: con **Modifica**, con un secondo clic sul blocco selezionato, con un doppio clic. Invio passa al campo dopo, Esc chiude e torna al blocco.
- [ ] Con un esempio importato, le funzioni diverse da Main non si modificano; un commento o una chiamata in Main hanno **Modifica** barrato.
- [ ] **Telefono:** la finestra è a tutto schermo con il campo in alto; con la tastiera aperta la barra dei simboli sta subito sopra la tastiera e un tocco su un simbolo non la chiude; nessuna correzione automatica o maiuscola iniziale; il campo non fa ingrandire la pagina.
- [ ] **iPhone:** scrivere una stringa con le virgolette della tastiera: nel campo diventano subito dritte `"`.

---

## Passo 11 — Cancellazione

- [ ] `tests.html` mostra **"Tutti i test superati"** (364 test).
- [ ] **Esempi → Somma, massimo e minimo**, clic su un input: nella barra in basso c'è **Elimina** con il cestino. Elimina: il blocco sparisce, le frecce si ricollegano, compare "Non salvato" e l'avviso «Blocco «Input …» eliminato.» con **Annulla**.
- [ ] **Annulla**: il blocco torna al suo posto ed è selezionato.
- [ ] Selezionare il primo ciclo ed eliminarlo: sparisce con tutto il contenuto; l'avviso dice quanti blocchi conteneva. Annulla lo rimette intero.
- [ ] Tastiera: Tab fino a un blocco, **Canc** (o Backspace) lo elimina; il focus resta sul + dove c'era il blocco. Un secondo Canc non cancella altro.
- [ ] Dopo una cancellazione, inserire o modificare un blocco: l'avviso con Annulla sparisce.
- [ ] Si elimina anche un blocco con la finestra di modifica aperta: la finestra si chiude.
- [ ] Durante l'esecuzione la barra della selezione non c'è e Canc non fa nulla.
- [ ] Salvare dopo una cancellazione e riaprire il file: il blocco non c'è, il resto è identico.
- [ ] **Telefono:** Elimina è un pulsante col solo cestino, nella stessa riga di Modifica e Inserisci dopo, sopra lo zoom; l'avviso ha Annulla e Chiudi sotto il testo.

---

## Passo 12 — Annulla e ripeti

- [ ] `tests.html` mostra **"Tutti i test superati"** (374 test).
- [ ] **Nuovo**: le due frecce di Annulla e Ripeti (nella barra prima di Esegui; con la finestra stretta, in basso a sinistra del foglio) sono barrate.
- [ ] Inserire un **Output**, scrivere `1`, **Fatto**. Modificarlo in `23`, **Fatto**. **Annulla**: torna `1` (tutta la modifica è un passo). **Annulla**: il blocco sparisce e "Non salvato" si spegne. **Ripeti** due volte: torna `23` con "Non salvato".
- [ ] **Ctrl + Z** e **Ctrl + Y** (anche **Ctrl + Maiusc + Z**) fanno lo stesso; dentro un campo della finestra di modifica Ctrl + Z annulla solo il testo del campo.
- [ ] Menu → Annulla e Ripeti funzionano e sono disabilitati quando non c'è nulla da fare.
- [ ] Cancellare un ciclo, poi **Annulla** (dalla barra o dall'avviso): torna con tutto il contenuto.
- [ ] Un esempio: fare qualche modifica, salvare, farne un'altra; Annulla spegne "Non salvato", un altro Annulla lo riaccende.
- [ ] Durante l'esecuzione Annulla e Ripeti sono barrati. Aprendo un altro diagramma la storia riparte vuota.
- [ ] Finestra del browser stretta (circa 900 px): la barra della selezione sta sopra lo zoom, Annulla e Ripeti in basso a sinistra; il nome del file resta leggibile.
- [ ] **Telefono:** Annulla e Ripeti in basso a sinistra del foglio, a sinistra dello zoom, si toccano al primo colpo.
