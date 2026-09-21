import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const chrome=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const width=Number(process.argv[2]||1280);
if(!Number.isInteger(width)||width<1)throw new Error('Viewport width must be a positive integer.');
const height=900;
const testPage=path.join(root,`.qa-page-${process.pid}.html`);
const profilePrefix=`imhotip-qa-${process.pid}-`;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),profilePrefix));
const url=process.argv[3]==='--http'?`http://localhost:8000/${path.basename(testPage)}`:pathToFileURL(testPage).href;
let browser;
let send;
let exited;
let stderr='';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// Chrome's window size has a platform minimum. CDP sets the page's actual CSS
// viewport before navigation, so the responsive checks really run at 390px.
function connectPipe(child){
  let nextId=0;
  let buffer='';
  let failure;
  const pending=new Map();
  const fail=error=>{
    failure=error;
    for(const {reject,timer} of pending.values()){clearTimeout(timer);reject(error)}
    pending.clear();
  };
  child.once('error',fail);
  child.once('exit',(code,signal)=>fail(new Error(`Chrome exited (${code??signal}). ${stderr.slice(-600)}`)));
  child.stdio[3].on('error',fail);
  child.stdio[4].on('error',fail);
  child.stdio[4].setEncoding('utf8');
  child.stdio[4].on('data',chunk=>{
    buffer+=chunk;
    let end;
    while((end=buffer.indexOf('\0'))!==-1){
      const frame=buffer.slice(0,end);buffer=buffer.slice(end+1);
      if(!frame)continue;
      let message;
      try{message=JSON.parse(frame)}catch(error){fail(error);return}
      const request=pending.get(message.id);
      if(!request)continue;
      clearTimeout(request.timer);pending.delete(message.id);
      if(message.error)request.reject(new Error(`${request.method}: ${message.error.message}`));
      else request.resolve(message.result);
    }
  });
  return (method,params={},sessionId,timeout=30000)=>new Promise((resolve,reject)=>{
    if(failure){reject(failure);return}
    const id=++nextId;
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timed out waiting for ${method}. ${stderr.slice(-600)}`))},timeout);
    pending.set(id,{resolve,reject,timer,method});
    child.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');
  });
}

try{
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  fs.writeFileSync(testPage,index.replace('</body>','<script defer src="./qa-client.js"></script></body>'));
  browser=spawn(chrome,['--headless','--disable-gpu','--no-sandbox','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-pipe',`--window-size=${width},${height}`],{stdio:['ignore','ignore','pipe','pipe','pipe'],windowsHide:true});
  exited=new Promise(resolve=>{browser.once('exit',resolve);browser.once('error',resolve)});
  browser.stderr.setEncoding('utf8');
  browser.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-4000)});
  send=connectPipe(browser);
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);
  await send('Page.enable',{},sessionId);
  const navigation=await send('Page.navigate',{url},sessionId);
  if(navigation.errorText)throw new Error(`Navigation failed: ${navigation.errorText}`);
  const evaluated=await send('Runtime.evaluate',{
    expression:`(async()=>{
      const deadline=Date.now()+25000;
      while(Date.now()<deadline){
        const encoded=document.body?.getAttribute('data-qa-results');
        if(encoded)return {checks:JSON.parse(decodeURIComponent(encoded)),viewport:{width:innerWidth,height:innerHeight,clientWidth:document.documentElement.clientWidth}};
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      throw new Error('Browser did not return QA results: '+location.href);
    })()`,
    awaitPromise:true,returnByValue:true
  },sessionId);
  if(evaluated.exceptionDetails)throw new Error(evaluated.exceptionDetails.exception?.description||evaluated.exceptionDetails.text);
  const {checks,viewport}=evaluated.result.value;
  console.log(`Viewport requested ${width}x${height}; effective ${viewport.width}x${viewport.height}; document client width ${viewport.clientWidth}px.`);
  if(viewport.width!==width||viewport.height!==height)throw new Error('Chrome did not apply the requested viewport.');
  for(const check of checks)console.log(`${check.passed?'PASS':'FAIL'} ${check.name}${check.detail?' — '+check.detail:''}`);
  const failed=checks.filter(check=>!check.passed);
  console.log(`${checks.length-failed.length}/${checks.length} browser checks passed at ${viewport.width}px (${url.startsWith('file:')?'file':'HTTP'}).`);
  if(failed.length)process.exitCode=1;
}finally{
  if(browser){
    if(send)await send('Browser.close',{},undefined,2000).catch(()=>{});
    await Promise.race([exited,delay(2000)]);
    if(browser.exitCode===null&&browser.signalCode===null&&browser.pid){
      // Only this isolated browser's PID and its descendants may be stopped.
      if(process.platform==='win32')spawnSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore',windowsHide:true,timeout:5000});
      else browser.kill('SIGKILL');
      await Promise.race([exited,delay(2000)]);
    }
  }
  if(fs.existsSync(testPage))fs.unlinkSync(testPage);
  const resolvedProfile=path.resolve(profile);
  if(path.dirname(resolvedProfile)!==path.resolve(os.tmpdir())||!path.basename(resolvedProfile).startsWith(profilePrefix))throw new Error('Refusing to remove an unexpected browser profile path.');
  fs.rmSync(resolvedProfile,{recursive:true,force:true,maxRetries:10,retryDelay:200});
}
