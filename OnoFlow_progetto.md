# OnoFlow — Product Requirements Document

| | |
|---|---|
| **Prodotto** | OnoFlow — editor web di diagrammi di flusso, compatibile con i file `.fprg` |
| **Versione del documento** | 1.10 — 20 ottobre 2026 |
| **Stato** | Base per una nuova implementazione da zero |
| **Origine** | Sintesi del documento di progetto (rev. 7) e di un prototipo che ha completato i passi 1–6 della fase 1 |
| **Licenza prevista** | MIT |

---

## 0. Come usare questo documento

Questo PRD è la **fonte di verità** del prodotto. È scritto per essere consegnato a un agente di sviluppo (Claude Code) o a uno sviluppatore che riparte da zero.

**Livelli di obbligo**

| Termine | Significato |
|---|---|
| **DEVE** | Requisito obbligatorio |
| **DOVREBBE** | Raccomandato; si può derogare con una motivazione scritta nel registro delle decisioni ([`DECISIONI.md`](DECISIONI.md)) |
| **PUÒ** | Facoltativo |

**Origine delle regole del linguaggio** (§6): **V** = verificato in Flowgorithm · **P** = scelta di progetto · **?** = da verificare in Flowgorithm.

**Regole di lavoro** per chi implementa:

1. Prima di scrivere codice per una parte del prodotto, segnalare incongruenze e lacune di questo documento **senza risolverle da soli**. Le domande vanno poste in forma a risposta diretta: opzioni numerate, con una raccomandazione motivata.
2. Lavorare per passi piccoli e verificabili (§13). Ogni passo termina con codice che l'autore può provare.
3. Consegnare file completi, mai frammenti da incollare.
4. Ogni modulo ha i suoi test nella batteria comune (§12). Va verificato anche che i test **sappiano fallire**, introducendo difetti di proposito.
5. Alla fine di ogni passo, elencare le decisioni prese che non erano in questo documento, registrarle in [`DECISIONI.md`](DECISIONI.md) e aggiornare questo documento.
6. Distinguere sempre tra "non so", "non sono sicuro" e "dipende da contesto mancante".

---

## 1. Sintesi

**OnoFlow** è un'applicazione web gratuita e open source per **creare da zero, modificare, eseguire e salvare diagrammi di flusso**. È pensata per insegnare la logica algoritmica nella scuola secondaria.

Con OnoFlow uno studente può:
- **costruire un diagramma partendo da un foglio vuoto ed eseguirlo subito** per verificare che funzioni;
- **aprire un file `.fprg`** creato con Flowgorithm o con OnoFlow, **modificarlo**, eseguirlo e **salvarlo**.

Tutto questo DEVE funzionare **sia su computer sia su telefono e tablet**, con un'interfaccia pensata anche per il tocco e non solo ridimensionata.

Legge e scrive il formato `.fprg` di Flowgorithm, così i diagrammi passano tra i due strumenti. Funziona interamente nel browser, anche offline e aprendo i file direttamente dal disco, senza installazione, senza account e senza raccogliere dati.

### 1.1 Nome e identità

| | |
|---|---|
| **Nome** | **OnoFlow** |
| **Sottotitolo** | *Editor web di diagrammi di flusso, compatibile con i file `.fprg`*: il nome è riconoscibile, il sottotitolo dice cos'è e che è un'app web |
| **Namespace nel codice** | `OnoFlow` (es. `OnoFlow.Interpreter`), scritto per esteso |
| **Repository** | `OnoFlow` su GitHub (disponibilità del nome da verificare), pubblicato con GitHub Pages |
| **Nota** | Letto in inglese può suonare "Oh no flow": accettato |

**Nomi scartati**

