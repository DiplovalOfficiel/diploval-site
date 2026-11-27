'use strict';
const q=document.querySelector('#world-query'),r=document.querySelector('#world-region'),reset=document.querySelector('#world-reset'),status=document.querySelector('#world-result'),entries=Array.from(document.querySelectorAll('[data-world-entry]')),map=document.querySelector('#ww-map'),pins=Array.from(document.querySelectorAll('[data-world-pin]'));
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const byId=new Map(pins.map(p=>[p.dataset.worldPin,p]));
function fitRegion(){
 if(!map)return;
 const chosen=r.value?entries.filter(e=>e.dataset.region===r.value).map(e=>byId.get(e.dataset.worldEntry)).filter(Boolean):[];
 let view=[0,0,720,360];
 if(chosen.length){
  const xs=chosen.map(p=>Number(p.dataset.x)),ys=chosen.map(p=>Number(p.dataset.y));
  const loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
  const w=Math.min(720,Math.max(100,hiX-loX+40,(hiY-loY+40)*2)),h=w/2;
  view=[Math.max(0,Math.min(720-w,(loX+hiX-w)/2)),Math.max(0,Math.min(360-h,(loY+hiY-h)/2)),w,h];
 }
 map.setAttribute('viewBox',view.join(' '));
 for(const pin of pins){const dot=pin.querySelector('circle');if(dot)dot.setAttribute('r',String(Math.max(1.7,4.3*view[2]/720)));}
}
function filter(){
 let count=0;for(const e of entries){const show=(!r.value||e.dataset.region===r.value)&&normalize(e.textContent).includes(normalize(q.value));e.hidden=!show;const pin=byId.get(e.dataset.worldEntry);if(pin){pin.classList.toggle('ww-pin-hidden',!show);pin.setAttribute('aria-hidden',String(!show));pin.setAttribute('tabindex',show?'0':'-1');}if(show)count++;}
 status.textContent=count+' dossier'+(count===1?'':'s')+' affiché'+(count===1?'':'s');
}
if(q&&r&&reset&&status){
 q.addEventListener('input',filter);
 r.addEventListener('change',()=>{filter();fitRegion();});
 reset.addEventListener('click',()=>{q.value='';r.value='';filter();fitRegion();q.focus()});
 for(const pin of pins)pin.addEventListener('click',()=>{const target=document.getElementById('ww-'+pin.dataset.worldPin);if(target&&!target.hidden)target.focus({preventScroll:true});});
 filter();fitRegion();
}
