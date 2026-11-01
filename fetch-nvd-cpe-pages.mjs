import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const API='https://services.nvd.nist.gov/rest/json/cpes/2.0';
const MAX_PAGE_SIZE=10000;

export function pageFileName(startIndex){
  if(!Number.isInteger(startIndex)||startIndex<0)throw new Error('startIndex must be a non-negative integer.');
  return `nvd-cpe-${String(startIndex).padStart(5,'0')}.json`;
}

export function validatePage(payload,{startIndex,resultsPerPage}){
  const errors=[];
  if(!payload||typeof payload!=='object')errors.push('response is not an object');
  if(payload?.startIndex!==startIndex)errors.push(`startIndex is ${payload?.startIndex}; expected ${startIndex}`);
  if(payload?.resultsPerPage!==resultsPerPage)errors.push(`resultsPerPage is ${payload?.resultsPerPage}; expected ${resultsPerPage}`);
  if(payload?.version!=='2.0')errors.push(`API version is ${payload?.version}; expected 2.0`);
  if(!Number.isInteger(payload?.totalResults)||payload.totalResults<1)errors.push('totalResults is missing or invalid');
  if(!Array.isArray(payload?.products))errors.push('products is not an array');
  else{
    if(payload.products.length>resultsPerPage)errors.push('products exceeds requested page size');
    if(startIndex+resultsPerPage<=payload.totalResults&&payload.products.length!==resultsPerPage)errors.push(`full page contains ${payload.products.length} products; expected ${resultsPerPage}`);
    for(let i=0;i<payload.products.length;i++){
      const cpe=payload.products[i]?.cpe;
      if(!cpe?.cpeNameId||!cpe?.cpeName||!Array.isArray(cpe?.titles)){errors.push(`products[${i}] is missing required CPE fields`);break}
    }
  }
  if(errors.length)throw new Error(`Invalid NVD CPE page ${startIndex}: ${errors.join('; ')}`);
  return payload;
}

export function validateSavedPage(file,expected){
  const payload=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
  return validatePage(payload,expected);
}

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function fetchPages({startIndex,pages,pageSize=MAX_PAGE_SIZE,outDir='content',delayMs,retries=5,force=false,dryRun=false,apiKey=process.env.NVD_API_KEY,fetchImpl=fetch}={}){
  if(!Number.isInteger(startIndex)||startIndex<0)throw new Error('--start must be a non-negative integer.');
  if(!Number.isInteger(pages)||pages<1)throw new Error('--pages must be a positive integer.');
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>MAX_PAGE_SIZE)throw new Error(`--page-size must be between 1 and ${MAX_PAGE_SIZE}.`);
  if(delayMs===undefined)delayMs=apiKey?1000:7000;
  if(!Number.isInteger(delayMs)||delayMs<0)throw new Error('--delay-ms must be a non-negative integer.');
  if(!Number.isInteger(retries)||retries<0)throw new Error('--retries must be a non-negative integer.');
  const resolvedOut=path.resolve(outDir);
  fs.mkdirSync(resolvedOut,{recursive:true});
  const summary=[];
  for(let page=0;page<pages;page++){
    const index=startIndex+page*pageSize;
    const destination=path.join(resolvedOut,pageFileName(index));
    const expected={startIndex:index,resultsPerPage:pageSize};
    if(fs.existsSync(destination)&&!force){
      const existing=validateSavedPage(destination,expected);
      summary.push({startIndex:index,status:'verified-existing',products:existing.products.length,file:destination});
      continue;
    }
    if(dryRun){summary.push({startIndex:index,status:'planned',file:destination});continue}
    const url=new URL(API);url.searchParams.set('startIndex',String(index));url.searchParams.set('resultsPerPage',String(pageSize));
    const headers={'User-Agent':'iMHOTiP-corpus-builder/1.0'};if(apiKey)headers.apiKey=apiKey;
    let response,lastError;
    for(let attempt=0;attempt<=retries;attempt++){
      try{
        response=await fetchImpl(url,{headers});
        if(response.ok)break;
        lastError=new Error(`HTTP ${response.status} ${response.statusText}`);
        if(response.status!==429&&response.status<500)break;
      }catch(error){lastError=error}
      if(attempt<retries)await wait(Math.min(60000,2000*2**attempt));
    }
    if(!response?.ok)throw new Error(`NVD request ${index} failed after ${retries+1} attempts: ${lastError?.message||'network error'}`);
    const payload=validatePage(await response.json(),expected);
    const temporary=`${destination}.partial-${process.pid}-${Date.now()}`;
    fs.writeFileSync(temporary,`${JSON.stringify(payload)}\n`,{flag:'wx'});
    validateSavedPage(temporary,expected);
    if(fs.existsSync(destination))fs.unlinkSync(destination);
    fs.renameSync(temporary,destination);
    summary.push({startIndex:index,status:'downloaded',products:payload.products.length,file:destination,totalResults:payload.totalResults});
    if(page<pages-1)await wait(delayMs);
  }
  return summary;
}

function parseArgs(argv){
  const options={};
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==='--force'||arg==='--dry-run'){options[arg.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=true;continue}
    if(!arg.startsWith('--'))throw new Error(`Unexpected argument: ${arg}`);
    const value=argv[++i];if(value===undefined)throw new Error(`Missing value for ${arg}`);
    const key=arg.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    options[key]=['start','pages','pageSize','delayMs','retries'].includes(key)?Number(value):value;
  }
  options.startIndex=options.start;delete options.start;
  return options;
}

const isMain=process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url;
if(isMain){
  try{
    const summary=await fetchPages(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify(summary,null,2));
  }catch(error){console.error(error.message);process.exitCode=1}
}