| Nome | Motivo |
|---|---|
| LearninGram | In minuscolo negli URL si legge "learning ram"; richiama Instagram |
| OpenFlow | Protocollo di rete noto (SDN); nome già occupato |
| OnoFlow.ai | `.ai` suggerisce un prodotto che usa l'IA, non costruito con l'IA; dominio non necessario |
| 0n0Flow | Non è un identificatore JavaScript valido, è ambiguo da scrivere e peggiore per le ricerche (l'idea grafica può finire nel logo) |
| onFlowchart | In JavaScript `on…` indica un gestore di evento; "flowchart" è generico |
| Namespace `OF` | Associazione indesiderata con un sito noto |

**Marchio:** "Flowgorithm" NON DEVE comparire nel nome del prodotto né del repository. Nel README e nell'app è lecito scrivere "compatibile con i file `.fprg` di Flowgorithm", precisando che OnoFlow è un progetto indipendente e non affiliato.

---

## 2. Contesto e problema

- **Flowgorithm** è lo strumento di riferimento per i diagrammi di flusso a scuola, ma funziona solo su Windows. Nei laboratori con **Linux Mint**, sui **Chromebook** e sui dispositivi **Android** degli studenti non è disponibile.
- Flowgorithm è freeware ma **closed source**. Un porting derivato dal suo codice non è percorribile, né sul piano legale né su quello pratico (è un'app .NET/WinForms).
- **Soluzione:** un'applicazione **indipendente**, scritta da zero, che interopera sul **formato dei dati** (`.fprg`, XML) senza toccare il codice originale.

---

## 3. Obiettivi e non-obiettivi

### 3.1 Obiettivi

| ID | Obiettivo |
|---|---|
| G-1 | Usabile da browser su Linux, Windows, Android, iOS e Chromebook, senza installazione, con un'**interfaccia pienamente funzionale da telefono** (creare, modificare, eseguire, salvare) |
| G-2 | **Ciclo completo fin dalla prima versione:** creare un diagramma da zero ed eseguirlo; aprire un file importato, modificarlo, eseguirlo e salvarlo |
| G-3 | Errori spiegati allo studente in modo chiaro, con il blocco coinvolto evidenziato |
| G-4 | Esecuzione passo-passo con le variabili visibili, per insegnare cosa fa l'algoritmo |
| G-5 | File `.fprg` scambiabili con Flowgorithm nei due sensi, per quanto possibile |
| G-6 | Nessun dato dell'utente raccolto o memorizzato |
| G-7 | In seguito, generazione di codice C++ e Python dal diagramma |

### 3.2 Non-obiettivi

- **Identità di comportamento con Flowgorithm in ogni caso limite.** Il comportamento DEVE essere ragionevole, definito e documentato; l'allineamento si fa quando un caso viene verificato.
- Collaborazione in tempo reale, account, salvataggio in cloud.
- Backend di qualunque tipo.
- Esportazione del diagramma come immagine (fuori perimetro per ora).
- Uso del nome o del marchio "Flowgorithm" nel nome del prodotto o del repository.

---

## 4. Utenti e scenari

| Utente | Bisogni |
|---|---|
| **Studente** (14–19 anni) | Costruire un diagramma, eseguirlo, capire perché non funziona; da PC del laboratorio, da casa o **dal proprio telefono**, che per molti è l'unico dispositivo disponibile fuori dalla scuola |
| **Docente** | Preparare esempi ed esercizi, mostrarli alla classe col proiettore, aprire i file prodotti con Flowgorithm |
| **Laboratorio scolastico** | Funzionare su macchine Linux senza installare nulla, anche senza rete, nel rispetto delle indicazioni del DPO |

**Scenari principali**

1. **Da zero:** lo studente crea un nuovo diagramma, inserisce i blocchi cliccando sulle frecce, scrive le espressioni (gli errori compaiono mentre scrive), lo esegue, inserisce i valori nella console, corregge e lo salva come `.fprg`.
2. **Da un file:** lo studente apre il `.fprg` dell'esercizio consegnato dal docente (creato in Flowgorithm o in OnoFlow), lo completa o lo corregge, lo esegue e lo salva; il file si riapre sia in OnoFlow sia in Flowgorithm.
3. Lo studente apre un esempio, lo esegue, inserisce i valori nella console e vede il risultato.
4. Lo studente sbaglia un'espressione: il blocco è marcato in rosso e il messaggio spiega l'errore in italiano, con un suggerimento.
5. Lo studente scrive un ciclo che non termina: la pagina resta reattiva e dopo pochi secondi gli viene chiesto se continuare o fermarsi.
6. **Da telefono:** lo studente, a casa, apre dal telefono il file dell'esercizio scaricato, aggiunge i blocchi con il dito, scrive le espressioni con la tastiera del telefono, lo esegue inserendo i valori nella console e lo salva nei download. Se nel frattempo passa a un'altra app e il telefono chiude la scheda, ritrova il diagramma com'era.
7. Il docente prepara un esercizio in OnoFlow, lo salva e lo distribuisce; gli studenti lo aprono, lo completano e lo riconsegnano.
8. In una versione successiva lo studente esegue il diagramma passo-passo osservando le variabili e ne genera il codice Python.

---

## 5. Requisiti funzionali

I requisiti sono raggruppati per area. La colonna **Fase** indica quando vanno realizzati (§13): **1 = prima versione (MVP)**, che comprende creazione da zero, modifica e salvataggio.

### 5.1 File

| ID | Requisito | Fase |
|---|---|---|
| FR-FILE-01 | L'app DEVE aprire un file `.fprg` scelto dall'utente (pulsante) e DOVREBBE accettarlo anche per trascinamento sulla pagina | 1 |
| FR-FILE-02 | L'app DEVE salvare il diagramma come `.fprg` tramite download, proponendo il nome del file aperto | 1 |
| FR-FILE-03 | Il round-trip import → export di un file non modificato DEVE produrre un **testo identico** all'originale, salvo l'attributo `saved` (§7.5) | 1 |
| FR-FILE-04 | Se un file non si apre, il diagramma già aperto DEVE restare | 1 |
| FR-FILE-05 | Un file con espressioni sintatticamente errate DEVE aprirsi comunque; gli errori restano associati ai blocchi | 1 |
| FR-FILE-06 | L'app DEVE offrire un menu di **esempi** pronti, utilizzabili senza avere file | 1 |
| FR-FILE-07 | L'app DEVE permettere di creare un **nuovo diagramma** partendo da un foglio vuoto (funzione `Main` senza blocchi), eseguibile non appena contiene blocchi validi | 1 |
| FR-FILE-08 | Con modifiche non salvate, l'app DEVE avvisare prima di aprire un altro file o crearne uno nuovo, e DOVREBBE avvisare alla chiusura della pagina. Sui telefoni, e su iOS in particolare, l'avviso alla chiusura non è affidabile: lì la protezione è il ripristino di FR-MOB-15 | 1 |
| FR-FILE-09 | Un file **importato e modificato** DEVE poter essere salvato come `.fprg`: i blocchi modificati sono scritti con il nuovo contenuto, quelli intatti esattamente come erano (FMT-W-05, FMT-W-06) | 1 |
| FR-FILE-10 | Un file salvato da OnoFlow DEVE riaprirsi in OnoFlow con lo stesso diagramma, e DOVREBBE riaprirsi in Flowgorithm (Q-04) | 1 |
| FR-FILE-11 | Il nome del file e lo stato "modificato" DEVONO essere visibili | 1 |

### 5.2 Visualizzazione del diagramma

| ID | Requisito | Fase |
|---|---|---|
| FR-VIEW-01 | Il diagramma DEVE essere disegnato in SVG, con le forme classiche dei diagrammi di flusso e un layout automatico ricorsivo, leggibile anche con cicli e `if` annidati | 1 |
| FR-VIEW-02 | Ogni blocco disegnato DEVE essere collegato al nodo del modello tramite un ID stabile (es. `data-id`) | 1 |
| FR-VIEW-03 | L'app DEVE poter evidenziare un blocco come "in esecuzione" e uno o più blocchi come "in errore" | 1 |
| FR-VIEW-04 | Il diagramma DEVE restare utilizzabile su schermi stretti (telefono): vedi §5.9 | 1 |
| FR-VIEW-05 | Le espressioni DEVONO essere mostrate esattamente come scritte dall'utente | 1 |

### 5.3 Editor

L'editor fa parte della **prima versione**: senza, lo studente può eseguire diagrammi ma non costruirli, e l'esigenza da cui nasce il progetto (§2) non è soddisfatta.

| ID | Requisito | Fase |
|---|---|---|
| FR-EDIT-01 | Modello di interazione: clic su una freccia → menu dei blocchi → inserimento nel punto scelto. Il menu DEVE offrire tutti i blocchi della §7.3 (dichiarazione, assegnazione, input, output, if, while, do, for) | 1 |
| FR-EDIT-02 | Finestra di modifica del contenuto di un blocco (clic o doppio clic sul blocco), con l'**errore di sintassi mostrato mentre si scrive**, con la posizione e il messaggio della §8.4 | 1 |
| FR-EDIT-03 | Un blocco appena inserito DEVE aprire subito la sua finestra di modifica; un blocco lasciato vuoto o con errori resta nel diagramma, marcato in rosso, e impedisce l'esecuzione | 1 |
| FR-EDIT-04 | Cancellazione di un blocco; per `if` e cicli, insieme al loro contenuto, con possibilità di annullare | 1 |
| FR-EDIT-05 | **Annulla e ripeti** per ogni modifica (inserimento, contenuto, cancellazione) | 1 |
| FR-EDIT-06 | Le modifiche aggiornano subito il diagramma e la lista degli errori che impediscono l'esecuzione | 1 |
| FR-EDIT-07 | La modifica NON DEVE essere possibile durante l'esecuzione | 1 |
| FR-EDIT-08 | Modifica dei campi non testuali: tipo e "array" nelle dichiarazioni, "a capo" nell'output, verso e passo del `for` | 1 |
| FR-EDIT-09 | L'editor DEVE essere pienamente usabile al tocco: vedi §5.9 | 1 |
| FR-EDIT-10 | Blocchi `call` e `comment` (formato da verificare, §7.4) | 2 |
| FR-EDIT-11 | Gestione delle funzioni: aggiunta, rinomina, parametri, valore di ritorno, cancellazione (formato da verificare, §7.4). Nella fase 1 le funzioni di un file importato si caricano, si disegnano e si eseguono, ma l'editor modifica solo `Main` (DEC-004) | 2 |
| FR-EDIT-12 | Spostamento di blocchi (trascinamento o taglia/incolla) | 2 |

### 5.4 Esecuzione

| ID | Requisito | Fase |
|---|---|---|
| FR-RUN-01 | Comandi **Esegui**, **Pausa/Riprendi**, **Ferma**, con lo stato visibile (in esecuzione, in pausa, in attesa di un valore) | 1 |
| FR-RUN-02 | Se il diagramma contiene errori che impediscono l'esecuzione, NON DEVE essere eseguito; gli errori si mostrano tutti insieme, nell'ordine dei blocchi | 1 |
| FR-RUN-03 | Durante l'esecuzione la pagina DEVE restare reattiva, anche con un ciclo infinito | 1 |
| FR-RUN-04 | Dopo **5 secondi reali** di esecuzione continua, l'app DEVE mettere in pausa e chiedere se continuare o fermare, senza finestre modali. Il conteggio riparte all'avvio, a ogni input fornito e a ogni ripresa | 1 |
| FR-RUN-05 | **Passo-passo:** esecuzione un blocco alla volta; la pausa avviene prima di eseguire il blocco, che è quello evidenziato | 2 |
| FR-RUN-06 | **Pannello delle variabili** aggiornato durante il passo-passo | 2 |

### 5.5 Console

| ID | Requisito | Fase |
|---|---|---|
| FR-CON-01 | L'output del diagramma DEVE comparire in una console in stile terminale | 1 |
| FR-CON-02 | L'input DEVE essere **in linea**: il campo compare subito dopo l'ultimo output, sulla stessa riga se l'output era senza a capo, con il tipo atteso come suggerimento. Con Invio il valore resta visibile nella console e si va a capo | 1 |
| FR-CON-03 | Niente finestre modali per input, conferme o errori | 1 |
| FR-CON-04 | La console DEVE svuotarsi a ogni nuova esecuzione | 1 |
| FR-CON-05 | La console DEVE limitare il testo conservato (ordine di grandezza: 200.000 caratteri), togliendo le righe più vecchie e segnalandolo una volta, perché un ciclo che stampa all'infinito non blocchi la pagina | 1 |

### 5.6 Errori

| ID | Requisito | Fase |
|---|---|---|
| FR-ERR-01 | Ogni errore DEVE indicare il blocco coinvolto, evidenziandolo nel diagramma e riportandone il testo nel messaggio | 1 |
| FR-ERR-02 | I messaggi DEVONO essere pensati per lo studente, nella lingua dell'interfaccia, e dove utile suggerire la correzione (§8.4) | 1 |
| FR-ERR-03 | Gli errori di runtime DEVONO mostrare lo stato delle variabili della funzione in esecuzione al momento dell'errore | 1 |
| FR-ERR-04 | Gli errori che impediscono l'esecuzione DOVREBBERO comparire già all'apertura del file | 1 |
| FR-ERR-05 | Gli avvisi di caricamento (es. versione del formato diversa, attributi non supportati) DEVONO essere mostrati senza bloccare il caricamento | 1 |
| FR-ERR-06 | Analisi statica completa prima dell'esecuzione (variabili non dichiarate, funzioni inesistenti, numero e tipo degli argomenti, tipi delle assegnazioni) | 2 |

### 5.7 Generazione di codice

| ID | Requisito | Fase |
|---|---|---|
| FR-GEN-01 | Esportazione del diagramma in **C++** e **Python**, con semantica equivalente a quella di OnoFlow (§6) | 3 |
| FR-GEN-02 | In C++ la divisione tra interi DEVE essere generata come divisione reale (es. `static_cast<double>(a) / b`), perché in OnoFlow `/` restituisce sempre `Real` | 3 |
| FR-GEN-03 | In Python `mod` con i negativi DEVE seguire la regola di OnoFlow (stile C++), quindi non il `%` nativo di Python | 3 |

### 5.8 Informazioni e trasparenza

| ID | Requisito | Fase |
|---|---|---|
| FR-INFO-01 | L'app DEVE dichiarare di essere indipendente e non affiliata a Flowgorithm | 1 |
| FR-INFO-02 | Una pagina **Informazioni** e il README DEVONO dichiarare l'uso dell'IA nello sviluppo (es. "Progettato da [autore] e sviluppato con l'assistenza di Claude (Anthropic)") | 1 |
| FR-INFO-03 | **Avviso sull'hosting in fondo alla pagina.** Il piè di pagina della versione online DEVE indicare che il sito è ospitato su **GitHub Pages**, un servizio di GitHub, Inc. con sede negli **Stati Uniti, quindi fuori dall'Unione Europea**; che GitHub registra l'indirizzo IP dei visitatori per motivi di sicurezza; che l'app non invia altri dati. DEVE contenere un collegamento all'informativa sulla privacy di GitHub. Il testo DEVE essere breve, leggibile anche su telefono, e stare nel catalogo come gli altri testi | 1 |
| FR-INFO-04 | Quando l'app è aperta in locale da `file://` (copia offline), il piè di pagina DOVREBBE dirlo al posto dell'avviso sull'hosting: in quel caso nessun dato raggiunge GitHub | 1 |

### 5.9 Uso da telefono e tablet

Il telefono è un dispositivo **di primo livello**: ogni funzione della prima versione DEVE essere utilizzabile da telefono, non solo visibile.

**Dispositivi di riferimento:** gli studenti usano **per metà Android e per metà iPhone**. Entrambi sono riferimento per le verifiche, con lo stesso peso:
- **Android:** telefoni con schermo largo almeno **360 px CSS**, in verticale e in orizzontale, con Chrome e Firefox; tablet Android.
- **iOS / iPadOS:** iPhone (largo almeno 375 px CSS) e iPad con **Safari**. Su iOS anche Chrome e Firefox usano il motore di Safari (WebKit), quindi provare Safari copre quasi tutti i casi. Non è certo se e quanto siano diffusi, nell'UE, browser iOS con motori diversi.
- Le versioni minime di Android e iOS da supportare sono una decisione aperta (D-13).

**Uso online:** sui telefoni l'app si usa **online**, dall'indirizzo di GitHub Pages. L'uso offline dallo ZIP (NFR-DIST-01) vale solo per i computer: su telefono aprire un file HTML locale con JavaScript attivo è complicato o impossibile.

| ID | Requisito | Fase |
|---|---|---|
| FR-MOB-01 | Su schermi stretti diagramma e console NON DEVONO essere due riquadri minuscoli impilati: l'utente DEVE poter passare dall'uno all'altra con un gesto o un tocco (es. schede o pannello che scorre), ciascuno a tutto schermo | 1 |
| FR-MOB-02 | All'avvio dell'esecuzione la console DEVE venire in primo piano; quando serve un input, il campo DEVE restare visibile sopra la tastiera del telefono | 1 |
| FR-MOB-03 | Quando l'esecuzione termina con un errore, DEVE essere possibile passare al diagramma con il blocco dell'errore già inquadrato | 1 |
| FR-MOB-04 | Tutti gli elementi toccabili (pulsanti, punti di inserimento sulle frecce, blocchi) DEVONO avere un'area di tocco di almeno **44 × 44 px CSS**, anche quando il disegno è più piccolo | 1 |
| FR-MOB-05 | **Inserimento al tocco:** i punti di inserimento sulle frecce DEVONO essere ben visibili e facili da colpire; in alternativa o in aggiunta, selezionando un blocco DEVE comparire un comando "inserisci dopo" | 1 |
| FR-MOB-06 | **Navigazione del diagramma:** scorrimento con il dito, zoom con due dita (pinch) e comando "adatta allo schermo". Lo zoom del diagramma NON DEVE far ingrandire l'intera pagina | 1 |
| FR-MOB-07 | **Finestra di modifica a tutto schermo** sul telefono, con il campo di testo in alto (non coperto dalla tastiera) e i pulsanti di conferma raggiungibili | 1 |
| FR-MOB-08 | **Barra dei simboli** sopra la tastiera nella finestra di modifica, con i caratteri scomodi da digitare sulle tastiere dei telefoni: `"` `&` `<` `>` `=` `[` `]` `(` `)` `^` `*` `/` | 1 |
| FR-MOB-09 | I campi per le espressioni NON DEVONO attivare correzione automatica, maiuscola iniziale automatica e suggerimenti (`autocorrect`, `autocapitalize`, `spellcheck` disattivati) | 1 |
| FR-MOB-10 | **Barra dei comandi compatta:** Esegui/Ferma sempre visibili; i comandi meno frequenti (Nuovo, Apri, Esempi, Salva) in un menu. Annulla e Ripeti raggiungibili con un tocco durante la modifica | 1 |
| FR-MOB-11 | Nessuna funzione DEVE dipendere dal passaggio del mouse (`hover`), dal tasto destro o dal trascinamento: sul telefono non esistono o sono scomodi. Il trascinamento dei file è solo una comodità da computer | 1 |
| FR-MOB-12 | Apertura e salvataggio DEVONO funzionare con il selettore di file e i download del telefono | 1 |
| FR-MOB-13 | Ruotare il telefono NON DEVE perdere né lo stato del diagramma né l'esecuzione in corso | 1 |
| FR-MOB-14 | Su tablet in orizzontale DOVREBBE valere la disposizione da computer (diagramma e console affiancati) | 1 |
| FR-MOB-15 | **Ripristino dopo la chiusura della scheda:** il diagramma aperto DEVE sopravvivere a un ricaricamento della pagina e alla chiusura della scheda in background da parte del sistema (frequente su iOS), tramite la copia di sessione di NFR-PRIV-08. Alla riapertura l'app DEVE dire che il diagramma è stato ripristinato e se era salvato o no | 1 |
| FR-MOB-16 | **Virgolette tipografiche:** la tastiera di iOS può trasformare `"` in `“ ”` (e `'` in `‘ ’`). Nei campi delle espressioni l'editor DEVE convertire le virgolette tipografiche in quelle dritte mentre si scrive; la barra dei simboli inserisce sempre virgolette dritte. Non è certo che disattivare la correzione automatica basti a evitare la sostituzione | 1 |
| FR-MOB-17 | **Niente ingrandimento automatico:** i campi di testo DEVONO avere caratteri di almeno **16 px**, altrimenti Safari su iOS ingrandisce la pagina quando li si tocca | 1 |
| FR-MOB-18 | **Selettore di file:** il selettore NON DEVE filtrare per estensione (`accept=".fprg"`), perché su iOS i file con estensioni sconosciute al sistema possono risultare non selezionabili; il tipo si controlla dopo l'apertura, con un messaggio chiaro se il file non è un `.fprg` | 1 |
| FR-MOB-19 | **Tastiera virtuale:** su iOS la tastiera non ridimensiona la pagina come su Android. Il campo attivo (input della console, finestra di modifica) DEVE restare visibile su entrambi; DOVREBBE essere usata l'API `visualViewport` | 1 |
| FR-MOB-20 | **Salvataggio su iOS:** il file salvato DEVE arrivare nell'app File (Download) con il nome e l'estensione `.fprg` corretti; se il download diretto non funziona, PUÒ essere usato il pannello di condivisione del sistema | 1 |
| FR-MOB-21 | **Zoom del diagramma su iOS:** Safari ignora `user-scalable=no`; lo zoom a due dita sul diagramma DEVE essere gestito senza che si ingrandisca la pagina (es. `touch-action` e gestione degli eventi di gesto) | 1 |

---

## 6. Specifica del linguaggio

Questa sezione è **normativa**: definisce come vengono analizzate ed eseguite le espressioni e i blocchi.

**Principio di prudenza:** OnoFlow NON DEVE accettare una sintassi che Flowgorithm potrebbe rifiutare, perché i file vengono riaperti lì. Nel dubbio, la sintassi accettata resta stretta.

### 6.1 Tipi

`Integer`, `Real`, `String`, `Boolean`, e array monodimensionali di ciascun tipo. **Tipizzazione forte.**

| Caso | Regola | Origine |
|---|---|---|
| `Integer` | 32 bit con segno: da −2.147.483.648 a 2.147.483.647 | P |
| `Real` | Virgola mobile a doppia precisione | P |
| `Integer` → `Real` | Conversione implicita in assegnazioni, input, argomenti e valori di ritorno | V |
| `Real` → `Integer` | **Errore di tipo**; il messaggio ricorda che `/` dà sempre `Real` e suggerisce `Int(...)` | V |

### 6.2 Lessico

| Caso | Regola | Origine |
|---|---|---|
| Identificatori | Lettere ASCII, cifre e `_`, senza cifra iniziale; niente lettere accentate. **Case-sensitive** | V (case) / P |
| Parole riservate | `and`, `or`, `not`, `mod`, `true`, `false`, **solo minuscole**: `AND` e `True` sono identificatori | P |
| Letterali numerici | Solo `123` (`Integer`) e `123.45` (`Real`), con il **punto**; niente `.5`, `5.`, `1e3` | P |
| Zeri iniziali | `007` accettato e letto in base dieci | P |
| Letterali stringa | Solo `"…"`, senza sequenze di escape: una stringa non può contenere `"` | P |
| Letterali booleani | `true`, `false` | P |
| `-2147483648` | Accettato. Il `-` è **sempre** un operatore unario (quindi `-2 ^ 2` vale `-4`); solo il letterale `2147483648`, quando è operando diretto di un meno unario, supera il controllo di intervallo (DEC-001) | P |
| Letterale `Integer` fuori intervallo | Errore statico | P |
| Spazi | Separano i token: spazio, tabulazione, a capo. Gli spazi speciali (es. spazio non separabile) sono un errore con messaggio dedicato, per prudenza (DEC-025) | P |

### 6.3 Operatori e precedenza

Entrambi gli stili sono accettati e producono lo stesso nodo: `=`/`==`, `<>`/`!=`, `and`/`&&`, `or`/`||`, `not`/`!`, `mod`/`%`. Origine: **V** per il set principale, **?** per `&&`, `||`, `!`, `%`, `!=`.

Precedenza, dalla più alta alla più bassa:

| Livello | Operatori | Associatività |
|---|---|---|
| 1 | chiamata `f(…)`, indice `a[…]` | — |
| 2 | `^` (potenza) | destra |
| 3 | segno unario `-` `+`, `not` `!` | prefisso |
| 4 | `*` `/` `mod` `%` | sinistra |
| 5 | `+` `-` | sinistra |
| 6 | `&` (concatenazione) | sinistra |
| 7 | `<` `<=` `>` `>=` `==` `=` `!=` `<>` | **non associativi** |
| 8 | `and` `&&` | sinistra |
| 9 | `or` `\|\|` | sinistra |

| Caso | Regola | Origine |
|---|---|---|
| `-2 ^ 2` | `-(2 ^ 2)` = `-4` | P |
| `not x > 5` | `(not x) > 5`, quindi errore di tipo con messaggio dedicato | P |
| `"Somma: " & a + b` | `"Somma: " & (a + b)` | P |
| `a < b < c` | **Errore di sintassi**, con il suggerimento di usare `and` | P |
| Indici | Solo dopo il nome di un array, una sola dimensione: `a[i][j]` e `f(x)[0]` sono errori | P |
| Parentesi | Le parentesi di raggruppamento non producono nodi nell'AST | P |

### 6.4 Semantica degli operatori

| Caso | Regola | Origine |
|---|---|---|
| `/` | Restituisce **sempre `Real`**: `7 / 2` → `3,5` | ? |
| Divisione per zero | Errore di runtime, sia tra `Integer` sia tra `Real`; vale anche per `mod 0` | P |
| `+` `-` `*` tra `Integer` | Risultato `Integer`, **errore di overflow** se fuori intervallo | P |
| `mod` | **Solo tra `Integer`**; segno del dividendo come in C++: `-7 mod 3` → `-1`, `7 mod -3` → `1` | P |
| `^` | `Integer` se base ed esponente sono `Integer` ed esponente ≥ 0 (con controllo di overflow: `2 ^ 31` è errore); altrimenti `Real`. `2 ^ 3` si assegna a un `Integer`, `2 ^ -1` → `0,5` | P |
| Meno unario | Overflow controllato (`-(-2147483648)` è errore) | P |
| `Real` non finito | Un risultato `Infinity` o `NaN` (es. `10.0 ^ 400`, `Sqrt(-1)`, `Log(0)`) è **errore di runtime** | P |
| `&` | Concatenazione; numeri e `Boolean` convertiti in testo con le regole dell'output (§6.9) | V |
| `+` tra stringhe | **Errore di tipo**, con il suggerimento di usare `&` | P |
| `and` / `or` | **Cortocircuitati**; operandi solo `Boolean`. Il tipo di un operando non valutato non si controlla durante l'esecuzione (`true or 1` → `true`): lo troverà l'analisi statica della fase 2 (DEC-044) | P |
| Uguaglianza tra `Real` | **Esatta**: `0.1 + 0.2 == 0.3` è falso | P |
| Confronto tra stringhe | **Case-sensitive** (`"S" == "s"` è falso); `<` e `>` per codice dei caratteri (`"Z" < "a"` è vero) | V / P |
| Confronto tra `Boolean` | Solo `==` e `!=` | P |
| Confronto tra tipi diversi | Errore di tipo, salvo `Integer` con `Real` | P |

### 6.5 Variabili e dichiarazioni

| Caso | Regola | Origine |
|---|---|---|
| Blocco `declare` | Può comparire in qualunque punto del corpo; dichiara uno o più nomi (`a, b, c`) | V |
| Variabile appena dichiarata | **Non inizializzata**: leggerla è errore di runtime | P |
| Rieseguire lo stesso `declare` (es. in un ciclo) | La variabile torna non inizializzata, come una variabile locale in C++ | P |
| Due `declare` diversi con lo stesso nome nella stessa funzione | **Errore statico**; vale anche per un parametro ridichiarato | P |
| Visibilità | Ogni funzione vede solo le proprie variabili e i propri parametri | P |
| Ordine nell'assegnazione | Prima il valore, poi il bersaglio (indice compreso) | P |
| Bersagli di assegnazione e input | `nome` oppure `nome[espressione]` | P |

### 6.6 Array

| Caso | Regola | Origine |
|---|---|---|
| Dimensione | Espressione valutata a runtime; `Integer` **≥ 1**; massimo 1.000.000 di elementi | V (espressione) / P |
| Elementi di un array nuovo | Ognuno **non inizializzato** | P |
| Indici | Da 0; fuori dai limiti è errore; indice `Real` è errore | V (da 0) / P |
| Array senza indice | Errore in output, nelle operazioni e nelle assegnazioni; ammesso solo come argomento di un parametro array e di `Size` | P |

### 6.7 Strutture di controllo

| Caso | Regola | Origine |
|---|---|---|
| Condizioni di `if`, `while`, `do` | Devono essere `Boolean` | P |
| `do` | Do-while: esegue il corpo, poi ripete **finché la condizione è vera** | V |
| `for` | Estremo `end` **incluso**; `direction` `inc` o `dec`; passo letterale `Integer` > 0 | V (forma) / P |
| `for`, valutazione | `start` ed `end` valutati **una volta**; la variabile si incrementa dal suo valore corrente (modificarla nel corpo ha effetto); dopo il ciclo vale il primo valore oltre `end`. Equivale a `for (int i = s, e = end; i <= e; i += step)` | P |
| `for` vicino al massimo degli `Integer` | Se l'incremento uscirebbe dall'intervallo, il ciclo termina e la variabile resta all'ultimo valore, senza overflow | P |
| Variabile del `for` | `Integer`, già dichiarata, non array, senza indice; estremi `Integer` | P |

### 6.8 Funzioni utente

Formato `.fprg` presunto e da verificare (§7.4).

| Caso | Regola | Origine |
|---|---|---|
| `Main` | Obbligatoria, senza parametri e senza valore di ritorno | P |
| Parametri | Array **per riferimento**, scalari per valore | P |
| Argomento array | Il nome di un array con elementi dello stesso tipo del parametro | P |
| Valore di ritorno | Lo dà la variabile indicata nell'attributo `variable` della funzione, che va dichiarata nel corpo; se alla fine non è inizializzata è errore | P |
| Blocco `call` | Deve contenere una chiamata; il valore di una funzione con ritorno viene scartato | P |
| Funzione senza ritorno in un'espressione | Errore | P |
| Ricorsione | Ammessa fino a 1000 chiamate di funzione annidate, oltre `Main` (DEC-048) | P |
| Chiamare `Main` | Non si può: `ERR_UNKNOWN_FUNCTION` (DEC-038) | P |
| Nomi | Funzioni con lo stesso nome o con il nome di una predefinita: errore statico | P |

### 6.9 Funzioni predefinite

**Elenco e semantica da verificare con Flowgorithm.** `Pow` **non esiste**: la potenza si scrive con `^`.

| Funzione | Argomenti | Risultato | Note |
|---|---|---|---|
| `Abs` | numero | stesso tipo | `Abs(-2147483648)` è overflow |
| `Arccos`, `Arcsin`, `Arctan`, `Cos`, `Sin`, `Tan` | `Real` (radianti) | `Real` | |
| `Sqrt`, `Log`, `Log10` | `Real` | `Real` | argomento non valido → errore di `Real` non finito |
| `Int` | numero | `Integer` | **troncamento verso zero**: `Int(-2.7)` → `-2` |
| `Sgn` | numero | `Integer` | `-1`, `0`, `1` |
| `Len` | `String` | `Integer` | |
| `Char` | `String`, posizione | `String` | posizioni da 0; fuori dal testo è errore |
| `Size` | array | `Integer` | |
| `Random` | `Integer` n | `Integer` | da 0 a n − 1; n ≤ 0 è errore |
| `ToChar` | codice | `String` | codice non valido è errore |
| `ToCode` | `String` | `Integer` | codice del primo carattere; testo vuoto è errore |
| `ToFixed` | `Real`, cifre (0–15) | `String` | zeri finali conservati, separatore della console: `ToFixed(2.5, 2)` → `"2,50"`; stesso arrotondamento dell'output (rappresentazione più corta, metà lontano dallo zero), mai `-0` (DEC-018) |
| `ToInteger`, `ToReal` | `String` | `Integer`, `Real` | stesse regole dell'input da console (§6.11) |
| `ToString` | valore semplice | `String` | stesse regole dell'output: `ToString(1/3)` → `"0,33"` |

### 6.10 Formato numerico in output

Il separatore decimale dipende dalla **lingua dell'interfaccia** (§9.6). Le regole sotto valgono per l'italiano. I letterali nelle espressioni usano **sempre il punto**, in tutte le lingue (lo impone il formato `.fprg`).

| Caso | Regola | Origine |
|---|---|---|
| `Integer` | Cifre senza separatori: `-7`, `2147483647` | P |
| `Real` | **Al massimo due decimali**, zeri finali rimossi: `7` → `7`, `2.5` → `2,5`, `1/3` → `0,33` | P |
| Separatore decimale | Virgola (italiano) | P |
| Arrotondamento | Al centesimo, casi a metà **lontano dallo zero**: `2.345` → `2,35`, `-2.345` → `-2,35`, `0.125` → `0,13` | P |
| Base dell'arrotondamento | La **rappresentazione decimale più corta** del numero (quella di `String(x)` in JavaScript), non il valore binario esatto: `1.005` → `1,01`, `2.675` → `2,68`. Non si può usare `toFixed`, che lavora sul valore binario | P |
| Meno zero | Mai `-0`: `-0.001` → `0` | P |
| Migliaia | Nessun separatore: `1234,5` | P |
| Valori molto grandi | **Per esteso, mai notazione scientifica**: `1e25` → `10000000000000000000000000` | P |
| Valori molto piccoli | Si arrotondano: `1e-7` → `0` | P |
| `Boolean` | `true` / `false` | P |
| Concatenazione `&` | Stesse regole | P |

### 6.11 Input da console

| Input | `Integer` | `Real` |
|---|---|---|
| `"  42  "` (spazi ai bordi) | 42 | 42 |
| `"+5"` | 5 | 5 |
| `"007"` | 7 | 7 |
| `"-0"` | 0 (mai −0) | 0 (mai −0) |
| `"2,5"` / `"2.5"` | errore (`decimal`) | 2.5 |
| `"2,0"` / `"2.0"` | errore (`decimal`) | 2 |
| `".5"` / `"5."` | errore (`decimal`) | accettato |
| `"1e3"` | errore (`format`) | errore (`format`) |
| `"1.234,5"` (migliaia) | errore (`format`) | errore (`format`) |
| `""` o soli spazi | errore (`empty`) | errore (`empty`) |
| Fuori intervallo | errore (`range`) | errore (`range`) se diventerebbe infinito |
| Troppo piccolo per un `double` | — | 0, senza errore |
| Cifre non ASCII | errore (`format`) | errore (`format`) |
| `"Infinity"`, `"NaN"`, `"0x10"` | errore (`format`) | errore (`format`) |

- **`String`:** conservata esattamente come digitata, spazi compresi.
- **`Boolean`:** `true` o `false` senza distinzione di maiuscole, con spazi ai bordi ammessi.
- **Valore non valido:** la console mostra l'errore e chiede di nuovo il valore; l'esecuzione non si ferma (DEC-040, confermata).
- **Separatori decimali in input:** virgola e punto **solo nelle lingue con separatore `,`**. Nelle lingue con separatore `.` si accetta solo il punto, perché `"1,500"` sarebbe ambiguo; lì `"2,5"` per un `Integer` è errore `format`, non `decimal` (DEC-017).
- **Spazi ai bordi:** si tolgono quelli che toglie `String.prototype.trim` (anche tabulazioni, a capo e spazio non separabile) (DEC-019).
- **Boolean non valido:** errore `format`. Segno e separatore iniziale insieme (`"-,5"`) sono accettati per i `Real`, come `".5"`.
- **Forma dell'errore:** `{ code: 'ERR_INPUT_NOT_CONVERTIBLE', params: { reason, type, text } }`, con `text` esattamente come digitato (DEC-016).

### 6.12 Conseguenze da documentare per gli studenti

- **Punto nelle espressioni, virgola nella console.** È l'asimmetria più delicata. I messaggi d'errore DEVONO riconoscere `x = 2,5` e suggerire `2.5`.
- **Un `Real` con valore intero si stampa come un `Integer`** (`7`, non `7.0`): il tipo si vede nel pannello delle variabili.
- **Con due decimali `0.001` si stampa `0`.**
- **`-2 ^ 2` vale `-4`**, e **`not x > 5` è un errore**.
- **`ToString` e `&` arrotondano a due decimali**; per più cifre serve `ToFixed`, che produce un testo con la virgola, non reinseribile come letterale.

---

## 7. Specifica del formato `.fprg`

Ricavata da un file reale di Flowgorithm (`fileversion="4.2"`), riportato in forma anonima nell'Appendice A.

### 7.1 Struttura

```xml
<?xml version="1.0"?>
<flowgorithm fileversion="4.2">
    <attributes>
        <attribute name="..." value="..."/>
    </attributes>
    <function name="Main" type="None" variable="">
        <parameters/>
        <body> ... blocchi ... </body>
    </function>
</flowgorithm>
```

Le espressioni sono negli attributi XML, con gli escape `&quot;`, `&lt;`, `&gt;`, `&amp;`.

### 7.2 Attributi del file

| Attributo | Contenuto |
|---|---|
| `name`, `about` | Testo in chiaro |
| `authors` | Testo in chiaro; **Flowgorithm lo precompila con il nome utente del sistema** |
| `saved` | Data e ora, con uno spazio finale: `"2026-10-10 11:27:35 "` |
| `created` | Base64 di `utente;PC;data;"ora ";numero` |
| `edited` | Base64 di `utente;PC;data;"ora ";contatore;numero` |

Il significato del **numero finale** di `created` ed `edited` non è noto: forse è un checksum. **Questi attributi contengono il nome utente e il nome del PC** (§9.1).

### 7.3 Blocchi verificati

| Blocco | Forma XML | Note |
|---|---|---|
| Dichiarazione | `<declare name="a, b, c" type="Integer" array="False" size=""/>` | Più nomi separati da virgola |
| Array | `<declare ... array="True" size="dim"/>` | `size` è un'espressione |
| Assegnazione | `<assign variable="numeri[i]" expression="n"/>` | Anche `variable` va analizzato |
| Input | `<input variable="n"/>` | |
| Output | `<output expression="..." newline="True"/>` | |
| If | `<if expression="..."><then>...</then><else/></if>` | `else` sempre presente, anche vuoto |
| While | `<while expression="...">...</while>` | |
| Do | `<do expression="...">...</do>` | |
| For | `<for variable="i" start="0" end="dim -1" direction="inc" step="1">...</for>` | `start`, `end` espressioni |

### 7.4 Elementi presunti, da verificare con altri campioni

- Funzione con parametri e ritorno: `<parameters><parameter name="..." type="..." array="True|False"/></parameters>`, con la variabile di ritorno nell'attributo `variable` di `<function>`.
- Chiamata: `<call expression="..."/>`.
- Commento: `<comment text="..."/>`.
- Tipi `Real` e `Boolean` negli attributi `type`.

### 7.5 Regole di lettura

| ID | Regola |
|---|---|
| FMT-R-01 | BOM iniziale rimosso; file letti come UTF-8 (la codifica di Flowgorithm non è nota) |
| FMT-R-02 | Booleani accettati solo come `True` / `False` |
| FMT-R-03 | Nell'`if`, `then` ed `else` obbligatori e non ripetuti |
| FMT-R-04 | Elemento sconosciuto → **errore di caricamento** con il nome dell'elemento. Gli elementi presunti della §7.4 (funzioni con parametri, `call`, `comment`) **non** sono sconosciuti: dalla fase 1 si caricano, si disegnano e si eseguono, con l'avviso `WARN_LOAD_UNVERIFIED_FORMAT` una volta per file (DEC-004) |
| FMT-R-05 | Attributo sconosciuto → **avviso** ("andrà perso al salvataggio"), una volta per coppia elemento/attributo |
| FMT-R-06 | Versione diversa da `4.x` (anche `4` è valida) → si prova a caricare, con un **avviso** |
| FMT-R-07 | `size` non vuoto con `array="False"` → ignorato, con avviso |
| FMT-R-08 | Testo e commenti XML tra gli elementi ignorati |
| FMT-R-09 | Funzione `Main` assente → errore di caricamento |
| FMT-R-10 | Il caricamento si ferma al primo errore strutturale; gli errori dentro le espressioni non lo bloccano |
| FMT-R-11 | `fileversion` assente → avviso `WARN_LOAD_UNSUPPORTED_VERSION` con versione vuota; `<attributes>` assente → nessun attributo; tutti gli altri elementi e attributi della §7.3 (compreso `variable` di `<function>`) sono obbligatori (DEC-030, DEC-031) |
| FMT-R-12 | File oltre 5 MB (misurati in caratteri dopo la lettura) → `ERR_LOAD_FILE_TOO_LARGE` (DEC-032) |
| FMT-R-13 | `WARN_LOAD_UNVERIFIED_FORMAT` una volta per tipo di elemento presunto: `comment`, `call`, `function` (diversa da `Main` senza tipo né ritorno), `parameter`. I tipi `Real` e `Boolean` non danno avviso (DEC-029) |

### 7.6 Regole di scrittura

| ID | Regola |
|---|---|
| FMT-W-01 | `fileversion="4.2"`, dichiarazione `<?xml version="1.0"?>`, indentazione di 4 spazi, a capo LF con a capo finale. Per un file **importato** si riproducono invece il tipo di a capo (LF o CRLF), il BOM e la presenza dell'a capo finale rilevati all'apertura (DEC-002) |
| FMT-W-02 | Attributi nell'ordine di Flowgorithm (es. `declare`: `name`, `type`, `array`, `size`) |
| FMT-W-03 | Elementi senza contenuto autochiusi (`<else/>`, `<parameters/>`, e per ipotesi anche `<then/>`, `<body/>` e cicli vuoti) |
| FMT-W-04 | Escape scritti dall'app, non dal serializzatore: `&amp;`, `&lt;`, `&gt;`, `&quot;`; a capo e tabulazioni come `&#10;`, `&#13;`, `&#9;` (ipotesi) |
| FMT-W-05 | **Espressioni, elenchi di nomi e passo del `for` riscritti con il testo originale**, non rigenerati dall'AST: lo stile dello studente (`<>` o `!=`, spazi) si conserva. Gli elementi XML, anche quelli non modificati, si rigenerano dal modello secondo questa sezione; eventuali differenze dal file originale emergono da QA-05 (DEC-003) |
| FMT-W-06 | Gli attributi di un file importato si conservano tutti, nello stesso ordine (anche `authors`, `created`, `edited`); solo `saved` si aggiorna all'ora dell'export, nel formato `AAAA-MM-GG hh:mm:ss ` |
| FMT-W-07 | L'app **non genera mai** `created` ed `edited`. Quali attributi abbia un file nuovo è la decisione D-01 (prima del passo 8); se Flowgorithm li richiedesse, si usano valori neutri privi di dati dell'utente |
| FMT-W-08 | Attributi sconosciuti non riscritti |
| FMT-W-09 | Un'espressione modificata nell'editor si scrive con il testo digitato dall'utente; un blocco nuovo si scrive nella forma della §7.3 |
| FMT-W-10 | Un file creato da zero ha almeno l'attributo `name` (dal nome scelto al salvataggio) e nessun dato dell'utente; l'insieme completo degli attributi è la decisione D-01 |
| FMT-W-11 | `saved` usa l'ora locale e si aggiorna solo se il file lo aveva; senza attributi si scrive `<attributes/>`; la dimensione di una dichiarazione non array si scrive vuota (DEC-033, DEC-034) |
| FMT-W-12 | Casi in cui il round-trip **non** è identico, accettati: dichiarazione XML diversa da `<?xml version="1.0"?>`, `fileversion` diverso da `4.2`, a capo o tabulazioni scritti letterali (non come `&#10;`) dentro un attributo, attributi sconosciuti, `size` su una variabile semplice (DEC-035) |

---

## 8. Gestione degli errori

### 8.1 Livelli

1. **Caricamento:** file non valido o non riconosciuto (§7.5).
2. **Prima dell'esecuzione (statici):** sintassi delle espressioni, letterali fuori intervallo, dichiarazioni duplicate, nomi di funzione duplicati o riservati, firma di `Main`, blocchi `call` senza chiamata. Nell'editor gli errori di sintassi si mostrano anche **mentre si scrive** (FR-EDIT-02). Nella fase 2 si aggiungono variabili non dichiarate, funzioni inesistenti, numero e tipo degli argomenti, tipi delle assegnazioni.
3. **Runtime:** divisione per zero, indice fuori dai limiti, tipi incompatibili, input non convertibile, variabile non inizializzata, overflow, `Real` non finito, ricorsione troppo profonda, interruzione con Ferma.

### 8.2 Rappresentazione

- Gli errori DEVONO essere **oggetti con codice e parametri**, mai stringhe: `{ code: 'ERR_INDEX_OUT_OF_BOUNDS', params: { index: 5, size: 3, last: 2 }, nodeId }`. Il testo si genera dal catalogo della lingua solo al momento di mostrarlo.
- Lo stesso codice può avere **messaggi diversi** in base ai parametri facoltativi `reason` e `type`: si cerca nel catalogo la chiave più specifica, `CODICE.reason.type` → `CODICE.reason` → `CODICE`. Vince la chiave più specifica presente nella lingua attiva **o** in italiano (DEC-015); `type` senza `reason` non sceglie una chiave.
- Gli errori di sintassi DEVONO avere la **posizione** nel testo dell'espressione (colonna, inizio, fine). Basta il primo errore per espressione, nell'ordine di lettura. Forma: `{ code, params, position: { start, end, column } }`, con `column` da 1 (DEC-022).
- Gli errori di runtime DEVONO includere la **fotografia delle variabili** della funzione in esecuzione.
- Gli avvisi hanno la stessa forma, con prefisso `WARN_`.

### 8.3 Codici minimi

Elenco indicativo dei codici validati nel prototipo, utile come punto di partenza.

| Area | Codici |
|---|---|
| Input | `ERR_INPUT_NOT_CONVERTIBLE` con `reason` `empty`, `format`, `decimal`, `range` |
| Sintassi | `ERR_SYNTAX_TOO_COMPLEX` (DEC-023), `ERR_SYNTAX_EMPTY_EXPRESSION`, `ERR_SYNTAX_UNEXPECTED_CHARACTER`, `ERR_SYNTAX_UNTERMINATED_STRING`, `ERR_SYNTAX_INVALID_NUMBER`, `ERR_SYNTAX_UNEXPECTED_TOKEN`, `ERR_SYNTAX_UNEXPECTED_END`, `ERR_SYNTAX_UNCLOSED`, `ERR_SYNTAX_CHAINED_COMPARISON`, `ERR_SYNTAX_INVALID_INDEX`, `ERR_SYNTAX_INVALID_TARGET`, `ERR_INTEGER_LITERAL_OUT_OF_RANGE`, `ERR_REAL_LITERAL_OUT_OF_RANGE`, `ERR_NAME_LIST_INVALID`, `ERR_FOR_STEP_INVALID` |
| Caricamento | `ERR_LOAD_INVALID_XML`, `ERR_LOAD_NOT_FLOWGORITHM`, `ERR_LOAD_UNKNOWN_ELEMENT`, `ERR_LOAD_MISSING_ELEMENT`, `ERR_LOAD_DUPLICATE_ELEMENT`, `ERR_LOAD_MISSING_ATTRIBUTE`, `ERR_LOAD_INVALID_VALUE`, `ERR_LOAD_NO_MAIN`; avvisi `WARN_LOAD_UNSUPPORTED_VERSION`, `WARN_LOAD_UNKNOWN_ATTRIBUTE`, `WARN_LOAD_IGNORED_SIZE`, `WARN_LOAD_UNVERIFIED_FORMAT`; `ERR_LOAD_FILE_TOO_LARGE` (DEC-032) |
| Statici | `ERR_DUPLICATE_DECLARATION`, `ERR_DUPLICATE_FUNCTION`, `ERR_FUNCTION_NAME_RESERVED`, `ERR_INVALID_NAME` (usato anche per la variabile del `for`, DEC-021), `ERR_MAIN_SIGNATURE`, `ERR_CALL_BLOCK_NOT_CALL` |
| Runtime (parametri e motivi: DEC-039, DEC-045, DEC-046) | `ERR_UNDECLARED_VARIABLE`, `ERR_UNINITIALIZED_VARIABLE`, `ERR_ARRAY_WITHOUT_INDEX`, `ERR_NOT_AN_ARRAY`, `ERR_INDEX_TYPE`, `ERR_INDEX_OUT_OF_BOUNDS`, `ERR_ARRAY_SIZE_TYPE`, `ERR_ARRAY_SIZE_INVALID`, `ERR_ARRAY_TOO_LARGE`, `ERR_ASSIGN_TYPE`, `ERR_CONDITION_TYPE`, `ERR_LOGICAL_OPERAND`, `ERR_BINARY_OPERATOR_TYPES`, `ERR_UNARY_OPERATOR_TYPE`, `ERR_DIVISION_BY_ZERO`, `ERR_INTEGER_OVERFLOW`, `ERR_REAL_NOT_FINITE`, `ERR_UNKNOWN_FUNCTION`, `ERR_ARGUMENT_COUNT`, `ERR_ARGUMENT_TYPE`, `ERR_ARRAY_ARGUMENT`, `ERR_FUNCTION_NO_VALUE`, `ERR_RETURN_UNDECLARED`, `ERR_RETURN_NOT_SET`, `ERR_RETURN_TYPE`, `ERR_RECURSION_LIMIT`, `ERR_FOR_VARIABLE_TYPE`, `ERR_FOR_BOUND_TYPE`, `ERR_BUILTIN_ARGUMENT`, `ERR_CONVERSION_FAILED`, `ERR_STOPPED`, `ERR_INTERNAL` |

### 8.4 Messaggi con suggerimento

Questi casi DEVONO avere un messaggio dedicato, perché sono gli errori tipici degli studenti:

| Caso | Suggerimento |
|---|---|
| `x = 2,5` (virgola decimale in un'espressione) | "si scrive 2.5; la virgola si usa solo nella console" |
| `a AND b`, `x = True` | "operatori e valori logici in minuscolo" |
| `'ciao'` | "le stringhe si scrivono tra virgolette doppie" |
| `età` | "nei nomi niente lettere accentate" |
| `.5`, `5.`, `1e3`, `2x` | rispettivamente: zero davanti, cifre dopo il punto, niente notazione scientifica, serve `*` |
| `a < b < c` | "usa `and`" |
| `c = a / b` con `c` `Integer` | "`/` dà sempre un `Real`; usa `Int(...)`" |
| `"a" + "b"` | "per unire testi usa `&`" |
| `not x > 5` | "per negare un confronto usa le parentesi" |
| Input `2,5` per un `Integer` | "la variabile accetta solo numeri interi" |
| Ricorsione troppo profonda | "probabilmente una funzione ricorsiva non si ferma" |
| Difetto interno | "non è un errore del diagramma: segnalalo" |

Negli errori gli operatori DEVONO essere mostrati in una forma canonica e coerente.

---

## 9. Requisiti non funzionali

### 9.1 Privacy (vincolo: nessun dato dell'utente salvato)

| ID | Requisito |
|---|---|
| NFR-PRIV-01 | Nessun `localStorage`, IndexedDB, cookie o altro storage **persistente**: si lavora in memoria e si salva scaricando il file. Unica eccezione la copia di sessione di NFR-PRIV-08 |
| NFR-PRIV-08 | **Copia di sessione del diagramma** (deroga decisa per i telefoni, FR-MOB-15): l'app PUÒ e DEVE conservare in `sessionStorage` **solo** il diagramma aperto (testo `.fprg`, nome del file, stato "salvato/non salvato"), per sopravvivere ai ricaricamenti e alle schede chiuse dal sistema. Resta solo su quel dispositivo e in quella scheda, il browser la cancella alla chiusura della scheda, non viene mai inviata. Niente preferenze, cronologia o altri dati. L'app DEVE funzionare anche se `sessionStorage` non è disponibile (es. navigazione privata), senza ripristino. Il README DEVE spiegarlo. Non è certo che su tutte le versioni di iOS la copia sopravviva a ogni chiusura in background: va verificato (QA-15) |
| NFR-PRIV-02 | **Nessuna risorsa esterna**: niente CDN, font remoti, analytics. Solo font di sistema e codice locale |
| NFR-PRIV-03 | I file si leggono in locale e si salvano tramite download; non lasciano mai il browser |
| NFR-PRIV-04 | La scelta della lingua non si memorizza; si può fissare solo con il parametro `?lang=` nell'URL |
| NFR-PRIV-05 | Il repository NON DEVE contenere dati personali. I file `.fprg` usati come esempi o test DEVONO avere `authors`, `created` ed `edited` con valori neutri. I test che lo verificano NON DEVONO citare i valori originali |
| NFR-PRIV-06 | Il README DEVE spiegare che un `.fprg` di Flowgorithm contiene nome utente e nome del PC di chi l'ha creato, e che OnoFlow non li aggiunge ma non li toglie |
| NFR-PRIV-07 | La documentazione di GitHub Pages dichiara che di ogni visitatore "l'indirizzo IP viene registrato e conservato per motivi di sicurezza", anche senza account GitHub. Va riportato nel README e nel piè di pagina dell'app (FR-INFO-03). Prima della pubblicazione va ricontrollata la documentazione di GitHub, che può cambiare |

> Nota: è un quadro tecnico, non un parere legale.

### 9.2 Distribuzione e ambiente

| ID | Requisito |
|---|---|
| NFR-DIST-01 | Pubblicata con **GitHub Pages**. Sui **computer** è utilizzabile anche **offline**, scaricando lo ZIP del repository e aprendo `index.html` da `file://`; sui **telefoni** si usa online (§5.9). Nessuna app installabile (PWA) per ora |
| NFR-DIST-02 | **Nessuna dipendenza esterna e nessun passaggio di build**: il repository è già l'applicazione. Unica eccezione la cartella `tools/`, con un proprio `package.json` (Playwright) usato solo per le verifiche automatiche: né l'app né `tests.html` ne dipendono (DEC-005) |
| NFR-DIST-03 | Browser di riferimento: **Firefox** su Linux Mint (laboratorio), **Chrome** su Android e **Safari** su iOS/iPadOS, con lo stesso peso. DEVE funzionare anche su Chromium/Chrome per computer e su Firefox per Android |
| NFR-DIST-04 | Da `file://` il browser non permette di leggere altri file locali con `fetch` o `XMLHttpRequest`: esempi e casi di test `.fprg` DEVONO essere incorporati come stringhe in file JavaScript |

### 9.3 Prestazioni e robustezza

| ID | Requisito |
|---|---|
| NFR-PERF-01 | Un ciclo infinito non DEVE bloccare la pagina; Pausa e Ferma DEVONO rispondere entro una frazione di secondo |
| NFR-PERF-02 | Limiti di sicurezza: ricorsione 1000 livelli, array 1.000.000 di elementi, console circa 200.000 caratteri, file 5 MB |
| NFR-PERF-03 | Un difetto dell'interprete NON DEVE lasciare l'app in uno stato bloccato: l'esecuzione termina con `ERR_INTERNAL` |
| NFR-PERF-04 | L'app DEVE restare fluida su telefoni Android di fascia bassa: disegno del diagramma, scorrimento e zoom senza scatti evidenti con diagrammi da esercizio (qualche decina di blocchi) |

### 9.4 Sicurezza

| ID | Requisito |
|---|---|
| NFR-SEC-01 | Ogni testo proveniente da un file (espressioni, commenti, nomi, attributi) DEVE essere inserito nella pagina come **testo**, mai come HTML |

### 9.5 Accessibilità e usabilità

| ID | Requisito |
|---|---|
| NFR-ACC-01 | Tutti i comandi raggiungibili da tastiera, con il focus visibile |
| NFR-ACC-02 | Tema chiaro e scuro secondo le impostazioni del sistema, con contrasto adeguato in entrambi |
| NFR-ACC-03 | Layout responsivo da 360 px CSS in su, senza scorrimento orizzontale della pagina; comportamento su telefono definito dalla §5.9 |
| NFR-ACC-04 | Leggibile proiettato in aula |

### 9.6 Localizzazione

| ID | Requisito |
|---|---|
| NFR-I18N-01 | Oggi solo italiano, ma **nessun testo dell'interfaccia scritto nel codice**: tutto passa da un catalogo per lingua, con funzione `t(chiave, parametri)` |
| NFR-I18N-02 | Messaggi con **segnaposto** (`{nome}`), mai concatenazioni di frammenti. Un parametro mancante lascia il segnaposto visibile; i numeri si passano già formattati (DEC-014) |
| NFR-I18N-03 | Un file per lingua; aggiungere una lingua = aggiungere un file |
| NFR-I18N-04 | Il catalogo contiene anche il **formato numerico** della console (separatore decimale in output e separatori accettati in input). Struttura: `{ name, number: { decimalSeparator, inputDecimalSeparators }, messages }` (DEC-013) |
| NFR-I18N-05 | Lingua iniziale: `?lang=` nell'URL, poi lingua del browser, poi italiano. Chiave assente nella lingua attiva → italiano; assente anche lì → la chiave stessa |
| NFR-I18N-06 | Un test verifica che ogni catalogo abbia esattamente le chiavi e gli stessi segnaposto dell'italiano |

### 9.7 Manutenibilità e didattica del codice

| ID | Requisito |
|---|---|
| NFR-CODE-01 | Il codice DEVE essere leggibile da chi lo studia: identificatori in inglese per esteso, commenti in italiano |
| NFR-CODE-02 | Ogni modulo dichiara le sue dipendenze nel commento iniziale |
| NFR-CODE-03 | Logica e interfaccia separate: la logica è testabile senza la pagina |

---

## 10. Architettura di riferimento

Questa architettura è stata **validata nel prototipo** dei passi 1–6. È raccomandata (**DOVREBBE**) ma non imposta: chi riparte da zero può proporre alternative, motivandole, purché rispettino i requisiti delle §5 e §9. I vincoli marcati DEVE derivano direttamente dai requisiti.

### 10.1 Vincoli

- **DEVE:** script JavaScript classici (`<script src>`), **senza moduli ES** (non funzionano da `file://`) e **senza build**. L'ordine dei `<script>` va documentato.
- **DOVREBBE:** un solo oggetto globale `OnoFlow`, con un sotto-oggetto per modulo scritto per esteso (`OnoFlow.Interpreter`, non abbreviazioni).

### 10.2 Moduli

| Modulo | Responsabilità |
|---|---|
| Localizzazione | Cataloghi, `t()`, formattazione degli errori, scelta della lingua |
| Formattazione | Stampa e parsing dei numeri della console (§6.10, §6.11) |
| Modello | Albero di programma, funzioni e blocchi; **unica fonte di verità**, senza dettagli grafici. ID stabili su ogni nodo |
| Espressioni | Lexer e parser (Pratt) di espressioni, bersagli, elenchi di nomi, nomi singoli e passo del `for`; conserva il **testo sorgente** accanto all'AST. Forma dell'AST e operatori canonici: DEC-020 |
| Formato | Import con `DOMParser`; export scritto a mano (§7.6). `importFprg` restituisce anche il formato del file (a capo, BOM, a capo finale), tenuto fuori dal modello (DEC-028) |
| Interprete | Esecuzione basata su **funzioni generatore** |
| Scheduler | Esecuzione continua a budget di passi, pausa, passo-passo, stop |
| Renderer | Layout e disegno SVG, collegato al modello tramite ID |
| Console | Output, input in linea, errori con variabili, avvisi |
| Editor | Inserimento, modifica, cancellazione, annulla/ripeti; ogni modifica passa dal modello e il disegno si aggiorna di conseguenza |
| Generatori di codice | Fase 3: un *visitor* sul modello per linguaggio |
| Applicazione | Collega i moduli all'interfaccia |

### 10.3 Scelte chiave e motivazioni

- **Interprete a generatori (`function*`).** Ogni blocco cede il controllo (`yield`): passo-passo, pausa e attesa dell'input si ottengono senza bloccare la pagina. **Anche il valutatore delle espressioni è un generatore**, perché una funzione utente chiamata in un'espressione può contenere un input; le chiamate si valutano con `yield*`. Il parser resta una funzione normale.
- **Eventi dell'interprete:** `step` (con l'ID del blocco), `output` (testo e a capo), `input` (tipo atteso; il testo digitato torna con `next(testo)`). Un `step` prima di ogni blocco **e a ogni verifica della condizione di un ciclo**, così anche un `while true` vuoto consuma passi. I commenti non si eseguono e non consumano passi (DEC-043).
- **Trampolino:** i generatori non delegano con `yield*` ma cedono il sotto-generatore a un motore con una pila esplicita; lo stack nativo resta costante e 1000 livelli di ricorsione sono possibili (DEC-041).
- **Scheduler a budget.** Non un `while (!gen.next().done)`: un numero massimo di passi per turno (ordine di grandezza 10.000), poi `setTimeout(0)`. La misura dei 5 secondi (FR-RUN-04) DEVE usare il **tempo reale**, pause tra i turni comprese, non solo il tempo di calcolo. Oltre al budget di passi, un turno dura al massimo circa 25 ms (DEC-042). **Ferma** fa entrare `ERR_STOPPED` nel generatore, così l'errore ha il blocco e le variabili del momento.
- **ID stabili sui nodi fin dall'inizio.** Collegano modello e disegno: servono all'evidenziazione degli errori, al passo-passo e al clic sulle frecce dell'editor. Non si scrivono nel file.
- **Testo sorgente conservato.** Il modello conserva, per ogni campo, il risultato dell'analisi `{ testo, ast, errore }` anche quando contiene un errore. Così un file con errori si apre, e l'export riscrive le espressioni come le ha scritte lo studente.
- **Modello separato dal disegno.** L'editor modifica solo il modello e il renderer ridisegna; la generazione di codice diventa un *visitor* sull'albero.
- **Modifiche come comandi.** Ogni modifica dell'editor DOVREBBE essere un'operazione reversibile sul modello (inserisci, sostituisci contenuto, cancella), così annulla/ripeti e lo stato "modificato" derivano dalla stessa storia delle modifiche. Gli ID dei nodi DEVONO restare stabili dopo annulla/ripeti.
- **Esecuzione sincrona per i test:** una funzione che esegue un programma con un elenco di input già noto e restituisce output ed esito.

---

## 11. Interfaccia

### 11.1 Disposizione e comandi

- **Barra superiore:** nome dell'app, nome del file aperto con l'indicazione "modificato", Nuovo, Apri, Esempi, Salva, Annulla, Ripeti, Esegui, Pausa/Riprendi, Ferma, stato dell'esecuzione.
- **Zona del diagramma** e **zona della console** affiancate su computer e tablet in orizzontale; **su telefono a tutto schermo, una alla volta**, con un modo rapido per passare dall'una all'altra (§5.9).
- **Su telefono:** indicazione "non salvato" ben visibile e messaggio di ripristino quando la pagina si riapre (FR-MOB-15); barra dei comandi compatta (Esegui/Ferma sempre visibili, il resto in un menu), finestra di modifica a tutto schermo con la barra dei simboli, diagramma con scorrimento, zoom e "adatta allo schermo".
- Durante l'esecuzione Nuovo, Apri, Esempi e la modifica del diagramma sono disabilitati; Pausa è disabilitato mentre si attende un input.
- Un diagramma nuovo mostra un invito a inserire il primo blocco cliccando sulla freccia.
- **Piè di pagina:** progetto indipendente e non affiliato a Flowgorithm; i file non lasciano il browser; **avviso sull'hosting** su GitHub Pages, fuori dall'UE, con il collegamento all'informativa di GitHub (FR-INFO-03), sostituito da "copia locale" quando l'app è aperta da `file://` (FR-INFO-04).
- **Testi:** frasi semplici, verbi d'azione; lo stesso nome per la stessa azione ovunque (es. "Ferma" sia nel pulsante sia nell'avviso del ciclo infinito). Tono **impersonale**, senza "tu" (DEC-050).
- **Priorità:** quando le esigenze sono in conflitto vince la leggibilità al proiettore (DEC-050).

### 11.2 Direzione visiva

Lo stile DEVE essere **proprio e distinto** da quello di Flowgorithm; dell'originale si riprende solo il modello di interazione.

Il prototipo ha validato una direzione basata sugli **oggetti della classe**:
- diagramma su un **foglio a quadretti** con il margine rosso del quaderno;
- console come **lavagna**, con il testo in gesso e i valori digitati in giallo;
- errori in **penna rossa** (riga marcata, sottolineatura ondulata);
- blocco in esecuzione con l'**evidenziatore**.

È una proposta che ha funzionato, non un vincolo: chi riparte PUÒ sceglierne un'altra, rispettando NFR-PRIV-02 e §9.5.

**Scelta (DEC-051):** questa direzione, in versione sobria, con la grammatica degli stati della segnaletica stradale (ogni stato un segno con un solo significato), linee a un pixel, niente gradienti, ombre o rilievi, quadretti tenui e contenuto al massimo contrasto. Contesto di prodotto in `PRODUCT.md`; sistema visivo in `DESIGN.md`, scritto alla fine del passo 6.

---

## 12. Qualità e test

| ID | Requisito |
|---|---|
| QA-01 | Una pagina `tests.html` con un **mini-framework di asserzioni scritto da zero**, senza dipendenze, eseguibile da `file://` in Firefox: suite, test sincroni e asincroni con timeout, asserzioni di uguaglianza (con `Object.is`, per distinguere `0` da `-0`), uguaglianza strutturale, eccezioni attese, filtro dall'URL (`?filtro=`), segnalazione degli script non caricati. Un test che non esegue asserzioni risulta fallito; `?dimostrazione` mostra fallimenti voluti (DEC-007, DEC-008) |
| QA-02 | Il framework ha i propri test, che verificano che le asserzioni falliscano quando devono |
| QA-03 | Ogni modulo di logica ha i suoi test. Ogni consegna verifica anche che i test sappiano fallire (difetti introdotti di proposito) |
| QA-04 | **Caso di riferimento:** il programma dell'Appendice A, con input `5, s, 3, n, 4, 9`, DEVE produrre come ultime righe:<br>`Somma del primo set di numeri: 8`<br>`Numero massimo trovato nel secondo set di numeri: 9`<br>`Numero minimo trovato nel secondo set di numeri: 4` |
| QA-05 | Round-trip del file dell'Appendice A: testo identico (salvo `saved`) e modello identico (salvo gli ID) |
| QA-06 | Ogni esempio del menu: si apre senza errori né avvisi, si riesporta identico, produce l'output atteso con input noti |
| QA-11 | **Creazione da zero:** costruire con le sole operazioni dell'editor il programma dell'Appendice A; eseguito con gli input di QA-04 produce lo stesso output; salvato e riaperto dà lo stesso modello |
| QA-12 | **Modifica di un file importato:** aprire l'Appendice A, cambiare un'espressione, aggiungere e cancellare un blocco, salvare; il file riaperto contiene esattamente le modifiche, le righe non toccate sono identiche all'originale e gli attributi sono conservati (salvo `saved`) |
| QA-13 | **Annulla/ripeti:** dopo una sequenza di modifiche, annullarle tutte riporta al modello iniziale (ID compresi) e lo stato "modificato" si azzera; ripeterle riporta al modello finale |
| QA-14 | **Telefono:** ogni passo con interfaccia DEVE essere verificato anche a 360 × 640 px CSS (Android) e 375 × 667 px CSS (iPhone) con eventi di tocco (es. emulazione in Chromium) e consegnato con schermate a quella larghezza. Gli scenari QA-11 e QA-12 DEVONO essere eseguibili da telefono |
| QA-15 | Prima della pubblicazione della prima versione: prova dell'autore su un **telefono Android reale e un iPhone reale** (creazione da zero, modifica di un file, esecuzione con input, salvataggio, ripristino dopo aver chiuso e riaperto la scheda o dopo essere passati a un'altra app). Le verifiche automatiche DOVREBBERO usare anche WebKit (es. Playwright con il motore WebKit) oltre a Chromium, ma non sostituiscono l'iPhone reale |
| QA-07 | Ogni codice d'errore prodotto nei test ha un messaggio nel catalogo, senza segnaposto rimasti |
| QA-08 | I componenti dell'interfaccia (console, diagramma) sono testati su elementi creati in memoria; l'applicazione completa si verifica con una **lista di controlli manuali** consegnata con il codice |
| QA-09 | La verifica che conta è quella in **Firefox** da `file://`, fatta dall'autore. Prima della consegna DOVREBBE essere fatta una verifica automatica in un browser vero (es. Chromium con Playwright), comprese schermate in tema chiaro, scuro e a larghezza da telefono. Lo strumento è `tools/run-tests.mjs` (Chromium, Firefox, WebKit) |
| QA-10 | Un ciclo infinito causato da un difetto dell'interprete DOVREBBE far fallire il test invece di bloccare `tests.html` (limite di tempo oltre al limite di passi) |

