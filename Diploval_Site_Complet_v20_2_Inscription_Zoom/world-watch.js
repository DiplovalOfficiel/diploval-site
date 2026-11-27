'use strict';
const q=document.querySelector('#world-query'),r=document.querySelector('#world-region'),reset=document.querySelector('#world-reset'),status=document.querySelector('#world-result'),entries=Array.from(document.querySelectorAll('[data-world-entry]'));
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function filter(){let count=0;for(const e of entries){const show=(!r.value||e.dataset.region===r.value)&&normalize(e.textContent).includes(normalize(q.value));e.hidden=!show;if(show)count++;}status.textContent=count+' dossier'+(count===1?'':'s')+' affiché'+(count===1?'':'s');}
if(q&&r&&reset&&status){q.addEventListener('input',filter);r.addEventListener('change',filter);reset.addEventListener('click',()=>{q.value='';r.value='';filter();q.focus()});filter();}
