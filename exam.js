(()=>{'use strict';
const $=s=>document.querySelector(s),LS='radiodx.exam.v1';
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let Q=[],S=null,timer=null;
const load=()=>{try{const d=JSON.parse(localStorage.getItem(LS));return d&&d.v===1?d:{v:1,theme:'light',hist:[]}}catch(e){return{v:1,theme:'light',hist:[]}}};
const save=d=>{try{localStorage.setItem(LS,JSON.stringify(d))}catch(e){}};
let store=load();
const setTheme=()=>document.body.classList.toggle('dark',store.theme==='dark');
const L=k=>String.fromCharCode(65+k);
function validate(qs){const ids=new Set(),errs=[];qs.forEach(q=>{
 if(ids.has(q.id))errs.push(q.id+': duplicate id');ids.add(q.id);
 if(!q.text||!q.explanation)errs.push(q.id+': missing text/explanation');
 if(q.type==='numeric'){if(typeof q.answer!=='number')errs.push(q.id+': bad numeric answer')}
 else{if(!q.options||q.options.length<2)errs.push(q.id+': options');
  const a=[].concat(q.answer);if(!a.length||a.some(i=>!(i>=0&&i<(q.options||[]).length)))errs.push(q.id+': invalid answer ref');
  if(q.type==='single'&&a.length!==1)errs.push(q.id+': single needs exactly one answer')}
 if(!['basic','intermediate','advanced','expert'].includes(q.difficulty))errs.push(q.id+': difficulty')});return errs}
// single/numeric exact match; multiple = all-or-nothing (documented)
const attempted=r=>r!=null&&!(Array.isArray(r)&&!r.length)&&!Number.isNaN(r);
function grade(q,r){if(!attempted(r))return 0;const m=q.marks??1,n=S.neg;let ok;
 if(q.type==='numeric')ok=Math.abs(r-q.answer)<=(q.tolerance??0);
 else if(q.type==='multiple')ok=[...r].sort().join()===[].concat(q.answer).sort().join();
 else ok=r===q.answer;return ok?m:-n}
function init(){setTheme();
 const topics=[...new Set(Q.map(q=>q.topic))];
 $('#topics').innerHTML='<details open><summary>Radiology Physics Question Bank</summary>'+topics.map(t=>`<label><input type="checkbox" class="tp" value="${esc(t)}" checked> ${esc(t)}</label><br>`).join('')+'</details>';
 $('#setup').innerHTML=`<h1>Custom Test Builder</h1><p>${Q.length} questions available.</p>
 <label>Mode <select id="mode"><option value="practice">Practice</option><option value="mock">Mock exam</option></select></label>
 <label>Questions <select id="cnt"><option>10</option><option>20</option><option>50</option><option>100</option><option value="0">All</option></select></label>
 <label>Difficulty <select id="dif"><option value="">Any</option><option>basic</option><option>intermediate</option><option>advanced</option><option>expert</option></select></label>
 <label>Minutes (0 = untimed) <input id="min" type="number" min="0" value="0" style="width:5em"></label>
 <label>Negative mark <select id="neg"><option value="0">0</option><option value="0.25">0.25</option><option value="0.3333">1/3</option></select></label>
 <label><input type="checkbox" id="rnd" checked> Randomise</label><p id="warn" role="status"></p><button id="start" class="pri">Start test</button>`;
 $('#start').onclick=start}
function start(){const tp=[...document.querySelectorAll('.tp:checked')].map(e=>e.value),d=$('#dif').value;
 let pool=Q.filter(q=>tp.includes(q.topic)&&(!d||q.difficulty===d));
 if($('#rnd').checked)pool=pool.map(q=>[Math.random(),q]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
 const want=+$('#cnt').value||pool.length;
 if(!pool.length){$('#warn').textContent='No questions match these filters.';return}
 if(pool.length<want)$('#warn').textContent=`Only ${pool.length} matching questions available (requested ${want}); using all of them.`;
 const qs=pool.slice(0,want);
 S={qs,ans:{},mk:new Set(),i:0,mode:$('#mode').value,neg:+$('#neg').value,total:qs.reduce((a,q)=>a+(q.marks??1),0),limit:(+$('#min').value||0)*60,t0:Date.now(),done:false,chk:{}};
 begin()}
function begin(){$('#setup').hidden=true;$('#result').hidden=true;$('#exam').hidden=false;$('#status').textContent=S.mode==='mock'?'Mock in progress':'Practice';
 clearInterval(timer);if(S.limit)timer=setInterval(tick,1000);tick();render()}
const left=()=>S.limit?Math.max(0,S.limit-Math.floor((Date.now()-S.t0)/1000)):null;
function tick(){const l=left();$('#pTime').textContent='Time: '+(l==null?'untimed':Math.floor(l/60)+':'+String(l%60).padStart(2,'0'));if(l===0&&!S.done)submit()}
const isA=i=>attempted(S.ans[S.qs[i].id]);
const stClass=i=>(isA(i)?' ans':'')+(S.mk.has(i)?' mk':'')+(i===S.i?' cur':'');
const stText=i=>[i===S.i?'current':'',isA(i)?'answered':'unanswered',S.mk.has(i)?'marked for review':''].filter(Boolean).join(', ');
const navGrid=()=>S.qs.map((q,i)=>`<button class="${stClass(i)}" data-go="${i}" aria-label="Question ${i+1}: ${stText(i)}">${i+1}</button>`).join('');
function side(){const n=S.qs.length,a=S.qs.filter((q,i)=>isA(i)).length;
 $('#pAns').textContent=`${a} / ${n} answered`;$('#pUn').textContent='Unanswered: '+(n-a);$('#pMk').textContent='Marked: '+S.mk.size;
 $('#ring').setAttribute('stroke-dasharray',`${Math.round(a/n*100)} 100`)}
function render(){const q=S.qs[S.i],r=S.ans[q.id],show=S.mode==='practice'&&S.chk[q.id],A=[].concat(q.answer);let body;
 if(q.type==='numeric')body=`<label>Answer ${q.unit?'('+esc(q.unit)+')':''} <input id="num" type="number" step="any" value="${r??''}"></label>${S.mode==='practice'?' <button id="chk">Check</button>':''}`;
 else body=q.options.map((o,k)=>{const sel=q.type==='multiple'?(r||[]).includes(k):r===k,c=show?(A.includes(k)?' ok':(sel?' bad':'')):(sel?' sel':'');
  return`<button class="opt${c}" data-o="${k}" aria-pressed="${sel}">${L(k)}. ${esc(o)}${show?(A.includes(k)?' ✔ correct':(sel?' ✘ your answer':'')):''}</button>`}).join('')+
  (q.type==='multiple'?`<p><small>Select all that apply.</small></p>${S.mode==='practice'?'<button id="chk">Check</button>':''}`:'');
 const ex=show?`<div class="exp"><b>Explanation:</b> ${esc(q.explanation)}${q.formula?`<br><b>Formula:</b> ${esc(q.formula)}`:''}</div>`:'';
 $('#crumb').textContent=`Exam › Question ${S.i+1}`;
 $('#exam').innerHTML=`<h2>${S.mode==='mock'?'Mock Examination':'Practice'} — ${S.qs.length} questions</h2><div class="grid" role="group" aria-label="Question navigation">${navGrid()}</div>
 <p><small>Legend: filled = answered · thick dashed border = marked for review · dark outline = current · plain = unanswered</small></p>
 <h3 id="qh" tabindex="-1">Q${S.i+1}. ${esc(q.text)}</h3>${body}${ex}<p>
 <button id="pv" ${S.i?'':'disabled'}>Previous</button><button id="nx" ${S.i<S.qs.length-1?'':'disabled'}>Next</button>
 <button id="mkb">${S.mk.has(S.i)?'Unmark review':'Mark for review'}</button><button id="clr">Clear answer</button>
 <button id="qs">Quiz Summary</button><button id="sub" class="pri">Submit Test</button></p>`;
 side();bind()}
function bind(){const q=S.qs[S.i],go=i=>{S.i=i;render();$('#qh').focus()};
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(+b.dataset.go));
 document.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{const k=+b.dataset.o;
  if(q.type==='multiple'){const s=new Set(S.ans[q.id]||[]);s.has(k)?s.delete(k):s.add(k);S.ans[q.id]=[...s];S.chk[q.id]=0}else{S.ans[q.id]=k;S.chk[q.id]=1}
  render()});
 const n=$('#num');if(n)n.oninput=()=>{S.ans[q.id]=n.value===''?null:+n.value;side()};
 const c=$('#chk');if(c)c.onclick=()=>{S.chk[q.id]=1;render()};
 $('#pv').onclick=()=>go(S.i-1);$('#nx').onclick=()=>go(S.i+1);
 $('#mkb').onclick=()=>{S.mk.has(S.i)?S.mk.delete(S.i):S.mk.add(S.i);render()};
 $('#clr').onclick=()=>{delete S.ans[q.id];S.chk[q.id]=0;render()};
 $('#qs').onclick=openSum;$('#sub').onclick=openSum}
function openSum(){const n=S.qs.length,a=S.qs.filter((q,i)=>isA(i)).length,l=left();
 $('#sum').innerHTML=`<p>Total ${n} · Answered ${a} · Unanswered ${n-a} · Marked ${S.mk.size} · Time left ${l==null?'untimed':Math.ceil(l/60)+' min'}</p>`+(n-a?`<p role="alert"><b>Warning:</b> ${n-a} unanswered question(s).</p>`:'');
 $('#sumNav').innerHTML=navGrid();$('#sumNav').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{$('#dlg').close();S.i=+b.dataset.go;render()});
 $('#dlg').showModal()}