---

## 13. Roadmap

Ogni fase produce una versione utilizzabile.

| Fase | Contenuto | Scopo | Criterio di uscita |
|---|---|---|---|
| **1. Prima versione (MVP)** | Nucleo (test, localizzazione, modello, espressioni, formato, interprete, scheduler), interfaccia, renderer **ed editor**, **su computer e telefono** | Uno strumento autonomo: creare da zero, modificare un file importato, eseguire, salvare, anche da telefono | QA-01…QA-15 superati; uno studente crea da zero il programma dell'Appendice A, lo esegue e lo salva senza Flowgorithm, **sia da computer sia da telefono** |
| **2. Didattica ed editor esteso** | Passo-passo, pannello delle variabili, analisi statica completa; funzioni, `call`, `comment`, spostamento dei blocchi | Valore didattico | FR-RUN-05, FR-RUN-06, FR-ERR-06, FR-EDIT-10…12 |
| **3. Codice** | Generazione C++ e Python | Collegare diagrammi e linguaggi | Il codice generato dagli esempi compila ed esegue con lo stesso output |

La prima versione si pubblica solo quando creazione da zero e modifica funzionano: un'app che esegue ma non permette di costruire non risponde all'esigenza di partenza.

**Ordine interno della fase 1** (logica pura prima, grafica dopo, editor per ultimo perché si appoggia su tutto il resto):

