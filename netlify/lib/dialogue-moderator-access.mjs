// Diploval V0.3 — autorisations professionnelles par dossier.
// Contrôle serveur UNIQUEMENT. Ce module ne sait ni créer un compte ni
// valider des mots de passe : verifySession est un fournisseur indépendant
// de confiance qui vérifie réellement la session et son expiration/révocation.
// loadGrants vient d'un registre privé, non de l'utilisateur ou du navigateur.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const VALID_ROLES=new Set(['observer','reviewer','supervisor']);
const PERMISSIONS={
 observer:new Set(['lookup_private','read_private']),
 reviewer:new Set(['lookup_private','read_private','moderate']),
 supervisor:new Set(['lookup_private','read_private','moderate','withdraw'])
};
export function createModeratorAccess({verifySession,loadGrants}={}){
 if(typeof verifySession!=='function'||typeof loadGrants!=='function')
  throw Error('Session professionnelle et registre privé des habilitations requis.');
 const issued=new WeakMap();
 const validSession=s=>s&&typeof s==='object'&&ID.test(s.staffId||'')
   &&typeof s.label==='string'&&s.label.trim().length>=3;
 const grantsFor=async staffId=>{
  const granted=await loadGrants(staffId);
  if(!granted||granted.active!==true||!Array.isArray(granted.roles)
     ||!Array.isArray(granted.consultationIds))return null;
  if(!granted.roles.length||granted.roles.some(x=>!VALID_ROLES.has(x)))return null;
  if(granted.consultationIds.length>100||granted.consultationIds.some(x=>!ID.test(x)))
   return null;
  return {
   roles:new Set(granted.roles),scopes:new Set(granted.consultationIds),
   allConsultations:granted.allConsultations===true&&granted.roles.includes('supervisor')
  };
 };
 const can=({roles,scopes,allConsultations},action,entry)=>{
  if(!Object.values(PERMISSIONS).some(v=>v.has(action)))return false;
  if(![...roles].some(role=>PERMISSIONS[role]?.has(action)))return false;
  if(action==='lookup_private')return true; // lecture par id suivie du contrôle du dossier
  if(!entry||!ID.test(entry.consultationId||''))return false;
  return allConsultations||scopes.has(entry.consultationId);
 };
 // Le résultat {principal,label} peut être passé au contrôleur B3. Le
 // principal seul ne contient aucune identité sérialisable utilisable.
 async function authenticate(request){
  const session=await verifySession(request);
  if(!validSession(session))return null;
  const grants=await grantsFor(session.staffId);
  if(!grants||![...grants.roles].some(r=>PERMISSIONS[r].has('lookup_private')))return null;
  const principal=Object.freeze({type:'verified-moderation'});
  issued.set(principal,{request,staffId:session.staffId});
  return {principal,label:session.label.trim()};
 }
 // Revalider la session et les habilitations à chaque opération : permet la
 // suspension immédiate de la personne ou la réduction de ses périmètres.
 async function authorize(principal,action,entry=null){
  if(!principal||typeof principal!=='object')return false;
  const proof=issued.get(principal);
  if(!proof)return false;
  const session=await verifySession(proof.request);
  if(!validSession(session)||session.staffId!==proof.staffId)return false;
  const grants=await grantsFor(proof.staffId);
  if(!grants)return false;
  return can(grants,action,entry);
 }
 return Object.freeze({authenticate,authorize});
}
