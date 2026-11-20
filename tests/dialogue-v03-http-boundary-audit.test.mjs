import test from 'node:test';
import assert from 'node:assert/strict';
import {createDialogueInternalHandler} from '../netlify/lib/dialogue-service-v03.mjs';

// Inert HTTP harness. All identities, mailboxes and storage are fictitious.
// The V0.3 production endpoint remains absent and disabled.
const origin='https://example.invalid';
const ref='CE-2026-ABCDEF123456';
const id='entry_123';
function harness({allowRate=true,moderator=false,session=false}={}){
 const actions={links:[],requested:0,reads:0,moderatorChecks:0,rateCalls:0};
 const authorPrincipal=Object.freeze({fake:'author'});
 const handler=createDialogueInternalHandler({
  enabled:true,origin,
  authorAccess:{
   requestLink:async x=>{actions.links.push(x);return {accepted:true};},
   redeemLink:async()=>null,
   authenticate:async token=>session&&token==='fake-author-session'?authorPrincipal:null,
   ownEntryId:async p=>p===authorPrincipal?id:null,
   revokeSession:async()=>true
  },
  authorRepository:{
   readPrivate:async()=>{actions.reads++;return {
    id,reference:ref,consultationId:'consultation_123',kind:'contribution',
    visibility:'private',mutation:0,publishedVersion:null,
    versions:[{number:1,text:'Contribution fictive et privée',status:'pending',submittedAt:'2026-11-19T16:00:00Z'}]
   };},
   mutatePrivate:async()=>{throw Error('Mutation non configurée pour le test.');}
  },
  moderatorRepository:{
   readPrivate:async()=>{actions.reads++;return null;},
   mutatePrivate:async()=>{throw Error('Mutation non configurée pour le test.');}
  },
  publicRepository:{readPublicReference:async()=>null},
  authenticateModerator:async()=>{
   actions.moderatorChecks++;
   return moderator?{label:'Agent fictif',principal:{fake:'moderator'}}:null;
  },
  resolveEntryIdByReference:async reference=>{actions.requested++;return reference===ref?id:null;},
  rateLimit:async()=>{actions.rateCalls++;return allowRate;}
 });
 function request(path,{method='GET',body,requestOrigin=origin,cookie}={}){
  const headers={};
  if(method==='POST'){
   headers.origin=requestOrigin;
   headers['x-diploval-v03-request']='1';
   headers['content-type']='application/json';
  }
  if(cookie)headers.cookie=cookie;
  return new Request(origin+path,{method,headers,...(method==='POST'?{body:JSON.stringify(body??{})}:{})});
 }
 return {handler,request,actions};
}
test('HTTP: disabled by default returns 503',async()=>{
 const r=await createDialogueInternalHandler()(new Request(origin+'/public/entry'));
 assert.equal(r.status,503);
 assert.equal((await r.json()).error,'Service V0.3 non activé.');
});
test('HTTP: active handler refuses missing required server-side adapters',()=>{
 assert.throws(()=>createDialogueInternalHandler({enabled:true,origin}),/Authentification/);
});
test('HTTP: public route does not reveal missing private record',async()=>{
 const x=harness();
 const r=await x.handler(x.request('/public/entry?reference='+ref));
 assert.equal(r.status,404);
 assert.equal(r.headers.get('cache-control'),'private, no-store, max-age=0');
 assert.equal(r.headers.get('referrer-policy'),'no-referrer');
});
test('HTTP: request origin of a foreign URL is denied before any rate-limit lookup',async()=>{
 const x=harness();
 const r=await x.handler(new Request('https://elsewhere.invalid/public/entry?reference='+ref));
 assert.equal(r.status,403);assert.equal(x.actions.rateCalls,0);
});
test('HTTP: POST with untrusted Origin cannot request a login link',async()=>{
 const x=harness();
 const r=await x.handler(x.request('/author/request-link',{method:'POST',requestOrigin:'https://elsewhere.invalid',
  body:{reference:ref,email:'fiction@example.invalid'}}));
 assert.equal(r.status,403);assert.equal(x.actions.requested,0);assert.equal(x.actions.links.length,0);
});
test('HTTP: POST without same-origin custom request header is forbidden',async()=>{
 const x=harness();
 const r=await x.handler(new Request(origin+'/author/request-link',{method:'POST',
  headers:{origin,'content-type':'application/json'},
  body:JSON.stringify({reference:ref,email:'fiction@example.invalid'})}));
 assert.equal(r.status,403);assert.equal(x.actions.links.length,0);
});
test('HTTP: distributed rate-limiter denial blocks private link request',async()=>{
 const x=harness({allowRate:false});
 const r=await x.handler(x.request('/author/request-link',{method:'POST',
  body:{reference:ref,email:'fiction@example.invalid'}}));
 assert.equal(r.status,429);assert.equal(x.actions.links.length,0);
});
test('HTTP: unknown reference returns generic accepted reply, not existence evidence',async()=>{
 const x=harness();
 const r=await x.handler(x.request('/author/request-link',{method:'POST',
  body:{reference:'CE-2026-FFFFFFFFFFFF',email:'fiction@example.invalid'}}));
 assert.equal(r.status,202);assert.deepEqual(await r.json(),{accepted:true});
 assert.equal(x.actions.links.length,0);
});
test('HTTP: valid reference produces generic reply, no token in response',async()=>{
 const x=harness();
 const r=await x.handler(x.request('/author/request-link',{method:'POST',
  body:{reference:ref,email:'fiction@example.invalid'}}));
 assert.equal(r.status,202);assert.deepEqual(await r.json(),{accepted:true});
 assert.equal(x.actions.links.length,1);
});
test('HTTP: no author session means no private entry',async()=>{
 const x=harness();
 const r=await x.handler(x.request('/author/me'));
 assert.equal(r.status,401);assert.equal(x.actions.reads,0);
});
test('HTTP: session cookie uses server-verified personal entry',async()=>{
 const x=harness({session:true});
 const r=await x.handler(x.request('/author/me',{cookie:'__Host-diploval-v03-author=fake-author-session'}));
 assert.equal(r.status,200);
 const body=await r.json();
 assert.equal(body.entry.reference,ref);
 assert.equal('author' in body.entry,false);assert.equal('audit' in body.entry,false);
});
test('HTTP: no institutional authentication denies moderator entry',async()=>{
 const x=harness();
 const r=await x.handler(x.request('/moderation/entry?id='+id));
 assert.equal(r.status,401);
 assert.equal(x.actions.reads,0);
});
test('HTTP: caller-supplied role header cannot impersonate a moderator',async()=>{
 const x=harness();
 const r=await x.handler(new Request(origin+'/moderation/entry?id='+id,{
  headers:{role:'administrator','x-role':'moderator'}}));
 assert.equal(r.status,401);assert.equal(x.actions.reads,0);
});
test('HTTP: unauthorized path yields 404 without revealing private state',async()=>{
 const x=harness();
 const r=await x.handler(x.request('/internal/admin'));
 assert.equal(r.status,404);assert.equal(x.actions.reads,0);
});
test('HTTP: malformed POST body is rejected without generating link',async()=>{
 const x=harness();
 const r=await x.handler(new Request(origin+'/author/request-link',{method:'POST',
  headers:{origin,'content-type':'application/json','x-diploval-v03-request':'1'},
  body:'not-json'}));
 assert.equal(r.status,400);assert.equal(x.actions.links.length,0);
});
