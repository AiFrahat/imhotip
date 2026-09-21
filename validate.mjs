import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('./data.js',import.meta.url),'utf8');
const context={window:{}};vm.runInNewContext(code,context);
const entries=context.window.DICTIONARY,categories=new Set(context.window.CATEGORIES.map(c=>c[0]));
vm.runInNewContext(fs.readFileSync(new URL('./en.js',import.meta.url),'utf8'),context);
vm.runInNewContext(fs.readFileSync(new URL('./expansion.js',import.meta.url),'utf8'),context);
const english=context.window.EN_CONTENT;
const errors=[],ids=new Set(),slugs=new Set(),terms=new Set(),aliases=new Map();
for(const e of entries){
  for(const field of ['id','slug','term','type','fullName','arabicName','category','level','shortDefinition','simpleExplanation','example','whereUsed','lastReviewed'])if(!e[field])errors.push(`${e.term}: missing ${field}`);
  if(ids.has(e.id))errors.push(`duplicate id: ${e.id}`);ids.add(e.id);
  if(slugs.has(e.slug))errors.push(`duplicate slug: ${e.slug}`);slugs.add(e.slug);
  if(e.id!==e.slug)errors.push(`${e.term}: id and slug differ`);
  if(terms.has(e.term.toLowerCase()))errors.push(`duplicate term: ${e.term}`);terms.add(e.term.toLowerCase());
  for(const alias of e.aliases){const key=alias.trim().toLowerCase();if(aliases.has(key)&&aliases.get(key)!==e.id)errors.push(`alias collision: ${alias}`);aliases.set(key,e.id)}
  if(!categories.has(e.category))errors.push(`${e.term}: invalid category`);
  if(!['Beginner','Intermediate','Advanced'].includes(e.level))errors.push(`${e.term}: invalid level`);
  if(!Array.isArray(english[e.id])||english[e.id].length!==3||english[e.id].some(value=>!value))errors.push(`${e.term}: missing English definition, example, or usage`);
  for(const source of e.sources)try{const url=new URL(source);if(!['https:','http:'].includes(url.protocol))throw new Error('Unsupported scheme')}catch{errors.push(`${e.term}: malformed source URL ${source}`)}
}
for(const e of entries)for(const r of e.relatedTerms)if(!ids.has(r))errors.push(`${e.term}: broken related term ${r}`);
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const staticTerms=[...html.matchAll(/data-static-term="([^"]+)"/g)].map(match=>match[1]);
if(staticTerms.length!==entries.length||staticTerms.some((id,index)=>id!==entries[index].id))errors.push('Static dictionary fallback is out of date; run node generate-fallback.mjs');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log(`Validated ${entries.length} terms and ${categories.size} categories.`);
