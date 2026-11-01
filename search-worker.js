const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ة/g,'ه').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
let baseRows=[],manifest=null;
const cache=new Map();

function prepare(row){
  const term=normalize(row.term),names=[row.term,row.fullName,row.arabicName,...(row.aliases||[])].map(normalize);
  const corpus=row.corpus||row.normalized||normalize([row.term,row.fullName,row.arabicName,row.shortDefinition,...(row.aliases||[]),...(row.keywords||[])].join(' '));
  return {...row,termNormalized:term,namesNormalized:names,corpus};
}
function score(row,query){if(!query)return 0;if(row.namesNormalized.some(value=>value===query))return 0;if(row.termNormalized.startsWith(query))return 1;if(row.namesNormalized.some(value=>value.startsWith(query)))return 2;if(row.namesNormalized.some(value=>value.includes(query)))return 3;return 4}
function matches(row,{query,category,review,letter}){if(category!=='all'&&row.category!==category)return false;if(review!=='all'&&row.reviewStatus!==review)return false;if(letter){const first=row.term[0]?.toUpperCase()||'';if(letter==='#'?!/^[0-9]/.test(first):first!==letter)return false}return !query||row.corpus.includes(query)}
async function loadShard(descriptor){
  if(!cache.has(descriptor.file))cache.set(descriptor.file,fetch(`./corpus/${descriptor.file}`).then(response=>{if(!response.ok)throw new Error(`${descriptor.file} ${response.status}`);return response.json()}).then(rows=>rows.map(prepare)));
  return cache.get(descriptor.file);
}
function descriptorsFor(filters){
  if(!manifest?.routes)return [];
  const compact=filters.query.replace(/\s+/g,'');
  if(compact.length>=manifest.routeLength){
    const descriptors=manifest.routes[compact.slice(0,manifest.routeLength)]||[];
    if(/^cve\s+\d{4}\s+\d+$/i.test(filters.query)){
      const ranged=descriptors.filter(item=>!item.firstTerm||filters.query.localeCompare(item.firstTerm,'en')>=0&&filters.query.localeCompare(item.lastTerm,'en')<=0);
      if(ranged.length)return ranged;
    }
    return descriptors;
  }
  if(filters.letter){const keys=Object.keys(manifest.routes).filter(key=>filters.letter==='#'?/^[0-9]/.test(key):key.startsWith(normalize(filters.letter)));return keys.flatMap(key=>manifest.routes[key])}
  if(filters.category!=='all'||filters.review!=='all'){
    const key=filters.category!=='all'&&filters.review!=='all'?`category-${filters.category}--review-${filters.review}`:filters.category!=='all'?`category-${filters.category}`:`review-${filters.review}`;
    return manifest.facets?.[key]?[manifest.facets[key]]:[];
  }
  return [];
}
function facetFor(filters){
  if(filters.query||filters.letter||filters.category==='all'&&filters.review==='all')return null;
  const key=filters.category!=='all'&&filters.review!=='all'?`category-${filters.category}--review-${filters.review}`:filters.category!=='all'?`category-${filters.category}`:`review-${filters.review}`;
  return manifest?.facets?.[key]||null;
}

self.addEventListener('message',async event=>{
  const message=event.data||{};
  try{
    if(message.type==='init'){
      baseRows=message.rows.map(prepare);manifest=message.manifest||null;
      self.postMessage({type:'ready',count:(manifest?.totalCount||baseRows.length)});return;
    }
    if(message.type!=='search')return;
    const filters={query:normalize(message.query),category:message.category,review:message.review,letter:message.letter};
    const descriptors=descriptorsFor(filters),payloads=await Promise.all(descriptors.map(loadShard));
    const combined=[...baseRows,...payloads.flat()],seen=new Set();
    const ranked=combined.filter(row=>!seen.has(row.id)&&seen.add(row.id)&&matches(row,filters)).map(row=>({row,score:score(row,filters.query)})).sort((a,b)=>a.score-b.score||a.row.term.localeCompare(b.row.term,'en'));
    const baseTotal=baseRows.filter(row=>matches(row,filters)).length,facet=facetFor(filters);
    const total=!filters.query&&filters.category==='all'&&filters.review==='all'&&!filters.letter?(manifest?.totalCount||ranked.length):facet?baseTotal+facet.total:ranked.length;
    const results=ranked.slice(0,2000).map(({row})=>{const {termNormalized,namesNormalized,corpus,...publicRow}=row;return publicRow});
    self.postMessage({type:'results',requestId:message.requestId,key:message.key,total,ids:results.map(row=>row.id),rows:results,loadedShards:descriptors.length});
  }catch(error){self.postMessage({type:'error',requestId:message.requestId,key:message.key,error:error?.message||String(error)})}
});