| Passo | Contenuto | Verifica |
|---|---|---|
| 1 | Pagina dei test e mini-framework | Si apre in Firefox da `file://` e mostra test superati e falliti |
| 2 | Localizzazione + formattazione dei numeri | Casi della §6.10 e §6.11 |
| 3 | Modello + espressioni | Entrambi gli stili, precedenze, errori con posizione |
| 4 | Formato `.fprg` | Import del campione; round-trip a testo identico |
| 5 | Interprete + scheduler | QA-04 senza interfaccia |
| 6 | Interfaccia minima | Apertura, esempi, esecuzione con input in linea, errori, salvataggio; passaggio diagramma/console su telefono (FR-MOB-01…03) |
| 7 | Renderer SVG | Diagramma in sola lettura, evidenziazione tramite ID; scorrimento, zoom e "adatta allo schermo" (FR-MOB-06) |
| 8 | Nuovo diagramma e stato "modificato" | FR-FILE-07, FR-FILE-08, FR-FILE-11 |
| 9 | Inserimento dalle frecce | FR-EDIT-01, FR-EDIT-03, FR-MOB-04, FR-MOB-05 |
| 10 | Finestra di modifica con errore mentre si scrive | FR-EDIT-02, FR-EDIT-08, FR-MOB-07…09 |
| 11 | Cancellazione | FR-EDIT-04 |
| 12 | Annulla/ripeti | FR-EDIT-05, QA-13 |
| 13 | Salvataggio di file creati e modificati | FR-FILE-09, FR-FILE-10, QA-11, QA-12 |

