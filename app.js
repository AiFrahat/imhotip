const data=window.DICTIONARY;
const categories=window.CATEGORIES;
const byId=new Map(data.map(x=>[x.id,x]));
const names=Object.fromEntries(categories);
const english=window.EN_CONTENT;
const namesEn={ai:'Artificial Intelligence',programming:'Programming',web:'Web & Internet',cloud:'Cloud',networks:'Networking',hardware:'Hardware',security:'Cybersecurity',apps:'Applications',business:'Business',data:'Data & Databases',devops:'Development & Operations'};
const featured=['ai','api','rag','llm','mcp','kubernetes','docker','vpn'];
const primary=['all','ai','programming','web','cloud','networks','hardware','security','apps','business'];
const alphabet=['#',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const $=id=>document.getElementById(id);
const publicReleaseCount=1000000;
const state={query:'',category:'all',review:'all',letter:null,limit:10,more:false,language:document.documentElement.lang==='en'?'en':'ar'};
const isEnglish=()=>state.language==='en';
const isMachineAssisted=entry=>entry.reviewStatus==='machine-assisted';
const arabicNameFor=entry=>isMachineAssisted(entry)?'الاسم العربي لسه تحت المراجعة':entry.arabicName;
const arabicSummaryFor=entry=>isMachineAssisted(entry)?'الشرح المصري للمصطلح ده لسه تحت المراجعة. افتحه علشان تشوف التعريف الإنجليزي والمصدر الأصلي.':entry.shortDefinition;
const categoryName=id=>isEnglish()?namesEn[id]:names[id];
const translated=(ar,en)=>isEnglish()?en:ar;
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase().trim();
const searchIndex=new Map(data.map(entry=>[entry.id,{
  corpus:normalize([entry.term,entry.fullName,entry.arabicName,entry.shortDefinition,entry.simpleExplanation,entry.example,entry.whereUsed,names[entry.category],namesEn[entry.category],...english[entry.id],...entry.aliases,...entry.keywords,...entry.alternateMeanings.flat()].join(' ')),
  names:[entry.term,entry.fullName,entry.arabicName,...entry.aliases].map(normalize),
  term:normalize(entry.term)
}]));
const canUseWorker=/^https?:$/.test(location.protocol)&&typeof Worker!=='undefined';
const searchWorker=canUseWorker?new Worker('./search-worker.js'):null;
let workerReady=false,workerRequest=0,workerResultKey='',workerResultIds=[],workerResultTotal=0,pendingEnter=false;
let corpusManifest=null;
const detailLoads=new Map();
const cpeUuid=id=>String(id||'').toLowerCase().replace(/^cpe-/,'');
const cpeDetailShard=id=>`${cpeUuid(id).slice(0,2)}.json`;
const cveCode=id=>String(id||'').toUpperCase().replace(/^CVE-?/,'CVE-').replace(/^CVE-(\d{4})-(\d+)$/,(_,year,serial)=>`CVE-${year}-${serial}`);
const cveDetailShard=id=>{const match=cveCode(id).match(/^CVE-(\d{4})-(\d+)$/);return match?`${match[1]}-${match[2].slice(0,2).padEnd(2,'_')}.json`:''};
function expandCompactCpeDetail(id,packed){
  if(!Array.isArray(packed)||packed.length<2)return null;
  const uuid=cpeUuid(id),[title,cpeName,created='',lastModified='']=packed;
  const source=`https://services.nvd.nist.gov/rest/json/cpes/2.0?cpeNameId=${uuid.toUpperCase()}`;
  const definition=`${title} ده سجل منتج رسمي في قاموس CPE التابع لـNVD، ومعرّفه بيساعد الأدوات تتعرف على المنتج أو الإصدار بشكل موحّد.`;
  return {arabicName:title,shortDefinition:definition,simpleExplanation:definition,example:`أداة جرد أو إدارة ثغرات ممكن تستخدم معرّف CPE ده علشان تربط ${title} بالسجلات الأمنية الصحيحة.`,whereUsed:'هتقابله في جرد البرامج والأجهزة، وإدارة الثغرات، وأتمتة عمليات الأمن السيبراني.',en:[`Official CPE product record for ${title}.`,`A security inventory can use this CPE name to identify ${title} consistently across tools and vulnerability records.`,'Software and hardware inventories, vulnerability management, and security automation.'],relatedTerms:[],alternateMeanings:[],sources:[source],cpeName,created,lastModified};
}
function expandCompactCveDetail(id,packed){
  if(!Array.isArray(packed)||packed.length<4)return null;
  const code=cveCode(id),[description,published='',lastModified='',severity='Unknown',score=null,sourceIdentifier='']=packed,source=`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(code)}`;
  const definition=`${code} دي ثغرة أمنية مسجلة رسميًا في NVD، ودرجة خطورتها ${severity}${score==null?'':` (${score})`}.`;
  return {arabicName:code,shortDefinition:definition,simpleExplanation:definition,example:'فرق الأمن بتستخدم رقم CVE ده علشان تتابع تأثير الثغرة والتحديثات أو إجراءات الحماية المناسبة.',whereUsed:'هتقابله في نشرات الأمان، وتقارير فحص الثغرات، وأنظمة إدارة التحديثات.',en:[description,`Official NVD record for ${code}. Severity: ${severity}${score==null?'':` (${score})`}.`,'Vulnerability management, security advisories, patching, and risk assessment.'],relatedTerms:[],alternateMeanings:[],sources:[source],published,lastModified,severity,score,sourceIdentifier};
}
function indexEntry(entry){searchIndex.set(entry.id,{corpus:normalize([entry.term,entry.fullName,entry.arabicName,entry.shortDefinition,entry.simpleExplanation,entry.example,entry.whereUsed,names[entry.category],namesEn[entry.category],...(english[entry.id]||[]),...(entry.aliases||[]),...(entry.keywords||[]),...(entry.alternateMeanings||[]).flat()].join(' ')),names:[entry.term,entry.fullName,entry.arabicName,...(entry.aliases||[])].map(normalize),term:normalize(entry.term)})}
function registerShardEntry(row){
  if(byId.has(row.id))return;
  const isCve=row.corpusType==='cve'||row.id.startsWith('cve-');
  const summary=isCve?`${row.term} دي ثغرة أمنية مسجلة رسميًا في قاعدة NVD.`:`${row.term} ده سجل منتج رسمي في قاموس CPE التابع لـNVD، ومعرّفه بيساعد الأدوات تتعرف على المنتج أو الإصدار بشكل موحّد.`;
  const englishSummary=isCve?`Official NVD vulnerability record for ${row.term}.`:`Official CPE product record for ${row.term}.`;
  const uuid=row.id.startsWith('cpe-')?row.id.slice(4).toUpperCase():'';
  const source=row.source||(uuid?`https://services.nvd.nist.gov/rest/json/cpes/2.0?cpeNameId=${encodeURIComponent(uuid)}`:isCve?`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(row.term)}`:'');
  const entry={...row,fullName:row.fullName||row.term,arabicName:row.arabicName||row.term,shortDefinition:row.shortDefinition||summary,simpleExplanation:row.shortDefinition||summary,example:'السجل ده جاي من قاموس CPE الرسمي التابع لـNVD.',whereUsed:'هتقابله في جرد البرامج وإدارة الثغرات.',aliases:row.aliases||[],keywords:row.keywords||[],relatedTerms:[],alternateMeanings:[],sources:source?[source]:[]};
  english[entry.id]=[englishSummary,'This record comes from the official NVD CPE dictionary.','Software inventories and vulnerability management.'];
  data.push(entry);byId.set(entry.id,entry);if(!searchWorker)indexEntry(entry);
}
function workerKey(){return JSON.stringify([normalize(state.query),state.category,state.review,state.letter])}
function requestWorkerResults(){
  if(!workerReady)return;
  const key=workerKey();
  if(key===workerResultKey)return;
  searchWorker.postMessage({type:'search',requestId:++workerRequest,key,query:state.query,category:state.category,review:state.review,letter:state.letter});
}
function initializeSearchWorker(){
  if(!searchWorker)return;
  const rows=data.map(entry=>{const indexed=searchIndex.get(entry.id);return {id:entry.id,term:entry.term,fullName:entry.fullName,arabicName:entry.arabicName,shortDefinition:entry.shortDefinition,aliases:entry.aliases||[],keywords:entry.keywords||[],category:entry.category,reviewStatus:entry.reviewStatus,corpus:indexed?.corpus||''}});
  searchWorker.postMessage({type:'init',rows,manifest:corpusManifest});
}
if(searchWorker)searchWorker.addEventListener('message',event=>{
  const message=event.data||{};
  if(message.type==='ready'){workerReady=true;document.body.dataset.searchWorker='ready';document.body.dataset.corpusReady='true';requestWorkerResults();return}
  if(message.type==='error'){console.error('Could not search the extended corpus.',message.error);document.body.dataset.corpusReady='error';return}
  if(message.type!=='results'||message.requestId!==workerRequest)return;
  for(const row of message.rows||[])registerShardEntry(row);
  workerResultKey=message.key;workerResultIds=message.ids;workerResultTotal=message.total??message.ids.length;render();
  if(pendingEnter){pendingEnter=false;const first=workerResultIds[0]&&byId.get(workerResultIds[0]);if(first){location.hash=first.id;openTerm(first.id)}}
});
async function loadShardedCorpus(){
  if(!/^https?:$/.test(location.protocol))return;
  try{
    const manifest=await fetch('./release-manifest.json').then(response=>{if(!response.ok)throw new Error(`Release manifest ${response.status}`);return response.json()});
    corpusManifest=manifest;
    initializeSearchWorker();
    $('term-count').textContent=manifest.totalCount.toLocaleString('en-US');translateUI();syncHash(false);
  }catch(error){console.error('Could not load the extended corpus.',error);document.body.dataset.corpusReady='error'}
}
async function ensureDetails(entry){
  if(!entry.detailShard||entry.detailsLoaded)return entry;
  const isCve=entry.corpusType==='cve'||entry.id.startsWith('cve-'),cacheKey=`${isCve?'cve':'cpe'}:${entry.detailShard}`;
  let pending=detailLoads.get(cacheKey);
  if(!pending){const base=isCve?'corpus-cve':'corpus';pending=fetch(`./${base}/details/${entry.detailShard}`).then(response=>{if(!response.ok)throw new Error(`${entry.detailShard} ${response.status}`);return response.json()});detailLoads.set(cacheKey,pending)}
  const shard=await pending,stored=shard[entry.id]??shard[cpeUuid(entry.id)];
  const details=Array.isArray(stored)?isCve?expandCompactCveDetail(entry.id,stored):expandCompactCpeDetail(entry.id,stored):stored;
  if(details){Object.assign(entry,details,{detailsLoaded:true});english[entry.id]=details.en;if(!searchWorker)indexEntry(entry)}
  return entry;
}
async function loadDirectCpe(id){
  if(!/^cpe-[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)||!/^https?:$/.test(location.protocol))return null;
  const detailShard=cpeDetailShard(id);
  let pending=detailLoads.get(detailShard);
  if(!pending){pending=fetch(`./corpus/details/${detailShard}`).then(response=>{if(!response.ok)throw new Error(`${detailShard} ${response.status}`);return response.json()});detailLoads.set(detailShard,pending)}
  const packed=(await pending)[cpeUuid(id)];if(!packed)return null;
  const details=expandCompactCpeDetail(id,packed);if(!details)return null;
  registerShardEntry({id:id.toLowerCase(),term:details.arabicName,category:'apps',level:'Intermediate',reviewStatus:'egyptian-structured',detailShard});
  const entry=byId.get(id.toLowerCase());Object.assign(entry,details,{detailsLoaded:true});english[entry.id]=details.en;return entry;
}
async function loadDirectCve(id){
  if(!/^cve-\d{4}-\d+$/i.test(id)||!/^https?:$/.test(location.protocol))return null;
  const detailShard=cveDetailShard(id);if(!detailShard)return null;const cacheKey=`cve:${detailShard}`;
  let pending=detailLoads.get(cacheKey);if(!pending){pending=fetch(`./corpus-cve/details/${detailShard}`).then(response=>{if(!response.ok)throw new Error(`${detailShard} ${response.status}`);return response.json()});detailLoads.set(cacheKey,pending)}
  const packed=(await pending)[id.toLowerCase()];if(!packed)return null;const details=expandCompactCveDetail(id,packed);if(!details)return null;
  registerShardEntry({id:id.toLowerCase(),term:cveCode(id),fullName:details.en[0],category:'security',level:details.score>=7?'Advanced':'Intermediate',reviewStatus:'egyptian-structured',corpusType:'cve',detailShard});
  const entry=byId.get(id.toLowerCase());Object.assign(entry,details,{detailsLoaded:true});english[entry.id]=details.en;return entry;
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const levelName={Beginner:'مبتدئ',Intermediate:'متوسط',Advanced:'متقدم'};
const ui={
  ar:{nav:['القاموس','التصنيفات','عن المشروع'],headline:'افهم التكنولوجيا ببساطة.',description:'قاموس بيشرح الاختصارات والمصطلحات التقنية بكلام سهل وواضح، للمبتدئ ولكل حد عايز يفهم عالم التكنولوجيا.',aside:'مفتوح لكل الناس<br>علشان مستقبل<br>فاهم التكنولوجيا أحسن.',placeholder:'دوّر على أي اختصار أو مصطلح... مثال: API, AI, VPN, RAM, Kubernetes, RAG',stats:['مصطلح وسجل تقني','تصنيف رئيسي','شرح مراجع بالمصري','بحث فوري','من غير تسجيل أو حساب'],review:['كل المحتوى','مراجع بالمصري','شرح مصري من بيانات رسمية','موثق إنجليزي ولسه تحت المراجعة'],popular:'🔥 المصطلحات المشهورة',more:'اعرض أكتر ←',categories:'▦ التصنيفات الرئيسية',results:'◷ مصطلحات القاموس',moreCategories:'تصنيفات أكتر ←',moreTerms:'اعرض مصطلحات أكتر ←',founder:'مؤسس المشروع',quote:'“ المعرفة التقنية مش لازم تكون معقدة.<br>خلّينا نبني مجتمع فاهم التكنولوجيا أحسن. ”',free:'مفتوح المصدر ومجاني لكل الناس ❤️',footer:['تواصل معانا','بلّغ عن غلطة','ساهم معانا','الخصوصية'],tagline:'بكل بساطة  |  Technology for Everyone',rights:'كل الحقوق محفوظة.',all:'الكل',expand:'أكتر⌄',collapse:'أقل⌃',none:'مفيش نتائج. جرّب كلمة تانية أو امسح الفلاتر.',detail:['يعني إيه؟','مثال بسيط','هتلاقيه فين؟','معنى تاني حسب السياق','مصطلحات ليها علاقة']},
  en:{nav:['Dictionary','Categories','About'],headline:'Understand technology, simply.',description:'A clear dictionary of technology acronyms and terms for beginners, curious readers, and anyone who wants to understand the digital world.',aside:'Open to everyone<br>for a future with<br>better tech literacy.',placeholder:'Search any acronym or term... e.g. API, AI, VPN, RAM, Kubernetes, RAG',stats:['technical terms and records','main categories','Egyptian-reviewed explanations','Instant search','No account required'],review:['All content','Egyptian-reviewed','Structured Egyptian from official data','Sourced English, Arabic review pending'],popular:'🔥 Popular terms',more:'See more →',categories:'▦ Main categories',results:'◷ Dictionary terms',moreCategories:'More categories →',moreTerms:'Show more terms →',founder:'Founder',quote:'“ Technology knowledge should not be complicated.<br>Let’s build a community that understands it better. ”',free:'Open source and free for everyone ❤️',footer:['Contact us','Report an error','Contribute','Privacy'],tagline:'Technology for Everyone  |  Simply explained',rights:'All rights reserved.',all:'All',expand:'More⌄',collapse:'Less⌃',none:'No results. Try another word or clear the filters.',detail:['What is it?','Simple example','Where will you see it?','Another meaning in context','Related terms']}
};
const copy=()=>ui[state.language];
function matches(entry,q){
  if(state.category!=='all'&&entry.category!==state.category)return false;
  if(state.review!=='all'&&entry.reviewStatus!==state.review)return false;
  if(state.letter){const first=entry.term[0].toUpperCase();if(state.letter==='#'?!/^[0-9]/.test(first):first!==state.letter)return false}
  return !q||Boolean(searchIndex.get(entry.id)?.corpus.includes(q));
}
function searchScore(entry,q){
  if(!q)return 0;
  const indexed=searchIndex.get(entry.id),namesToCheck=indexed.names;
  if(namesToCheck.some(value=>value===q))return 0;
  if(indexed.term.startsWith(q))return 1;
  if(namesToCheck.some(value=>value.startsWith(q)))return 2;
  if(namesToCheck.some(value=>value.includes(q)))return 3;
  return 4;
}
function filteredEntries(){
  const q=normalize(state.query),key=workerKey(),needsWorker=workerReady;
  if(searchWorker&&!workerReady)return data.slice(0,10000).filter(entry=>matches(entry,q)).map(entry=>({entry,score:searchScore(entry,q)})).sort((a,b)=>a.score-b.score||a.entry.term.localeCompare(b.entry.term,'en')).map(item=>item.entry);
  if(needsWorker){
    if(workerResultKey===key)return workerResultIds.map(id=>byId.get(id)).filter(Boolean);
    requestWorkerResults();
    return data.slice(0,10000).filter(entry=>matches(entry,q)).map(entry=>({entry,score:searchScore(entry,q)})).sort((a,b)=>a.score-b.score||a.entry.term.localeCompare(b.entry.term,'en')).map(item=>item.entry);
  }
  return data.filter(entry=>matches(entry,q)).map(entry=>({entry,score:searchScore(entry,q)})).sort((a,b)=>a.score-b.score||a.entry.term.localeCompare(b.entry.term,'en')).map(item=>item.entry)
}
function card(e){return `<button class="term-card" type="button" data-term="${e.id}" aria-label="${translated('اقرأ شرح','Read about')} ${esc(e.term)}"><strong dir="ltr">${esc(e.term)}</strong><span class="english" dir="ltr">${esc(e.fullName)}</span><span class="arabic">${esc(arabicNameFor(e))}</span><span class="summary" dir="${isEnglish()?'ltr':'rtl'}">${esc(isEnglish()?english[e.id][0]:arabicSummaryFor(e))}</span><span class="badges"><span class="badge">${esc(categoryName(e.category))}</span><span class="badge">${isEnglish()?e.level:levelName[e.level]}</span></span></button>`}
function renderControls(){
  $('filters').innerHTML=[...primary,...(state.more?categories.map(x=>x[0]).filter(id=>!primary.includes(id)):[])].map(id=>`<button type="button" data-category="${id}" class="${state.category===id?'active':''}" aria-pressed="${state.category===id}">${esc(id==='all'?copy().all:categoryName(id))}</button>`).join('')+`<button type="button" data-more="true" aria-expanded="${state.more}">${state.more?copy().collapse:copy().expand}</button>`;
  $('alphabet').innerHTML=alphabet.map(letter=>`<button type="button" data-letter="${letter}" class="${state.letter===letter?'active':''}" aria-pressed="${state.letter===letter}">${letter}</button>`).join('');
  $('review-filters').innerHTML=[['all',copy().review[0]],['egyptian-reviewed',copy().review[1]],['egyptian-structured',copy().review[2]],['machine-assisted',copy().review[3]]].map(([id,label])=>`<button type="button" data-review="${id}" class="${state.review===id?'active':''}" aria-pressed="${state.review===id}">${esc(label)}</button>`).join('');
}
function render(){
  renderControls();
  const filtered=filteredEntries();
  document.body.classList.toggle('search-active',Boolean(state.query));
  const suggestions=$('search-suggestions');
  suggestions.hidden=!state.query;
  const filteredTotal=workerReady&&workerResultKey===workerKey()?workerResultTotal:filtered.length;
  if(state.query){
    suggestions.innerHTML=filtered.length?`<p>${isEnglish()?`${filteredTotal} matching terms`:`لقيت ${filteredTotal} مصطلح`}</p>${filtered.slice(0,6).map(e=>`<button type="button" data-term="${e.id}"><strong dir="ltr">${esc(e.term)}</strong><span dir="ltr">${esc(e.fullName)}</span><span dir="rtl">${esc(arabicNameFor(e))}</span></button>`).join('')}`:`<p>${copy().none}</p>`;
  }else suggestions.innerHTML='';
  $('featured-title').textContent=state.query?translated('نتائج البحث','Search results'):copy().popular;
  $('featured-cards').innerHTML=(state.query?filtered.slice(0,8):featured.map(id=>byId.get(id))).map(card).join('');
  $('show-all').hidden=!!state.query||filtered.length===0;
  $('result-status').textContent=state.query||state.category!=='all'||state.review!=='all'||state.letter?(isEnglish()?`${filteredTotal} result${filteredTotal===1?'':'s'}${state.query?' for “'+state.query+'”':''}`:`${filteredTotal} نتيجة${state.query?' عن «'+state.query+'»':''}`):'';
  $('results').innerHTML=filtered.slice(0,state.limit).map(e=>`<button type="button" class="result-row" data-term="${e.id}"><strong dir="ltr">${esc(e.term)}</strong><span class="full" dir="ltr">${esc(e.fullName)}</span><span class="ar">${esc(arabicNameFor(e))}</span><span class="cat"><span>${esc(categoryName(e.category))}</span></span></button>`).join('')||`<p class="empty">${copy().none}</p>`;
  $('load-more').hidden=filteredTotal<=state.limit;
}
function openTerm(id,scroll=true){
  const e=byId.get(id);if(!e)return;
  if(e.detailShard&&!e.detailsLoaded){
    ensureDetails(e).then(()=>openTerm(id,scroll)).catch(error=>console.error('Could not load term details.',error));
    return;
  }
  const related=e.relatedTerms.map(id=>byId.get(id)).filter(Boolean).map(x=>`<a href="#${x.id}" dir="ltr">${esc(x.term)}</a>`).join('');
  const pendingArabic=!isEnglish()&&isMachineAssisted(e);
  const content=isEnglish()||pendingArabic?english[id]:[e.simpleExplanation,e.example,e.whereUsed];
  const headings=copy().detail;
  const references=e.sources.length?`<h3>${translated('مراجع للمزيد','Further reading')}</h3><div class="related">${e.sources.map(url=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" dir="ltr">${esc(new URL(url).hostname.replace(/^www\./,''))}</a>`).join('')}</div>`:'';
  const alternate=e.alternateMeanings.length?`<h3>${headings[3]}</h3>${e.alternateMeanings.map(a=>`<p><b dir="ltr">${esc(a[0])}</b> — ${isEnglish()?'In systems and databases, the number of completed transactions per second.':esc(a[1]+': '+a[2])}</p>`).join('')}`:'';
  const translationNote=isMachineAssisted(e)?`<p class="translation-note">${translated('الشرح العربي للمصطلح ده لسه تحت المراجعة. المعروض دلوقتي هو النص الإنجليزي من المصدر علشان ما نقدّمش ترجمة غير دقيقة.','The Arabic explanation is still under editorial review. The sourced English text is shown for accuracy.')}</p>`:'';
  const contentDir=pendingArabic?'ltr':isEnglish()?'ltr':'rtl';
  $('term-detail').innerHTML=`<div class="detail-head"><div><h2 dir="ltr">${esc(e.term)}</h2><p class="full-name">${esc(e.fullName)}</p><p class="arabic-name">${esc(arabicNameFor(e))}</p></div><button class="detail-close" type="button" aria-label="${translated('اقفل شرح المصطلح','Close term details')}">×</button></div><div class="detail-body" dir="${isEnglish()?'ltr':'rtl'}">${translationNote}<h3>${headings[0]}</h3><p dir="${contentDir}">${esc(content[0])}</p><h3>${headings[1]}</h3><p dir="${contentDir}">${esc(content[1])}</p><h3>${headings[2]}</h3><p dir="${contentDir}">${esc(content[2])}</p>${alternate}<h3>${headings[4]}</h3><div class="related">${related||'—'}</div>${references}</div>`;
  $('term-detail').hidden=false;
  if(scroll)$('term-detail').scrollIntoView({behavior:'smooth',block:'start'});
}
function syncHash(scroll=false){const id=decodeURIComponent(location.hash.slice(1)).toLowerCase();if(byId.has(id))openTerm(id,scroll);else if(id.startsWith('cpe-'))loadDirectCpe(id).then(entry=>entry?openTerm(entry.id,scroll):$('term-detail').hidden=true).catch(error=>{console.error('Could not open direct CPE link.',error);$('term-detail').hidden=true});else if(id.startsWith('cve-'))loadDirectCve(id).then(entry=>entry?openTerm(entry.id,scroll):$('term-detail').hidden=true).catch(error=>{console.error('Could not open direct CVE link.',error);$('term-detail').hidden=true});else $('term-detail').hidden=true}
function setTheme(choice){if(choice==='system')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=choice;try{localStorage.setItem('imhotip-theme',choice)}catch{}updateTheme()}
function updateTheme(){const saved=document.documentElement.dataset.theme||'system';const dark=saved==='dark'||saved==='system'&&matchMedia('(prefers-color-scheme: dark)').matches;document.querySelectorAll('.theme-toggle span').forEach((el,i)=>el.classList.toggle('selected',i===(dark?1:0)));$('publisher-photo').src=dark?'./assets/publisher-dark.png':'./assets/publisher-light.png';document.querySelector('meta[name="theme-color"]').content=dark?'#0d1119':'#ffffff';$('theme-toggle').title=isEnglish()?`Theme: ${saved}. Click to switch; Shift+click for system.`:`المظهر: ${saved==='system'?'تلقائي':dark?'ليلي':'نهاري'} — انقر للتبديل، وShift+نقر لوضع النظام`}
function translateUI(){
  const c=copy();
  document.documentElement.lang=state.language;document.documentElement.dir=isEnglish()?'ltr':'rtl';
  document.title=isEnglish()?'iMHOTiP.com — Technology Explained Simply':'iMHOTiP.com — قاموس التكنولوجيا ببساطة';
  document.querySelectorAll('.main-nav a').forEach((element,index)=>element.textContent=c.nav[index]);
  $('hero-title').textContent=c.headline;document.querySelector('.hero-description').textContent=c.description;document.querySelector('.hero-aside').innerHTML=c.aside;
  $('search').placeholder=c.placeholder;$('search').setAttribute('aria-label',translated('ابحث في القاموس','Search the dictionary'));
  $('filters').setAttribute('aria-label',translated('تصفية حسب التصنيف','Filter by category'));
  $('alphabet').setAttribute('aria-label',translated('تصفية حسب الحرف','Filter by letter'));
  const stats=document.querySelectorAll('.stat');
  stats[0].querySelector('small').textContent=c.stats[0];stats[1].querySelector('small').textContent=c.stats[1];
  stats[2].querySelector('small').textContent=c.stats[2];
  stats[3].querySelector('strong').textContent=c.stats[3];stats[3].querySelector('small').textContent=c.stats[4];
  $('featured-title').textContent=c.popular;$('show-all').textContent=c.more;$('categories-title').textContent=c.categories;$('results-title').textContent=c.results;$('all-categories').textContent=c.moreCategories;$('load-more').textContent=c.moreTerms;
  document.querySelector('.publisher-identity span').textContent=c.founder;document.querySelector('.publisher blockquote').innerHTML=c.quote;document.querySelector('.publisher-social > span').innerHTML=`iMHOTiP.com<br>${c.free}`;
  $('publisher-photo').alt=translated('صورة الناشر أحمد فرحات','Portrait of publisher Ahmed Farahat');
  const footer=document.querySelector('.site-footer');footer.querySelector(':scope > span:first-child').textContent=`© ${new Date().getFullYear()} iMHOTiP.com. ${c.rights}`;
  footer.querySelectorAll('div > *').forEach((element,index)=>element.textContent=c.footer[index]);footer.querySelector(':scope > span:last-child').textContent=c.tagline;
  $('lang-button').textContent=isEnglish()?'EN⌄':'AR⌄';$('lang-button').setAttribute('aria-label',translated('Switch to English','Switch to Arabic'));
  $('theme-toggle').setAttribute('aria-label',translated('تغيير المظهر','Change appearance'));
  $('featured-cards').innerHTML=featured.map(id=>card(byId.get(id))).join('');
  $('category-list').innerHTML=categories.slice(0,9).map(([id])=>`<button class="category-row" type="button" data-category="${id}"><span class="count">${data.filter(e=>e.category===id).length}</span><span class="label">${esc(categoryName(id))}</span><span class="arrow">›</span></button>`).join('');
  render();syncHash(false);updateTheme();
}
document.addEventListener('DOMContentLoaded',()=>{
  $('term-count').textContent=publicReleaseCount.toLocaleString('en-US');$('category-count').textContent=categories.length.toLocaleString('en-US');$('reviewed-count').textContent=data.filter(entry=>entry.reviewStatus==='egyptian-reviewed').length.toLocaleString('en-US');$('year').textContent=new Date().getFullYear();
  translateUI();
  loadShardedCorpus();
  if(byId.has(decodeURIComponent(location.hash.slice(1)))){
    document.documentElement.style.scrollBehavior='auto';
    $('term-detail').scrollIntoView({block:'start'});
    document.documentElement.style.scrollBehavior='';
  }
  document.addEventListener('click',ev=>{
    const term=ev.target.closest('[data-term]');if(term){location.hash=term.dataset.term;openTerm(term.dataset.term);return}
    const cat=ev.target.closest('[data-category]');if(cat){state.category=cat.dataset.category;state.limit=10;render();$('results-title').scrollIntoView({behavior:'smooth',block:'start'});return}
    const review=ev.target.closest('[data-review]');if(review){state.review=review.dataset.review;state.limit=10;render();return}
    const letter=ev.target.closest('[data-letter]');if(letter){state.letter=state.letter===letter.dataset.letter?null:letter.dataset.letter;state.limit=10;render();$('results-title').scrollIntoView({behavior:'smooth',block:'start'});return}
    if(ev.target.closest('[data-more]')||ev.target.closest('#all-categories')){state.more=!state.more;render();if(ev.target.closest('#all-categories'))$('filters').scrollIntoView({behavior:'smooth'});return}
    if(ev.target.closest('.detail-close')){$('term-detail').hidden=true;history.pushState(null,'',location.pathname+location.search);return}
  });
  $('search').addEventListener('input',ev=>{state.query=ev.target.value.trim();state.limit=10;render()});
  $('search').addEventListener('keydown',ev=>{if(ev.key==='Enter'){const key=workerKey(),needsWorker=workerReady&&Boolean(normalize(state.query)||state.category!=='all'||state.review!=='all'||state.letter);if(needsWorker&&workerResultKey!==key){ev.preventDefault();pendingEnter=true;requestWorkerResults();return}const first=filteredEntries()[0];if(first){ev.preventDefault();location.hash=first.id;openTerm(first.id)}}});
  $('show-all').addEventListener('click',()=>{$('results-title').scrollIntoView({behavior:'smooth',block:'start'})});
  $('load-more').addEventListener('click',()=>{state.limit+=20;render()});
  $('theme-toggle').addEventListener('click',ev=>{if(ev.shiftKey){setTheme('system');return}const current=document.documentElement.dataset.theme||'system';const dark=current==='dark'||current==='system'&&matchMedia('(prefers-color-scheme: dark)').matches;setTheme(dark?'light':'dark')});
  $('lang-button').addEventListener('click',()=>{state.language=isEnglish()?'ar':'en';try{localStorage.setItem('imhotip-language',state.language)}catch{}translateUI()});
  document.addEventListener('keydown',ev=>{if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='k'){ev.preventDefault();$('search').focus()}if(ev.key==='Escape'&&document.activeElement===$('search')){$('search').value='';state.query='';render();$('search').blur()}});
  addEventListener('hashchange',()=>syncHash(true));addEventListener('popstate',()=>syncHash(false));matchMedia('(prefers-color-scheme: dark)').addEventListener('change',updateTheme);
});
