import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('.', import.meta.url);
const TARGET = 9500;
const clean = value => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim();
const trimSentence = (value, max = 360) => {
  const text = clean(value);
  if (text.length <= max) return text;
  const clipped = text.slice(0, max);
  const end = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('; '), clipped.lastIndexOf(', '));
  return `${clipped.slice(0, end > 150 ? end + 1 : max).trim()}…`;
};
const slug = value => clean(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const parseCsv = text => {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift();
  return rows.filter(r => r.some(Boolean)).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
};
const categoryFor = text => {
  const value = text.toLowerCase();
  const rules = [
    ['ai', /\b(ai|artificial intelligence|machine learning|neural|model|algorithm|inference)\b/],
    ['data', /\b(data|database|record|schema|analytics|statistic|information)\b/],
    ['networks', /\b(network|wireless|internet|protocol|packet|router|telecommunication|radio)\b/],
    ['hardware', /\b(hardware|device|processor|memory|sensor|circuit|chip|physical)\b/],
    ['cloud', /\b(cloud|virtual machine|distributed|service provider|tenant)\b/],
    ['programming', /\b(code|software|program|function|library|compiler|runtime|application)\b/],
    ['web', /\b(web|browser|http|media type|markup|html|xml|mime)\b/],
    ['devops', /\b(deploy|configuration|container|build|test|operations|monitoring)\b/],
    ['business', /\b(risk|governance|organization|policy|management|compliance|business)\b/],
    ['apps', /\b(user interface|mobile|desktop|app|client)\b/]
  ];
  return rules.find(([, pattern]) => pattern.test(value))?.[0] ?? 'security';
};
const coreRelated = {ai:'ai',programming:'api',web:'http',cloud:'cloud',networks:'dns',hardware:'cpu',security:'https',apps:'gui',business:'mvp',data:'dataset',devops:'testing'};

const context = {window:{}};
vm.runInNewContext(fs.readFileSync(new URL('data.js', root), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(new URL('en.js', root), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(new URL('expansion.js', root), 'utf8'), context);
const usedTerms = new Set(context.window.DICTIONARY.map(entry => entry.term.toLowerCase()));
const usedIds = new Set(context.window.DICTIONARY.map(entry => entry.id));
const candidates = [];
const add = (source, externalId, term, definition, sourceUrl, preferredCategory) => {
  term = clean(term); definition = trimSentence(definition);
  if (term.length < 2 || term.length > 150 || !/[a-z0-9]/i.test(term) || usedTerms.has(term.toLowerCase())) return;
  let id = `${source}-${slug(externalId || term)}`;
  if (!slug(externalId || term) || usedIds.has(id)) return;
  const category = preferredCategory || categoryFor(`${term} ${definition}`);
  usedTerms.add(term.toLowerCase()); usedIds.add(id);
  candidates.push({
    id, term, fullName: term, arabicName: '',
    definition: definition || `A technical term documented by ${source.toUpperCase()}; its precise meaning depends on the cited source and context.`,
    example: `The term “${term}” appears in technical documentation and implementation discussions.`,
    whereUsed: `Used in ${category} standards, systems, documentation, or operations.`,
    en: [], category, level: 'Advanced', relatedTerms: [coreRelated[category]], aliases: [],
    keywords: [source, externalId].filter(Boolean), sources: [sourceUrl].filter(Boolean), sourceType: source
  });
};

const nist = JSON.parse(fs.readFileSync(new URL('content/source-nist/glossary-export.json', root), 'utf8').replace(/^\uFEFF/, '')).parentTerms;
const nistWithDefinitions = nist.filter(item => Array.isArray(item.definitions) && clean(item.definitions[0]?.text));
const nistWithoutDefinitions = nist.filter(item => !Array.isArray(item.definitions) || !clean(item.definitions[0]?.text));
for (const item of nistWithDefinitions) {
  const first = item.definitions[0];
  add('nist', item.link.split('/').pop(), item.term, first.text, first.sources?.[0]?.link || item.link);
}

const cwe = parseCsv(fs.readFileSync(new URL('content/source-cwe/1000.csv', root), 'utf8'));
for (const item of cwe) add('cwe', item['CWE-ID'], `CWE-${item['CWE-ID']}: ${item.Name}`, item.Description, `https://cwe.mitre.org/data/definitions/${item['CWE-ID']}.html`, 'security');

const ianaXml = fs.readFileSync(new URL('content/source-iana-media-types.xml', root), 'utf8');
for (const registry of ianaXml.matchAll(/<registry id="([^"\s]+)"[\s\S]*?<title>([^<]+)<\/title>([\s\S]*?)<\/registry>/g)) {
  const [, registryId, title, body] = registry;
  if (!/^(application|audio|font|haptics|image|message|model|multipart|text|video)$/.test(registryId)) continue;
  for (const record of body.matchAll(/<record[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<file[^>]*>([\s\S]*?)<\/file>[\s\S]*?<\/record>/g)) {
    const name = clean(record[1]), mime = clean(record[2]);
    if (!mime.includes('/')) continue;
    add('iana', mime, mime, `An IANA-registered ${title.toLowerCase()} media type used to label and exchange ${name} content.`, `https://www.iana.org/assignments/media-types/${mime}`.replace(/\+/g, '%2B'), 'web');
  }
}

for (const item of nistWithoutDefinitions) {
  if (candidates.length >= TARGET) break;
  add('nist', item.link.split('/').pop(), item.term, '', item.link);
}

if (candidates.length < TARGET) throw new Error(`Only ${candidates.length} unique reference terms were available.`);
const selected = candidates.slice(0, TARGET);
for (const row of selected) row.en = [row.definition, row.example, row.whereUsed];
fs.writeFileSync(new URL('content/reference-catalog.source.json', root), JSON.stringify(selected, null, 2));
console.log(JSON.stringify({selected:selected.length, available:candidates.length, sources:Object.groupBy(selected, x=>x.sourceType)}, (key,value)=>key==='sources'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,v.length])):value, 2));
