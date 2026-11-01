import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {expandCpeDetail} from './compact-cpe-detail.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const arg=name=>{const index=process.argv.indexOf(name);return index===-1?undefined:process.argv[index+1]};
const target=Number(arg('--target')||JSON.parse(fs.readFileSync(path.join(root,'corpus','manifest.json'),'utf8')).totalCount);
const maxShardBytes=Number(arg('--max-shard-bytes')||1048576);
const maxP95Ms=Number(arg('--max-p95-ms')||150);
const sampleSize=Number(arg('--sample')||2000);
const json=process.argv.includes('--json');
if(!Number.isInteger(target)||target<1)throw new Error('--target must be a positive integer');

const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const manifest=readJson('corpus/manifest.json');
const gates=[];
const gate=(name,pass,actual,expected)=>gates.push({name,pass:Boolean(pass),actual,expected});
const rows=[];
let searchBytes=0;
let largestShard={file:'',bytes:0};

for(const shard of manifest.searchShards||[]){
  const file=path.join('corpus',shard.file);
  const bytes=fs.statSync(path.join(root,file)).size;
  searchBytes+=bytes;
  if(bytes>largestShard.bytes)largestShard={file:shard.file,bytes};
  const shardRows=readJson(file);
  gate(`manifest count: ${shard.file}`,shardRows.length===shard.count,shardRows.length,shard.count);
  rows.push(...shardRows);
}

const context={window:{}};
for(const file of ['data.js','en.js','expansion.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const base=context.window.DICTIONARY||[];
const all=[...base,...rows];
const ids=new Set();
const titles=new Set();
let duplicateIds=0;
let duplicateTitles=0;
for(const row of all){
  if(ids.has(row.id))duplicateIds++;else ids.add(row.id);
  const title=String(row.term||'').normalize('NFKC').toLocaleLowerCase('en');
  if(titles.has(title))duplicateTitles++;else titles.add(title);
}

gate('release count',manifest.totalCount===target&&all.length===target,{manifest:manifest.totalCount,actual:all.length},target);
gate('base count',base.length===manifest.baseCount,base.length,manifest.baseCount);
gate('sharded count',rows.length===manifest.shardedCount,rows.length,manifest.shardedCount);
gate('unique IDs',duplicateIds===0,duplicateIds,0);
gate('unique normalized titles',duplicateTitles===0,duplicateTitles,0);
gate('routed search shard size',largestShard.bytes<=maxShardBytes,largestShard,`<= ${maxShardBytes} bytes`);
const hasSearchRouting=Boolean(
  manifest.routing||manifest.searchRouting||manifest.prefixRouting||
  (manifest.searchStrategy==='normalized-leading-prefix'&&manifest.routeLength>0&&manifest.routes&&Object.keys(manifest.routes).length)
);
gate('search routing metadata',hasSearchRouting,hasSearchRouting,true);

const hash=value=>{let result=2166136261;for(const ch of String(value)){result^=ch.codePointAt(0);result=Math.imul(result,16777619)}return result>>>0};
const sample=[...rows].sort((a,b)=>hash(a.id)-hash(b.id)||String(a.id).localeCompare(String(b.id))).slice(0,Math.min(sampleSize,rows.length));
const detailCache=new Map();
let missingDetails=0;
let invalidSources=0;
let invalidEgyptian=0;
let invalidStatus=0;
const egyptian=/(?:ده|دي|بيساعد|بتساعد|تقدر|ممكن|علشان|هتقابله|هتلاقيه)/;
for(const row of sample){
  if(row.reviewStatus!=='egyptian-structured'&&row.reviewStatus!=='egyptian-reviewed')invalidStatus++;
  if(!row.detailShard){missingDetails++;continue}
  let details=detailCache.get(row.detailShard);
  if(!details){
    const file=path.join(root,'corpus','details',row.detailShard);
    if(!fs.existsSync(file)){missingDetails++;continue}
    details=JSON.parse(fs.readFileSync(file,'utf8'));detailCache.set(row.detailShard,details);
  }
  const uuid=String(row.id).replace(/^cpe-/,'');
  const packed=details[row.id]??details[uuid];
  if(!packed){missingDetails++;continue}
  const detail=Array.isArray(packed)?expandCpeDetail(row.id,packed):packed;
  const expected=`https://services.nvd.nist.gov/rest/json/cpes/2.0?cpeNameId=${uuid.toUpperCase()}`;
  if(!Array.isArray(detail.sources)||detail.sources[0]!==expected)invalidSources++;
  if(!egyptian.test(`${detail.shortDefinition||''} ${detail.simpleExplanation||''} ${detail.example||''} ${detail.whereUsed||''}`))invalidEgyptian++;
}
gate('sample details present',missingDetails===0,missingDetails,0);
gate('sample official sources',invalidSources===0,invalidSources,0);
gate('sample Egyptian quality markers',invalidEgyptian===0,invalidEgyptian,0);
gate('sample review statuses',invalidStatus===0,invalidStatus,0);

const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('en').replace(/[\u064B-\u065F\u0670]/g,'').replace(/ـ/g,'').trim();
const prepared=rows.map(row=>({id:row.id,text:normalize(`${row.term} ${row.category||''} ${row.level||''}`)}));
const seeds=['microsoft','linux','router','server','android','network','security','oracle','cisco','cloud','database','firmware','windows','apache','python'];
const queries=Array.from({length:45},(_,index)=>seeds[index%seeds.length]);
const timings=[];
let checksum=0;
for(const query of queries){
  const start=performance.now();
  for(const row of prepared)if(row.text.includes(query))checksum++;
  timings.push(performance.now()-start);
}
timings.sort((a,b)=>a-b);
const p95=timings[Math.ceil(timings.length*.95)-1]||0;
const p50=timings[Math.ceil(timings.length*.50)-1]||0;
const max=timings.at(-1)||0;
gate('search p95 (loaded shard set)',p95<=maxP95Ms,`${p95.toFixed(1)} ms`,`<= ${maxP95Ms} ms`);

const report={
  target,generatedAt:new Date().toISOString(),manifestTotal:manifest.totalCount,actualTotal:all.length,
  search:{shards:(manifest.searchShards||[]).length,totalBytes:searchBytes,largestShard,p50Ms:Number(p50.toFixed(1)),p95Ms:Number(p95.toFixed(1)),maxMs:Number(max.toFixed(1)),checksum},
  deterministicSample:{size:sample.length,detailShardsRead:detailCache.size},
  gates,passed:gates.filter(item=>item.pass).length,failed:gates.filter(item=>!item.pass).length
};
if(json)console.log(JSON.stringify(report,null,2));
else{
  for(const item of gates)console.log(`${item.pass?'PASS':'FAIL'} ${item.name}: ${JSON.stringify(item.actual)} (expected ${JSON.stringify(item.expected)})`);
  console.log(`\n${report.passed}/${gates.length} milestone gates passed; ${report.failed} failed.`);
}
if(report.failed)process.exitCode=1;
