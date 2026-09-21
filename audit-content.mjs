import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('.',import.meta.url);
const ctx={window:{}};
for(const file of ['data.js','en.js','expansion.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),ctx);
const entries=ctx.window.DICTIONARY, english=ctx.window.EN_CONTENT;
const errors=[],canonical=new Map(),aliases=new Map(),definitions=new Map();
const normalize=s=>s.normalize('NFKC').toLowerCase().trim();
for(const e of entries)canonical.set(normalize(e.term),e.id);
for(const e of entries){
  for(const [lang,definition,example,usage] of [['ar',e.shortDefinition,e.example,e.whereUsed],['en',...english[e.id]]]){
    if([e.term,e.fullName,e.arabicName].some(name=>normalize(definition)===normalize(name)))errors.push(`${e.id}: ${lang} definition only repeats its name`);
    if(definition===example||definition===usage)errors.push(`${e.id}: ${lang} repeated field`);
    const key=lang+':'+normalize(definition);
    if(definitions.has(key))errors.push(`${e.id}: duplicate ${lang} definition with ${definitions.get(key)}`);
    definitions.set(key,e.id);
  }
  for(const alias of e.aliases){
    const key=normalize(alias);
    if(canonical.has(key)&&canonical.get(key)!==e.id)errors.push(`${e.id}: alias ${alias} is canonical ${canonical.get(key)}`);
    if(aliases.has(key)&&aliases.get(key)!==e.id)errors.push(`${e.id}: alias ${alias} also belongs to ${aliases.get(key)}`);
    aliases.set(key,e.id);
  }
  if(e.relatedTerms.includes(e.id))errors.push(`${e.id}: self-related term`);
}
if(entries.length!==500)errors.push(`Expected 500 terms, received ${entries.length}`);
console.log(JSON.stringify({terms:entries.length,categories:Object.fromEntries(ctx.window.CATEGORIES.map(([id])=>[id,entries.filter(e=>e.category===id).length])),withSources:entries.filter(e=>e.sources.length).length,errors},null,2));
if(errors.length)process.exitCode=1;
