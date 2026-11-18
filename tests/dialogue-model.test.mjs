import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createReference, createEntry, createReply, proposeRevision, reviewRevision,
 withdrawPublication, publicView, publicList, createReport, reviewReport
} from '../netlify/lib/dialogue-model.mjs';

const stamp='2026-11-18T20:30:00.000Z';
const ref='CE-2026-112233445566';
const basic={
 consultationId:'engagements-electoraux',kind:'contribution',
 text:'Une justification publique et documentée devrait rester compréhensible.',
 processingAgreement:true,publicationAgreement:true,
 displayMode:'pseudonym',publicLabel:'Personne participante',
 email:'citoyen@example.test'
};
const make=(overrides={},opts={})=>createEntry({...basic,...overrides},{
 at:stamp,id:'dossier-test-001',reference:ref,...opts
});
const approve=(record,other={})=>reviewRevision(record,{decision:'approve',actor:'Equipe de moderation',expectedMutation:record.mutation,at:stamp,...other});

test('référence publique aléatoire : distincte de la clé d’accès',()=>{
 const result=createReference({year:2026,prefix:'CE',bytes:Buffer.from('a0b1c2d3e4f5','hex')});
 assert.equal(result,'CE-2026-A0B1C2D3E4F5');
 assert.throws(()=>createReference({bytes:Buffer.from('ff','hex')}),/Aléa insuffisant/);
});

test('un dépôt est privé par défaut et contient uniquement une version en attente',()=>{
 const record=make();
 assert.equal(record.visibility,'private');
 assert.equal(record.versions[0].status,'pending');
 assert.equal(record.publishedVersion,null);
 assert.equal(publicView(record),null);
});

test('accord de traitement explicite et choix de diffusion explicite obligatoires',()=>{
 assert.throws(()=>make({processingAgreement:false}),/Accord de traitement/);
 assert.throws(()=>make({publicationAgreement:undefined}),/Choix de publication/);
});

test('sans autorisation de publication, la modération ne peut pas publier',()=>{
 const record=make({publicationAgreement:false});
 assert.throws(()=>approve(record),/Aucune autorisation/);
 assert.equal(publicView(record),null);
});

test('un nom public est obligatoire uniquement quand demandé ; par défaut sans nom affiché',()=>{
 const record=make({displayMode:'without_name'});
 assert.equal(approve(record).author.publicLabel,null);
 assert.equal(publicView(approve(record)).publicAuthor,'Participant sans nom affiché');
 assert.throws(()=>make({displayMode:'pseudonym',publicLabel:''}),/Nom ou pseudonyme/);
});

test('après validation humaine, seule la version autorisée devient publique',()=>{
 const record=make();
 const accepted=approve(record);
 const page=publicView(accepted);
 assert.deepEqual(Object.keys(page).sort(),[
 'consultationId','kind','publicAuthor','publishedAt','reference','text','version'
 ]);
 assert.equal(page.version,1);
 assert.equal(page.text,basic.text);
 assert(!JSON.stringify(page).includes('citoyen@example.test'));
 assert(!JSON.stringify(page).includes('Equipe de moderation'));
 assert(!JSON.stringify(page).includes('processingAt'));
 assert(!JSON.stringify(page).includes('audit'));
});

test('une réponse est attachée à la version exacte de l’argument',()=>{
 const published=approve(make());
 const reply=createReply({
 consultationId:basic.consultationId,
 text:'Une objection documentée qui répond à la version actuellement publiée.',
 processingAgreement:true,publicationAgreement:true,
 displayMode:'without_name'
 },published,{at:stamp,id:'reponse-test-002',reference:'CE-2026-112233445577'});
 assert.equal(reply.kind,'reply');
 assert.deepEqual(reply.parent,{reference:published.reference,version:1});
 assert.equal(publicView(reply),null);
 const publishedReply=approve(reply);
 assert.deepEqual(publicView(publishedReply).inReplyTo,{reference:ref,version:1});
});

test('une réponse ne peut pas viser un brouillon ou un autre dossier',()=>{
 const parent=make();
 const info={consultationId:basic.consultationId,text:'Une réponse assez longue.',processingAgreement:true,publicationAgreement:true};
 assert.throws(()=>createReply(info,parent),/déjà publié/);
 assert.throws(()=>createReply({...info,consultationId:'autre-consultation'},approve(parent)),/même consultation/);
});

test('un seul fil de réponses : pas d’imbrication infinie',()=>{
 const parent=approve(make());
 const reply=approve(createReply({
 consultationId:basic.consultationId,text:'Texte en réponse, pour cet argument.',
 processingAgreement:true,publicationAgreement:true
 },parent,{id:'reponse-test-003',reference:'CE-2026-112233445588',at:stamp}));
 assert.throws(()=>createReply({
 consultationId:basic.consultationId,text:'Réponse à une autre réponse.',
 processingAgreement:true,publicationAgreement:true
 },reply),/imbriqués/);
});

