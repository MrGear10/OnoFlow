/*
 * OnoFlow — genera documentazione.html dai documenti Markdown del repository (DEC-081).
 *
 * Dipendenze: nessuna (Node.js). Solo per lo sviluppo, come il resto di tools/ (DEC-005).
 *
 * Uso, dalla cartella tools/:
 *     node build-docs.mjs            riscrive ../documentazione.html
 *     node build-docs.mjs --check    esce con 1 se la pagina non corrisponde ai documenti
 *
 * Da file:// il browser non legge altri file (NFR-DIST-04): i testi stanno dentro la pagina.
 * Il convertitore copre solo il Markdown usato nei documenti: titoli, paragrafi, elenchi
 * (anche annidati), tabelle (con \| e <br>), blocchi di codice, citazioni, righe orizzontali,
 * codice, grassetto, corsivo, collegamenti. Tutto il testo entra con l'escape (NFR-SEC-01);
 * l'unico tag lasciato passare è <br> nelle celle. I collegamenti tra documenti diventano
 * ancore della pagina. Il risultato non dipende dalla data: --check lo confronta byte per byte.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'documentazione.html');

// I documenti pubblici, nell'ordine dell'indice. Solo locali: PROGRESS.md, CLAUDE.md (DEC-071), DECISIONI.md, DESIGN.md, PRODUCT.md (DEC-083).
export const DOCUMENTS = [
    { id: 'guida', file: 'docs/guida.md', title: 'Guida d\'uso' },
    { id: 'presentazione', file: 'README.md', title: 'Presentazione' },
    { id: 'specifica', file: 'OnoFlow_progetto.md', title: 'Specifica' },
    { id: 'controlli', file: 'docs/checklist-manuale.md', title: 'Controlli manuali' },
    { id: 'licenza', file: 'LICENSE', title: 'Licenza', plain: true }
];

const FILE_TO_DOC = Object.fromEntries(DOCUMENTS.map((doc) => [doc.file, doc.id]));

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Ancora di un titolo: minuscole, senza accenti, solo lettere, cifre e trattini. */
export function slugify(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/`/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sezione';
}

/* Destinazione di un collegamento: un altro documento diventa un'ancora della pagina. */
function linkTarget(url) {
    if (/^https?:\/\//.test(url)) {
        return { href: url, external: true };
    }
    const [file, hash] = url.split('#');
    const doc = FILE_TO_DOC[file.replace(/^\.\//, '').replace(/^\.\.\//, '')];
    if (doc) {
        return { href: '#' + doc + (hash ? '--' + slugify(hash) : ''), external: false };
    }
    return { href: url, external: false };
}

/* Testo in linea: codice, collegamenti, grassetto, corsivo; tutto il resto con l'escape. */
export function inline(text) {
    const codes = [];
    // Il codice si mette da parte prima di tutto: dentro non vale nessun altro segno.
    let html = text.replace(/`([^`]+)`/g, (match, code) => {
        codes.push('<code>' + escapeHtml(code) + '</code>');
        return '\u0000' + (codes.length - 1) + '\u0000';
    });
    const links = [];
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
        links.push({ label, url });
        return '\u0001' + (links.length - 1) + '\u0001';
    });
    html = escapeHtml(html)
        .replace(/&lt;br&gt;/g, '<br>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<em>$2</em>');
    html = html.replace(/\u0001(\d+)\u0001/g, (match, index) => {
        const { label, url } = links[Number(index)];
        const target = linkTarget(url);
        const attributes = target.external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return '<a href="' + escapeHtml(target.href) + '"' + attributes + '>' + inline(label) + '</a>';
    });
    return html.replace(/\u0000(\d+)\u0000/g, (match, index) => codes[Number(index)]);
}

/* Celle di una riga di tabella: si divide sui | non preceduti da \. */
function cells(line) {
    const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    const parts = [];
    let current = '';
    for (let i = 0; i < trimmed.length; i++) {
        if (trimmed[i] === '\\' && trimmed[i + 1] === '|') {
            current += '|';
            i++;
        } else if (trimmed[i] === '|') {
            parts.push(current.trim());
            current = '';
        } else {
            current += trimmed[i];
        }
    }
    parts.push(current.trim());
    return parts;
}

const LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