**Il telefono non è un passo a sé:** ogni passo con interfaccia (6–13) DEVE soddisfare la §5.9 e QA-14 nel momento in cui viene fatto. Adattare dopo un'interfaccia nata solo per il mouse costa molto di più, soprattutto per l'editor.

**Il renderer viene prima dell'editor:** il modello di interazione dell'editor (clic sulla freccia) si appoggia sul diagramma disegnato. Il passo 7 è la parte tecnicamente più difficile del percorso: disposizione leggibile di cicli e `if` annidati, su schermi larghi e stretti.

---

## 14. Incognite e domande aperte

### 14.1 Da verificare in Flowgorithm

| # | Domanda | Impatto |
|---|---|---|
| Q-01 | `7 / 2` tra due `Integer` dà `3.5`? | §6.4 |
| Q-02 | Sono accettati `&&`, `\|\|`, `!`, `%`, `!=`? | §6.3, principio di prudenza |
| Q-03 | Il caso di riferimento (QA-04) produce lo stesso output? | QA-04 |
| Q-04 | Un file salvato da OnoFlow si riapre in Flowgorithm? In particolare: file importato, **modificato** e riesportato con `created`/`edited` conservati (il numero finale potrebbe essere un checksum); file **creato da zero** senza `created`/`edited`; file con valori neutri. **Bloccante per FR-FILE-10** | FMT-W-06, FMT-W-07, FR-FILE-10, NFR-PRIV-05 |
| Q-05 | A capo CRLF o LF? Codifica dei file (UTF-8, con BOM, Windows-1252)? | FMT-R-01, FMT-W-01 |
| Q-06 | Elementi vuoti autochiusi (`<then/>`, `<body/>`, cicli vuoti) e a capo nei commenti | FMT-W-03, FMT-W-04 |
| Q-07 | Formato di funzioni con parametri e ritorno, `call`, `comment`, tipi `Real` e `Boolean` (serve un secondo file campione) | §7.4 |
| Q-08 | Semantica: `-7 mod 3`, `7.5 mod 2`, `x = 2 ^ 3` con `x` `Integer`, `0.1 + 0.2 == 0.3`, `true & "!"`, `"a" + "b"`, `Int(-2.7)` | §6.4, §6.9 |
| Q-09 | Elenco e firme delle funzioni predefinite; `Pow` esiste? `Char` conta da 0 o da 1? Intervallo di `Random`? | §6.9 |
| Q-10 | Sintassi: `"a" & 1 + 2`, `-2 ^ 2`, `not 1 == 2`, `'ciao'`, `.5 + 1`, `007` | §6.2, §6.3 |
| Q-11 | Flowgorithm produce file con `size` valorizzato e `array="False"`? | FMT-R-07 |
| Q-12 | Su iOS, disattivare la correzione automatica nei campi evita le virgolette tipografiche? E la copia in `sessionStorage` sopravvive sempre alla chiusura della scheda in background? (da verificare su iPhone, non in Flowgorithm) | FR-MOB-15, FR-MOB-16 |

