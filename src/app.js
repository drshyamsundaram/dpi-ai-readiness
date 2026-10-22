
(function(){
'use strict';
var C = window.APP_CONFIG || {};
var BL = C.baseline || {name:'India',short:'India',possessive:"India's"};
var BN = BL.short || BL.name;
var BR = BL.inSentence || BN; // e.g. 'the US' in running text
var SITE = C.site || {}, REFS = C.references || {preReads:[],annexures:[]};
var P = JSON.parse(JSON.stringify(C.pillars || []));
var N = 0; P.forEach(function(p){ p.items.forEach(function(it){ N++; it.n = N; }); });
var BANDS = (SITE.bands||[]).map(function(b){ return [b.min,b.max,b.name,b.text]; });
var KEY = SITE.storageKey || 'ai-readiness-assessment-v1';
var state = {profile:{},answers:{},evidence:{},pillar:0,showBase:false,group:[]};
function load(){ try{ var s = localStorage.getItem(KEY); if(s){ var o = JSON.parse(s); Object.assign(state,o); } }catch(e){} }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
var $ = function(s,r){ return (r||document).querySelector(s); };
var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function fmt(v){ return v==null||isNaN(v)?'–':v.toFixed(1); }
function toast(m){ var t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(function(){t.classList.remove('show');},2200); }
function band(v){ if(v==null) return null; for(var i=0;i<BANDS.length;i++){ if(v>=BANDS[i][0]&&v<BANDS[i][1]) return BANDS[i]; } return BANDS[3]; }

/* scoring */
function pillarScore(p, ans){
  var vals=[], dk=0, ev=0, answered=0;
  p.items.forEach(function(it){ var a = ans[it.n]; if(a==='DK'){dk++;answered++;} else if(a){ vals.push(a); answered++; } });
  var mean = vals.length? vals.reduce(function(s,v){return s+v;},0)/vals.length : null;
  return {mean: dk>=2? null : mean, raw: mean, dk:dk, n:vals.length, answered:answered, insufficient: dk>=2};
}
function scoreAll(ans, evid){
  var res = P.map(function(p){ var s = pillarScore(p, ans); s.p = p; return s; });
  var scored = res.filter(function(r){return r.mean!=null;});
  var overall = scored.length===P.length ? scored.reduce(function(s,r){return s+r.mean;},0)/P.length : (scored.length? scored.reduce(function(s,r){return s+r.mean;},0)/scored.length : null);
  var total=0, noev=0; Object.keys(ans).forEach(function(k){ if(ans[k]&&ans[k]!=='DK'){ total++; if(!evid||!String(evid[k]||'').trim()) noev++; } });
  return {pillars:res, overall:overall, complete: scored.length===P.length, answered:Object.keys(ans).filter(function(k){return ans[k];}).length, scoredItems:total, noEvidence:noev};
}
var baseOverall = typeof BL.overall==='number' ? BL.overall : P.reduce(function(s,p){return s+p.base;},0)/P.length;

/* radar */
function radar(series, opts){
  opts = opts||{}; var W=420,H=400,cx=W/2,cy=H/2+4,R=140,n=P.length;
  function pt(i,v){ var a = -Math.PI/2 + i*2*Math.PI/n; return [cx+Math.cos(a)*R*v/5, cy+Math.sin(a)*R*v/5]; }
  var g='';
  [1,2,3,4,5].forEach(function(l){ var d=P.map(function(_,i){ return pt(i,l).join(','); }).join(' '); g+='<polygon points="'+d+'" fill="none" stroke="var(--line)" stroke-width="1"/>'; });
  P.forEach(function(p,i){ var e=pt(i,5); g+='<line x1="'+cx+'" y1="'+cy+'" x2="'+e[0]+'" y2="'+e[1]+'" stroke="var(--line)"/>';
    var l=pt(i,5.9), anc = Math.abs(l[0]-cx)<8?'middle':(l[0]>cx?'start':'end');
    g+='<text x="'+l[0]+'" y="'+(l[1]+4)+'" text-anchor="'+anc+'" font-size="12" font-weight="650" fill="var(--text)">'+p.id+'</text>';
    g+='<text x="'+l[0]+'" y="'+(l[1]+18)+'" text-anchor="'+anc+'" font-size="10.5" fill="var(--text-3)">'+esc(shortName(p.name))+'</text>'; });
  [1,3,5].forEach(function(l){ g+='<text x="'+(cx+4)+'" y="'+(cy-R*l/5+3)+'" font-size="9.5" fill="var(--text-3)">'+l+'</text>'; });
  series.forEach(function(s){
    var pts = s.values.map(function(v,i){ return pt(i, v==null?0:v); });
    g+='<polygon points="'+pts.map(function(p){return p.join(',');}).join(' ')+'" fill="'+s.color+'" fill-opacity="'+(s.fill||0.12)+'" stroke="'+s.color+'" stroke-width="2" '+(s.dash?'stroke-dasharray="5 4"':'')+' stroke-linejoin="round"/>';
    pts.forEach(function(p,i){ if(s.values[i]!=null) g+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.5" fill="'+s.color+'"><title>'+P[i].id+' '+esc(P[i].name)+': '+fmt(s.values[i])+' ('+esc(s.label)+')</title></circle>'; });
  });
  return '<svg viewBox="-75 -10 '+(W+150)+' '+(H+20)+'" width="100%" role="img" aria-label="'+esc(opts.label||'Readiness radar')+'">'+g+'</svg>';
}
function shortName(n){ for(var i=0;i<P.length;i++){ if(P[i].name===n) return P[i].short||n; } return n; }

/* tabs */
function go(v){ $$('nav.tabs button').forEach(function(b){ b.setAttribute('aria-selected', b.dataset.view===v?'true':'false'); });
  $$('section.view').forEach(function(s){ s.classList.toggle('active', s.id==='view-'+v); });
  if(v==='results') renderResults(); if(v==='group') renderGroup(); if(v==='assess') renderPillar(); if(v==='references') renderRefs();
  window.scrollTo({top:0,behavior:'smooth'}); }
$$('nav.tabs button').forEach(function(b){ b.addEventListener('click',function(){ go(b.dataset.view); }); });
document.addEventListener('click',function(e){ var g=e.target.closest('[data-go]'); if(g){ go(g.dataset.go); } });

/* theme */
$('#themeBtn').addEventListener('click',function(){ var r=document.documentElement; var dark = r.dataset.theme? r.dataset.theme==='dark' : matchMedia('(prefers-color-scheme: dark)').matches; r.dataset.theme = dark?'light':'dark'; try{localStorage.setItem(KEY+'-theme', r.dataset.theme);}catch(e){} });
try{ var th=localStorage.getItem(KEY+'-theme'); if(th) document.documentElement.dataset.theme=th; }catch(e){}

/* intro */
function renderIntro(){
  $('#pillarsList').innerHTML = P.map(function(p){ return '<div><b>'+p.id+' · '+esc(p.name)+'</b><span>'+esc(p.tests)+'</span></div>'; }).join('');
  var sel=$('#pf-pillar'); P.forEach(function(p){ var o=document.createElement('option'); o.textContent=p.id+' '+p.name; sel.appendChild(o); });
  ['name','org','country','role','pillar','fam'].forEach(function(k){ var el=$('#pf-'+k); el.value = state.profile[k]||''; el.addEventListener('input',function(){ state.profile[k]=el.value; save(); }); });
  var c = Object.keys(state.answers).filter(function(k){return state.answers[k];}).length;
  if(c) $('#resumeNote').textContent = c+' of '+N+' answered so far. Your progress is saved in this browser.';
}

/* assess */
function counts(p){ return p.items.filter(function(it){ return state.answers[it.n]; }).length; }
function renderSide(){
  $('#sideNav').innerHTML = P.map(function(p,i){ var c=counts(p); return '<button class="pn" data-i="'+i+'" aria-current="'+(i===state.pillar)+'"><span class="num">'+p.id+'</span><span class="nm">'+esc(p.name)+'</span><span class="ct'+(c===5?' done':'')+'">'+(c===5?'✓':c+'/5')+'</span></button>'; }).join('') +
   '<button class="pn" data-res="1"><span class="num">→</span><span class="nm"><b>View results</b></span></button>';
  $$('#sideNav .pn').forEach(function(b){ b.addEventListener('click',function(){ if(b.dataset.res){ go('results'); return; } state.pillar=+b.dataset.i; save(); renderPillar(); window.scrollTo({top:0}); }); });
  var tot = Object.keys(state.answers).filter(function(k){return state.answers[k];}).length; $('#prog').style.width=(tot/N*100)+'%';
}
function renderPillar(){
  var p = P[state.pillar];
  var h = '<div class="phead"><div><div class="k">Pillar '+(state.pillar+1)+' of 8</div><h1 style="margin:2px 0 2px">'+p.id+' · '+esc(p.name)+'</h1><div class="muted">'+esc(p.tests)+'</div></div>'+
          '<div class="pblock" style="display:'+(state.showBase?'block':'none')+'"><span class="pillchip india">'+BN+' baseline '+fmt(p.base)+' (range '+fmt(p.lo)+'–'+fmt(p.hi)+')</span></div></div>';
  p.items.forEach(function(it){
    var a = state.answers[it.n]; var ev = state.evidence[it.n]||'';
    var on = function(l){ return a===l?' on':(a===l-1||a===l+1?' half':''); };
    h += '<div class="card item" data-n="'+it.n+'"><div class="qrow"><div class="qn">'+it.n+'</div><div class="q">'+esc(it.q)+'</div></div>'+
      '<div class="anchors"><div class="anchor'+on(1)+'"><b>1 · Absent</b>'+esc(it.a1)+'</div><div class="anchor'+on(3)+'"><b>3 · Established, fragmented</b>'+esc(it.a3)+'</div><div class="anchor'+on(5)+'"><b>5 · Leading</b>'+esc(it.a5)+'</div></div>'+
      '<div class="scale" role="group" aria-label="Score for item '+it.n+'">'+[1,2,3,4,5].map(function(v){ return '<button data-v="'+v+'" aria-pressed="'+(a===v)+'">'+v+'<span class="ib'+(it.base===v?' here':'')+'" title="'+BN+' baseline"></span></button>'; }).join('')+
      '<button class="dk" data-v="DK" aria-pressed="'+(a==='DK')+'">DK</button><span class="hint">'+(a==null?'Not answered':a==='DK'?'Don’t know: not scored':'Score '+a+(a===2||a===4?' (between anchors)':''))+'</span></div>'+
      '<div class="evid'+(a&&a!=='DK'&&!ev.trim()?' need':'')+'"><textarea rows="1" placeholder="Evidence: one fact, source or example" aria-label="Evidence for item '+it.n+'">'+esc(ev)+'</textarea><div class="warnline">Add evidence so this score can be checked.</div></div></div>';
  });
  h += '<div class="pager"><button class="btn" id="prevP" '+(state.pillar===0?'disabled':'')+'>← Previous</button>'+
       (state.pillar<7? '<button class="btn primary" id="nextP">Next: '+P[state.pillar+1].id+' '+esc(P[state.pillar+1].name)+' →</button>' : '<button class="btn primary" data-go="results">See results →</button>')+'</div>';
  var pane=$('#pillarPane'); pane.innerHTML=h;
  document.body.classList.toggle('showbase', state.showBase);
  $$('.item',pane).forEach(function(card){ var n=+card.dataset.n;
    $$('.scale button',card).forEach(function(b){ b.addEventListener('click',function(){ var v=b.dataset.v==='DK'?'DK':+b.dataset.v; state.answers[n] = state.answers[n]===v? null : v; save(); renderPillar(); renderSide(); }); });
    var ta=$('textarea',card); ta.addEventListener('input',function(){ state.evidence[n]=ta.value; save(); var a=state.answers[n]; $('.evid',card).classList.toggle('need', !!(a&&a!=='DK'&&!ta.value.trim())); });
  });
  var pv=$('#prevP'); if(pv) pv.addEventListener('click',function(){ state.pillar--; save(); renderPillar(); window.scrollTo({top:0}); });
  var nx=$('#nextP'); if(nx) nx.addEventListener('click',function(){ state.pillar++; save(); renderPillar(); window.scrollTo({top:0}); });
  renderSide();
}
$('#showBase').addEventListener('change',function(e){ state.showBase=e.target.checked; save(); renderPillar(); });

/* results */
function statusChip(r){
  if(r.insufficient) return '<span class="pillchip">Insufficient evidence</span>';
  if(r.mean==null) return '<span class="pillchip">Incomplete</span>';
  var g = r.mean - r.p.base;
  if(r.mean<2.5) return '<span class="pillchip bad">Foundational gap</span>';
  if(g<=-1) return '<span class="pillchip warn">Well behind '+BR+'</span>';
  if(g>0.5) return '<span class="pillchip good">Ahead of '+BR+'</span>';
  return '<span class="pillchip">In line</span>';
}
function renderResults(){
  var s = scoreAll(state.answers, state.evidence), pf=state.profile;
  $('#resTitle').textContent = (pf.country? pf.country+': ' : '')+'readiness profile';
  $('#resMeta').textContent = [pf.name,pf.org,pf.role].filter(Boolean).join(' · ') + (s.answered? (pf.name||pf.org?' · ':'')+s.answered+' of '+N+' items answered':'');
  if(!s.answered){ $('#resBody').innerHTML='<div class="card empty">No answers yet. <a href="#" data-go="assess">Start the assessment</a> to see results.</div>'; return; }
  var b = band(s.overall), valid = s.pillars.filter(function(r){return r.mean!=null;});
  var low = valid.slice().sort(function(a,b){return a.mean-b.mean;})[0];
  var gapsArr = valid.map(function(r){return {r:r,g:r.mean-r.p.base};}).sort(function(a,b){return a.g-b.g;});
  var h = '<div class="grid g4">'+
    '<div class="card tile"><div class="lab">Overall score</div><div class="val">'+fmt(s.overall)+'<span class="small muted"> / 5</span></div><div class="sub">'+BN+' baseline '+fmt(baseOverall)+'</div></div>'+
    '<div class="card tile"><div class="lab">Readiness band</div><div class="val" style="font-size:24px">'+(b?b[2]:'–')+'</div><div class="sub">'+(b?esc(b[3]):'')+'</div></div>'+
    '<div class="card tile"><div class="lab">Binding constraint</div><div class="val" style="font-size:24px">'+(low?low.p.id+' · '+fmt(low.mean):'–')+'</div><div class="sub">'+(low?esc(low.p.name):'')+'</div></div>'+
    '<div class="card tile"><div class="lab">Evidence coverage</div><div class="val">'+(s.scoredItems? Math.round((s.scoredItems-s.noEvidence)/s.scoredItems*100):0)+'%</div><div class="sub">'+s.noEvidence+' scored item'+(s.noEvidence===1?'':'s')+' without evidence</div></div></div>';
  if(/illustrative|draft/i.test(BL.status||'')) h += '<div class="callout ind" style="margin-top:16px"><b>'+esc(BL.name)+' baseline is an illustrative draft.</b> '+esc(BL.status)+'. Treat gaps as prompts for discussion, not findings.</div>';
  if(!s.complete) h += '<div class="callout" style="margin-top:16px">Some pillars are incomplete or have insufficient evidence, so the overall score uses the pillars that can be scored. <a href="#" data-go="assess">Finish the assessment</a> for a full profile.</div>';
  h += '<div class="rescols"><div class="card pad"><h2>Profile against the '+BN+' baseline</h2><div class="legend" style="margin:6px 0 4px"><span><i style="background:var(--accent)"></i>Your scores</span><span><i style="background:var(--india)"></i>'+BN+' baseline</span></div>'+
    radar([{label:''+BN+' baseline',values:P.map(function(p){return p.base;}),color:'var(--india)',fill:0.06,dash:true},{label:'Your scores',values:s.pillars.map(function(r){return r.mean;}),color:'var(--accent)',fill:0.16}],{label:'Your pillar scores against the '+BN+' baseline'})+'</div>'+
    '<div class="card pad"><h2>Pillar scores and gaps</h2><p class="small muted" style="margin-top:0">Gap = your score − '+BN+' baseline. The amber tick marks the baseline on each bar.</p><table class="t"><thead><tr><th>Pillar</th><th class="num">You</th><th style="width:28%"></th><th class="num">'+BN+'</th><th class="num">Gap</th><th>Status</th></tr></thead><tbody>'+
    s.pillars.map(function(r){ var g = r.mean==null?null:r.mean-r.p.base; return '<tr><td><b>'+r.p.id+'</b> '+esc(shortName(r.p.name))+(r.dk?'<div class="tiny">'+r.dk+' DK</div>':'')+'</td><td class="num"><b>'+fmt(r.mean)+'</b></td><td><div class="bar"><i style="width:'+((r.mean||0)/5*100)+'%"></i><b style="left:'+(r.p.base/5*100)+'%"></b></div></td><td class="num">'+fmt(r.p.base)+'</td><td class="num gap '+(g==null?'':g<0?'neg':'pos')+'">'+(g==null?'–':(g>0?'+':'')+g.toFixed(1))+'</td><td>'+statusChip(r)+'</td></tr>'; }).join('')+
    '</tbody></table></div></div>';
  // item-level gaps
  var items=[]; P.forEach(function(p){ p.items.forEach(function(it){ var a=state.answers[it.n]; if(a&&a!=='DK') items.push({p:p,it:it,a:a,g:a-it.base}); }); });
  var behind = items.filter(function(x){return x.g<0;}).sort(function(a,b){return a.g-b.g;}).slice(0,6);
  var ahead = items.filter(function(x){return x.g>0;}).sort(function(a,b){return b.g-a.g;}).slice(0,4);
  h += '<div class="grid g2" style="margin-top:16px"><div class="card pad"><h2>Largest item gaps behind '+BR+'</h2><p class="small muted" style="margin-top:0">Where the pre-reads are most likely to offer design choices you can transfer.</p>'+
    (behind.length? '<table class="t"><tbody>'+behind.map(function(x){ return '<tr><td style="width:44px"><span class="pillchip">'+x.it.n+'</span></td><td>'+esc(x.it.q)+'<div class="tiny">'+x.p.id+' · you '+x.a+' · '+BN+' '+x.it.base+'</div></td><td class="num gap neg">'+x.g+'</td></tr>'; }).join('')+'</tbody></table>' : '<div class="muted small">No items below the '+BN+' baseline.</div>')+'</div>'+
    '<div class="card pad"><h2>Where you are ahead</h2><p class="small muted" style="margin-top:0">What '+BR+' could learn from your country.</p>'+
    (ahead.length? '<table class="t"><tbody>'+ahead.map(function(x){ return '<tr><td style="width:44px"><span class="pillchip">'+x.it.n+'</span></td><td>'+esc(x.it.q)+'<div class="tiny">'+x.p.id+' · you '+x.a+' · '+BN+' '+x.it.base+'</div></td><td class="num gap pos">+'+x.g+'</td></tr>'; }).join('')+'</tbody></table>' : '<div class="muted small">No items above the '+BN+' baseline.</div>')+'</div></div>';
  // prompts
  h += '<div class="card pad" style="margin-top:16px"><h2>Bring to the session</h2><ol class="small" style="padding-left:18px;margin:8px 0 0">'+
    (low?'<li><b>Binding constraint:</b> '+low.p.id+' '+esc(low.p.name)+' scores '+fmt(low.mean)+'. Would fixing it unlock the other pillars?</li>':'')+
    (gapsArr.length?'<li><b>Largest gap to '+BR+':</b> '+gapsArr[0].r.p.id+' ('+(gapsArr[0].g>0?'+':'')+gapsArr[0].g.toFixed(1)+'). Which of '+esc(BL.possessive)+' design choices here transfer, and which don’t?</li>':'')+
    '<li><b>Trust by design:</b> can DEPA-style consent and confidential clean rooms do work that would otherwise need heavy regulation?</li>'+
    '<li><b>First move:</b> name one action, an owner and a 12-month marker for '+(low?low.p.id:'your weakest pillar')+'.</li></ol></div>';
  $('#resBody').innerHTML = h;
}
function responseObj(){ return {schema:'ai-readiness-v1',exported:new Date().toISOString(),baseline:BL.id,profile:state.profile,answers:state.answers,evidence:state.evidence}; }
function download(name, text, type){ var b=new Blob([text],{type:type}); var u=URL.createObjectURL(b); var a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(u); a.remove();},100); }
function slug(s){ return String(s||'response').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'response'; }
function csvCell(v){ v = v==null?'':String(v); return /[",\n]/.test(v)? '"'+v.replace(/"/g,'""')+'"' : v; }
$('#exJson').addEventListener('click',function(){ download('ai-readiness-'+slug(state.profile.name||state.profile.country)+'.json', JSON.stringify(responseObj(),null,2),'application/json'); toast('Response exported'); });
$('#exCsv').addEventListener('click',function(){ var rows=[['Respondent','Country','Pillar','Item','Question','Score',''+BN+' baseline','Gap','Evidence']]; var pf=state.profile;
  P.forEach(function(p){ p.items.forEach(function(it){ var a=state.answers[it.n]; rows.push([pf.name,pf.country,p.id,it.n,it.q,a||'',it.base,(a&&a!=='DK')?a-it.base:'',state.evidence[it.n]||'']); }); });
  download('ai-readiness-'+slug(pf.name||pf.country)+'.csv', rows.map(function(r){return r.map(csvCell).join(',');}).join('\n'),'text/csv'); toast('CSV exported'); });

/* group */
function quantile(sorted,q){ if(!sorted.length) return null; var pos=(sorted.length-1)*q, b=Math.floor(pos), r=pos-b; return sorted[b+1]!==undefined? sorted[b]+r*(sorted[b+1]-sorted[b]) : sorted[b]; }
function addResp(o, label){
  if(!o||!o.answers){ toast('Not a valid response file'); return false; }
  var nm = (o.profile&&(o.profile.name||o.profile.org)) || label || ('Respondent '+(state.group.length+1));
  state.group.push({name:nm, profile:o.profile||{}, answers:o.answers, evidence:o.evidence||{}}); save(); return true;
}
function handleFiles(files){ var arr=Array.prototype.slice.call(files), done=0, ok=0;
  arr.forEach(function(f){ var rd=new FileReader(); rd.onload=function(){ try{ if(addResp(JSON.parse(rd.result), f.name.replace(/\.json$/,''))) ok++; }catch(e){ toast('Could not read '+f.name); } if(++done===arr.length){ renderGroup(); toast(ok+' response'+(ok===1?'':'s')+' added'); } }; rd.readAsText(f); }); }
var drop=$('#drop'), fi=$('#fileIn');
drop.addEventListener('click',function(){ fi.click(); });
drop.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fi.click(); } });
fi.addEventListener('change',function(){ handleFiles(fi.files); fi.value=''; });
['dragenter','dragover'].forEach(function(ev){ drop.addEventListener(ev,function(e){ e.preventDefault(); drop.classList.add('over'); }); });
['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev,function(e){ e.preventDefault(); drop.classList.remove('over'); }); });
drop.addEventListener('drop',function(e){ if(e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
$('#addMine').addEventListener('click',function(){ if(!Object.keys(state.answers).some(function(k){return state.answers[k];})){ toast('You have no answers yet'); return; } addResp(responseObj(),'Me'); renderGroup(); toast('Your response was added'); });
$('#clearGroup').addEventListener('click',function(){ state.group=[]; save(); renderGroup(); toast('Group cleared'); });
function groupStats(){
  var per = state.group.map(function(g){ return scoreAll(g.answers,g.evidence); });
  return P.map(function(p,i){ var vals = per.map(function(s){ return s.pillars[i].mean; }).filter(function(v){return v!=null;}).sort(function(a,b){return a-b;});
    var med = quantile(vals,.5), q1=quantile(vals,.25), q3=quantile(vals,.75);
    return {p:p, n:vals.length, insuff: per.length-vals.length, med:med, q1:q1, q3:q3, iqr: vals.length>1? q3-q1 : null, min:vals[0], max:vals[vals.length-1], gap: med==null?null:med-p.base}; });
}
function renderGroup(){
  var G=state.group, el=$('#groupBody');
  if(!G.length){ el.innerHTML='<div class="card empty">No responses loaded yet. Ask each participant to export their response (JSON) from the Results tab, then drop the files above.</div>'; return; }
  var st = groupStats(), valid=st.filter(function(r){return r.med!=null;});
  var overall = valid.length? valid.reduce(function(s,r){return s+r.med;},0)/valid.length : null, b=band(overall);
  var contested = st.filter(function(r){return r.iqr!=null&&r.iqr>1;});
  var low = valid.slice().sort(function(a,b){return a.med-b.med;})[0];
  var h = '<div class="grid g4"><div class="card tile"><div class="lab">Respondents</div><div class="val">'+G.length+'</div><div class="sub">'+esc(uniq(G.map(function(g){return g.profile.country;})).join(', ')||'Country not given')+'</div></div>'+
    '<div class="card tile"><div class="lab">Group overall</div><div class="val">'+fmt(overall)+'</div><div class="sub">'+(b?b[2]:'')+' · '+BN+' '+fmt(baseOverall)+'</div></div>'+
    '<div class="card tile"><div class="lab">Binding constraint</div><div class="val" style="font-size:24px">'+(low?low.p.id+' · '+fmt(low.med):'–')+'</div><div class="sub">'+(low?esc(low.p.name):'')+'</div></div>'+
    '<div class="card tile"><div class="lab">Contested pillars</div><div class="val">'+contested.length+'</div><div class="sub">Spread (IQR) above 1.0</div></div></div>';
  if(contested.length) h += '<div class="callout ind" style="margin-top:16px"><b>Resolve the facts first.</b> Respondents disagree on '+contested.map(function(r){return r.p.id;}).join(', ')+'. Compare their evidence before you debate priorities.</div>';
  h += '<div class="rescols"><div class="card pad"><h2>Group median against '+BR+'</h2><div class="legend" style="margin:6px 0 4px"><span><i style="background:var(--accent)"></i>Group median</span><span><i style="background:var(--india)"></i>'+BN+' baseline</span></div>'+
    radar([{label:''+BN+' baseline',values:P.map(function(p){return p.base;}),color:'var(--india)',fill:0.06,dash:true},{label:'Group median',values:st.map(function(r){return r.med;}),color:'var(--accent)',fill:0.16}],{label:'Group median pillar scores against the '+BN+' baseline'})+'</div>'+
    '<div class="card pad"><h2>Median, spread and gap</h2><p class="small muted" style="margin-top:0">The band shows the middle 50% of respondents (Q1–Q3); the dot is the median; the amber tick is '+BR+'.</p><table class="t"><thead><tr><th>Pillar</th><th class="num">Median</th><th style="width:30%">Spread</th><th class="num">IQR</th><th class="num">Gap</th><th class="num">n</th></tr></thead><tbody>'+
    st.map(function(r){ return '<tr><td><b>'+r.p.id+'</b> '+esc(shortName(r.p.name))+'</td><td class="num"><b>'+fmt(r.med)+'</b></td><td>'+spreadBar(r)+'</td><td class="num">'+(r.iqr==null?'–':'<span class="'+(r.iqr>1?'gap neg':'')+'">'+r.iqr.toFixed(1)+'</span>')+'</td><td class="num gap '+(r.gap==null?'':r.gap<0?'neg':'pos')+'">'+(r.gap==null?'–':(r.gap>0?'+':'')+r.gap.toFixed(1))+'</td><td class="num">'+r.n+(r.insuff?'<div class="tiny">+'+r.insuff+' insuff.</div>':'')+'</td></tr>'; }).join('')+
    '</tbody></table></div></div>';
  h += '<div class="card pad" style="margin-top:16px"><h2>Respondents</h2><table class="t"><thead><tr><th>Name</th><th>Role</th><th>Country</th>'+P.map(function(p){return '<th class="num">'+p.id+'</th>';}).join('')+'<th class="num">Overall</th><th class="noprint"></th></tr></thead><tbody>'+
    G.map(function(g,i){ var s=scoreAll(g.answers,g.evidence); return '<tr><td>'+esc(g.name)+'</td><td>'+esc(g.profile.role||'')+'</td><td>'+esc(g.profile.country||'')+'</td>'+s.pillars.map(function(r){return '<td class="num">'+fmt(r.mean)+'</td>';}).join('')+'<td class="num"><b>'+fmt(s.overall)+'</b></td><td class="noprint"><button class="btn ghost danger small" data-rm="'+i+'" aria-label="Remove">✕</button></td></tr>'; }).join('')+'</tbody></table></div>';
  el.innerHTML=h;
  $$('[data-rm]',el).forEach(function(b){ b.addEventListener('click',function(){ state.group.splice(+b.dataset.rm,1); save(); renderGroup(); }); });
}
function spreadBar(r){ if(r.med==null) return '<span class="tiny">Insufficient</span>'; var x=function(v){return (v-1)/4*100;};
  return '<div class="bar" style="background:var(--surface-2)"><i style="left:'+x(r.q1)+'%;width:'+Math.max(1.5,x(r.q3)-x(r.q1))+'%;opacity:.35"></i><i style="left:calc('+x(r.med)+'% - 4px);width:8px;border-radius:50%;top:0;height:8px"></i><b style="left:'+x(r.p.base)+'%"></b></div>'; }
function uniq(a){ var o=[]; a.forEach(function(v){ if(v&&o.indexOf(v)<0) o.push(v); }); return o; }
$('#exGroup').addEventListener('click',function(){ if(!state.group.length){ toast('No group responses'); return; } var st=groupStats(); var rows=[['Pillar','Name','Median','Q1','Q3','IQR',''+BN+' baseline','Gap','n','Insufficient']];
  st.forEach(function(r){ rows.push([r.p.id,r.p.name,fmt(r.med),fmt(r.q1),fmt(r.q3),r.iqr==null?'':r.iqr.toFixed(2),r.p.base,r.gap==null?'':r.gap.toFixed(2),r.n,r.insuff]); });
  download('ai-readiness-group.csv', rows.map(function(r){return r.map(csvCell).join(',');}).join('\n'),'text/csv'); toast('Group CSV exported'); });

/* icons (generic, stroke-based) */
var ICON = {
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>',
  profile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 13h20"/></svg>',
  code:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>',
  repo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>'
};
function safeUrl(u){ return /^https?:\/\//i.test(String(u||'')) ? u : '#'; }
function isPlaceholder(u){ return !u || /REPLACE-WITH/i.test(u); }
function extLink(url,label,icon){ return '<a class="lnk" href="'+esc(safeUrl(url))+'" target="_blank" rel="noopener noreferrer">'+(ICON[icon]||ICON.link)+esc(label)+'</a>'; }

/* chrome */
function renderChrome(){
  document.title = (SITE.title||document.title)+' · '+BN+' baseline';
  $('#brandTitle').textContent = SITE.title||'';
  $('#brandSub').textContent = SITE.subtitle||'';
  $('#footText').textContent = 'v'+(SITE.version||'')+' · '+(SITE.license?SITE.license.name+' License · ':'')+'Created by '+((SITE.author||{}).name||'')+' · '+BL.name+' baseline: '+(BL.status||'')+' (as of '+(BL.asOf||'')+').';
}

/* readme + instructions slots */
function renderDocs(){
  $$('[data-slot="asof"]').forEach(function(el){ el.textContent = BL.asOf||SITE.baselineAsOf||''; });
  $$('[data-slot="baseline-status"]').forEach(function(el){ el.innerHTML = '<b>'+esc(BL.name)+' baseline</b> · '+esc(BL.status||'')+' · overall '+fmt(BL.overall)+' / 5. '+esc(BL.summary||'')+(BL.method?'<br><span class="small">'+esc(BL.method)+'</span>':''); });
  $$('[data-slot="baseline-evidence"]').forEach(function(el){ el.innerHTML = '<table class="t"><thead><tr><th>Pillar</th><th class="num">Score</th><th class="num">Range</th><th>Evidence</th><th>Key assumption</th><th>Confidence</th></tr></thead><tbody>'+
    P.map(function(p){ return '<tr><td><b>'+p.id+'</b> '+esc(p.short||p.name)+'</td><td class="num"><b>'+fmt(p.base)+'</b></td><td class="num">'+fmt(p.lo)+'–'+fmt(p.hi)+'</td><td class="small">'+esc(p.evidence||'')+'</td><td class="small">'+esc(p.assumption||'')+'</td><td>'+(p.confidence?'<span class="pillchip '+({High:'good',Medium:'',Low:'warn'}[p.confidence]||'')+'">'+esc(p.confidence)+'</span>':'')+'</td></tr>'; }).join('')+'</tbody></table>'; });
  $$('[data-slot="baselines-list"]').forEach(function(el){ var L=C.baselines||[]; el.innerHTML = L.length? '<table class="t"><thead><tr><th>Baseline</th><th class="num">Overall</th><th>Status</th><th>Build</th></tr></thead><tbody>'+L.map(function(b){ return '<tr><td><b>'+esc(b.name)+'</b>'+(b.id===BL.id?' <span class="pillchip you">this page</span>':'')+'</td><td class="num">'+fmt(b.overall)+'</td><td class="small">'+esc(b.status||'')+'</td><td><code>npm run build -- --country '+esc(b.id)+'</code></td></tr>'; }).join('')+'</tbody></table>' : ''; });
  $$('[data-slot="pillar-table"]').forEach(function(el){ el.innerHTML = '<table class="t"><thead><tr><th>Pillar</th><th>What it tests</th><th class="num">'+BN+' baseline</th><th class="num">Range</th></tr></thead><tbody>'+
    P.map(function(p){ return '<tr><td><b>'+p.id+'</b> '+esc(p.name)+'</td><td>'+esc(p.tests)+'</td><td class="num">'+fmt(p.base)+'</td><td class="num">'+fmt(p.lo)+'–'+fmt(p.hi)+'</td></tr>'; }).join('')+'</tbody></table>'; });
  $$('[data-slot="bands-table"]').forEach(function(el){ el.innerHTML = '<table class="t"><thead><tr><th>Band</th><th>Overall score</th><th>Meaning</th></tr></thead><tbody>'+
    (SITE.bands||[]).map(function(b,i,a){ return '<tr><td><b>'+esc(b.name)+'</b></td><td>'+(i===0?'Below '+b.max:(i===a.length-1?b.min+' and above':b.min+'–'+(b.max-0.1).toFixed(1)))+'</td><td>'+esc(b.text)+'</td></tr>'; }).join('')+'</tbody></table>'; });
  $$('[data-slot="reading-table"]').forEach(function(el){ el.innerHTML = '<table class="t"><thead><tr><th>Result</th><th>What it means</th><th>What to do</th></tr></thead><tbody>'+
    [['Pillar score under 2.5','A foundational gap','Treat it as a candidate binding constraint'],['Gap of −1.0 or more','Clearly behind '+BR+'','Look at the matching pre-reads for design choices that transfer'],['Gap above +0.5','Ahead of '+BR+'','Capture what '+BR+' could learn'],['Spread above 1.0','Respondents disagree on the facts','Compare evidence before setting priorities'],['Two or more DK in a pillar','Insufficient evidence','Gather evidence before acting']].map(function(r){ return '<tr><td><b>'+r[0]+'</b></td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>'; }).join('')+'</tbody></table>'; });
  $$('[data-slot="repo"]').forEach(function(el){ el.innerHTML = isPlaceholder(SITE.repository) ? '<p class="tiny">Set <code>repository</code> in <code>config/site.json</code> to show the repository link here.</p>' : '<p>'+extLink(SITE.repository,'Project repository','repo')+'</p>'; });
}

/* references */
var refFilter = {q:'',pillar:'',core:false};
function renderRefs(){
  var el = $('#refBody'); if(!el) return;
  if(!el.dataset.ready){
    el.innerHTML = '<h1>References</h1><p class="lead">The pre-reads mapped to each pillar, plus the annexures. Starred items are the core set (about six hours). Links located as of '+esc(REFS.asOf||'')+'.</p>'+
      '<div class="reftools noprint"><input id="refQ" type="search" placeholder="Search titles, sources and notes" aria-label="Search references"><select id="refP" aria-label="Filter by pillar"><option value="">All pillars</option>'+P.map(function(p){return '<option value="'+p.id+'">'+p.id+' '+esc(p.name)+'</option>';}).join('')+'</select><label class="toggle"><input type="checkbox" id="refCore"> Core set only</label></div>'+
      '<div id="refCount" class="tiny" style="margin-bottom:8px"></div><div class="reflist" id="refList"></div><div id="annexBody"></div>'+
      (REFS.note?'<p class="tiny" style="margin-top:18px">'+esc(REFS.note)+'</p>':'');
    el.dataset.ready='1';
    $('#refQ').addEventListener('input',function(e){ refFilter.q=e.target.value.toLowerCase(); drawRefs(); });
    $('#refP').addEventListener('change',function(e){ refFilter.pillar=e.target.value; drawRefs(); });
    $('#refCore').addEventListener('change',function(e){ refFilter.core=e.target.checked; drawRefs(); });
    drawAnnex();
  }
  drawRefs();
}
function drawRefs(){
  var list = (REFS.preReads||[]).filter(function(r){
    if(refFilter.core && !r.star) return false;
    if(refFilter.pillar && r.pillars.indexOf(refFilter.pillar)<0 && r.pillars.indexOf('All')<0) return false;
    if(refFilter.q && (r.title+' '+r.source+' '+r.why).toLowerCase().indexOf(refFilter.q)<0) return false;
    return true; });
  $('#refCount').textContent = list.length+' of '+(REFS.preReads||[]).length+' pre-reads';
  $('#refList').innerHTML = list.length ? list.map(function(r){ return '<div class="card ref"><div class="rn'+(r.star?' star':'')+'" title="'+(r.star?'Core pre-read':'')+'">'+(r.star?'★':'')+r.n+'</div><div><h3>'+esc(r.title)+'</h3><div class="why">'+esc(r.why)+'</div><div class="meta"><span class="pillchip">'+esc(r.source)+'</span>'+r.pillars.map(function(p){return '<span class="pillchip you">'+esc(p)+'</span>';}).join('')+'</div></div><div class="links">'+(r.links||[]).map(function(l){return extLink(l.url,l.label,'link');}).join('')+'</div></div>'; }).join('') : '<div class="card empty">No references match.</div>';
}
function drawAnnex(){
  $('#annexBody').innerHTML = (REFS.annexures||[]).map(function(a){
    return '<div class="annex"><div class="k">Annexure '+esc(a.id)+'</div><h2>'+esc(a.title)+'</h2><p class="small muted" style="margin-top:0">'+esc(a.intro||'')+'</p><div class="card pad" style="padding:6px 18px"><table class="t"><thead><tr><th style="width:150px">Posted</th><th>Post</th><th class="noprint"></th></tr></thead><tbody>'+
      (a.items||[]).map(function(it){ return '<tr><td class="small muted">'+esc(it.date)+'</td><td><b>'+esc(it.title)+'</b><div class="small muted">'+esc(it.adds||'')+'</div></td><td style="text-align:right"><div class="links" style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">'+extLink(it.url,'Read','link')+(it.code?extLink(it.code.url,it.code.label,'code'):'')+'</div></td></tr>'; }).join('')+
      '</tbody></table></div>'+((a.more&&a.more.length)?'<div class="row" style="margin-top:10px">'+a.more.map(function(m){return extLink(m.url,m.label,'link');}).join('')+'</div>':'')+'</div>'; }).join('');
}

/* license */
function renderLicense(){
  var L = SITE.license||{};
  $('#licLead').textContent = 'This project is released under the '+(L.name||'MIT')+' License. You may use, copy, modify and distribute it, provided the copyright notice and this permission notice are kept.';
  $('#licText').textContent = C.licenseText || '';
}

/* about */
function renderAbout(){
  var A = SITE.author||{}, initials = String(A.name||'').replace(/^Dr\.?\s+/i,'').split(/\s+/).map(function(w){return w.charAt(0);}).join('').slice(0,2).toUpperCase();
  var social = [];
  if(A.linkedin) social.push('<a href="'+esc(safeUrl(A.linkedin))+'" target="_blank" rel="noopener noreferrer">'+ICON.profile+'LinkedIn</a>');
  if(A.github) social.push('<a href="'+esc(safeUrl(A.github))+'" target="_blank" rel="noopener noreferrer">'+ICON.code+'GitHub</a>');
  var placeholder = isPlaceholder(A.linkedin)||isPlaceholder(A.github);
  $('#aboutBody').innerHTML = '<h1>About</h1><div class="card profile"><div class="avatar" aria-hidden="true">'+esc(initials)+'</div><div><div class="tiny" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700">Created by</div><h2>'+esc(A.name||'')+'</h2><div class="muted">'+esc(A.role||'')+'</div>'+(A.bio?'<p class="small" style="margin:8px 0 0">'+esc(A.bio)+'</p>':'')+'<div class="social">'+social.join('')+'</div>'+(placeholder?'<div class="tiny" style="margin-top:8px">Profile links are placeholders: set <code>author.linkedin</code> and <code>author.github</code> in <code>config/site.json</code>.</div>':'')+'</div></div>'+
    '<div class="card pad" style="margin-top:16px"><h2>This project</h2><dl class="kv"><dt>Name</dt><dd>'+esc(SITE.title||'')+'</dd><dt>Version</dt><dd>'+esc(SITE.version||'')+'</dd><dt>Built</dt><dd>'+esc(C.built||'')+'</dd><dt>Baseline</dt><dd>'+esc(BL.name)+' · as of '+esc(BL.asOf||'')+' · '+esc(BL.status||'')+'</dd><dt>Other baselines</dt><dd>'+esc((C.baselines||[]).filter(function(b){return b.id!==BL.id;}).map(function(b){return b.name;}).join(', ')||'none')+'</dd><dt>License</dt><dd><a href="#" data-go="license">'+esc((SITE.license||{}).name||'MIT')+'</a></dd>'+(isPlaceholder(SITE.repository)?'':'<dt>Source</dt><dd>'+extLink(SITE.repository,'Repository','repo')+'</dd>')+'<dt>Context</dt><dd>Prepared for the session "Preparing a country for AI scale", drawing on India’s digital transformation journey.</dd></dl></div>';
}

/* reset */
$('#resetBtn').addEventListener('click',function(){ if(!Object.keys(state.answers).some(function(k){return state.answers[k];})){ toast('Nothing to reset'); return; } state.answers={}; state.evidence={}; state.pillar=0; save(); renderSide(); $('#resumeNote').textContent=''; toast('Your answers were cleared'); });

/* init */
load(); state.group = state.group||[]; $('#showBase').checked = !!state.showBase;
renderChrome(); renderIntro(); renderDocs(); renderLicense(); renderAbout(); renderSide();
})();
