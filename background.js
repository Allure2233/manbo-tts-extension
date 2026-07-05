// 曼波配音 - 后台：火山引擎优先，失败自动回退中转站
'use strict';

const bAPI = typeof browser !== 'undefined' ? browser : chrome;
const MANBO_API = 'https://api.milorapart.top/apis/mbAIsc';
const VOLCANO_API = 'https://openspeech.bytedance.com/api/v1/tts';
let lastSpeakTime = 0;
let volcanoKey = '', volcanoVoice = '';

bAPI.storage.local.get(['volcano_key', 'volcano_voice'], r => {
  if (r.volcano_key) volcanoKey = r.volcano_key;
  if (r.volcano_voice) volcanoVoice = r.volcano_voice;
  console.log('[MB] 火山:', volcanoKey ? '已配' : '未配 | 中转站');
});
bAPI.storage.onChanged.addListener(ch => {
  if (ch.volcano_key) volcanoKey = ch.volcano_key.newValue || '';
  if (ch.volcano_voice) volcanoVoice = ch.volcano_voice.newValue || '';
});

bAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchAudio') {
    fetchAudio(message.text).then(r => sendResponse(r)).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  return false;
});

async function fetchAudio(text) {
  // 优先火山引擎
  if (volcanoKey && volcanoVoice) {
    const r = await fetchVolcano(text);
    if (r.success) return r;
    console.log('[MB] 火山失败，回退中转站:', r.error);
  }
  return fetchManbo(text);
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
