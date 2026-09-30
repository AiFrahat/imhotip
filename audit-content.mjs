import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('.',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('content/manifest.json',root),'utf8'));
const ctx={window:{}};
for(const file of ['data.js','en.js','expansion.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),ctx);
const entries=ctx.window.DICTIONARY, english=ctx.window.EN_CONTENT;
const errors=[],canonical=new Map(),aliases=new Map(),definitions=new Map();
let referenceDuplicateDefinitions=0;
const normalize=s=>s.normalize('NFKC').toLowerCase().trim();
const isReference=e=>/^(nist|cwe|iana)-/.test(e.id);
for(const e of entries)canonical.set(normalize(e.term),e.id);
for(const e of entries){
  for(const [lang,definition,example,usage] of [['ar',e.shortDefinition,e.example,e.whereUsed],['en',...english[e.id]]]){
    if([e.term,e.fullName,e.arabicName].some(name=>normalize(definition)===normalize(name)))errors.push(`${e.id}: ${lang} definition only repeats its name`);
    if(definition===example||definition===usage)errors.push(`${e.id}: ${lang} repeated field`);
    const key=lang+':'+normalize(definition);
    if(definitions.has(key)){
      const previous=definitions.get(key);
      if(isReference(e)&&isReference(previous))referenceDuplicateDefinitions++;
      else errors.push(`${e.id}: duplicate ${lang} definition with ${previous.id}`);
    }
    definitions.set(key,e);
  }
  for(const alias of e.aliases){
    const key=normalize(alias);
    if(canonical.has(key)&&canonical.get(key)!==e.id)errors.push(`${e.id}: alias ${alias} is canonical ${canonical.get(key)}`);
    if(aliases.has(key)&&aliases.get(key)!==e.id)errors.push(`${e.id}: alias ${alias} also belongs to ${aliases.get(key)}`);
    aliases.set(key,e.id);
  }
  if(e.relatedTerms.includes(e.id))errors.push(`${e.id}: self-related term`);
}
if(entries.length!==manifest.currentReleaseCount)errors.push(`Expected ${manifest.currentReleaseCount} terms, received ${entries.length}`);
console.log(JSON.stringify({terms:entries.length,goal:manifest.collectionGoal,nextMilestone:manifest.milestones.find(value=>value>entries.length)||null,categories:Object.fromEntries(ctx.window.CATEGORIES.map(([id])=>[id,entries.filter(e=>e.category===id).length])),withSources:entries.filter(e=>e.sources.length).length,referenceDuplicateDefinitions,errors},null,2));
if(errors.length)process.exitCode=1;