### 14.2 Da decidere

| # | Decisione | Quando |
|---|---|---|
| D-01 | Attributi di un file creato in OnoFlow (`authors` vuoto? `created`/`edited` assenti o neutri?) | Prima del passo 8 |
| D-02 | Meccanismo di annulla/ripeti (comandi reversibili o copie del modello) e limite della storia | Prima del passo 12 |
| D-03 | Forma dello spostamento dei blocchi (trascinamento o taglia/incolla) | Fase 2 |
| D-04 | Interazione dell'editor al tocco: punti di inserimento sulle frecce, comando "inserisci dopo" sul blocco selezionato, o entrambi (FR-MOB-05) | Prima del passo 9 |
| D-05 | "Valore completo" nel pannello delle variabili (es. `0.30000000000000004`) e con quale separatore | Fase 2 |
| D-06 | Suggerimento sulle maiuscole nell'analisi statica (`x = True` → "intendevi `true`?") | Fase 2 |
| D-07 | Array in C++: `std::vector` o array statici | Fase 3 |
| D-08 | Il codice generato replica la stampa a due decimali con la virgola, o usa il formato nativo? | Fase 3 |
| D-09 | Un blocco nuovo appena inserito parte vuoto o con un contenuto di esempio (es. `x` ← `0`)? | Prima del passo 9 |
| D-10 | Cosa succede salvando un file importato e modificato: `edited` resta com'era (potrebbe non corrispondere più al contenuto) o si toglie? Dipende da Q-04 | Prima del passo 13 |
| D-11 | Modo di passare tra diagramma e console su telefono: schede in basso, pulsante, scorrimento laterale (FR-MOB-01) | Prima del passo 6 |
| D-12 | Tastiera per l'input numerico nella console su telefono: testo normale o tastiera numerica (`inputmode`)? Alcune tastiere numeriche, in particolare su iOS, non hanno il segno meno o la virgola | Prima del passo 6 |
| D-13 | Versioni minime di Android e iOS da supportare (dipende dai telefoni degli studenti) | Prima del passo 6 |

