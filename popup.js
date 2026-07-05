// popup.js
'use strict';
const bAPI=typeof browser!=='undefined'?browser:chrome;
const tb=document.getElementById('tb'),sd=document.getElementById('sd'),st=document.getElementById('st'),test=document.getElementById('test');
const vol=document.getElementById('vol'),spd=document.getElementById('spd'),dly=document.getElementById('dly');
const volVal=document.getElementById('volVal'),spdVal=document.getElementById('spdVal'),dlyVal=document.getElementById('dlyVal');
const volcKey=document.getElementById('volcKey'),volcVoice=document.getElementById('volcVoice');
const volcTitle=document.getElementById('volcTitle'),volcBody=document.getElementById('volcBody');

function sg(k){return new Promise(r=>{try{const v=bAPI.storage.local.get(k);if(v&&typeof v.then==='function'){v.then(r).catch(()=>r({}));return}}catch(_){}try{bAPI.storage.local.get(k,v=>r(v||{}))}catch(_){r({})}})}
function ss(o){return new Promise(r=>{try{const v=bAPI.storage.local.set(o);if(v&&typeof v.then==='function'){v.then(r).catch(r);return}}catch(_){}try{bAPI.storage.local.set(o,r)}catch(_){r()}})}
function sm(m){return new Promise(r=>{try{const v=bAPI.runtime.sendMessage(m);if(v&&typeof v.then==='function'){v.then(r).catch(()=>r(null));return}}catch(_){}try{bAPI.runtime.sendMessage(m,v=>r(v||null))}catch(_){r(null)}})}

// 加载
sg(['enabled','volume','speed','delay','volcano_key','volcano_voice']).then(r=>{
  tb.checked = r.enabled !== undefined ? r.enabled : true;
  vol.value = r.volume || 100;
  spd.value = r.speed || 100;
  dly.value = r.delay || 300;
  if (r.volcano_key) volcKey.value = r.volcano_key;
  if (r.volcano_voice) volcVoice.value = r.volcano_voice;
  updateUI(tb.checked); updateLabels();
});

// 开关
tb.addEventListener('change',()=>{ss({enabled:tb.checked});updateUI(tb.checked)});

// 滑块
['vol','spd','dly'].forEach(id=>{
  document.getElementById(id).addEventListener('input',()=>{
    ss({[id==='vol'?'volume':id==='spd'?'speed':'delay']:parseInt(document.getElementById(id).value)});
    updateLabels();
  });
});
function updateLabels(){
  volVal.textContent=vol.value+'%';
  spdVal.textContent=(spd.value/100).toFixed(2)+'x';
  dlyVal.textContent=dly.value+'ms';
}

// 火山引擎配置保存
volcKey.addEventListener('change',()=>ss({volcano_key:volcKey.value.trim()}));
volcVoice.addEventListener('change',()=>ss({volcano_voice:volcVoice.value.trim()}));

// 折叠
volcTitle.addEventListener('click',()=>{
  volcTitle.classList.toggle('collapsed');
  volcBody.style.display = volcTitle.classList.contains('collapsed') ? 'none' : '';
});

function updateUI(en){
  if(en){sd.className='dot';st.textContent=volcKey.value?'已启用 · 火山引擎':'已启用 · 中转站'}
  else{sd.className='dot off';st.textContent='已暂停'}
}

// 测试
test.addEventListener('click',async()=>{
  test.textContent='\u23F3 ...';test.disabled=true;
  try{
    const r=await sm({action:'fetchAudio',text:'\u4F60\u597D\u4E16\u754C'});
    if(r&&r.success&&r.audioUrl){
      const a=new Audio(r.audioUrl);
      a.volume=vol.value/100;a.playbackRate=spd.value/100;
      a.play().catch(()=>{});test.textContent='\u2705';
    }else test.textContent='\u274C';
  }catch(_){test.textContent='\u274C'}
  setTimeout(()=>{test.textContent='\uD83D\uDD0A \u6D4B\u8BD5';test.disabled=false},4000);
});
