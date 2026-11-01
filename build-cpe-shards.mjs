import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=new URL('.',import.meta.url);
const out=new URL('corpus/',root);
const searchDir=new URL('corpus/search/',root);
const detailDir=new URL('corpus/details/',root);
const facetDir=new URL('corpus/facets/',root);
for(const dir of [out,searchDir,detailDir,facetDir])fs.mkdirSync(dir,{recursive:true});

const targetArgIndex=process.argv.indexOf('--target');
const targetCpeCount=targetArgIndex===-1?240000:Number(process.argv[targetArgIndex+1]);
if(!Number.isInteger(targetCpeCount)||targetCpeCount<1)throw new Error('--target must be a positive integer.');
const inputs=fs.readdirSync(new URL('content/',root)).filter(file=>/^nvd-cpe-\d+\.json$/.test(file)).sort().map(file=>`content/${file}`);
const products=inputs.flatMap(file=>JSON.parse(fs.readFileSync(new URL(file,root),'utf8')).products);
const context={window:{}};
for(const file of ['data.js','en.js','expansion.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),context);
const titleKey=value=>String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLocaleLowerCase('en-US');
const seenTitles=new Set(context.window.DICTIONARY.map(row=>titleKey(row.term)));
const clean=value=>String(value??'').replace(/\\([\\!?*])/g,'$1').replace(/_/g,' ').trim();
const categoryFor=part=>part==='h'?'hardware':part==='o'?'apps':'apps';
const levelFor=version=>version&&version!=='*'&&version!=='-'?'Advanced':'Intermediate';
const normalizeSearch=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ة/g,'ه').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const routeLength=2;
const targetShardBytes=900*1024;
const routeKey=title=>normalizeSearch(title).replace(/\s+/g,'').slice(0,routeLength).padEnd(routeLength,'_')||'__';
const safeName=key=>[...key].map(ch=>/[a-z0-9_]/.test(ch)?ch:`u${ch.codePointAt(0).toString(16)}`).join('-');
const splitToLimit=rows=>{
  const chunks=[];let current=[],bytes=2;
  for(const row of rows){const rowBytes=Buffer.byteLength(JSON.stringify(row))+(current.length?1:0);if(current.length&&bytes+rowBytes>targetShardBytes){chunks.push(current);current=[];bytes=2}current.push(row);bytes+=rowBytes}
  if(current.length)chunks.push(current);return chunks;
};
const records=[];
const seen=new Set();
for(const {cpe} of products){
  if(records.length>=targetCpeCount)break;
  if(cpe.deprecated||seen.has(cpe.cpeNameId))continue;
  const title=cpe.titles?.find(item=>item.lang==='en')?.title||cpe.titles?.[0]?.title;
  if(!title||seenTitles.has(titleKey(title)))continue;
  const parts=cpe.cpeName.split(':');
  const [part,vendor,product,version]=[parts[2],clean(parts[3]),clean(parts[4]),clean(parts[5])];
  const id=`cpe-${cpe.cpeNameId.toLowerCase()}`;
  const source=`https://services.nvd.nist.gov/rest/json/cpes/2.0?cpeNameId=${encodeURIComponent(cpe.cpeNameId)}`;
  const arabicName=title;
  const arabicDefinition=`${title} ده سجل منتج رسمي في قاموس CPE التابع لـNVD، ومعرّفه بيساعد الأدوات تتعرف على المنتج أو الإصدار بشكل موحّد.`;
  const arabicExample=`أداة جرد أو إدارة ثغرات ممكن تستخدم معرّف CPE ده علشان تربط ${title} بالسجلات الأمنية الصحيحة.`;
  const arabicUsage='هتقابله في جرد البرامج والأجهزة، وإدارة الثغرات، وأتمتة عمليات الأمن السيبراني.';
  records.push({
    id,term:title,fullName:title,category:categoryFor(part),level:levelFor(version),
    arabicName,shortDefinition:arabicDefinition,
    aliases:[`${vendor} ${product}`.trim()].filter(value=>value&&value.toLowerCase()!==title.toLowerCase()),
    keywords:[cpe.cpeName,vendor,product,version].filter(value=>value&&value!=='*'&&value!=='-'),
    reviewStatus:'egyptian-structured',detailShard:'',source,
    detail:{
      arabicName,shortDefinition:arabicDefinition,simpleExplanation:arabicDefinition,example:arabicExample,whereUsed:arabicUsage,
      en:[`Official CPE product record for ${title}.`,`A security inventory can use this CPE name to identify ${title} consistently across tools and vulnerability records.`,'Software and hardware inventories, vulnerability management, and security automation.'],
      relatedTerms:[],alternateMeanings:[],sources:[source],cpeName:cpe.cpeName,created:cpe.created,lastModified:cpe.lastModified
    }
  });
  seen.add(cpe.cpeNameId);seenTitles.add(titleKey(title));
}

for(const old of fs.readdirSync(detailDir).filter(name=>name.endsWith('.json')))fs.unlinkSync(new URL(`corpus/details/${old}`,root));
const detailGroups=new Map();
for(const row of records){
  const uuid=row.id.slice(4).toLowerCase(),prefix=uuid.slice(0,2),name=`${prefix}.json`;
  row.detailShard=name;
  if(!detailGroups.has(prefix))detailGroups.set(prefix,{});
  detailGroups.get(prefix)[uuid]=[row.term,row.detail.cpeName,row.detail.created||'',row.detail.lastModified||''];
  delete row.detail;
}
let detailBytes=0,maxDetailShardBytes=0;
for(const [prefix,details] of [...detailGroups].sort(([a],[b])=>a.localeCompare(b))){
  const payload=JSON.stringify(details),bytes=Buffer.byteLength(payload);
  fs.writeFileSync(new URL(`corpus/details/${prefix}.json`,root),payload);
  detailBytes+=bytes;maxDetailShardBytes=Math.max(maxDetailShardBytes,bytes);
}

for(const old of fs.readdirSync(searchDir).filter(name=>name.endsWith('.json')))fs.unlinkSync(new URL(`corpus/search/${old}`,root));
for(const old of fs.readdirSync(facetDir).filter(name=>name.endsWith('.json')))fs.unlinkSync(new URL(`corpus/facets/${old}`,root));
const groups=Map.groupBy(records,row=>routeKey(row.term));
const searchShards=[],routes={};let maxShardBytes=0;
for(const [key,rows] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  const compact=rows.map(({id,term,category,level,reviewStatus,detailShard})=>({id,term,category,level,reviewStatus,detailShard,normalized:normalizeSearch(term)})).sort((a,b)=>a.normalized.localeCompare(b.normalized)||a.id.localeCompare(b.id));
  routes[key]=[];
  for(const [index,chunk] of splitToLimit(compact).entries()){
    const file=`${safeName(key)}-${String(index).padStart(3,'0')}.json`,payload=JSON.stringify(chunk),bytes=Buffer.byteLength(payload);
    fs.writeFileSync(new URL(`corpus/search/${file}`,root),payload);
    const descriptor={file:`search/${file}`,count:chunk.length,bytes};searchShards.push(descriptor);routes[key].push(descriptor);maxShardBytes=Math.max(maxShardBytes,bytes);
  }
}
const compactRow=({id,term,category,level,reviewStatus,detailShard})=>({id,term,category,level,reviewStatus,detailShard,normalized:normalizeSearch(term)});
const facetPreviewLimit=2000,facets={};let maxFacetBytes=0;
const writeFacet=(key,rows)=>{
  const preview=rows.slice().sort((a,b)=>normalizeSearch(a.term).localeCompare(normalizeSearch(b.term))||a.id.localeCompare(b.id)).slice(0,facetPreviewLimit).map(compactRow);
  const file=`${safeName(key)}.json`,payload=JSON.stringify(preview),bytes=Buffer.byteLength(payload);
  if(bytes>1024*1024)throw new Error(`Facet preview ${key} is ${bytes} bytes; expected <= 1 MiB.`);
  fs.writeFileSync(new URL(`corpus/facets/${file}`,root),payload);
  facets[key]={file:`facets/${file}`,count:preview.length,total:rows.length,bytes};maxFacetBytes=Math.max(maxFacetBytes,bytes);
};
const categories=[...new Set(records.map(row=>row.category))].sort();
const reviews=[...new Set(records.map(row=>row.reviewStatus))].sort();
for(const category of categories)writeFacet(`category-${category}`,records.filter(row=>row.category===category));
for(const review of reviews)writeFacet(`review-${review}`,records.filter(row=>row.reviewStatus===review));
for(const category of categories)for(const review of reviews)writeFacet(`category-${category}--review-${review}`,records.filter(row=>row.category===category&&row.reviewStatus===review));
const manifest={schemaVersion:4,generatedAt:new Date().toISOString(),baseCount:10000,shardedCount:records.length,totalCount:10000+records.length,source:'NVD CPE API 2.0',sourceUrl:'https://nvd.nist.gov/products/cpe',searchStrategy:'normalized-leading-prefix',routeLength,targetShardBytes,hardShardLimitBytes:1024*1024,maxShardBytes,routes,searchShards,facetStrategy:'bounded-preview',facetPreviewLimit,maxFacetBytes,facets,detailStrategy:'first-two-uuid-hex-compact',detailFields:['title','cpeName','created','lastModified'],detailShards:detailGroups.size,detailBytes,maxDetailShardBytes};
if(records.length!==targetCpeCount)throw new Error(`Expected ${targetCpeCount} unique active CPE records, built ${records.length}. Add another official NVD CPE input page.`);
fs.writeFileSync(new URL('corpus/manifest.json',root),JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest,null,2));
