// popup.js - 简洁版
'use strict';
const bAPI = typeof browser !== 'undefined' ? browser : chrome;
const tb = document.getElementById('tb'), sd = document.getElementById('sd'), st = document.getElementById('st'), test = document.getElementById('test');
const vol = document.getElementById('vol'), spd = document.getElementById('spd'), dly = document.getElementById('dly');
const volVal = document.getElementById('volVal'), spdVal = document.getElementById('spdVal'), dlyVal = document.getElementById('dlyVal');
const mimoKey = document.getElementById('mimoKey'), uploadArea = document.getElementById('uploadArea'), voiceFile = document.getElementById('voiceFile');

function sg(k) { return new Promise(r => { try { const v = bAPI.storage.local.get(k); if (v && typeof v.then === 'function') { v.then(r).catch(() => r({})); return; } } catch (_) {} try { bAPI.storage.local.get(k, v => r(v || {})); } catch (_) { r({}); } }); }
function ss(o) { return new Promise(r => { try { const v = bAPI.storage.local.set(o); if (v && typeof v.then === 'function') { v.then(r).catch(r); return; } } catch (_) {} try { bAPI.storage.local.set(o, r); } catch (_) { r(); } }); }
function sm(m) { return new Promise(r => { try { const v = bAPI.runtime.sendMessage(m); if (v && typeof v.then === 'function') { v.then(r).catch(() => r(null)); return; } } catch (_) {} try { bAPI.runtime.sendMessage(m, v => r(v || null)); } catch (_) { r(null); } }); }

// 加载
sg(['enabled', 'mimo_key', 'mimo_voice_b64', 'volume', 'speed', 'delay']).then(r => {
  tb.checked = r.enabled !== undefined ? r.enabled : true;
  if (r.mimo_key) mimoKey.value = r.mimo_key;
  if (r.mimo_voice_b64) { uploadArea.textContent = '✅ 声音已上传'; uploadArea.classList.add('done'); }
  vol.value = r.volume || 100; spd.value = r.speed || 100; dly.value = r.delay || 300;
  updateUI(tb.checked); updateLabels();
});

// 开关
tb.addEventListener('change', () => { ss({ enabled: tb.checked }); updateUI(tb.checked); });

// API Key
mimoKey.addEventListener('change', () => ss({ mimo_key: mimoKey.value.trim() }));

// 上传声音
uploadArea.addEventListener('click', () => voiceFile.click());
voiceFile.addEventListener('change', () => {
  const file = voiceFile.files[0];
  if (!file) return;
  uploadArea.textContent = '处理中...';
  const reader = new FileReader();
  reader.onload = () => {
    ss({ mimo_voice_b64: reader.result });
    uploadArea.textContent = '✅ ' + file.name;
    uploadArea.classList.add('done');
  };
  reader.onerror = () => { uploadArea.textContent = '❌ 失败'; };
  reader.readAsDataURL(file);
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
  if (en) { sd.className = 'dot'; st.textContent = '已启用'; } else { sd.className = 'dot off'; st.textContent = '已暂停'; }
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
