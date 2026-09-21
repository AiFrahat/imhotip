// Browser interaction checks. Loaded only by qa-browser.mjs, never by the site.
addEventListener('DOMContentLoaded',async()=>{
  const results=[];
  const errors=[];
  addEventListener('error',event=>errors.push(event.message));
  addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
  const check=(name,passed,detail='')=>results.push({name,passed:Boolean(passed),detail});
  const wait=()=>new Promise(resolve=>setTimeout(resolve,35));
  const search=value=>{const input=document.getElementById('search');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))};
  const firstResult=()=>document.querySelector('#results [data-term]')?.dataset.term;
  const firstCard=()=>document.querySelector('#featured-cards [data-term]')?.dataset.term;
  const activeCategory=()=>document.querySelector('#filters [aria-pressed=true]')?.dataset.category;
  const activeLetter=()=>document.querySelector('#alphabet [aria-pressed=true]')?.dataset.letter;
  try{
    check('Initial dictionary renders',document.querySelectorAll('#featured-cards [data-term]').length===8&&document.querySelectorAll('#results [data-term]').length===10);
    check('Exactly 500 real dictionary entries',window.DICTIONARY.length===500&&document.getElementById('term-count').textContent==='500');
    const expansionSamples=['Transformer','ACID','Python','C++','C#','DOM','Passkey','IPv6','USB-C','IaaS','SRE','KPI'];
    const timings=[];
    for(const term of expansionSamples){const entry=window.DICTIONARY.find(item=>item.term===term);const start=performance.now();search(term);timings.push(performance.now()-start);check(`Expanded corpus search: ${term}`,Boolean(entry)&&firstResult()===entry.id)}
    search('ML');check('Common acronym alias search',firstResult()==='machine-learning');
    search('K8s');check('Established term alias search',firstResult()==='kubernetes');
    search('التحقق من الهوية');check('New Arabic term search',firstResult()==='authentication');
    check('Search remains responsive with 500 entries',Math.max(...timings)<300,`slowest ${Math.max(...timings).toFixed(1)} ms`);
    search('');
    check('Publisher image loads',document.getElementById('publisher-photo').complete&&document.getElementById('publisher-photo').naturalWidth>0);
    search('API');check('Acronym search appears beside input',!document.getElementById('search-suggestions').hidden&&document.querySelector('#search-suggestions [data-term]')?.dataset.term==='api');
    check('Acronym search updates visible cards and list',firstCard()==='api'&&firstResult()==='api');
    search('Application Programming Interface');check('English expansion search',firstResult()==='api');
    search('واجهة برمجة التطبيقات');check('Arabic name search',firstResult()==='api');
    search('برامج تتواصل مع بعضها');check('Arabic phrase search',firstResult()==='api');
    search('nonexistent-phrase-xyz');check('No-result feedback',document.querySelectorAll('#results [data-term]').length===0&&document.getElementById('search-suggestions').textContent.includes('لا توجد'));
    search('');check('Clearing search restores cards',document.getElementById('search-suggestions').hidden&&document.querySelectorAll('#featured-cards [data-term]').length===8);
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));check('Ctrl+K focuses search',document.activeElement===document.getElementById('search'));
    search('Docker');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check('Escape clears search',document.getElementById('search').value===''&&document.getElementById('search-suggestions').hidden);
    document.querySelector('#filters [data-category=programming]').click();check('Category filter',activeCategory()==='programming'&&[...document.querySelectorAll('#results [data-term]')].every(button=>window.DICTIONARY.find(entry=>entry.id===button.dataset.term).category==='programming'));
    search('Git');check('Search and category combine',firstResult()==='git'&&activeCategory()==='programming');search('');
    document.querySelector('#filters [data-category=all]').click();document.querySelector('#alphabet [data-letter=K]').click();check('A–Z filter',activeLetter()==='K'&&document.querySelectorAll('#results [data-term]').length>0&&[...document.querySelectorAll('#results [data-term]')].every(button=>window.DICTIONARY.find(e=>e.id===button.dataset.term).term.toUpperCase().startsWith('K')));
    document.querySelector('#alphabet [data-letter=K]').click();check('A–Z reset',!activeLetter()&&document.querySelectorAll('#results [data-term]').length===10);
    document.querySelector('#filters [data-more]').click();check('More categories expands',Boolean(document.querySelector('#filters [data-category=data]')));document.querySelector('#filters [data-more]').click();
    const beforeMore=document.querySelectorAll('#results [data-term]').length;document.getElementById('load-more').click();check('Load more terms',beforeMore===10&&document.querySelectorAll('#results [data-term]').length===30);
    search('Docker');document.getElementById('search').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));check('Enter opens a term',location.hash==='#docker'&&!document.getElementById('term-detail').hidden);
    location.hash='api';await wait();check('Direct term link',document.querySelector('#term-detail h2')?.textContent==='API');
    document.querySelector('#term-detail a[href="#sdk"]')?.click();await wait();check('Related-term navigation',location.hash==='#sdk'&&document.querySelector('#term-detail h2')?.textContent==='SDK');
    history.back();await wait();check('Browser back restores term',location.hash==='#api'&&document.querySelector('#term-detail h2')?.textContent==='API');
    document.querySelector('.detail-close').click();check('Close detail',document.getElementById('term-detail').hidden);
    document.documentElement.removeAttribute('data-theme');const theme=document.getElementById('theme-toggle');theme.click();check('Dark mode and persistence',document.documentElement.dataset.theme==='dark'&&localStorage.getItem('imhotip-theme')==='dark'&&document.getElementById('publisher-photo').src.endsWith('publisher-dark.png'));theme.click();check('Theme toggles back to light',document.documentElement.dataset.theme==='light');theme.dispatchEvent(new MouseEvent('click',{shiftKey:true,bubbles:true}));check('System theme reset',!document.documentElement.dataset.theme&&localStorage.getItem('imhotip-theme')==='system');
    search('');const language=document.getElementById('lang-button');language.click();check('English interface and content',document.documentElement.lang==='en'&&document.getElementById('hero-title').textContent.includes('Understand')&&document.querySelector('.term-card .summary').textContent.startsWith('Technology'));
    check('English preference persists',localStorage.getItem('imhotip-language')==='en');
    search('encrypted connection');check('English definition search',Boolean(document.querySelector('#results [data-term="vpn"]')));search('');
    location.hash='transformer';await wait();const transformer=window.DICTIONARY.find(e=>e.id==='transformer');check('New term has English definition and example',Boolean(transformer)&&document.getElementById('term-detail').textContent.includes(window.EN_CONTENT.transformer[0])&&document.getElementById('term-detail').textContent.includes(window.EN_CONTENT.transformer[1]));
    check('New term exposes reference links',document.querySelectorAll('#term-detail a[href^="https://"]').length>0);
    language.click();check('Arabic language round trip',document.documentElement.lang==='ar'&&document.getElementById('hero-title').textContent.includes('افهم'));
    check('New term returns to Arabic content',document.getElementById('term-detail').textContent.includes(transformer.shortDefinition));
    check('No horizontal page overflow',document.documentElement.scrollWidth<=innerWidth,`${document.documentElement.scrollWidth}/${innerWidth}`);
    check('No browser script errors',errors.length===0,errors.join('; '));
  }catch(error){results.push({name:'Test runner',passed:false,detail:String(error?.stack||error)})}
  document.body.dataset.qaResults=encodeURIComponent(JSON.stringify(results));
});
