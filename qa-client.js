// Browser interaction checks. Loaded only by qa-browser.mjs, never by the site.
addEventListener('DOMContentLoaded',async()=>{
  const results=[];
  const errors=[];
  addEventListener('error',event=>errors.push(event.message));
  addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
  const check=(name,passed,detail='')=>results.push({name,passed:Boolean(passed),detail});
  const wait=()=>new Promise(resolve=>setTimeout(resolve,100));
  const waitFor=async(predicate,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(predicate())return true;await wait()}return false};
  const search=value=>{const input=document.getElementById('search');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))};
  const firstResult=()=>document.querySelector('#results [data-term]')?.dataset.term;
  const firstCard=()=>document.querySelector('#featured-cards [data-term]')?.dataset.term;
  const activeCategory=()=>document.querySelector('#filters [aria-pressed=true]')?.dataset.category;
  const activeLetter=()=>document.querySelector('#alphabet [aria-pressed=true]')?.dataset.letter;
  try{
    if(/^https?:$/.test(location.protocol)){await waitFor(()=>document.body.dataset.corpusReady);await waitFor(()=>document.body.dataset.searchWorker==='ready')}
    check('Initial dictionary renders',document.querySelectorAll('#featured-cards [data-term]').length===8&&document.querySelectorAll('#results [data-term]').length===10);
    const publicCount=Number(document.getElementById('term-count').textContent.replaceAll(',',''));
    check('Release count matches the active build',publicCount===1000000);
    if(/^https?:$/.test(location.protocol)){
      check('1,000,000-term routed corpus is ready',document.body.dataset.corpusReady==='true'&&Number(document.getElementById('term-count')?.textContent.replace(/,/g,''))===1000000);
      check('Egyptian-reviewed public counter is exact',Number(document.getElementById('reviewed-count').textContent.replaceAll(',',''))===window.DICTIONARY.filter(entry=>entry.reviewStatus==='egyptian-reviewed').length);
      check('Extended corpus stays lazy at startup',window.DICTIONARY.length===10000,`${window.DICTIONARY.length} rows resident`);
      const manifest=await fetch('./release-manifest.json').then(response=>response.json());
      const sampleDescriptor=(manifest.routes.mi||manifest.routes.ap||Object.values(manifest.routes)[0])[0];
      const sampleRows=await fetch(`./corpus/${sampleDescriptor.file}`).then(response=>response.json());
      const sample=sampleRows[Math.min(10,sampleRows.length-1)];
      const cpeSearchStart=performance.now();search(sample.term);await waitFor(()=>firstResult()===sample.id,5000);const cpe=window.DICTIONARY.find(item=>item.id===sample.id);
      check('CPE prefix shard search',Boolean(cpe)&&firstResult()===sample.id);check('Worker CPE search stays responsive',performance.now()-cpeSearchStart<1500,`${(performance.now()-cpeSearchStart).toFixed(1)} ms`);
      location.hash=sample.id;await waitFor(()=>document.querySelector('#term-detail h2')?.textContent===sample.term,5000);check('CPE details load on demand',document.querySelector('#term-detail h2')?.textContent===sample.term&&cpe?.detailsLoaded===true&&window.EN_CONTENT[cpe.id][0].includes('Official CPE'));
      const cveDescriptor=(manifest.routes.cv||[]).find(item=>item.file.includes('corpus-cve'));const cveRows=await fetch(`./corpus/${cveDescriptor.file}`).then(response=>response.json()),cveSample=cveRows[10];search(cveSample.term);await waitFor(()=>firstResult()===cveSample.id,5000);const cve=window.DICTIONARY.find(item=>item.id===cveSample.id);check('CVE prefix shard search',Boolean(cve)&&firstResult()===cve.id);location.hash=cveSample.id;await waitFor(()=>document.querySelector('#term-detail h2')?.textContent===cveSample.term,5000);check('CVE details and source load on demand',cve?.detailsLoaded===true&&window.EN_CONTENT[cve.id][0].length>20&&document.querySelector('#term-detail a[href*="cves/2.0"]'));
      history.replaceState(null,'',location.pathname+location.search);document.getElementById('term-detail').hidden=true;search('');
    }
    const expansionSamples=['Transformer','ACID','Python','C++','C#','DOM','Passkey','IPv6','USB-C','IaaS','SRE','KPI'];
    const timings=[];
    for(const term of expansionSamples){const entry=window.DICTIONARY.find(item=>item.term===term);const start=performance.now();search(term);timings.push(performance.now()-start);check(`Expanded corpus search: ${term}`,Boolean(entry)&&firstResult()===entry.id)}
    search('ML');check('Common acronym alias search',firstResult()==='machine-learning');
    search('K8s');check('Established term alias search',firstResult()==='kubernetes');
    search('التحقق من الهوية');check('New Arabic term search',firstResult()==='authentication');
    const referenceSamples=['(KEM) ciphertext','CWE-5: J2EE Misconfiguration: Data Transmission Without Encryption','application/cbor'];
    for(const term of referenceSamples){const entry=window.DICTIONARY.find(item=>item.term===term);const start=performance.now();search(term);timings.push(performance.now()-start);check(`Official reference search: ${term}`,Boolean(entry)&&firstResult()===entry.id)}
    const arabicReference=window.DICTIONARY.find(item=>item.term==='(KEM) ciphertext');search(arabicReference.arabicName);check('Generated Arabic reference search',firstResult()===arabicReference.id);
    check(`Search remains responsive with ${window.DICTIONARY.length.toLocaleString('en-US')} entries`,Math.max(...timings)<300,`slowest ${Math.max(...timings).toFixed(1)} ms`);
    search('');
    await wait();check('Publisher image loads',document.getElementById('publisher-photo').complete&&document.getElementById('publisher-photo').naturalWidth>0);
    search('API');check('Acronym search appears beside input',!document.getElementById('search-suggestions').hidden&&document.querySelector('#search-suggestions [data-term]')?.dataset.term==='api');
    check('Acronym search updates visible cards and list',firstCard()==='api'&&firstResult()==='api');
    search('Application Programming Interface');check('English expansion search',firstResult()==='api');
    search('واجهة برمجة التطبيقات');check('Arabic name search',firstResult()==='api');
    search('برامج تتواصل مع بعضها');check('Arabic phrase search',firstResult()==='api');
    search('nonexistent-phrase-xyz');check('No-result feedback',document.querySelectorAll('#results [data-term]').length===0&&document.getElementById('search-suggestions').textContent.includes('مفيش'));
    search('');check('Clearing search restores cards',document.getElementById('search-suggestions').hidden&&document.querySelectorAll('#featured-cards [data-term]').length===8);
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));check('Ctrl+K focuses search',document.activeElement===document.getElementById('search'));
    search('Docker');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check('Escape clears search',document.getElementById('search').value===''&&document.getElementById('search-suggestions').hidden);
    document.querySelector('#filters [data-category=programming]').click();check('Category filter',activeCategory()==='programming'&&[...document.querySelectorAll('#results [data-term]')].every(button=>window.DICTIONARY.find(entry=>entry.id===button.dataset.term).category==='programming'));
    search('Git');check('Search and category combine',firstResult()==='git'&&activeCategory()==='programming');search('');
    document.querySelector('#filters [data-category=all]').click();document.querySelector('#alphabet [data-letter=K]').click();check('A–Z filter',activeLetter()==='K'&&document.querySelectorAll('#results [data-term]').length>0&&[...document.querySelectorAll('#results [data-term]')].every(button=>window.DICTIONARY.find(e=>e.id===button.dataset.term).term.toUpperCase().startsWith('K')));
    document.querySelector('#alphabet [data-letter=K]').click();check('A–Z reset',!activeLetter()&&document.querySelectorAll('#results [data-term]').length===10);
    document.querySelector('#filters [data-more]').click();check('More categories expands',Boolean(document.querySelector('#filters [data-category=data]')));document.querySelector('#filters [data-more]').click();
    document.querySelector('#review-filters [data-review=egyptian-reviewed]').click();check('Egyptian-reviewed filter',document.querySelectorAll('#results [data-term]').length>0&&[...document.querySelectorAll('#results [data-term]')].every(button=>window.DICTIONARY.find(entry=>entry.id===button.dataset.term).reviewStatus==='egyptian-reviewed'));document.querySelector('#review-filters [data-review=all]').click();
    if(/^https?:$/.test(location.protocol)){document.querySelector('#review-filters [data-review=egyptian-structured]').click();await waitFor(()=>document.querySelectorAll('#results [data-term]').length>0&&[...document.querySelectorAll('#results [data-term]')].every(button=>window.DICTIONARY.find(entry=>entry.id===button.dataset.term).reviewStatus==='egyptian-structured'));check('Structured Egyptian CPE filter',document.querySelectorAll('#results [data-term]').length>0&&[...document.querySelectorAll('#results [data-term]')].every(button=>window.DICTIONARY.find(entry=>entry.id===button.dataset.term).reviewStatus==='egyptian-structured'));document.querySelector('#review-filters [data-review=all]').click();await wait()}
    const beforeMore=document.querySelectorAll('#results [data-term]').length;document.getElementById('load-more').click();check('Load more terms',beforeMore===10&&document.querySelectorAll('#results [data-term]').length===30);
    search('Docker');await waitFor(()=>firstResult()==='docker');document.getElementById('search').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await waitFor(()=>location.hash==='#docker'&&!document.getElementById('term-detail').hidden);check('Enter opens a term',location.hash==='#docker'&&!document.getElementById('term-detail').hidden);
    location.hash='api';await waitFor(()=>document.querySelector('#term-detail h2')?.textContent==='API');check('Direct term link',document.querySelector('#term-detail h2')?.textContent==='API');
    document.querySelector('#term-detail a[href="#sdk"]')?.click();await waitFor(()=>location.hash==='#sdk'&&document.querySelector('#term-detail h2')?.textContent==='SDK');check('Related-term navigation',location.hash==='#sdk'&&document.querySelector('#term-detail h2')?.textContent==='SDK');
    history.back();await wait();check('Browser back restores term',location.hash==='#api'&&document.querySelector('#term-detail h2')?.textContent==='API');
    document.querySelector('.detail-close').click();check('Close detail',document.getElementById('term-detail').hidden);
    document.documentElement.dataset.theme='light';const theme=document.getElementById('theme-toggle');theme.click();check('Dark mode and persistence',document.documentElement.dataset.theme==='dark'&&localStorage.getItem('imhotip-theme')==='dark'&&document.getElementById('publisher-photo').src.endsWith('publisher-dark.png'));theme.click();check('Theme toggles back to light',document.documentElement.dataset.theme==='light');theme.dispatchEvent(new MouseEvent('click',{shiftKey:true,bubbles:true}));check('System theme reset',!document.documentElement.dataset.theme&&localStorage.getItem('imhotip-theme')==='system');
    search('');const language=document.getElementById('lang-button');language.click();check('English interface and content',document.documentElement.lang==='en'&&document.getElementById('hero-title').textContent.includes('Understand')&&document.querySelector('.term-card .summary').textContent.startsWith('Technology'));
    check('English preference persists',localStorage.getItem('imhotip-language')==='en');
    search('encrypted connection');check('English definition search',Boolean(document.querySelector('#results [data-term="vpn"]')));search('');
    location.hash='transformer';await wait();const transformer=window.DICTIONARY.find(e=>e.id==='transformer');check('New term has English definition and example',Boolean(transformer)&&document.getElementById('term-detail').textContent.includes(window.EN_CONTENT.transformer[0])&&document.getElementById('term-detail').textContent.includes(window.EN_CONTENT.transformer[1]));
    check('New term exposes reference links',document.querySelectorAll('#term-detail a[href^="https://"]').length>0);
    language.click();check('Arabic language round trip',document.documentElement.lang==='ar'&&document.getElementById('hero-title').textContent.includes('افهم'));
    check('New term returns to Arabic content',document.getElementById('term-detail').textContent.includes(transformer.shortDefinition));
    location.hash='nist-kem-ciphertext';await wait();check('Unreviewed Arabic translation is hidden',document.getElementById('term-detail').textContent.includes('لسه تحت المراجعة')&&document.getElementById('term-detail').textContent.includes(window.EN_CONTENT['nist-kem-ciphertext'][0])&&!document.getElementById('term-detail').textContent.includes('الطلاء'));
    check('No horizontal page overflow',document.documentElement.scrollWidth<=innerWidth,`${document.documentElement.scrollWidth}/${innerWidth}`);
    check('No browser script errors',errors.length===0,errors.join('; '));
  }catch(error){results.push({name:'Test runner',passed:false,detail:String(error?.stack||error)})}
  document.body.dataset.qaResults=encodeURIComponent(JSON.stringify(results));
});
