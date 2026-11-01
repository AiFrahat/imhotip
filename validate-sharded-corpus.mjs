import fs from 'node:fs';
import vm from 'node:vm';
import {cpeUuid,expandCpeDetail} from './compact-cpe-detail.mjs';

const root=new URL('.',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('corpus/manifest.json',root),'utf8'));
const context={window:{}};
for(const file of ['data.js','en.js','expansion.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),context);
const base=context.window.DICTIONARY;
const errors=[];
const ids=new Set(base.map(row=>row.id));
const terms=new Set(base.map(row=>row.term.toLowerCase()));
const searchRows=[];
for(const shard of manifest.searchShards){
  const rows=JSON.parse(fs.readFileSync(new URL(`corpus/${shard.file}`,root),'utf8'));
  if(rows.length!==shard.count)errors.push(`${shard.file}: expected ${shard.count}, received ${rows.length}`);
  searchRows.push(...rows);
}
const detailFiles=new Set();
for(const row of searchRows){
  for(const field of ['id','term','category','level','detailShard','reviewStatus'])if(!row[field])errors.push(`${row.id||row.term}: missing ${field}`);
  if(ids.has(row.id))errors.push(`duplicate id: ${row.id}`);ids.add(row.id);
  const term=row.term.toLowerCase();if(terms.has(term))errors.push(`duplicate term: ${row.term}`);terms.add(term);
  if(row.reviewStatus!=='egyptian-structured')errors.push(`${row.id}: CPE record must use the verified structured-Egyptian status`);
  detailFiles.add(row.detailShard);
}
let detailCount=0;
for(const file of detailFiles){
  const details=JSON.parse(fs.readFileSync(new URL(`corpus/details/${file}`,root),'utf8'));
  detailCount+=Object.keys(details).length;
  for(const [storedId,packed] of Object.entries(details)){
    const id=storedId.startsWith('cpe-')?storedId:`cpe-${storedId}`;
    const row=Array.isArray(packed)?expandCpeDetail(id,packed):packed;
    if(!ids.has(id))errors.push(`${file}: orphan detail ${id}`);
    if(!Array.isArray(row.en)||row.en.length!==3||row.en.some(value=>!value))errors.push(`${id}: missing English detail fields`);
    if(!Array.isArray(row.sources)||!row.sources.length||!/^https:\/\/services\.nvd\.nist\.gov\//.test(row.sources[0]))errors.push(`${id}: missing or invalid NVD source`);
    if(!/(ده|بيساعد|ممكن|علشان|هتقابله)/.test(`${row.simpleExplanation} ${row.example} ${row.whereUsed}`))errors.push(`${id}: missing Egyptian detail markers`);
  }
}
if(searchRows.length!==manifest.shardedCount)errors.push(`Manifest shardedCount ${manifest.shardedCount}, received ${searchRows.length}`);
if(base.length!==manifest.baseCount)errors.push(`Manifest baseCount ${manifest.baseCount}, received ${base.length}`);
if(base.length+searchRows.length!==manifest.totalCount)errors.push(`Manifest totalCount ${manifest.totalCount}, received ${base.length+searchRows.length}`);
if(detailCount!==searchRows.length)errors.push(`Detail count ${detailCount}, search count ${searchRows.length}`);
if(detailFiles.size!==manifest.detailShards)errors.push(`Manifest detailShards ${manifest.detailShards}, received ${detailFiles.size}`);
if(errors.length){console.error(errors.slice(0,100).join('\n'));console.error(`${errors.length} sharded-corpus validation errors.`);process.exitCode=1}
else console.log(`Validated ${manifest.totalCount.toLocaleString('en-US')} terms: ${manifest.baseCount.toLocaleString('en-US')} base + ${manifest.shardedCount.toLocaleString('en-US')} sharded CPE records across ${manifest.searchShards.length} search shards and ${detailFiles.size} detail shards.`);
