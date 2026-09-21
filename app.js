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
const state={query:'',category:'all',letter:null,limit:10,more:false,language:document.documentElement.lang==='en'?'en':'ar'};
const isEnglish=()=>state.language==='en';
const categoryName=id=>isEnglish()?namesEn[id]:names[id];
const translated=(ar,en)=>isEnglish()?en:ar;
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase().trim();
const searchIndex=new Map(data.map(entry=>[entry.id,{
  corpus:normalize([entry.term,entry.fullName,entry.arabicName,entry.shortDefinition,entry.simpleExplanation,entry.example,entry.whereUsed,names[entry.category],namesEn[entry.category],...english[entry.id],...entry.aliases,...entry.keywords,...entry.alternateMeanings.flat()].join(' ')),
  names:[entry.term,entry.fullName,entry.arabicName,...entry.aliases].map(normalize),
  term:normalize(entry.term)
}]));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const levelName={Beginner:'مبتدئ',Intermediate:'متوسط',Advanced:'متقدم'};
const ui={
  ar:{nav:['القاموس','التصنيفات','حول المشروع'],headline:'افهم لغة التكنولوجيا ببساطة.',description:'قاموس شامل للاختصارات والمصطلحات التقنية بلغة سهلة وواضحة، للمبتدئين والمهتمين وكل من يريد فهم عالم التكنولوجيا.',aside:'مفتوح للجميع<br>من أجل مستقبل<br>أكثر وعيًا بالتقنية.',placeholder:'ابحث عن أي اختصار أو مصطلح... مثال: API, AI, VPN, RAM, Kubernetes, RAG',stats:['مصطلح واختصار','تصنيف رئيسي','لكل المستويات','من المبتدئ إلى المتقدم','بحث فوري','بدون تسجيل أو حساب'],popular:'🔥 المصطلحات الشائعة',more:'عرض المزيد ←',categories:'▦ التصنيفات الرئيسية',results:'◷ مصطلحات القاموس',moreCategories:'المزيد من التصنيفات ←',moreTerms:'عرض المزيد من المصطلحات ←',founder:'مؤسس المشروع',quote:'“ المعرفة التقنية لا يجب أن تكون معقدة.<br>لنبنِ مجتمعًا أكثر فهمًا للتكنولوجيا. ”',free:'مفتوح المصدر ومجاني للجميع ❤️',footer:['تواصل معنا','الإبلاغ عن خطأ','المساهمة','الخصوصية'],tagline:'بكل بساطة  |  Technology for Everyone',rights:'جميع الحقوق محفوظة.',all:'الكل',expand:'المزيد⌄',collapse:'أقل⌃',none:'لا توجد نتائج. جرّب كلمة أخرى أو أزل التصفية.',detail:['ما هو؟','مثال بسيط','أين ستجده؟','معنى آخر حسب السياق','مصطلحات مرتبطة']},
  en:{nav:['Dictionary','Categories','About'],headline:'Understand technology, simply.',description:'A clear dictionary of technology acronyms and terms for beginners, curious readers, and anyone who wants to understand the digital world.',aside:'Open to everyone<br>for a future with<br>better tech literacy.',placeholder:'Search any acronym or term... e.g. API, AI, VPN, RAM, Kubernetes, RAG',stats:['terms and acronyms','main categories','All levels','From beginner to advanced','Instant search','No account required'],popular:'🔥 Popular terms',more:'See more →',categories:'▦ Main categories',results:'◷ Dictionary terms',moreCategories:'More categories →',moreTerms:'Show more terms →',founder:'Founder',quote:'“ Technology knowledge should not be complicated.<br>Let’s build a community that understands it better. ”',free:'Open source and free for everyone ❤️',footer:['Contact us','Report an error','Contribute','Privacy'],tagline:'Technology for Everyone  |  Simply explained',rights:'All rights reserved.',all:'All',expand:'More⌄',collapse:'Less⌃',none:'No results. Try another word or clear the filters.',detail:['What is it?','Simple example','Where will you see it?','Another meaning in context','Related terms']}
};
const copy=()=>ui[state.language];
function matches(entry,q){
  if(state.category!=='all'&&entry.category!==state.category)return false;
  if(state.letter){const first=entry.term[0].toUpperCase();if(state.letter==='#'?!/^[0-9]/.test(first):first!==state.letter)return false}
  return !q||searchIndex.get(entry.id).corpus.includes(q);
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
function filteredEntries(){const q=normalize(state.query);return data.filter(entry=>matches(entry,q)).map(entry=>({entry,score:searchScore(entry,q)})).sort((a,b)=>a.score-b.score||a.entry.term.localeCompare(b.entry.term,'en')).map(item=>item.entry)}
function card(e){return `<button class="term-card" type="button" data-term="${e.id}" aria-label="${translated('اقرأ شرح','Read about')} ${esc(e.term)}"><strong dir="ltr">${esc(e.term)}</strong><span class="english" dir="ltr">${esc(e.fullName)}</span><span class="arabic">${esc(e.arabicName)}</span><span class="summary" dir="${isEnglish()?'ltr':'rtl'}">${esc(isEnglish()?english[e.id][0]:e.shortDefinition)}</span><span class="badges"><span class="badge">${esc(categoryName(e.category))}</span><span class="badge">${isEnglish()?e.level:levelName[e.level]}</span></span></button>`}
function renderControls(){
  $('filters').innerHTML=[...primary,...(state.more?categories.map(x=>x[0]).filter(id=>!primary.includes(id)):[])].map(id=>`<button type="button" data-category="${id}" class="${state.category===id?'active':''}" aria-pressed="${state.category===id}">${esc(id==='all'?copy().all:categoryName(id))}</button>`).join('')+`<button type="button" data-more="true" aria-expanded="${state.more}">${state.more?copy().collapse:copy().expand}</button>`;
  $('alphabet').innerHTML=alphabet.map(letter=>`<button type="button" data-letter="${letter}" class="${state.letter===letter?'active':''}" aria-pressed="${state.letter===letter}">${letter}</button>`).join('');
}
function render(){
  renderControls();
  const filtered=filteredEntries();
  document.body.classList.toggle('search-active',Boolean(state.query));
  const suggestions=$('search-suggestions');
  suggestions.hidden=!state.query;
  if(state.query){
    suggestions.innerHTML=filtered.length?`<p>${isEnglish()?`${filtered.length} matching terms`:`${filtered.length} مصطلح مطابق`}</p>${filtered.slice(0,6).map(e=>`<button type="button" data-term="${e.id}"><strong dir="ltr">${esc(e.term)}</strong><span dir="ltr">${esc(e.fullName)}</span><span dir="rtl">${esc(e.arabicName)}</span></button>`).join('')}`:`<p>${copy().none}</p>`;
  }else suggestions.innerHTML='';
  $('featured-title').textContent=state.query?translated('نتائج البحث','Search results'):copy().popular;
  $('featured-cards').innerHTML=(state.query?filtered.slice(0,8):featured.map(id=>byId.get(id))).map(card).join('');
  $('show-all').hidden=!!state.query||filtered.length===0;
  $('result-status').textContent=state.query||state.category!=='all'||state.letter?(isEnglish()?`${filtered.length} result${filtered.length===1?'':'s'}${state.query?' for “'+state.query+'”':''}`:`${filtered.length} نتيجة${state.query?' عن «'+state.query+'»':''}`):'';
  $('results').innerHTML=filtered.slice(0,state.limit).map(e=>`<button type="button" class="result-row" data-term="${e.id}"><strong dir="ltr">${esc(e.term)}</strong><span class="full" dir="ltr">${esc(e.fullName)}</span><span class="ar">${esc(e.arabicName)}</span><span class="cat"><span>${esc(categoryName(e.category))}</span></span></button>`).join('')||`<p class="empty">${copy().none}</p>`;
  $('load-more').hidden=filtered.length<=state.limit;
}
function openTerm(id,scroll=true){
  const e=byId.get(id);if(!e)return;
  const related=e.relatedTerms.map(id=>byId.get(id)).filter(Boolean).map(x=>`<a href="#${x.id}" dir="ltr">${esc(x.term)}</a>`).join('');
  const content=isEnglish()?english[id]:[e.simpleExplanation,e.example,e.whereUsed];
  const headings=copy().detail;
  const references=e.sources.length?`<h3>${translated('مراجع للمزيد','Further reading')}</h3><div class="related">${e.sources.map(url=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" dir="ltr">${esc(new URL(url).hostname.replace(/^www\./,''))}</a>`).join('')}</div>`:'';
  const alternate=e.alternateMeanings.length?`<h3>${headings[3]}</h3>${e.alternateMeanings.map(a=>`<p><b dir="ltr">${esc(a[0])}</b> — ${isEnglish()?'In systems and databases, the number of completed transactions per second.':esc(a[1]+': '+a[2])}</p>`).join('')}`:'';
  $('term-detail').innerHTML=`<div class="detail-head"><div><h2 dir="ltr">${esc(e.term)}</h2><p class="full-name">${esc(e.fullName)}</p><p class="arabic-name">${esc(e.arabicName)}</p></div><button class="detail-close" type="button" aria-label="${translated('إغلاق شرح المصطلح','Close term details')}">×</button></div><div class="detail-body" dir="${isEnglish()?'ltr':'rtl'}"><h3>${headings[0]}</h3><p>${esc(content[0])}</p><h3>${headings[1]}</h3><p>${esc(content[1])}</p><h3>${headings[2]}</h3><p>${esc(content[2])}</p>${alternate}<h3>${headings[4]}</h3><div class="related">${related||'—'}</div>${references}</div>`;
  $('term-detail').hidden=false;
  if(scroll)$('term-detail').scrollIntoView({behavior:'smooth',block:'start'});
}
function syncHash(scroll=false){const id=decodeURIComponent(location.hash.slice(1));if(byId.has(id))openTerm(id,scroll);else $('term-detail').hidden=true}
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
  stats[2].querySelector('strong').textContent=c.stats[2];stats[2].querySelector('small').textContent=c.stats[3];
  stats[3].querySelector('strong').textContent=c.stats[4];stats[3].querySelector('small').textContent=c.stats[5];
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
  $('term-count').textContent=data.length.toLocaleString('en-US');$('category-count').textContent=categories.length.toLocaleString('en-US');$('year').textContent=new Date().getFullYear();
  translateUI();
  if(byId.has(decodeURIComponent(location.hash.slice(1)))){
    document.documentElement.style.scrollBehavior='auto';
    $('term-detail').scrollIntoView({block:'start'});
    document.documentElement.style.scrollBehavior='';
  }
  document.addEventListener('click',ev=>{
    const term=ev.target.closest('[data-term]');if(term){location.hash=term.dataset.term;openTerm(term.dataset.term);return}
    const cat=ev.target.closest('[data-category]');if(cat){state.category=cat.dataset.category;state.limit=10;render();$('results-title').scrollIntoView({behavior:'smooth',block:'start'});return}
    const letter=ev.target.closest('[data-letter]');if(letter){state.letter=state.letter===letter.dataset.letter?null:letter.dataset.letter;state.limit=10;render();$('results-title').scrollIntoView({behavior:'smooth',block:'start'});return}
    if(ev.target.closest('[data-more]')||ev.target.closest('#all-categories')){state.more=!state.more;render();if(ev.target.closest('#all-categories'))$('filters').scrollIntoView({behavior:'smooth'});return}
    if(ev.target.closest('.detail-close')){$('term-detail').hidden=true;history.pushState(null,'',location.pathname+location.search);return}
  });
  $('search').addEventListener('input',ev=>{state.query=ev.target.value.trim();state.limit=10;render()});
  $('search').addEventListener('keydown',ev=>{if(ev.key==='Enter'){const first=filteredEntries()[0];if(first){ev.preventDefault();location.hash=first.id;openTerm(first.id)}}});
  $('show-all').addEventListener('click',()=>{$('results-title').scrollIntoView({behavior:'smooth',block:'start'})});
  $('load-more').addEventListener('click',()=>{state.limit+=20;render()});
  $('theme-toggle').addEventListener('click',ev=>{if(ev.shiftKey){setTheme('system');return}const current=document.documentElement.dataset.theme||'system';const dark=current==='dark'||current==='system'&&matchMedia('(prefers-color-scheme: dark)').matches;setTheme(dark?'light':'dark')});
  $('lang-button').addEventListener('click',()=>{state.language=isEnglish()?'ar':'en';try{localStorage.setItem('imhotip-language',state.language)}catch{}translateUI()});
  document.addEventListener('keydown',ev=>{if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='k'){ev.preventDefault();$('search').focus()}if(ev.key==='Escape'&&document.activeElement===$('search')){$('search').value='';state.query='';render();$('search').blur()}});
  addEventListener('hashchange',()=>syncHash(true));addEventListener('popstate',()=>syncHash(false));matchMedia('(prefers-color-scheme: dark)').addEventListener('change',updateTheme);
});
