import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('.',import.meta.url);
const context={window:{}};
for(const file of ['data.js','en.js','expansion.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),context);
const entries=context.window.DICTIONARY;
const arabic=/[\u0600-\u06ff]/;
const egyptian=/(?:^|\s)(?:بت\S+|بي\S+|بن\S+|هت\S+|هن\S+|مش|مفيش|ممكن|علشان|عشان|لما|لو|إيه|ايه|ده|دي|دول|تاني|تانية|أكتر|أقل|هتقابله|يقدر)(?:\s|[،؛.!؟]|$)/;
const suspicious=[
  /وكالة الأمن (?:الإقليمي|الوطني|السلبية)/,
  /فك الكبسولة|الطلاء/,
  /الثلاجة غير/,
  /مصطلح تقني موثق يشير إلى/,
  /مصطلح تقني:/,
  /\/ \/ \/ \/ /
];
const isMachine=e=>e.reviewStatus==='machine-assisted'||/^(nist|cwe|iana)-/.test(e.id);
const findings=[];
let egyptianCount=0, reviewedCount=0, reviewedWithoutMarker=0, machineCount=0, suspiciousCount=0, missingArabic=0;
for(const entry of entries){
  const fields=[entry.arabicName,entry.shortDefinition,entry.example,entry.whereUsed];
  const joined=fields.join(' ');
  if(isMachine(entry))machineCount++;
  if(egyptian.test(joined))egyptianCount++;
  if(entry.reviewStatus==='egyptian-reviewed'){
    reviewedCount++;
    if(!egyptian.test(joined)){
      reviewedWithoutMarker++;
      findings.push({id:entry.id,type:'reviewed-without-egyptian-marker',sample:joined.slice(0,180)});
    }
  }
  if(fields.some(value=>!arabic.test(value))){missingArabic++;findings.push({id:entry.id,type:'missing-arabic'})}
  const pattern=suspicious.find(value=>value.test(joined));
  if(pattern){suspiciousCount++;findings.push({id:entry.id,type:'suspicious-machine-translation',sample:joined.slice(0,180)})}
}
const report={
  total:entries.length,
  machineAssisted:machineCount,
  egyptianReviewed:reviewedCount,
  reviewedWithoutEgyptianMarker:reviewedWithoutMarker,
  entriesWithEgyptianMarkers:egyptianCount,
  missingArabic,
  suspiciousMachineTranslation:suspiciousCount,
  note:'This is a triage report. A clean result does not replace semantic or human review.',
  sampleFindings:findings.slice(0,30)
};
console.log(JSON.stringify(report,null,2));
if(missingArabic||reviewedWithoutMarker)process.exitCode=1;
