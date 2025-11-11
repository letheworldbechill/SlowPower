// Raumpsychologie v3.2 – Clean build
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
}

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Theme & Language
const themeBtn = $('#btn-theme');
if (localStorage.getItem('rp_theme') === 'dark') document.body.classList.add('dark');
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('rp_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
const langSel = $('#lang'); langSel.value = localStorage.getItem('rp_lang') || 'de';
langSel.addEventListener('change', e => localStorage.setItem('rp_lang', e.target.value));

// Routing
const sections = ['home','scan','reso','bind','info','precheck'];
$$('.nav button').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
function show(id){ sections.forEach(x=>$('#'+x).classList.add('hidden')); $('#'+id).classList.remove('hidden'); }
show('home');

// Private framing (double tap on logo)
let tapT = 0;
$('#logo').addEventListener('click', ()=>{
  const now = Date.now();
  if (now - tapT < 350) {
    modal(`<h2>Nur für mich</h2>
      <p>Ich nutze diese App, um mich zu erinnern: wann ich ruhig war, wann ich mich verloren habe, wann ich mich wiedergefunden habe.</p>
      <p>Ich will keine Masken zerreißen, sondern meine eigene Ruhe schützen. Ich darf loslassen, ohne erklären zu müssen.</p>
      <p>Ich wähle Distanz, ohne Schuld. Ich wähle Klarheit, ohne Härte. Ich wähle Frieden, ohne Zeugen.</p>`);
  }
  tapT = now;
});

// ========== Wohnung Check ==========
const rooms = [
  {key:'schlaf', name:'🛏 Schlafzimmer'},
  {key:'wohn', name:'🛋 Wohnzimmer'},
  {key:'kue', name:'🍳 Küche'},
  {key:'bad', name:'🚿 Bad'},
];
const roomMount = $('#rooms');
rooms.forEach(r => roomMount.appendChild(roomCard(r.key, r.name)));

function roomCard(key, title){
  const wrap = document.createElement('div'); wrap.className='room-card';
  wrap.innerHTML = `<h3>${title}</h3>
    ${triSlider(key,'Boden')}
    ${triSlider(key,'Flächen','flaechen')}
    ${triSlider(key,'Atmosphäre','atmo')}
    <div id="${key}-note" class="muted"></div>
    <textarea id="${key}-txt" placeholder="Wenn dieser Raum sprechen könnte … (optional)"></textarea>`;
  ['boden','flaechen','atmo'].forEach(sub => {
    wrap.querySelector(`#${key}-${sub}`).addEventListener('input', ()=>{ updateRoomNote(key); updateHomeTotal(); });
  });
  updateRoomNote(key);
  return wrap;
}
function triSlider(key,label,sub){
  sub = sub || label.toLowerCase();
  const id = `${key}-${sub}`;
  const oId = `${key}-${sub}-o`;
  return `<div class="slider-row">
    <label>${label} <output id="${oId}">5</output></label>
    <input id="${id}" type="range" min="1" max="10" value="5" />
  </div>`;
}
function mean(vals){ return vals.reduce((a,b)=>a+b,0)/vals.length; }
function label4(v){ if(v<=3) return 'Überreizt – hier fließt Energie ab.'; if(v<=6) return 'Unruhig – Raum braucht Aufmerksamkeit.'; if(v<=8) return 'Im Gleichgewicht.'; return 'Stabil und nährend.'; }
function updateRoomNote(key){
  const v = ['boden','flaechen','atmo'].map(s=>+$('#'+key+'-'+s).value);
  const m = Math.round(mean(v));
  $('#'+key+'-note').textContent = label4(m);
  ['boden','flaechen','atmo'].forEach(s => { $('#'+key+'-'+s+'-o').textContent = $('#'+key+'-'+s).value; });
  return m;
}
function updateHomeTotal(){
  const totals = rooms.map(r => updateRoomNote(r.key));
  const pct = Math.round(mean(totals) * 10);
  const res = $('#home-result'); let text = `Gesamt: ${pct}% · `, color='#ffd166', tip='—';
  if (pct>=80){ text+='ruhig'; color='#8ce0c0'; tip='Genieße den Frieden – atme durch.'; }
  else if (pct>=50){ text+='leicht unruhig'; color='#fff3bf'; tip='Ein Raum braucht dich heute – fühl hinein, welcher.'; }
  else { text+='überfordert'; color='#ffc9c9'; tip='Fang bei einem Quadratmeter an.'; }
  res.textContent = text; res.style.background = color; $('#home-tip').textContent = tip;
}
updateHomeTotal();
$('#home-save').addEventListener('click', ()=>{
  const day = today();
  const data = JSON.parse(localStorage.getItem('rp_hist_home')||'[]');
  const pct = Math.round(mean(rooms.map(r=>updateRoomNote(r.key))) * 10);
  const it = data.find(d=>d.date===day); if (it) it.total=pct; else data.push({date:day,total:pct});
  while(data.length>14) data.shift();
  localStorage.setItem('rp_hist_home', JSON.stringify(data));
  toast('Gespeichert'); aftershock();
});
$('#home-repeat').addEventListener('click', ()=>{
  rooms.forEach(r=>['boden','flaechen','atmo'].forEach(s=>$('#'+r.key+'-'+s).value=5));
  rooms.forEach(r=>updateRoomNote(r.key));
  updateHomeTotal();
});

// ========== RaumScan ==========
const scanFields = [
  ['🧱 Boden','boden'], ['💨 Luft','luft'], ['💡 Licht','licht'], ['🔊 Klang','klang'], ['🧺 Ordnung','ordnung']
];
const scanMount = $('#scan-sliders');
scanFields.forEach(([label,key])=>{
  const row = document.createElement('div'); row.className='slider-row';
  row.innerHTML = `<label>${label} <output id="o-${key}">5</output></label>
    <input id="s-${key}" type="range" min="1" max="10" value="5" />`;
  scanMount.appendChild(row);
  row.querySelector('input').addEventListener('input', scanUpdate);
});
function scanSum(){ return scanFields.map(([_,k])=>+$('#s-'+k).value).reduce((a,b)=>a+b,0); }
function scanUpdate(){
  scanFields.forEach(([_,k])=>$('#o-'+k).textContent=$('#s-'+k).value);
  const total = scanSum(); const pct = Math.round(((total-5)/45)*100);
  const res = $('#scan-result'); let text=`Neutral · ${pct}%`, color='#ffd166';
  if (pct>=70){ text=`Ruhig · ${pct}%`; color='#8ce0c0'; }
  else if (pct<=35){ text=`Unruhig · ${pct}%`; color='#ffc9c9'; }
  res.textContent=text; res.style.background=color;
}
scanUpdate();
$('#scan-save').addEventListener('click', ()=>{
  const day=today(); const data=JSON.parse(localStorage.getItem('rp_hist_scan')||'[]');
  const total=scanSum(); const it=data.find(d=>d.date===day); if(it) it.total=total; else data.push({date:day,total});
  while(data.length>14) data.shift();
  localStorage.setItem('rp_hist_scan', JSON.stringify(data));
  toast('Gespeichert'); aftershock();
});
$('#scan-reset').addEventListener('click', ()=>{
  scanFields.forEach(([_,k])=>$('#s-'+k).value=5); scanUpdate();
});

// ========== Vorcheck (Resonanz/Bindung) ==========
let nextTarget = null;
function startPrecheck(target){ nextTarget = target; show('precheck'); }
$('#pre-next').addEventListener('click', ()=>{ show(nextTarget); });
$('#pre-cancel').addEventListener('click', ()=>{ show('home'); });

// ========== Resonanz ==========
const resoQs = [
  'Ich frage nach, bevor ich annehme.',
  'Ich erinnere mich an Dinge, die dem anderen wichtig sind.',
  'Ich kann Kritik hören, ohne mich zu verteidigen.',
  'Ich denke darüber nach, wie mein Verhalten wirkt.',
  'Ich tue etwas Gutes, ohne dass es mir nützt.',
  'Ich handle im Einklang mit dem, was ich wahrnehme.'
];
const resoMount = $('#reso-qs');
resoQs.forEach((q,i)=>{
  const row = document.createElement('div'); row.className='slider-row';
  row.innerHTML = `<label>${i+1}. ${q} <output id="ro-${i}">3</output></label>
    <input id="r-${i}" type="range" min="1" max="5" value="3" />`;
  resoMount.appendChild(row);
  row.querySelector('input').addEventListener('input', resoUpdate);
});
function resoScore(){ return resoQs.map((_,i)=>+$('#r-'+i).value).reduce((a,b)=>a+b,0); }
function resoUpdate(){
  resoQs.forEach((_,i)=>$('#ro-'+i).textContent=$('#r-'+i).value);
  const score = resoScore(); const pct = Math.round(((score-6)/24)*100);
  const res = $('#reso-result'); const tip = $('#reso-tip');
  let text=`Neutral · ${pct}%`, color='#ffd166', t='Atme. Nimm Kontakt zu dir auf.';
  if (pct>=66){ text=`Resonanz · ${pct}%`; color='#8ce0c0'; t='Du bist verbunden und handlungsbewusst.'; }
  else if (pct<=33){ text=`Eigenfilm · ${pct}%`; color='#ffc9c9'; t='Pause. Beobachte dich, bevor du reagierst.'; }
  else { text=`Reaktion · ${pct}%`; color='#fff3bf'; t='Du fühlst viel – prüfe, ob du auch danach handelst.'; }
  res.textContent=text; res.style.background=color; tip.textContent=t;
}
resoUpdate();
$('#reso-done').addEventListener('click', ()=>{ toast('Abgeschlossen'); aftershock(); });

// ========== Bindung ==========
const lovebombQs = [
  'Tempo & Überwältigung: Zuwendung schneller als Vertrauen wächst.',
  'Konsistenz: Worte und Gesten bleiben stabil, auch wenn ich Grenzen setze. (invertiert)',
  'Authentizität: Nicht „zu perfekt“, kleine Unsicherheiten sichtbar. (invertiert)',
  'Übertriebene Spiegelung von außen: „perfekt verstanden“ ohne Grundlage.',
  'Eigene Spiegelreaktion: Ich passe mich übermäßig an, um Harmonie zu sichern.'
];
const bindMainQs = [
  'Wenn ich Unstimmigkeiten anspreche, wird es besprochen statt bestritten. (invertiert)',
  'Meine Grenzen werden respektiert. (invertiert)',
  'Kleine Lügen/Halbwahrheiten werden geleugnet.',
  'Wenn ich Hilfe brauche, kommt Unterstützung – nicht Vorwurf. (invertiert)',
  'Über andere wird fair und reflektiert gesprochen. (invertiert)',
  'Vergangenheit: Lernen statt Opferrolle. (invertiert)',
  'Nach Gesprächen bin ich klar, nicht verwirrt. (invertiert)',
  'Zukunftsbild in 12 Monaten: Ruhe statt Angst. (invertiert)',
  'Unterschwellige Verachtung (Blick/Ton/Spott) vorhanden.',
  'Worte und Taten stimmen über Zeit überein. (invertiert)'
];
const ynBlocks = [
  {title:'Wahrheit & Transparenz', qs:['Schon kleine Lügen bemerkt?','Wurden sie zugegeben? (Nein=Problem)','Wiederholen sich solche Muster?']},
  {title:'Verantwortung', qs:['Wird Kritik ohne Gegenangriff aufgenommen?','Wird Eigenverantwortung übernommen?','Gibt es Schuldumkehr? (Ja=Problem)']},
  {title:'Achtung & Respekt', qs:['Momente von Spott/Augenrollen? (Ja=Problem)','Wird meine Meinung ernst genommen?','Wird Nähe mit Wärme, nicht Druck erzeugt? (Nein=Problem)']},
  {title:'Empathie in Handlung', qs:['Handelt die Person wie sie spricht?','Bleibt Unterstützung konstant ohne Nutzen?','Wird mein „Nein“ akzeptiert?']},
  {title:'Zukunft & Sicherheit', qs:['Kann ich mir langfristiges Vertrauen vorstellen?','Wird geplant, nicht nur reagiert?','Fühle ich mich sicher, wenn die Person wütend ist?']},
];

function mountSliders(list, mountId, min=1,max=5, def=3){
  const mount = $('#'+mountId); mount.innerHTML='';
  list.forEach((q,i)=>{
    const row = document.createElement('div'); row.className='slider-row';
    row.innerHTML = `<label>${i+1}. ${q} <output id="${mountId}-o-${i}">${def}</output></label>
      <input id="${mountId}-r-${i}" type="range" min="${min}" max="${max}" value="${def}" />`;
    mount.appendChild(row);
    row.querySelector('input').addEventListener('input', ()=>$('#'+mountId+'-o-'+i).textContent=$('#'+mountId+'-r-'+i).value);
  });
}
mountSliders(lovebombQs,'lovebomb');
mountSliders(bindMainQs,'bind-main');

const bindYN = $('#bind-yn');
ynBlocks.forEach((b,bi)=>{
  const card = document.createElement('div'); card.className='room-card';
  const inner = [`<h4>${bi+1}. ${b.title}</h4>`].concat(b.qs.map((q,qi)=>{
    return `<div class="row"><label style="min-width:260px">${qi+1}. ${q}</label>
      <label><input type="radio" name="yn-${bi}-${qi}" value="yes" checked> Ja</label>
      <label><input type="radio" name="yn-${bi}-${qi}" value="no"> Nein</label></div>`;
  }));
  card.innerHTML = inner.join('');
  bindYN.appendChild(card);
});

function scoreList(mountId, invertIdx=[]){
  const len = $$('#'+mountId+' input[type=range]').length;
  let vals = [];
  for (let i=0;i<len;i++){
    const v = +$('#'+mountId+'-r-'+i).value;
    vals.push(invertIdx.includes(i) ? (6 - v) : v);
  }
  return vals.reduce((a,b)=>a+b,0) / (len*5) * 100; // percent
}
const loveInvert = [1,2];
const mainInvert = [0,1,3,4,5,6,7,9];

function scoreYN(){
  let totalQs=0, negatives=0;
  ynBlocks.forEach((b,bi)=>{
    b.qs.forEach((q,qi)=>{
      const val = (document.querySelector(`input[name="yn-${bi}-${qi}"]:checked`)||{}).value || 'yes';
      totalQs++;
      const isYesProblem = q.includes('(Ja=Problem)');
      const isNoProblem = q.includes('(Nein=Problem)');
      if ((isYesProblem && val==='yes') || (isNoProblem && val==='no')) { negatives++; }
    });
  });
  const pct = Math.max(0, 100 - Math.round((negatives/totalQs)*100));
  const warn = negatives>=3;
  return {pct, warn, negatives, totalQs};
}

function bindResult(){
  const lb = scoreList('lovebomb', loveInvert);
  const main = scoreList('bind-main', mainInvert);
  const yn = scoreYN();
  const final = Math.round((lb*0.3 + main*0.5 + yn.pct*0.2));
  const res = $('#bind-result'); let label='–', color='#ffd166', tip='—';
  if (final>=75){ label='Klar & tragfähig'; color='#8ce0c0'; tip='Vertrauen auf Basis von Realität.'; }
  else if (final>=50){ label='Muster prüfen'; color='#fff3bf'; tip='Achtsam bleiben, Tempo rausnehmen.'; }
  else if (final>=25){ label='Innere Alarmzone'; color:'#ffdfbf'; tip='Muster wiederholt sich – Distanz aufbauen.'; }
  else { label='Selbstschutz aktivieren'; color='#ffc9c9'; tip='Ruhig, klar, höflich beenden.'; }
  res.textContent = `${label} · ${final}%`; res.style.background = color; $('#bind-tip').textContent = tip + (yn.warn? ' • (Ja/Nein‑Warnsignal aktiv)' : '');
  return final;
}
$('#bind-done').addEventListener('click', ()=>{ bindResult(); aftershock(); });

// ========== Nachbeben ==========
function aftershock(){
  modal(`<h2>🕊 Nachbeben</h2>
    <p>Wenn es nach dem Aufräumen oder Loslassen unruhig wird:</p>
    <ol>
      <li>Atme – <em>länger aus</em> als ein.</li>
      <li>Benenne 3 Dinge, die du siehst.</li>
      <li>Sag dir: „Ruhe ist sicher.“</li>
    </ol>
    <div class="row"><button id="ab-close" class="primary">Zurück zur Ruhe</button></div>`);
  $('#ab-close').addEventListener('click', closeModal);
  localStorage.setItem('rp_aftershock', new Date().toISOString());
}

// ========== Utils ==========
function modal(html){ const m=$('#modal'); m.innerHTML=html; m.showModal(); }
function closeModal(){ $('#modal').close(); }
function today(){ return new Date().toISOString().slice(0,10); }
function toast(msg){
  const t=document.createElement('div');
  t.textContent=msg; t.style.position='fixed'; t.style.bottom='18px'; t.style.left='50%';
  t.style.transform='translateX(-50%)'; t.style.background='#111a'; t.style.color='#fff';
  t.style.padding='10px 14px'; t.style.borderRadius='10px'; t.style.backdropFilter='blur(8px)'; t.style.zIndex='9999';
  document.body.appendChild(t); setTimeout(()=>t.remove(),1600);
}

// Hook precheck before opening reso/bind
document.querySelector('button[data-view="reso"]').addEventListener('click', ()=>startPrecheck('reso'));
document.querySelector('button[data-view="bind"]').addEventListener('click', ()=>startPrecheck('bind'));
