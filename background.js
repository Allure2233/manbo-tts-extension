// 曼波配音 - 后台：多音色 + 火山引擎优先 + 中转站兜底
'use strict';

const bAPI = typeof browser !== 'undefined' ? browser : chrome;
const MANBO_API = 'https://api.milorapart.top/apis/mbAIsc';
const VOLCANO_API = 'https://openspeech.bytedance.com/api/v1/tts';
let lastSpeakTime = 0;
let volcanoKey = '', volcanoVoice = 'S_TvzAcVZ72', currentVoice = 'manbo';

// 音色表
const VOICES = {
  manbo:    { name: '曼波',    voiceId: 'S_TvzAcVZ72' },
  jelpeta:  { name: '杰尔佩塔', voiceId: 'S_6lXkcVZ72' }
};

console.log('[MB] 后台就绪');

bAPI.storage.local.get(['volcano_key', 'volcano_voice', 'current_voice'], r => {
  if (r.volcano_key) volcanoKey = r.volcano_key;
  if (r.current_voice) currentVoice = r.current_voice;
  volcanoVoice = VOICES[currentVoice]?.voiceId || VOICES.manbo.voiceId;
  console.log('[MB] 音色:', currentVoice, volcanoKey ? '火山引擎' : '中转站');
});

bAPI.storage.onChanged.addListener(ch => {
  if (ch.volcano_key) volcanoKey = ch.volcano_key.newValue || '';
  if (ch.current_voice) {
    currentVoice = ch.current_voice.newValue || 'manbo';
    volcanoVoice = VOICES[currentVoice]?.voiceId || VOICES.manbo.voiceId;
    console.log('[MB] 切换音色:', currentVoice, volcanoVoice);
  }
});

bAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchAudio') {
    fetchAudio(message.text).then(r => sendResponse(r)).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  return false;
});

async function fetchAudio(text) {
  // 火山引擎优先
  if (volcanoKey && volcanoVoice) {
    const r = await fetchVolcano(text);
    if (r.success) return r;
    console.log('[MB] 火山失败，回退:', r.error);
  }
  // 中转站兜底（仅限曼波）
  if (currentVoice === 'manbo') return fetchManbo(text);
  return { success: false, error: '火山引擎失败，中转站仅支持曼波' };
}

async function fetchManbo(text) {
  const now = Date.now();
  if (now - lastSpeakTime < 800) return { success: false, reason: 'throttled' };
  lastSpeakTime = now;
  try {
    const r = await fetch(`${MANBO_API}?${new URLSearchParams({ text, format: 'mp3' })}`);
    const d = await r.json();
    return d.code === 200 && d.url ? { success: true, audioUrl: d.url } : { success: false, error: d.msg };
  } catch (e) { return { success: false, error: e.message }; }
}

async function fetchVolcano(text) {
  const now = Date.now();
  if (now - lastSpeakTime < 400) return { success: false, reason: 'throttled' };
  lastSpeakTime = now;
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
      const mime = (d.audio_config && d.audio_config.format === 'mp3') ? 'audio/mp3' : 'audio/wav';
      return { success: true, audioUrl: `data:${mime};base64,${d.data}` };
    }
    return { success: false, error: d.message || `code=${d.code}` };
  } catch (e) { return { success: false, error: e.message }; }
}
