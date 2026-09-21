import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const chrome=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const testPage=path.join(root,`.qa-page-${process.pid}.html`);
const page=index.replace('</body>','<script defer src="./qa-client.js"></script></body>');
fs.writeFileSync(testPage,page);
try{
  const width=Number(process.argv[2]||1280);
  const url=process.argv[3]==='--http'?`http://localhost:8000/${path.basename(testPage)}`:`file:///${testPage.replaceAll('\\','/')}`;
  const result=spawnSync(chrome,['--headless','--disable-gpu','--no-sandbox','--virtual-time-budget=3000',`--window-size=${width},900`,'--dump-dom',url],{encoding:'utf8',timeout:30000,maxBuffer:10*1024*1024});
  if(result.error)throw result.error;
  const match=result.stdout.match(/data-qa-results="([^"]+)"/);
  if(!match)throw new Error(`Browser did not return QA results. ${result.stderr.slice(-500)}`);
  const checks=JSON.parse(decodeURIComponent(match[1].replaceAll('&amp;','&')));
  for(const check of checks)console.log(`${check.passed?'PASS':'FAIL'} ${check.name}${check.detail?' — '+check.detail:''}`);
  const failed=checks.filter(check=>!check.passed);
  console.log(`${checks.length-failed.length}/${checks.length} browser checks passed at ${width}px (${url.startsWith('file:')?'file':'HTTP'}).`);
  if(failed.length)process.exitCode=1;
}finally{if(fs.existsSync(testPage))fs.unlinkSync(testPage)}