/* Elenchi annidati per rientro; una riga rientrata senza segno continua la voce. */
function renderList(lines) {
    const root = { children: [], indent: -1, ordered: false };
    const stack = [root];
    let last = null;
    lines.forEach((line) => {
        const match = LIST_ITEM.exec(line);
        if (!match) {
            if (last) {
                last.text += ' ' + line.trim();
            }
            return;
        }
        const indent = match[1].length;
        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }
        let parent = stack[stack.length - 1];
        if (last && indent > (last.indent)) {
            last.list = last.list || { children: [], indent: indent, ordered: /\d/.test(match[2]) };
            parent = last.list;
            stack.push(parent);
        } else if (parent === root && root.children.length === 0) {
            root.ordered = /\d/.test(match[2]);
        }
        last = { text: match[3], indent: indent, list: null };
        parent.children.push(last);
    });
    function render(list) {
        const tag = list.ordered ? 'ol' : 'ul';
        return '<' + tag + '>' + list.children.map((item) =>
            '<li>' + inline(item.text) + (item.list ? render(item.list) : '') + '</li>').join('') + '</' + tag + '>';
    }
    return render(root);
}

/*
 * Un documento Markdown in HTML. headings raccoglie i titoli per l'indice: { level, text, id }.
 * Le ancore sono uniche nella pagina: documento--titolo, con un numero se si ripete.
 */