$('#back').onclick=()=>$('#dlg').close();
$('#final').onclick=()=>{$('#dlg').close();submit()};
function submit(){if(!S||S.done)return;S.done=true;clearInterval(timer);if($('#dlg').open)$('#dlg').close();
 const used=Math.min(Math.floor((Date.now()-S.t0)/1000),S.limit||1e9);let c=0,w=0,u=0,marks=0;const tp={},df={};
 S.qs.forEach(q=>{const r=S.ans[q.id],g=grade(q,r),a=attempted(r);marks+=g;a?(g>0?c++:w++):u++;
  for(const[o,k]of[[tp,q.topic],[df,q.difficulty]]){o[k]=o[k]||{c:0,n:0};o[k].n++;if(g>0)o[k].c++}});
 const pct=S.total?Math.max(0,marks/S.total*100):0,acc=(c+w)?(c/(c+w)*100).toFixed(1)+'%':'N/A';
 const res={date:new Date().toISOString(),marks:+marks.toFixed(2),total:S.total,pct:+pct.toFixed(1),c,w,u,used};
 const prev=store.hist.length?store.hist[store.hist.length-1]:null;
 store.hist.push(res);store.hist=store.hist.slice(-50);save(store);
 const bars=o=>Object.entries(o).map(([k,v])=>`<p>${esc(k)}: ${v.c}/${v.n}<span class="bar"><i style="width:${v.c/v.n*100}%"></i></span></p>`).join('');
 $('#exam').hidden=true;$('#result').hidden=false;$('#status').textContent='Submitted';
 $('#result').innerHTML=`<h1>Results</h1><h2>${res.marks} / ${S.total} (${res.pct}%)</h2>
 <p>Correct ${c} · Incorrect ${w} · Unanswered ${u} · Accuracy (of attempted) ${acc} · Time ${Math.floor(used/60)}m ${used%60}s · Avg ${(used/S.qs.length).toFixed(1)}s/question</p>
 ${prev?`<p>Previous saved attempt: ${prev.pct}%</p>`:''}<h3>Topics</h3>${bars(tp)}<h3>Difficulty</h3>${bars(df)}
 <p><button id="rt" class="pri">Retry</button><button id="nt">New test</button><button id="pr">Print</button><button id="ej">Export JSON</button></p><h3>Review</h3>`+
 S.qs.map((q,i)=>{const r=S.ans[q.id],ca=q.type==='numeric'?q.answer:[].concat(q.answer).map(L).join(', '),
  yr=!attempted(r)?'—':q.type==='numeric'?r:[].concat(r).map(L).join(', ');
  return`<div class="exp"><b>Q${i+1}.</b> ${esc(q.text)}<br>Your answer: ${yr} · Correct: ${ca}<br>${esc(q.explanation)}</div>`}).join('');
 $('#rt').onclick=()=>{S={...S,ans:{},mk:new Set(),i:0,chk:{},t0:Date.now(),done:false};begin()};
 $('#nt').onclick=()=>{$('#result').hidden=true;$('#setup').hidden=false;$('#status').textContent='Idle'};
 $('#pr').onclick=()=>print();
 $('#ej').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(res,null,2)],{type:'application/json'}));a.download='radiodx-result.json';a.click()}}
$('#theme').onclick=()=>{store.theme=store.theme==='dark'?'light':'dark';save(store);setTheme()};
$('#full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
fetch('data/questions.json').then(r=>r.json()).then(d=>{Q=d.questions.filter(q=>q.status!=='draft');const e=validate(Q);
 if(e.length){$('#setup').innerHTML='<h1>Question bank errors</h1><ul>'+e.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';return}init()})
 .catch(()=>{$('#setup').textContent='Could not load data/questions.json. Serve over HTTP (GitHub Pages or python3 -m http.server), not file://.'});
})();