test('une nouvelle version en attente ne remplace pas l’ancienne version publique',()=>{
 const old=approve(make());
 const next=proposeRevision(old,{text:'Mon opinion évolue : mieux expliquer les contraintes et les limites des décisions.',expectedMutation:old.mutation,at:stamp});
 assert.equal(next.versions.length,2);
 assert.equal(next.versions[0].status,'approved');
 assert.equal(next.versions[1].status,'pending');
 assert.equal(next.publishedVersion,1);
 assert.equal(publicView(next).text,basic.text);
 assert.equal(old.versions.length,1);
});

test('après validation de la nouvelle version, l’historique interne reste',()=>{
 const old=approve(make());
 const revision=proposeRevision(old,{text:'Une formulation nouvelle : conserver une explication et ses sources.',expectedMutation:old.mutation,at:stamp});
 const accepted=approve(revision);
 assert.equal(accepted.versions.length,2);
 assert.equal(accepted.publishedVersion,2);
 assert.equal(publicView(accepted).version,2);
 assert.equal(accepted.versions[0].text,basic.text);
 assert.equal(publicView(accepted).text,accepted.versions[1].text);
 assert(!JSON.stringify(publicView(accepted)).includes(basic.text));
});

test('rejet d’une révision : l’ancienne version approuvée reste visible',()=>{
 const old=approve(make());
 const revision=proposeRevision(old,{text:'Nouvelle approche encore à préciser, pas assez documentée.',expectedMutation:old.mutation,at:stamp});
 const rejected=reviewRevision(revision,{decision:'reject',actor:'Moderation',reason:'Demander une source ou une précision.',expectedMutation:revision.mutation,at:stamp});
 assert.equal(rejected.versions[1].status,'rejected');
 assert.equal(publicView(rejected).version,1);
 assert(!JSON.stringify(publicView(rejected)).includes('Demander une source'));
});

test('une décision sans motif ne peut pas rejeter un message',()=>{
 assert.throws(()=>reviewRevision(make(),{decision:'reject',actor:'Moderation',reason:'',expectedMutation:0,at:stamp}),/Motif de refus/);
});

test('contrôle de concurrence : une révision obsolète est refusée',()=>{
 const old=approve(make());
 assert.throws(()=>proposeRevision(old,{text:'Une nouvelle version explicative détaillée.',expectedMutation:0,at:stamp}),/recharger/);
});

test('le retrait est immédiat dans la projection publique et ne peut être contourné',()=>{
 const visible=approve(make());
 const revision=proposeRevision(visible,{text:'Je complète mon argument avec de nouvelles données.',expectedMutation:visible.mutation,at:stamp});
 const withdrawn=withdrawPublication(revision,{actor:'Moderation',reason:'Demande de retrait reçue.',expectedMutation:revision.mutation,at:stamp});
 assert.equal(publicView(withdrawn),null);
 assert.equal(withdrawn.versions.length,2);
 assert.throws(()=>approve(withdrawn),/retiré/);
 assert.throws(()=>proposeRevision(withdrawn,{text:'Nouvelle formulation, pas validée.',expectedMutation:withdrawn.mutation,at:stamp}),/retirée/);
});

test('un signalement n’efface jamais automatiquement le contenu visé',()=>{
 const original=approve(make());
 const reported=createReport({target:original,reason:'other',reporterMessage:'Une référence semble erronée.',id:'signalement-test-001',at:stamp});
 assert.equal(reported.status,'pending');
 assert.equal(publicView(original).version,1);
 const decision=reviewReport(reported,{outcome:'hide',actor:'Moderation',reason:'Contrôle nécessaire.',at:stamp});
 assert.equal(decision.status,'reviewed');
 assert.equal(decision.decision.outcome,'hide');
 // Le retrait réel exige un autre acte explicite et audité.
 assert.equal(publicView(original).version,1);
 assert.throws(()=>createReport({target:make(),reason:'spam'}),/contenu public/);
});

test('la liste publique ne révèle ni rejet, ni brouillon, ni coordonnées',()=>{
 const published=approve(make());
 const hidden=make({text:'Une autre opinion privée, à ne pas exposer.'},{
 id:'dossier-test-004',reference:'CE-2026-AABBCCDDEEFF'
 });
 const result=publicList([published,hidden]);
 assert.equal(result.length,1);
 assert.equal(result[0].reference,ref);
 assert(!JSON.stringify(result).includes('citoyen@example.test'));
 assert(!JSON.stringify(result).includes('Une autre opinion privée'));
});

test('les données techniques et notes ne deviennent jamais publiques par ajout de champs',()=>{
 const entry=approve(make());
 entry.privateUnexpected={moderatorPassword:'NE_JAMAIS_AFFICHER',secret:'TOKEN_SECRET'};
 entry.author.privateContact='private@example.test';
 entry.audit.push({actor:'Moderation',note:'Une appréciation privée'});
 const data=JSON.stringify(publicView(entry));
 assert(!data.includes('NE_JAMAIS_AFFICHER'));
 assert(!data.includes('private@example.test'));
 assert(!data.includes('Une appréciation privée'));
});
