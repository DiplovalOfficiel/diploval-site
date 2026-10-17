// Noyau de traitement : aucune écriture Netlify, aucun accès réseau.
export const STATUSES = Object.freeze(['À examiner','Source à vérifier','Recevable','Retenue','Non retenue','Doublon','Hors sujet']);
export const emptyReview = () => ({status:'À examiner',internalNote:'',sourceVerified:'À vérifier',newElement:'À vérifier',proposedChange:'',chapter:'',decisionReason:'',argumentIds:[],history:[],revision:0});
const textFields = ['internalNote','proposedChange','chapter','decisionReason'];
const checks = ['À vérifier','Oui','Non','Sans objet'];
export function updateReview(previous,changes,{actor,now=new Date().toISOString(),expectedRevision}={}) {
  if(!actor || typeof actor!=='string') throw Error('Un responsable de traitement est nécessaire.');
  if(expectedRevision!==previous.revision) throw Error('Cette contribution a été modifiée : recharger avant de sauvegarder.');
  const allowed=['status',...textFields,'sourceVerified','newElement','argumentIds'];
  if(Object.keys(changes).some(k=>!allowed.includes(k))) throw Error('Champ de traitement inconnu.');
  const next=structuredClone(previous);
  for(const [k,v] of Object.entries(changes)) {
    if(k==='status'&&!STATUSES.includes(v))throw Error('Statut invalide.');
    if(textFields.includes(k)&&(typeof v!=='string'||v.length>20000))throw Error('Note invalide.');
    if(['sourceVerified','newElement'].includes(k)&&!checks.includes(v))throw Error('Valeur de vérification invalide.');
    if(k==='argumentIds'&&(!Array.isArray(v)||v.length>100||v.some(id=>typeof id!=='string'||!id||id.length>200)))throw Error('Arguments invalides.');
    next[k]=k==='argumentIds'?[...new Set(v)]:v;
  }
  if(['Non retenue','Doublon','Hors sujet'].includes(next.status)&&!next.decisionReason.trim())throw Error('Préciser le motif de la décision interne.');
  const delta={};for(const k of allowed)if(JSON.stringify(next[k])!==JSON.stringify(previous[k]))delta[k]={before:previous[k],after:next[k]};
  if(!Object.keys(delta).length)return next;
  next.revision=previous.revision+1;
  next.history.push({at:now,actor,changes:delta});
  return next;
}
export function counters(submissions,reviews,{dossierKey}={}) {
  const selected=submissions.filter(s=>!dossierKey||s.dossierKey===dossierKey);
  const argumentsSet=new Set();let classified=0;
  for(const s of selected){const ids=reviews[s.id]?.argumentIds||[];if(ids.length)classified++;for(const id of ids)argumentsSet.add(s.dossierKey+'\u0000'+id);}
  return {received:selected.length,distinctArguments:argumentsSet.size,classifiedContributions:classified,unclassifiedContributions:selected.length-classified};
}
export function groupExactTextSuggestions(submissions) {
  const groups=new Map();
  for(const s of submissions){const content=String(s.data?.contribution||'').normalize('NFC').replace(/\s+/g,' ').trim();if(!content)continue;const key=s.dossierKey+'\u0000'+content;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s.id);}
  return [...groups.values()].filter(g=>g.length>1);
}
export function normalizeSubmission(raw,{formId,formName}={}) {
  if(!raw||typeof raw!=='object'||!raw.id||!formId)throw Error('Identifiant Netlify de la réponse et du formulaire requis.');
  if(!formName?.startsWith('contribution-'))throw Error('Ce formulaire ne relève pas des consultations.');
  const data=structuredClone(raw.data||{});
  // La clé du formulaire distingue les versions de consultation sans fusion implicite.
  return {id:String(raw.id),formId:String(formId),dossierKey:String(formId),formName,receivedAt:raw.created_at||'',data,original:structuredClone(raw)};
}
