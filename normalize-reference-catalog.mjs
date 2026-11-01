import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('.',import.meta.url);
const context={window:{}};
for(const file of ['data.js','en.js','expansion.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),context);
const editorial=context.window.DICTIONARY.filter(entry=>!/^(nist|cwe|iana)-/.test(entry.id));
const reservedAliases=new Set(editorial.flatMap(entry=>entry.aliases).map(value=>value.trim().toLowerCase()));
const normalized=value=>String(value||'').normalize('NFKC').trim().toLowerCase();

for(const file of ['content/reference-catalog.source.json','content/reference-catalog.json']){
  const url=new URL(file,root);
  const rows=JSON.parse(fs.readFileSync(url,'utf8'));
  for(const row of rows){
    row.reviewStatus='machine-assisted';
    if(row.id.startsWith('iana-')){
      row.arabicName=`نوع وسائط: ${row.fullName}`;
      row.definition=`نوع وسائط مسجّل لدى IANA ويُستخدم لتعريف محتوى «${row.fullName}» وتبادله بين الأنظمة.`;
    }else if(row.id.startsWith('cwe-')&&!/[\u0600-\u06ff]/.test(row.arabicName)){
      row.arabicName=`ضعف برمجي موثق: ${row.fullName.split(':')[0]}`;
    }
    row.reviewStatus='machine-assisted';
    if(row.id.startsWith('iana-')){
      row.arabicName=`نوع وسائط: ${row.fullName}`;
      row.definition=`نوع وسائط مسجّل لدى IANA ويُستخدم لتعريف محتوى «${row.fullName}» وتبادله بين الأنظمة.`;
    }else if(row.id.startsWith('cwe-')&&!/[\u0600-\u06ff]/.test(row.arabicName)){
      row.arabicName=`ضعف برمجي موثق: ${row.fullName.split(':')[0]}`;
    }
    if(reservedAliases.has(row.term.trim().toLowerCase()))row.term=`${row.term} — NIST reference`;
    if(row.en[0].startsWith('A technical term documented by ')){
      row.en[0]=`${row.fullName} is a technical term listed in NIST's cybersecurity and privacy glossary; its precise meaning depends on the cited source and context.`;
      if(file.endsWith('reference-catalog.json'))row.definition=`«${row.fullName}» مصطلح تقني مدرج في قاموس NIST للأمن السيبراني والخصوصية، ويتحدد معناه الدقيق حسب المصدر والسياق المشار إليهما.`;
    }
    if([row.term,row.fullName].some(value=>normalized(value)===normalized(row.en[0])))row.en[0]=`${row.fullName} is a documented technical concept whose precise definition is given by the cited standard or registry.`;
    if(file.endsWith('reference-catalog.json')&&[row.term,row.fullName,row.arabicName].some(value=>normalized(value)===normalized(row.definition)))row.definition=`«${row.fullName}» مفهوم تقني موثق، ويقدم المعيار أو السجل المشار إليه تعريفه الدقيق حسب السياق.`;
  }
  fs.writeFileSync(url,JSON.stringify(rows,null,2));
  console.log(`Normalized ${rows.length} entries in ${file}.`);
}
