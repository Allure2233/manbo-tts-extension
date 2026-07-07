// popup.js - 三引擎配置
'use strict';
const bAPI = typeof browser !== 'undefined' ? browser : chrome;
const tb = document.getElementById('tb'), sd = document.getElementById('sd'), st = document.getElementById('st'), test = document.getElementById('test');
const vol = document.getElementById('vol'), spd = document.getElementById('spd'), dly = document.getElementById('dly');
const volVal = document.getElementById('volVal'), spdVal = document.getElementById('spdVal'), dlyVal = document.getElementById('dlyVal');
const mimoKey = document.getElementById('mimoKey'), volcKey = document.getElementById('volcKey');
const uploadArea = document.getElementById('uploadArea'), voiceFile = document.getElementById('voiceFile');
const engBtns = document.querySelectorAll('.eng-btn[data-engine]');
const voiceBtns = document.querySelectorAll('.eng-btn[data-voice]');
let currentEngine = 'mimo', currentVoice = 'manbo';

function sg(k) { return new Promise(r => { try { const v = bAPI.storage.local.get(k); if (v && typeof v.then === 'function') { v.then(r).catch(() => r({})); return; } } catch (_) {} try { bAPI.storage.local.get(k, v => r(v || {})); } catch (_) { r({}); } }); }
function ss(o) { return new Promise(r => { try { const v = bAPI.storage.local.set(o); if (v && typeof v.then === 'function') { v.then(r).catch(r); return; } } catch (_) {} try { bAPI.storage.local.set(o, r); } catch (_) { r(); } }); }
function sm(m) { return new Promise(r => { try { const v = bAPI.runtime.sendMessage(m); if (v && typeof v.then === 'function') { v.then(r).catch(() => r(null)); return; } } catch (_) {} try { bAPI.runtime.sendMessage(m, v => r(v || null)); } catch (_) { r(null); } }); }

// 加载
sg(['enabled', 'engine', 'current_voice', 'mimo_key', 'volcano_key', 'volume', 'speed', 'delay']).then(r => {
  tb.checked = r.enabled !== undefined ? r.enabled : true;
  currentEngine = r.engine || 'mimo';
  currentVoice = r.current_voice || 'manbo';
  if (r.mimo_key) mimoKey.value = r.mimo_key;
  if (r.volcano_key) volcKey.value = r.volcano_key;
  vol.value = r.volume || 100; spd.value = r.speed || 100; dly.value = r.delay || 300;
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
  const names = { mimo: 'MiMo 克隆', volcano: '火山引擎', manbo: '中转站' };
  if (tb.checked) st.textContent = '已启用 · ' + names[e];
}

// 音色切换（火山引擎）
voiceBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentVoice = btn.dataset.voice;
    ss({ current_voice: currentVoice });
    setVoiceUI(currentVoice);
  });
});

function setVoiceUI(v) {
  voiceBtns.forEach(b => b.classList.toggle('active', b.dataset.voice === v));
}

// MiMo API Key
mimoKey.addEventListener('change', () => ss({ mimo_key: mimoKey.value.trim() }));

// 火山 API Key
volcKey.addEventListener('change', () => ss({ volcano_key: volcKey.value.trim() }));

// 上传声音文件
uploadArea.addEventListener('click', () => voiceFile.click());
voiceFile.addEventListener('change', async () => {
  const file = voiceFile.files[0];
  if (!file) return;
  uploadArea.textContent = '正在处理...';
  try {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result; // data:audio/mp3;base64,...
      ss({ mimo_voice_b64: b64 });
      uploadArea.textContent = '✅ ' + file.name;
      uploadArea.classList.add('has-file');
    };
    reader.onerror = () => { uploadArea.textContent = '❌ 读取失败'; };
    reader.readAsDataURL(file);
  } catch (_) {
    uploadArea.textContent = '❌ 处理失败';
  }
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
  test.textContent = '\u23F3 ...'; test.disabled = true;
  try {
    const r = await sm({ action: 'fetchAudio', text: '\u4F60\u597D\u4E16\u754C' });
    if (r && r.success && r.audioUrl) {
      const a = new Audio(r.audioUrl); a.volume = vol.value / 100; a.playbackRate = spd.value / 100;
      a.play().catch(() => {}); test.textContent = '\u2705';
    } else test.textContent = '\u274C ' + ((r && r.error) || '');
  } catch (_) { test.textContent = '\u274C'; }
  setTimeout(() => { test.textContent = '\uD83D\uDD0A \u6D4B\u8BD5'; test.disabled = false; }, 4000);
});
