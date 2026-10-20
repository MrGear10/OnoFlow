# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

HTML, CSS e JavaScript statici: script classici (niente moduli ES), nessun passaggio di build, nessuna dipendenza esterna. Il repository è già l'applicazione. Pubblicazione su GitHub Pages; sui computer anche offline, aprendo `index.html` da `file://`. Dettagli nel documento di progetto (`OnoFlow_progetto.md`, §9.2, §10).

## Users

- **Studenti della scuola secondaria (14–19 anni).** Costruiscono un diagramma di flusso, lo eseguono e capiscono perché non funziona. Lo usano dal PC del laboratorio (Firefox su Linux Mint), da casa e dal proprio telefono, che per molti è l'unico dispositivo disponibile fuori da scuola. Metà Android, metà iPhone.
- **Docenti.** Preparano esempi ed esercizi, li distribuiscono come file `.fprg`, li **mostrano alla classe con il proiettore** e aprono i file prodotti con Flowgorithm.
- **Priorità in caso di conflitto:** il docente al proiettore. Una scelta che rende il diagramma o la console meno leggibili a distanza perde, anche se migliora un altro contesto.

## Product Purpose

Creare da zero, modificare, eseguire e salvare diagrammi di flusso, per insegnare la logica algoritmica. Successo: uno studente costruisce un programma, lo esegue inserendo i valori nella console, capisce gli errori dai messaggi e salva un file che si riapre anche in Flowgorithm; un docente lo mostra alla classe senza strumenti aggiuntivi.

## Positioning

Alternativa libera, gratuita e indipendente a Flowgorithm, che funziona dove Flowgorithm non arriva: Linux, Chromebook, Android, iPhone, senza installazione. Legge e scrive il formato `.fprg`, quindi i file passano tra i due strumenti. Nessun account e nessun dato raccolto. Gli errori sono spiegati in italiano, con il blocco coinvolto evidenziato e un suggerimento per correggerlo.

## Operating Context

- Lezioni in laboratorio e in aula, con il diagramma proiettato.
- Esercizi distribuiti come file `.fprg`, aperti dal disco o dai download del telefono e riconsegnati salvati.
- Laboratori senza rete o con vincoli del DPO: uso offline da una copia locale.
- Sul telefono: uso online, sessioni interrotte da altre app (il diagramma va ripristinato se il sistema chiude la scheda).

## Capabilities and Constraints

- Editor a blocchi (dichiarazione, assegnazione, input, output, if, while, do, for), esecuzione continua con console in linea, errori spiegati; in seguito passo-passo con le variabili e generazione di codice C++/Python.
- Ogni funzione della prima versione è pienamente usabile da telefono, non solo visibile.
- Niente risorse esterne: niente CDN, font remoti o analytics; solo font di sistema.
- Niente storage persistente, salvo la copia di sessione del diagramma aperto.
- Nessun testo dell'interfaccia scritto nel codice: tutto passa dal catalogo per lingua (oggi solo italiano).
- Requisiti completi e decisioni: `OnoFlow_progetto.md` (fonte di verità) e `DECISIONI.md`.

## Brand Commitments

- **Nome:** OnoFlow. Sottotitolo: *Editor web di diagrammi di flusso, compatibile con i file `.fprg`*.
- **Marchio:** "Flowgorithm" non compare nel nome del prodotto né del repository; si può scrivere "compatibile con i file `.fprg` di Flowgorithm", precisando che OnoFlow è indipendente e non affiliato.
- **Trasparenza:** dichiarare l'uso dell'IA nello sviluppo; avviso sull'hosting su GitHub Pages (fuori dall'UE) nel piè di pagina.
- **Tono dei testi:** impersonale, senza rivolgersi direttamente allo studente con il "tu" (es. "Per unire testi si usa &"). Frasi brevi, lo stesso nome per la stessa azione ovunque. Licenza MIT.

## Evidence on Hand

- Un file reale di Flowgorithm 4.2, anonimizzato: Appendice A del documento di progetto, incorporato come esempio in `js/examples/examples.js`.
- Non esistono testimonianze, utenti reali, dati d'uso o recensioni: non vanno inventati.

## Product Principles

1. **Capire prima di tutto.** Ogni errore dice cosa non va, dove, e come correggerlo; il comportamento è definito e documentato anche nei casi limite.
2. **Leggibile da lontano.** Ciò che funziona proiettato davanti a una classe ha la precedenza.
3. **Il telefono è di primo livello.** Creare, modificare, eseguire e salvare devono funzionare con il dito, non solo essere visibili.
4. **Niente dati raccolti.** I file non lasciano il dispositivo; nessun account.
5. **Onestà su ciò che non è verificato.** Ciò che non è stato confermato con Flowgorithm viene segnalato, non nascosto.

## Accessibility & Inclusion

Tutti i comandi raggiungibili da tastiera con il focus visibile; tema chiaro e scuro secondo il sistema, con contrasto adeguato in entrambi; leggibile proiettato in aula; aree di tocco di almeno 44 × 44 px; layout da 360 px CSS in su senza scorrimento orizzontale; movimento ridotto rispettato.