export function renderMarkdown(source, docId, headings) {
    const text = source.replace(/\r\n/g, '\n')
        .replace(/^---\n[\s\S]*?\n---\n/, '') // intestazione YAML: dati per gli strumenti
        .replace(/<!--[\s\S]*?-->/g, '');
    const lines = text.split('\n');
    const out = [];
    const used = new Set();
    let i = 0;
    const isBlank = (line) => line.trim() === '';
    while (i < lines.length) {
        const line = lines[i];
        if (isBlank(line)) {
            i++;
            continue;
        }
        const fence = /^```(\w*)/.exec(line);
        if (fence) {
            const code = [];
            i++;
            while (i < lines.length && !/^```/.test(lines[i])) {
                code.push(lines[i]);
                i++;
            }
            i++;
            out.push('<pre><code' + (fence[1] ? ' class="language-' + fence[1] + '"' : '') + '>' + escapeHtml(code.join('\n')) + '</code></pre>');
            continue;
        }
        const heading = /^(#{1,6})\s+(.*)$/.exec(line);
        if (heading) {
            const level = heading[1].length;
            let id = docId + '--' + slugify(heading[2]);
            for (let n = 2; used.has(id); n++) {
                id = docId + '--' + slugify(heading[2]) + '-' + n;
            }
            used.add(id);
            headings.push({ level, text: heading[2].replace(/`/g, ''), id });
            // Il titolo del documento è quello dell'indice: i titoli del file scendono di un livello.
            const tag = 'h' + Math.min(level + 1, 6);
            out.push('<' + tag + ' id="' + id + '">' + inline(heading[2]) + '<a class="anchor" href="#' + id + '" aria-label="Collegamento a questa sezione">#</a></' + tag + '>');
            i++;
            continue;
        }
        if (/^-{3,}\s*$/.test(line)) {
            out.push('<hr>');
            i++;
            continue;
        }
        if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
            const head = cells(line);
            i += 2;
            const rows = [];
            while (i < lines.length && /^\|/.test(lines[i])) {
                rows.push(cells(lines[i]));
                i++;
            }
            out.push('<div class="table-wrap"><table><thead><tr>' + head.map((cell) => '<th scope="col">' + inline(cell) + '</th>').join('') +
                '</tr></thead><tbody>' + rows.map((row) => '<tr>' + row.map((cell) => '<td>' + inline(cell) + '</td>').join('') + '</tr>').join('') +
                '</tbody></table></div>');
            continue;
        }
        if (/^>/.test(line)) {
            const quote = [];
            while (i < lines.length && /^>/.test(lines[i])) {
                quote.push(lines[i].replace(/^>\s?/, ''));
                i++;
            }
            out.push('<blockquote><p>' + inline(quote.join(' ')) + '</p></blockquote>');
            continue;
        }
        if (LIST_ITEM.test(line)) {
            const items = [];
            while (i < lines.length && !isBlank(lines[i]) && (LIST_ITEM.test(lines[i]) || /^\s+\S/.test(lines[i]))) {
                items.push(lines[i]);
                i++;
            }
            out.push(renderList(items));
            continue;
        }
        const paragraph = [];
        while (i < lines.length && !isBlank(lines[i]) && !/^(#{1,6}\s|```|\||>|-{3,}\s*$)/.test(lines[i]) && !LIST_ITEM.test(lines[i])) {
            paragraph.push(lines[i].trim());
            i++;
        }
        out.push('<p>' + inline(paragraph.join(' ')) + '</p>');
    }
    return out.join('\n');
}

const SUN = '<svg class="icon theme-icon theme-icon--sun" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.5"/><path d="M10 2v2.5M10 15.5V18M2 10h2.5M15.5 10H18M4.3 4.3l1.8 1.8M13.9 13.9l1.8 1.8M4.3 15.7l1.8-1.8M13.9 6.1l1.8-1.8"/></svg>';
const MOON = '<svg class="icon theme-icon theme-icon--moon" viewBox="0 0 20 20" aria-hidden="true"><path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8z"/></svg>';

export async function buildDocs() {
    const articles = [];
    const nav = [];
    for (const doc of DOCUMENTS) {
        const source = await readFile(path.join(ROOT, doc.file), 'utf8');
        const headings = [];
        const body = doc.plain ? '<pre class="plain">' + escapeHtml(source.trim()) + '</pre>' : renderMarkdown(source, doc.id, headings);
        articles.push('<article class="doc" id="' + doc.id + '" aria-labelledby="' + doc.id + '-title">\n' +
            '<p class="doc-source">' + escapeHtml(doc.file) + '</p>\n<h1 id="' + doc.id + '-title">' + escapeHtml(doc.title) + '</h1>\n' + body + '\n</article>');
        // Nell'indice i titoli di secondo livello (## nel file), che sono i capitoli.
        const chapters = headings.filter((heading) => heading.level === 2);
        nav.push('<li class="nav-doc"><a class="nav-doc-link" href="#' + doc.id + '">' + escapeHtml(doc.title) + '</a>' +
            (chapters.length ? '<ul>' + chapters.map((heading) =>
                '<li><a href="#' + heading.id + '">' + inline(heading.text) + '</a></li>').join('') + '</ul>' : '') + '</li>');
    }
    return `<!doctype html>
<!-- Generata da tools/build-docs.mjs a partire dai documenti del repository: non modificarla a mano (DEC-081). -->
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f5f7">
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1a1f29">
    <title>OnoFlow · Documentazione</title>
    <link rel="stylesheet" href="css/tokens.css">
    <link rel="stylesheet" href="css/docs.css">
</head>
<body>
<a class="skip" href="#contenuto">Vai al contenuto</a>
<header class="docs-bar">
    <a class="brand" href="index.html" data-back>OnoFlow</a>
    <span class="docs-bar-title">Documentazione</span>
    <button class="button docs-index-button" id="docs-index-button" type="button" aria-expanded="false" aria-controls="docs-nav">Indice</button>
    <button class="button theme-button" id="theme-toggle" type="button">
        ${SUN}
        ${MOON}
    </button>
    <a class="button docs-back" href="index.html" data-back>Torna all'app</a>
</header>
<div class="docs-layout">
    <nav class="docs-nav" id="docs-nav" aria-label="Indice della documentazione">
        <label class="visually-hidden" for="docs-filter">Filtra i titoli</label>
        <input class="docs-filter" id="docs-filter" type="search" placeholder="Filtra i titoli…" autocomplete="off" spellcheck="false">
        <ul class="nav-docs">
${nav.join('\n')}
        </ul>
        <p class="docs-filter-empty" id="docs-filter-empty" hidden>Nessun titolo contiene questo testo. Per cercare nei testi: Ctrl + F.</p>
    </nav>
    <main class="docs-main" id="contenuto" tabindex="-1">
${articles.join('\n')}
    </main>
</div>
<script src="js/namespace.js"></script>
<script src="js/ui/theme.js"></script>
<script src="js/docs.js"></script>
</body>
</html>
`;
}

async function main() {
    const html = await buildDocs();
    if (process.argv.includes('--check')) {
        const current = await readFile(OUTPUT, 'utf8').catch(() => '');
        if (current !== html) {
            console.error('documentazione.html non corrisponde ai documenti: node build-docs.mjs');
            process.exit(1);
        }
        console.log('documentazione.html aggiornata');
        return;
    }
    await writeFile(OUTPUT, html);
    console.log('scritta documentazione.html');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main();
}
