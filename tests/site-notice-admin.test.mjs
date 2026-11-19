import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script=fs.readFileSync(
 new URL('../Diploval_Site_Complet_v20_2_Inscription_Zoom/content-admin.js',import.meta.url),'utf8'
);
const parts=new Intl.DateTimeFormat('en-CA',{
 timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'
}).formatToParts(new Date()).reduce((a,p)=>{if(p.type!=='literal')a[p.type]=p.value;return a},{});
const base=new Date(parts.year+'-'+parts.month+'-'+parts.day+'T12:00:00Z');
const key=offset=>new Date(base.getTime()+offset*86400000).toISOString().slice(0,10);
const fr=offset=>{const [y,m,d]=key(offset).split('-');return d+'/'+m+'/'+y;};
const config=(data={})=>({
 enabled:true,label:'Point d’information',text:'Message de suivi fictif.',
 start_date:'',end_date:'',link:'',link_label:'Ouvrir le suivi',
 ...data
});

async function run({notice=config(),points=[]}={}){
 const elements={
  label:{textContent:''},
  text:{textContent:''},
  link:{hidden:true,href:'',textContent:'',removeAttribute(name){if(name==='href')this.href='';}}
 };
 const noticeHost={
  hidden:true,
  querySelector:s=>({
   '#site-notice-label':elements.label,
   '#site-notice-text':elements.text,
   '#site-notice-link':elements.link
  }[s]||null)
 };
 const pointSection={hidden:true},pointList={innerHTML:''};
 const document={
  querySelector:s=>({
   '#site-notice':noticeHost,
   '#points-information':pointSection,
   '#admin-points-home':pointList
  }[s]||null),
  querySelectorAll:()=>[],
  addEventListener:()=>{}
 };
 const fetch=async path=>({
  ok:true,json:async()=>path.includes('site-settings')?{temporary_notice:notice}:
   path.includes('points-information')?{points}:{}
 });
 const context={document,fetch,URL,Intl,Date,console,window:{},location:{href:'https://diploval.fr/',origin:'https://diploval.fr',pathname:'/'}};
 vm.runInNewContext(script,context,{timeout:5000});
 await new Promise(resolve=>setImmediate(resolve)); // Attend Promise.all de init().
 return {host:noticeHost,elements,pointSection,pointList};
}

test('message actif sans dates : bandeau visible, texte et libellé exacts',async()=>{
 const r=await run();
 assert.equal(r.host.hidden,false);
 assert.equal(r.elements.label.textContent,'Point d’information :');
 assert.equal(r.elements.text.textContent,'Message de suivi fictif.');
 assert.equal(r.elements.link.hidden,true);
});
test('formats Decap français : début et fin inclus',async()=>{
 const r=await run({notice:config({start_date:fr(-1),end_date:fr(0)})});
 assert.equal(r.host.hidden,false);
});
test('dates ISO et timestamp : même visibilité',async()=>{
 const r=await run({notice:config({start_date:key(-1)+'T00:00:00Z',end_date:key(1)})});
 assert.equal(r.host.hidden,false);
});
test('début futur : ne pas publier le bandeau',async()=>{
 assert.equal((await run({notice:config({start_date:fr(1)})})).host.hidden,true);
});
test('date de fin passée : ne pas publier le bandeau',async()=>{
 assert.equal((await run({notice:config({end_date:fr(-1)})})).host.hidden,true);
});
test('période inversée : rester masqué',async()=>{
 assert.equal((await run({notice:config({start_date:fr(2),end_date:fr(-2)})})).host.hidden,true);
});
test('date civile invalide : rester masqué',async()=>{
 assert.equal((await run({notice:config({start_date:'31/02/2026'})})).host.hidden,true);
});
test('activation sans texte : bandeau masqué',async()=>{
 assert.equal((await run({notice:config({text:'  '})})).host.hidden,true);
 assert.equal((await run({notice:config({enabled:false})})).host.hidden,true);
});
test('lien interne sûr : rendu et texte de lien',async()=>{
 const r=await run({notice:config({link:'/points-information',link_label:'Lire le suivi'})});
 assert.equal(r.host.hidden,false);
 assert.equal(r.elements.link.hidden,false);
 assert.equal(r.elements.link.href,'/points-information');
 assert.equal(r.elements.link.textContent,'Lire le suivi →');
});
test('lien externe HTTPS valide : rendu autorisé',async()=>{
 const r=await run({notice:config({link:'https://example.org/info'})});
 assert.equal(r.elements.link.hidden,false);
 assert.equal(r.elements.link.href,'https://example.org/info');
});
test('liens non sûrs : aucune activation du lien',async()=>{
 for(const link of ['javascript:alert(1)','//example.org/evil','http://example.org/info']){
  const r=await run({notice:config({link})});
  assert.equal(r.host.hidden,false);
  assert.equal(r.elements.link.hidden,true,link);
  assert.equal(r.elements.link.href,'',link);
 }
});
test('un Point d’information visible apparaît sur l’accueil quand il est actif',async()=>{
 const r=await run({points:[{
  visible:true,show_home:true,status:'suivi',title:'Suivi de démonstration',
  summary:'Point de situation factuel.',slug:'suivi-test',level:'3',updates:[]
 }]});
 assert.equal(r.pointSection.hidden,false);
 assert.match(r.pointList.innerHTML,/Suivi de démonstration/);
 assert.match(r.pointList.innerHTML,/Niveau 3/);
 assert.match(r.pointList.innerHTML,/points-information\/suivi-test\//);
});
test('une fiche non visible, close ou hors accueil ne déclenche pas de carte',async()=>{
 const r=await run({points:[
  {visible:false,status:'suivi',title:'Privé'},
  {visible:true,status:'clos',title:'Clos'},
  {visible:true,show_home:false,status:'suivi',title:'Non mis en avant'}
 ]});
 assert.equal(r.pointSection.hidden,true);
 assert.equal(r.pointList.innerHTML,'');
});