### 14.3 Organizzative

- Disponibilità del nome OnoFlow su GitHub e creazione del repository.
- Politica privacy di GitHub Pages per il README e il piè di pagina (NFR-PRIV-07, FR-INFO-03). **Non verificato:** in quali Paesi si trovino fisicamente i server che distribuiscono le pagine; l'avviso parla della sede di GitHub (USA), che determina il trasferimento fuori dall'UE.

---

## 15. Glossario

| Termine | Significato |
|---|---|
| **Blocco** | Elemento del diagramma: dichiarazione, assegnazione, input, output, if, while, do, for, chiamata, commento |
| **Bersaglio** | Ciò che riceve un valore in un'assegnazione o in un input: `x` oppure `v[i]` |
| **Round-trip** | Aprire un file e riesportarlo: il risultato deve coincidere con l'originale |
| **Rappresentazione più corta** | Il minimo numero di cifre decimali che identifica un `double` (quello che JavaScript stampa con `String(x)`) |
| **Passo** | Unità di esecuzione dell'interprete: un blocco, o la verifica della condizione di un ciclo |
| **Budget** | Numero massimo di passi eseguiti prima di restituire il controllo al browser |
| **Catalogo** | File con i testi dell'interfaccia di una lingua |

---

## Appendice A — File campione (anonimizzato)

