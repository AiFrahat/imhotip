import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname),cpe=JSON.parse(fs.readFileSync(path.join(root,'corpus','manifest.json'),'utf8')),cve=JSON.parse(fs.readFileSync(path.join(root,'corpus-cve','manifest.json'),'utf8'));
const prefix=(descriptor,base)=>({...descriptor,file:`${base}/${descriptor.file}`});
const routes=structuredClone(cpe.routes);
for(const [key,descriptors] of Object.entries(cve.routes))routes[key]=[...(routes[key]||[]),...descriptors.map(item=>prefix(item,'../corpus-cve'))];
const facets=structuredClone(cpe.facets||{});
facets['category-security']=prefix(cve.facets['category-security'],'../corpus-cve');
facets['category-security--review-egyptian-structured']=prefix(cve.facets['category-security--review-egyptian-structured'],'../corpus-cve');
const cpeReview=cpe.facets['review-egyptian-structured'],cveReview=cve.facets['review-egyptian-structured'];
const cpeRows=JSON.parse(fs.readFileSync(path.join(root,'corpus',cpeReview.file),'utf8')).slice(0,1000),cveRows=JSON.parse(fs.readFileSync(path.join(root,'corpus-cve',cveReview.file),'utf8')).slice(0,1000);
const combined=[...cpeRows,...cveRows],combinedFile='facets/review-combined.json',combinedJson=JSON.stringify(combined);fs.writeFileSync(path.join(root,'corpus',combinedFile),combinedJson);
facets['review-egyptian-structured']={file:combinedFile,count:combined.length,total:cpe.shardedCount+cve.count,bytes:Buffer.byteLength(combinedJson)};
const manifest={schemaVersion:1,generatedAt:new Date().toISOString(),baseCount:cpe.baseCount,cpeCount:cpe.shardedCount,cveCount:cve.count,totalCount:cpe.baseCount+cpe.shardedCount+cve.count,routeLength:2,searchStrategy:'multi-corpus-normalized-leading-prefix',routes,facets,corpora:[{type:'cpe',manifest:'corpus/manifest.json'},{type:'cve',manifest:'corpus-cve/manifest.json'}]};
fs.writeFileSync(path.join(root,'release-manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({totalCount:manifest.totalCount,routes:Object.keys(routes).length,combinedReviewBytes:facets['review-egyptian-structured'].bytes},null,2));
