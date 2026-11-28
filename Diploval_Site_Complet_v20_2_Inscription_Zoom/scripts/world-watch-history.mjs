// Chronologie mondiale : données éditoriales existantes, jamais une vérification automatique.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateValid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const validText=v=>typeof v==='string'&&!!v.trim();
const paris=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const localParts=ms=>Object.fromEntries(paris.formatToParts(new Date(ms)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
const parisDay=ms=>{const p=localParts(ms);return p.year+'-'+p.month+'-'+p.day};
const parisLabel=ms=>{const p=localParts(ms);return p.day+'/'+p.month+'/'+p.year+' à '+p.hour+' h '+p.minute};
const dateFR=v=>dateValid(v)?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):'Non renseignée';
function parseLegacyTime(v){
 // The historical data uses Paris local time, not the visitor's time zone.
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)||!dateValid(v.slice(0,10)))return NaN;
 const guess=Date.parse(v+'Z');if(!Number.isFinite(guess))return NaN;
 const candidates=[guess-3600000,guess-7200000].filter(ms=>{const p=localParts(ms);return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute===v});
 // Ambiguous or nonexistent daylight-saving time: never guess.
 return candidates.length===1?candidates[0]:NaN;
}
const parseTime=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&dateValid(v.slice(0,10))?Date.parse(v):NaN;
const validUrl=v=>{try{return new URL(v).protocol==='https:'}catch{return false}};
const sourceOK=s=>s&&validText(s.label)&&validUrl(s.url);
const sourceSet=s=>Array.isArray(s)?s.filter(sourceOK):[];
const sourceCount=s=>new Set(sourceSet(s).map(x=>x.url)).size;
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
const types={securite:'Sécurité',diplomatie:'Diplomatie',humanitaire:'Humanitaire',vivant:'Le vivant',droit:'Droit et institutions',economie:'Économie',paix:'Processus de paix',vigilance:'Évaluation de vigilance',correction:'Correction',autre:'Autre évolution'};
const outcomes={aucune_evolution:'Aucune évolution substantielle constatée dans les sources examinées',evolution_documentee:'Évolution documentée',donnees_insuffisantes:'Informations insuffisantes pour conclure'};
export function buildWorldHistory({rows,points,primary,analyses,analysisDate,history}){
 const ids=new Set(rows.map(d=>d.id)),legacyIds=new Set(primary.keys()),events=[],reviews=new Map(),eventIds=new Set(),legacyKeys=new Set();
 if(!history||!Array.isArray(history.events)||!Array.isArray(history.reviews))throw Error('Historique mondial invalide');
 for(const [id,slug] of primary){
  const p=points.find(p=>p.id===slug);if(!p)continue;
  for(const u of (p.updates||[])){
   const key=id+'|'+u.datetime+'|'+u.title+'|'+(u.event_date||'');
   if(legacyKeys.has(key)||!validText(u.title))continue;legacyKeys.add(key);
   const uid='legacy-'+id+'-'+hash(key),ms=parseLegacyTime(u.datetime),sources=sourceSet(u.sources);
   if(eventIds.has(uid))throw Error('Collision des identifiants historiques');eventIds.add(uid);
   events.push({uid,id,ms,event_date:dateValid(u.event_date)?u.event_date:null,event_label:u.event_label,title:u.title,type:u.correction?'correction':null,sources,legacy:true,legacyUrl:'/points-information/'+slug+'/'});
  }
 }
 for(const e of history.events){
  const ms=parseTime(e.published_at);
  if(!e||!validText(e.uid)||!/^ww-[a-z0-9-]{4,80}$/.test(e.uid)||eventIds.has(e.uid)||!ids.has(e.dossier_id)||legacyIds.has(e.dossier_id)||!Number.isFinite(ms)||!dateValid(e.validated_on)||e.validated_on>parisDay(ms)||!validText(e.title)||!validText(e.summary)||!Object.hasOwn(types,e.type)||!Array.isArray(e.sources)||e.sources.some(s=>!sourceOK(s))||sourceCount(e.sources)<2||(e.event_date!=null&&(!dateValid(e.event_date)||e.event_date>parisDay(ms))))throw Error('Évolution mondiale invalide : identifiant unique, dossier, date, sources et validation requis');
  eventIds.add(e.uid);events.push({uid:e.uid,id:e.dossier_id,ms,event_date:e.event_date,title:e.title,type:e.type,sources:e.sources,summary:e.summary,validated_on:e.validated_on,legacy:false});
 }
 const reviewKeys=new Set();
 for(const r of history.reviews){
  const k=r.dossier_id+'|'+r.reviewed_on;
  if(!ids.has(r.dossier_id)||!dateValid(r.reviewed_on)||reviewKeys.has(k)||!Object.hasOwn(outcomes,r.outcome)||!validText(r.note)||!Array.isArray(r.sources)||r.sources.some(s=>!sourceOK(s))||(r.outcome!=='donnees_insuffisantes'&&sourceCount(r.sources)<2)||(r.outcome==='evolution_documentee'&&!events.some(e=>e.uid===r.event_uid&&e.id===r.dossier_id)))throw Error('Vérification mondiale invalide : date, résultat, note et sources requis');
  reviewKeys.add(k);if(!reviews.has(r.dossier_id))reviews.set(r.dossier_id,[]);reviews.get(r.dossier_id).push(r);
 }
 for(const arr of reviews.values())arr.sort((a,b)=>b.reviewed_on.localeCompare(a.reviewed_on));
 events.sort((a,b)=>(Number.isFinite(b.ms)?b.ms:-1)-(Number.isFinite(a.ms)?a.ms:-1)||a.uid.localeCompare(b.uid));
 const byId=new Map(rows.map(d=>[d.id,d]));
 const histories=new Map(rows.map(d=>[d.id,events.filter(e=>e.id===d.id)]));
 // The feed references prior public updates rather than copying their factual body.
 const eligible=events.filter(e=>Number.isFinite(e.ms)&&e.sources.length);
 const latest=new Map();for(const e of eligible)if(!latest.has(e.id))latest.set(e.id,e.ms);
 const sourceLinks=s=>'<ul class="ww-sources">'+s.map(x=>'<li><a href="'+esc(x.url)+'">'+esc(x.label)+'</a></li>').join('')+'</ul>';
 const typeLabel=e=>e.type?types[e.type]:'Suivi historique';
 const feed=eligible.map(e=>'<li class="ww-update" data-ww-update="'+esc(e.uid)+'" data-ww-time="'+e.ms+'"><div class="ww-update-meta"><span>'+esc(e.legacy&&e.id==='MOR-01'?'Proche-Orient — suivi régional':byId.get(e.id).title)+' · '+esc(typeLabel(e))+'</span><time datetime="'+new Date(e.ms).toISOString()+'">'+esc(parisLabel(e.ms))+'</time></div><a href="#ww-event-'+esc(e.uid)+'" data-ww-event-link>'+esc(e.title)+'</a>'+(e.legacy?'<small>Extrait du suivi déjà publié</small>':'')+'</li>').join('');
 const feedHtml='<section class="ww-news" aria-labelledby="ww-news-title"><h2 id="ww-news-title">Dernières évolutions mondiales</h2><p>Les ajouts et corrections déjà publiés, classés par date d’ajout au suivi. Une vérification sans changement ne crée pas de nouveauté.</p><div class="ww-periods" role="group" aria-label="Période des nouveautés"><button type="button" data-ww-period="24" aria-pressed="true">24 h</button><button type="button" data-ww-period="168" aria-pressed="false">7 jours</button><button type="button" data-ww-period="720" aria-pressed="false">30 jours</button><button type="button" data-ww-period="all" aria-pressed="false">Tout</button></div><p id="ww-news-result" role="status" aria-live="polite"></p><ul class="ww-updates">'+feed+'</ul><button type="button" id="ww-news-more" hidden>Afficher plus d’évolutions</button><p class="ww-meta">Horaires de Paris. Les entrées historiques disposant de sources indiquées sont reprises sans nouvelle certification ; consulter leur dossier pour le contexte. Les dates de constitution ou de première analyse ne sont pas assimilées à des faits nouveaux.</p></section>';
 const cardHtml=d=>{
  const list=histories.get(d.id)||[],rev=reviews.get(d.id)||[],last=rev[0],change=latest.get(d.id),a=analyses.get(d.id);
  const recent='<dl class="ww-dates"><div><dt>Dernière vérification</dt><dd>'+(last?esc(dateFR(last.reviewed_on))+' — '+esc(outcomes[last.outcome]):'Non renseignée')+'</dd></div><div><dt>Dernière évolution publiée</dt><dd>'+(Number.isFinite(change)?esc(parisLabel(change)):'Non renseignée')+'</dd></div>'+(a?'<div><dt>Date de l’analyse au registre</dt><dd>'+esc(dateFR(analysisDate))+'</dd></div>':'')+'</dl>';
  const items=list.map(e=>'<li id="ww-event-'+esc(e.uid)+'" tabindex="-1"><p class="ww-meta">Ajout au suivi : '+(Number.isFinite(e.ms)?esc(parisLabel(e.ms)):'Date non exploitable')+(e.event_date?' · Faits : '+esc(dateFR(e.event_date)):'')+'</p><strong>'+esc(e.title)+'</strong>'+(e.type==='correction'?'<p>Correction signalée</p>':'')+(e.legacy?'<p class="ww-meta">Entrée du suivi historique'+(!e.sources.length?' — aucune source attachée à cette entrée':'')+'. <a href="'+esc(e.legacyUrl)+'">Lire le suivi original →</a></p>'+(e.sources.length?'<p class="ww-meta">Sources indiquées dans cette entrée :</p>'+sourceLinks(e.sources):''):'<p>'+esc(e.summary)+'</p><p class="ww-meta">Validation humaine : '+esc(dateFR(e.validated_on))+'</p>'+sourceLinks(e.sources))+'</li>').join('');
  const reviewItems=rev.map(r=>'<li><strong>'+esc(dateFR(r.reviewed_on))+' — '+esc(outcomes[r.outcome])+'</strong><p>'+esc(r.note)+'</p>'+sourceLinks(r.sources)+'</li>').join('');
  return recent+'<details class="ww-analysis ww-chronology"><summary><span class="ww-summary-label">Chronologie ('+list.length+')</span><span class="ww-chevron" aria-hidden="true"></span></summary>'+(items?'<ol class="ww-history">'+items+'</ol>':'<p>Aucune évolution datée enregistrée. Cela ne signifie pas que la situation est stable.</p>')+(reviewItems?'<h4>Historique des vérifications</h4><ol class="ww-history">'+reviewItems+'</ol>':'')+'</details>';
 };
 return {feedHtml,cardHtml,latest,eligibleCount:eligible.length};
}
