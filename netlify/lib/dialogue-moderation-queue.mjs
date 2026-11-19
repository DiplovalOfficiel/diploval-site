// Diploval V0.3 — consultation privée de la file des contributions.
// Pas de route HTTP. Cette vue ne fournit jamais d'adresse ni d'audit.
// listCandidateIds est un index SERVEUR : l'index n'autorise aucune lecture.
// Chaque dossier est rechargé via repository.readPrivate(), qui revalide
// les droits du collaborateur sur la consultation concernée.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const STATE=new Set(['pending','approved','rejected','withdrawn','all']);
const MAX_CANDIDATES=1000;
const MAX_PAGE=25;

export const moderationState=entry=>{
  if(entry?.visibility==='withdrawn')return 'withdrawn';
  const last=entry?.versions?.at(-1);
  if(last?.status==='pending')return 'pending';
  if(last?.status==='rejected')return 'rejected';
  if(entry?.visibility==='public'&&Number.isInteger(entry?.publishedVersion))return 'approved';
  return null;
};

function safeCard(entry){
  const last=entry.versions.at(-1);
  return {
    id:entry.id,
    reference:entry.reference,
    consultationId:entry.consultationId,
    kind:entry.kind,
    state:moderationState(entry),
    mutation:entry.mutation,
    currentVersion:last.number,
    publishedVersion:entry.publishedVersion,
    receivedAt:last.submittedAt,
    excerpt:String(last.text||'').slice(0,180),
    displayMode:entry.author?.displayMode??'without_name',
    // Aucun nom, pseudonyme, contact, consentement ou journal n'est exposé
    // dans la file ; la fiche détaillée est chargée séparément avec droits.
  };
}

export function createModerationQueue({listCandidateIds,repository,authorize}={}){
  if(typeof listCandidateIds!=='function'
    ||!repository||typeof repository.readPrivate!=='function'
    ||typeof authorize!=='function')throw Error('Index privé, lecture protégée et habilitations nécessaires.');

  async function list(principal,{consultationId=null,state='pending',limit=20,cursor=0}={}){
    // Avant même d'interroger l'index, refuser tout principal non habilité.
    if(await authorize(principal,'read_queue')!==true)throw Error('Accès non autorisé.');
    if(!STATE.has(state))throw Error('Filtre de file invalide.');
    if(consultationId!==null&&(!ID.test(consultationId)))throw Error('Consultation invalide.');
    if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_PAGE
       ||!Number.isSafeInteger(cursor)||cursor<0)throw Error('Pagination invalide.');

    const ids=await listCandidateIds();
    if(!Array.isArray(ids)||ids.length>MAX_CANDIDATES)
      throw Error('Index de modération indisponible ou incomplet.');
    const unique=[...new Set(ids)];
    if(unique.some(id=>typeof id!=='string'||!ID.test(id)))
      throw Error('Index de modération invalide.');
    const items=[];
    for(const id of unique){
      // Droits revérifiés sur chaque dossier, même si l'index est obsolète.
      if(await authorize(principal,'read_queue')!==true)throw Error('Accès révoqué.');
      let entry;
      try{entry=await repository.readPrivate(principal,id);}
      catch(err){
        // Un hors-périmètre ne se retrouve pas dans la réponse. Toute panne
        // de stockage, chiffrement ou cohérence provoque un échec fermé.
        if(err?.message==='Accès non autorisé.')continue;
        throw err;
      }
      if(!entry)continue;
      if(entry.id!==id||!ID.test(entry.consultationId))throw Error('Index de modération incohérent.');
      const status=moderationState(entry);
      if(!status||state!=='all'&&status!==state
        ||consultationId&&entry.consultationId!==consultationId)continue;
      items.push(safeCard(entry));
    }
    // Une pagination stable par date puis référence, sans compter les
    // dossiers hors habilitation ni révéler leur nombre.
    items.sort((a,b)=>String(a.receivedAt).localeCompare(String(b.receivedAt))
      ||a.reference.localeCompare(b.reference));
    const visible=items.slice(cursor,cursor+limit);
    return {
      entries:visible,
      nextCursor:cursor+limit<items.length?cursor+limit:null
    };
  }
  return Object.freeze({list});
}