File reale di Flowgorithm 4.2, con `authors`, `created` ed `edited` sostituiti da valori neutri (`studente`, `PC-LAB`). È il caso di riferimento di QA-04 e QA-05. Va incorporato nei test come stringa (NFR-DIST-04).

```xml
<?xml version="1.0"?>
<flowgorithm fileversion="4.2">
    <attributes>
        <attribute name="name" value="test_per_WebApp"/>
        <attribute name="authors" value="studente"/>
        <attribute name="about" value=""/>
        <attribute name="saved" value="2026-10-10 11:27:35 "/>
        <attribute name="created" value="c3R1ZGVudGU7UEMtTEFCOzIwMjYtMTAtMTA7IjExOjA2OjMwICI7MjIzOQ=="/>
        <attribute name="edited" value="c3R1ZGVudGU7UEMtTEFCOzIwMjYtMTAtMTA7IjExOjI3OjM1ICI7MjsyMzU2"/>
    </attributes>
    <function name="Main" type="None" variable="">
        <parameters/>
        <body>
            <declare name="n, max, min, dim, i" type="Integer" array="False" size=""/>
            <declare name="risultato" type="Integer" array="False" size=""/>
            <declare name="risposta" type="String" array="False" size=""/>
            <assign variable="dim" expression="0"/>
            <assign variable="risultato" expression="0"/>
            <do expression="risposta == &quot;s&quot;">
                <output expression="&quot;Quale numero vuoi sommare?&quot;" newline="True"/>
                <input variable="n"/>
                <assign variable="dim" expression="dim + 1"/>
                <assign variable="risultato" expression="risultato + n"/>
                <output expression="&quot;Vuoi continuare? s/n&quot;" newline="True"/>
                <input variable="risposta"/>
            </do>
            <declare name="numeri" type="Integer" array="True" size="dim"/>
            <for variable="i" start="0" end="dim -1" direction="inc" step="1">
                <output expression="&quot;Inserisci un numero&quot;" newline="True"/>
                <input variable="n"/>
                <assign variable="numeri[i]" expression="n"/>
            </for>
            <assign variable="i" expression="0"/>
            <assign variable="max" expression="numeri[0]"/>
            <assign variable="min" expression="numeri[0]"/>
            <while expression="i&lt;dim">
                <if expression="max &lt; numeri[i]">
                    <then>
                        <assign variable="max" expression="numeri[i]"/>
                    </then>
                    <else/>
                </if>
                <if expression="min &gt; numeri[i]">
                    <then>
                        <assign variable="min" expression="numeri[i]"/>
                    </then>
                    <else/>
                </if>
                <assign variable="i" expression="i + 1"/>
            </while>
            <output expression="&quot;Somma del primo set di numeri: &quot; &amp; risultato" newline="True"/>
            <output expression="&quot;Numero massimo trovato nel secondo set di numeri: &quot; &amp; max" newline="True"/>
            <output expression="&quot;Numero minimo trovato nel secondo set di numeri: &quot; &amp; min" newline="True"/>
        </body>
    </function>
</flowgorithm>
```

Nota: i valori neutri di `created`/`edited` potrebbero non essere accettati da Flowgorithm se il numero finale è un checksum (Q-04).

---

## Appendice B — Lezioni dal prototipo

Problemi incontrati nel prototipo dei passi 1–6, da tenere presenti ripartendo.

| # | Lezione |
|---|---|
| L-01 | **Da `file://` Firefox tratta ogni file come un'origine distinta:** niente `fetch` di file locali, e le eccezioni di altri script possono arrivare mascherate come `Script error.` La pagina dei test deve segnalare gli script non caricati e rimandare alla console |
| L-02 | **Lo ZIP va estratto** prima di aprire `index.html` o `tests.html`: aprirli dal gestore di archivi estrae solo quel file. La pagina dei test deve dirlo se il framework non si carica, invece di restare ferma |
| L-03 | **`toFixed` è impreciso** per l'arrotondamento a metà (`2.675.toFixed(2)` → `"2.67"`); la regola della §6.10 si implementa sulle cifre di `toExponential()` |
| L-04 | **`-0` esiste** in JavaScript: va normalizzato ovunque (output, input, letterali, risultati), e i test devono distinguerlo (`Object.is`) |
| L-05 | **Limiti degli `Integer`:** usare `BigInt` per controllare l'intervallo di testi lunghi e delle potenze intere |
| L-06 | **`DOMParser` non esiste in Node:** se si fanno verifiche fuori dal browser serve una libreria DOM, solo nell'ambiente di prova e mai nel repository |
| L-07 | **Il tempo per l'avviso del ciclo infinito va misurato in tempo reale:** contando solo il tempo di calcolo, l'avviso arrivava dopo circa 7,5 secondi invece di 5 |
| L-08 | **Un difetto che impedisce all'interprete di produrre passi blocca la pagina dei test** invece di farla fallire (QA-10) |
| L-09 | **Il file campione originale conteneva nome utente e nome del PC**, anche dentro il Base64 di `created`/`edited`. Anche un test che cerca quei valori per verificarne l'assenza li pubblica: va scritto in modo da controllare i valori neutri attesi |
| L-10 | **Un caso di test incorporato come stringa è una copia:** tenerne una sola (es. l'esempio del menu riusato dai test) |
| L-11 | **`setTimeout(0)` non è immediato** (circa 4 ms quando annidato): con un budget di 10.000 passi per turno la pagina è rimasta reattiva, con ritardi di qualche decina di millisecondi |
| L-12 | **Mostrare gli errori del diagramma già all'apertura** e in ordine di blocco si è rivelato più chiaro che mostrarli solo a Esegui, raggruppati per tipo |
| L-13 | **`dim -1`** nel campione è una sottrazione, non `dim` seguito dal letterale `-1`: il meno si "piega" nel letterale solo quando è un operatore unario |
| L-14 | **A 390 px di larghezza la disposizione "una zona sotto l'altra" funzionava ma era scomoda:** diagramma e console diventavano due riquadri piccoli, il rientro dei blocchi annidati sprecava spazio e la tastiera del telefono copriva la console. Da qui FR-MOB-01 e FR-MOB-02 |
