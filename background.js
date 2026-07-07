// 曼波配音 - 三引擎：本地 MiMo + 火山引擎 + 中转站
'use strict';
const bAPI = typeof browser !== 'undefined' ? browser : chrome;
const MIMO_LOCAL = 'http://localhost:3000/api/tts';
const VOLCANO_API = 'https://openspeech.bytedance.com/api/v1/tts';
const MANBO_API = 'https://api.milorapart.top/apis/mbAIsc';
let lastSpeakTime = 0;

// 配置
let engine = 'mimo';
let volcanoKey = '', volcanoVoice = 'S_TvzAcVZ72';
let mimoPort = 3000;

const VOLCANO_VOICES = {
  manbo: { name: '曼波', id: 'S_TvzAcVZ72' },
  jelpeta: { name: '杰尔佩塔', id: 'S_6lXkcVZ72' }
};

console.log('[MB] 后台就绪');

bAPI.storage.local.get(['engine', 'volcano_key', 'volcano_voice', 'mimo_port'], r => {
  if (r.engine) engine = r.engine;
  if (r.volcano_key) volcanoKey = r.volcano_key;
  if (r.volcano_voice) volcanoVoice = r.volcano_voice;
  if (r.mimo_port) mimoPort = r.mimo_port;
  console.log('[MB] 引擎:', engine);
});

bAPI.storage.onChanged.addListener(ch => {
  if (ch.engine) engine = ch.engine.newValue || 'mimo';
  if (ch.volcano_key) volcanoKey = ch.volcano_key.newValue || '';
  if (ch.volcano_voice) volcanoVoice = ch.volcano_voice.newValue || 'S_TvzAcVZ72';
  if (ch.mimo_port) mimoPort = ch.mimo_port.newValue || 3000;
});

bAPI.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'fetchAudio') {
    fetchAudio(msg.text).then(r => sendResponse(r)).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  return false;
});

async function fetchAudio(text) {
  const now = Date.now();
  if (now - lastSpeakTime < 500) return { success: false, reason: 'throttled' };
  lastSpeakTime = now;

  // 按引擎优先级调用
  if (engine === 'mimo') {
    const r = await fetchMiMo(text);
    if (r.success) return r;
    console.warn('[MB] MiMo 失败:', r.error);
    // 自动回退
    if (volcanoKey) { const r2 = await fetchVolcano(text); if (r2.success) return r2; }
    return fetchManbo(text);
  }

  if (engine === 'volcano') {
    if (!volcanoKey) return fetchManbo(text);
    const r = await fetchVolcano(text);
    if (r.success) return r;
    console.warn('[MB] 火山失败:', r.error);
    return fetchManbo(text);
  }

  return fetchManbo(text);
}

// ====== 本地 MiMo TTS Studio ======
async function fetchMiMo(text) {
  try {
    const r = await fetch(`http://localhost:${mimoPort}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'mimo-v2.5-tts-voiceclone', text, voiceAudio: '' })
    });
    if (!r.ok) return { success: false, error: `HTTP ${r.status}` };
    const blob = await r.blob();
    if (blob.size > 0) {
      return { success: true, audioUrl: URL.createObjectURL(blob) };
    }
    return { success: false, error: '空音频' };
  } catch (e) { return { success: false, error: e.message }; }
}

// ====== 火山引擎 ======
async function fetchVolcano(text) {
  try {
    const r = await fetch(VOLCANO_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': volcanoKey },
      body: JSON.stringify({
        app: { cluster: 'volcano_icl' },
        user: { uid: 'manbo-tts' },
        audio: { voice_type: volcanoVoice, encoding: 'mp3', speed_ratio: 1.0 },
        request: { reqid: Date.now() + String(Math.random()).slice(2, 6), text, operation: 'query' }
      })
    });
    const d = await r.json();
    if (d.code === 3000 && d.data) {
      const mime = (d.audio_config?.format === 'mp3') ? 'audio/mp3' : 'audio/wav';
      return { success: true, audioUrl: `data:${mime};base64,${d.data}` };
    }
    return { success: false, error: d.message || `code=${d.code}` };
  } catch (e) { return { success: false, error: e.message }; }
}

// ====== 中转站 ======
async function fetchManbo(text) {
  try {
    const r = await fetch(`${MANBO_API}?${new URLSearchParams({ text, format: 'mp3' })}`);
    const d = await r.json();
    return d.code === 200 && d.url ? { success: true, audioUrl: d.url } : { success: false, error: d.msg };
  } catch (e) { return { success: false, error: e.message }; }
}
