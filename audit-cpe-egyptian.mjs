import fs from 'node:fs';
import {cpeUuid,expandCpeDetail} from './compact-cpe-detail.mjs';

const root=new URL('.',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('corpus/manifest.json',root),'utf8'));
const errors=[];
const rows=[];
const detailFiles=new Map();
const ids=new Set();
const terms=new Set();
let exactNvdSources=0;
const egyptian=/(?:ده|بيساعد|تتعرف|ممكن|علشان|هتقابله)/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(id,message)=>errors.push({id,message});

for(const shard of manifest.searchShards){
  const shardRows=JSON.parse(fs.readFileSync(new URL(`corpus/${shard.file}`,root),'utf8'));
  if(shardRows.length!==shard.count)fail(shard.file,`manifest count ${shard.count}, actual ${shardRows.length}`);
  rows.push(...shardRows);
}

for(const row of rows){
  if(ids.has(row.id))fail(row.id,'duplicate id');
  ids.add(row.id);
  const normalizedTerm=row.term.normalize('NFKC').toLowerCase();
  if(terms.has(normalizedTerm))fail(row.id,`duplicate title: ${row.term}`);
  terms.add(normalizedTerm);
  const externalId=row.id.replace(/^cpe-/,'');
  if(!row.id.startsWith('cpe-')||!uuid.test(externalId))fail(row.id,'invalid CPE id');
  if(row.reviewStatus!=='egyptian-structured')fail(row.id,`unexpected review status: ${row.reviewStatus}`);
  const expectedSource=`https://services.nvd.nist.gov/rest/json/cpes/2.0?cpeNameId=${externalId.toUpperCase()}`;
  if(!/^(?:cpe-\d{3}|[0-9a-f]{2})\.json$/i.test(row.detailShard))fail(row.id,`invalid detail shard: ${row.detailShard}`);
  if(!detailFiles.has(row.detailShard))detailFiles.set(row.detailShard,JSON.parse(fs.readFileSync(new URL(`corpus/details/${row.detailShard}`,root),'utf8')));
  const stored=detailFiles.get(row.detailShard)[row.id]??detailFiles.get(row.detailShard)[externalId.toLowerCase()];
  if(!stored){fail(row.id,'missing detail record');continue}
  const detail=Array.isArray(stored)?expandCpeDetail(row.id,stored):stored;
  if(detail.arabicName!==row.term)fail(row.id,'detail title differs from official product title');
  if(!detail.shortDefinition.startsWith(`${row.term} ده سجل منتج رسمي`))fail(row.id,'structured definition does not preserve the exact title');
  if(detail.simpleExplanation!==detail.shortDefinition)fail(row.id,'detail Egyptian definitions disagree');
  if(!egyptian.test(detail.shortDefinition))fail(row.id,'structured definition lacks Egyptian markers');
  if(!detail.example.includes(row.term))fail(row.id,'Egyptian example does not preserve the exact title');
  if(!egyptian.test(`${detail.simpleExplanation} ${detail.example} ${detail.whereUsed}`))fail(row.id,'details lack Egyptian markers');
  if(!String(detail.cpeName).startsWith('cpe:2.3:'))fail(row.id,'missing CPE 2.3 identifier in details');
  if(detail.sources?.length!==1||detail.sources[0]!==expectedSource)fail(row.id,'detail source URL does not match the record UUID');
  else exactNvdSources++;
  if(!Array.isArray(detail.en)||detail.en.length!==3||detail.en.some(value=>!value))fail(row.id,'incomplete English fallback');
  if(Number.isNaN(Date.parse(detail.created))||Number.isNaN(Date.parse(detail.lastModified)))fail(row.id,'invalid NVD dates');
}

for(const [file,details] of detailFiles){
  for(const storedId of Object.keys(details)){
    const id=storedId.startsWith('cpe-')?storedId:`cpe-${storedId}`;
    if(!ids.has(id))fail(id,`orphan record in ${file}`);
  }
}

const hash=value=>{let result=2166136261;for(const ch of value){result^=ch.codePointAt(0);result=Math.imul(result,16777619)}return result>>>0};
const sampleSize=Math.min(1000,rows.length);
const sample=[...rows].sort((a,b)=>hash(a.id)-hash(b.id)||a.id.localeCompare(b.id)).slice(0,sampleSize);
const sampleErrors=new Set(errors.filter(error=>sample.some(row=>row.id===error.id)).map(error=>error.id));
const report={
  total:rows.length,
  expected:manifest.shardedCount,
  searchShards:manifest.searchShards.length,
  detailShards:detailFiles.size,
  uniqueIds:ids.size,
  uniqueTitles:terms.size,
  egyptianStructured:rows.filter(row=>row.reviewStatus==='egyptian-structured').length,
  exactNvdSources,
  deterministicSample:{size:sample.length,recordsWithErrors:sampleErrors.size,firstIds:sample.slice(0,10).map(row=>row.id)},
  errors:errors.length,
  sampleErrors:errors.slice(0,30)
};
console.log(JSON.stringify(report,null,2));
if(rows.length!==manifest.shardedCount||detailFiles.size!==manifest.detailShards||errors.length)process.exitCode=1;
