export const NVD_CPE_API='https://services.nvd.nist.gov/rest/json/cpes/2.0?cpeNameId=';

export function cpeUuid(value){
  return String(value||'').toLowerCase().replace(/^cpe-/,'');
}

export function cpeDetailShard(value){
  const uuid=cpeUuid(value);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid))throw new Error(`Invalid CPE id: ${value}`);
  return `${uuid.slice(0,2)}.json`;
}

export function expandCpeDetail(id,packed){
  if(!Array.isArray(packed)||packed.length<2)throw new Error(`Invalid compact CPE detail: ${id}`);
  const uuid=cpeUuid(id);
  const [title,cpeName,created='',lastModified='']=packed;
  const source=`${NVD_CPE_API}${uuid.toUpperCase()}`;
  const definition=`${title} ده سجل منتج رسمي في قاموس CPE التابع لـNVD، ومعرّفه بيساعد الأدوات تتعرف على المنتج أو الإصدار بشكل موحّد.`;
  return {
    arabicName:title,
    shortDefinition:definition,
    simpleExplanation:definition,
    example:`أداة جرد أو إدارة ثغرات ممكن تستخدم معرّف CPE ده علشان تربط ${title} بالسجلات الأمنية الصحيحة.`,
    whereUsed:'هتقابله في جرد البرامج والأجهزة، وإدارة الثغرات، وأتمتة عمليات الأمن السيبراني.',
    en:[
      `Official CPE product record for ${title}.`,
      `A security inventory can use this CPE name to identify ${title} consistently across tools and vulnerability records.`,
      'Software and hardware inventories, vulnerability management, and security automation.'
    ],
    relatedTerms:[],alternateMeanings:[],sources:[source],cpeName,created,lastModified
  };
}
