// popup.js - 三引擎 + 声音上传
'use strict';
const bAPI = typeof browser !== 'undefined' ? browser : chrome;
const tb = document.getElementById('tb'), sd = document.getElementById('sd'), st = document.getElementById('st'), test = document.getElementById('test');
const vol = document.getElementById('vol'), spd = document.getElementById('spd'), dly = document.getElementById('dly');
const volVal = document.getElementById('volVal'), spdVal = document.getElementById('spdVal'), dlyVal = document.getElementById('dlyVal');
const volcKey = document.getElementById('volcKey'), mimoPort = document.getElementById('mimoPort');
const uploadArea = document.getElementById('uploadArea'), voiceFile = document.getElementById('voiceFile');
const engBtns = document.querySelectorAll('.eng-btn[data-engine]');
const voiceBtns = document.querySelectorAll('.eng-btn[data-voice]');
let currentEngine = 'mimo', currentVoice = 'manbo';

function sg(k) { return new Promise(r => { try { const v = bAPI.storage.local.get(k); if (v && typeof v.then === 'function') { v.then(r).catch(() => r({})); return; } } catch (_) {} try { bAPI.storage.local.get(k, v => r(v || {})); } catch (_) { r({}); } }); }
function ss(o) { return new Promise(r => { try { const v = bAPI.storage.local.set(o); if (v && typeof v.then === 'function') { v.then(r).catch(r); return; } } catch (_) {} try { bAPI.storage.local.set(o, r); } catch (_) { r(); } }); }
function sm(m) { return new Promise(r => { try { const v = bAPI.runtime.sendMessage(m); if (v && typeof v.then === 'function') { v.then(r).catch(() => r(null)); return; } } catch (_) {} try { bAPI.runtime.sendMessage(m, v => r(v || null)); } catch (_) { r(null); } }); }

// 加载
sg(['enabled', 'engine', 'volcano_key', 'volcano_voice', 'mimo_port', 'mimo_voice_b64', 'volume', 'speed', 'delay']).then(r => {
  tb.checked = r.enabled !== undefined ? r.enabled : true;
  currentEngine = r.engine || 'mimo';
  currentVoice = r.volcano_voice || 'manbo';
  if (r.volcano_key) volcKey.value = r.volcano_key;
  mimoPort.value = r.mimo_port || 3000;
  vol.value = r.volume || 100; spd.value = r.speed || 100; dly.value = r.delay || 300;
  if (r.mimo_voice_b64) {
    uploadArea.innerHTML = '✅ 声音已上传<div class="file-name">点击更换</div>';
    uploadArea.classList.add('done');
  }
  setEngineUI(currentEngine); setVoiceUI(currentVoice); updateUI(tb.checked); updateLabels();
});

// 开关
tb.addEventListener('change', () => { ss({ enabled: tb.checked }); updateUI(tb.checked); });

// 引擎切换
engBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentEngine = btn.dataset.engine;
    ss({ engine: currentEngine });
    setEngineUI(currentEngine);
  });
});

function setEngineUI(e) {
  engBtns.forEach(b => b.classList.toggle('active', b.dataset.engine === e));
  const names = { mimo: 'MiMo 本地', volcano: '火山引擎', manbo: '中转站' };
  if (tb.checked) st.textContent = '已启用 · ' + names[e];
  document.getElementById('mimoSection').style.display = e === 'mimo' ? '' : 'none';
  document.getElementById('volcSection').style.display = e === 'volcano' ? '' : 'none';
  document.getElementById('manboSection').style.display = e === 'manbo' ? '' : 'none';
}

// 音色切换
voiceBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentVoice = btn.dataset.voice;
    ss({ volcano_voice: currentVoice });
    setVoiceUI(currentVoice);
  });
});
function setVoiceUI(v) { voiceBtns.forEach(b => b.classList.toggle('active', b.dataset.voice === v)); }

// 配置保存
volcKey.addEventListener('change', () => ss({ volcano_key: volcKey.value.trim() }));
mimoPort.addEventListener('change', () => ss({ mimo_port: parseInt(mimoPort.value) || 3000 }));

// 上传声音文件
uploadArea.addEventListener('click', () => voiceFile.click());
voiceFile.addEventListener('change', () => {
  const file = voiceFile.files[0];
  if (!file) return;
  uploadArea.textContent = '处理中...';
  const reader = new FileReader();
  reader.onload = () => {
    ss({ mimo_voice_b64: reader.result });
    uploadArea.innerHTML = '✅ ' + file.name + '<div class="file-name">点击更换</div>';
    uploadArea.classList.add('done');
  };
  reader.onerror = () => { uploadArea.textContent = '❌ 失败'; };
  reader.readAsDataURL(file);
});

// 折叠
document.querySelectorAll('.section-title').forEach(title => {
  title.addEventListener('click', () => {
    title.classList.toggle('collapsed');
    const body = title.nextElementSibling;
    if (body) body.style.display = title.classList.contains('collapsed') ? 'none' : '';
  });
});

// 滑块
['vol', 'spd', 'dly'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    ss({ [id === 'vol' ? 'volume' : id === 'spd' ? 'speed' : 'delay']: parseInt(document.getElementById(id).value) });
    updateLabels();
  });
});
function updateLabels() { volVal.textContent = vol.value + '%'; spdVal.textContent = (spd.value / 100).toFixed(2) + 'x'; dlyVal.textContent = dly.value + 'ms'; }

function updateUI(en) {
  if (en) { sd.className = 'dot'; } else { sd.className = 'dot off'; st.textContent = '已暂停'; }
}

// 测试
test.addEventListener('click', async () => {
  test.textContent = '⏳ ...'; test.disabled = true;
  try {
    const r = await sm({ action: 'fetchAudio', text: '你好世界' });
    if (r && r.success && r.audioUrl) {
      const a = new Audio(r.audioUrl); a.volume = vol.value / 100; a.playbackRate = spd.value / 100;
      a.play().catch(() => {}); test.textContent = '✅ 播放中';
    } else test.textContent = '❌ ' + ((r && r.error) || '失败');
  } catch (_) { test.textContent = '❌ 错误'; }
  setTimeout(() => { test.textContent = '🔊 测试朗读'; test.disabled = false; }, 4000);
});
