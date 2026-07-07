// 曼波配音 - MiMo 克隆 + 中转站双引擎
'use strict';
const bAPI = typeof browser !== 'undefined' ? browser : chrome;
const MIMO_TTS_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
const MANBO_API = 'https://api.milorapart.top/apis/mbAIsc';
let lastSpeakTime = 0, mimoKey = '', mimoVoiceB64 = '';

console.log('[MB] 后台就绪');

bAPI.storage.local.get(['mimo_key', 'mimo_voice_b64'], r => {
  if (r.mimo_key) mimoKey = r.mimo_key;
  if (r.mimo_voice_b64) mimoVoiceB64 = r.mimo_voice_b64;
  console.log('[MB] MiMo:', mimoKey ? '已配' : '未配', '| 声音:', mimoVoiceB64 ? '已上传' : '未上传');
});

bAPI.storage.onChanged.addListener(ch => {
  if (ch.mimo_key) mimoKey = ch.mimo_key.newValue || '';
  if (ch.mimo_voice_b64) mimoVoiceB64 = ch.mimo_voice_b64.newValue || '';
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

  // 优先 MiMo 克隆
  if (mimoKey && mimoVoiceB64) {
    const r = await fetchMiMo(text);
    if (r.success) return r;
    console.warn('[MB] MiMo 失败，回退中转站:', r.error);
  }
  // 中转站兜底
  return fetchManbo(text);
}

async function fetchMiMo(text) {
  try {
    const r = await fetch(MIMO_TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mimoKey}` },
      body: JSON.stringify({
        model: 'mimo-v2.5-tts-voiceclone',
        messages: [{ role: 'assistant', content: text }],
        audio: { format: 'pcm16', voice: mimoVoiceB64 },
        stream: false
      })
    });
    if (!r.ok) return { success: false, error: `HTTP ${r.status}` };
    const data = await r.json();
    const audioData = data.choices?.[0]?.message?.audio?.data;
    if (audioData) {
      const pcm = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
      const wav = buildWav(pcm);
      return { success: true, audioUrl: URL.createObjectURL(new Blob([wav], { type: 'audio/wav' })) };
    }
    return { success: false, error: '无音频' };
  } catch (e) { return { success: false, error: e.message }; }
}

function buildWav(pcm) {
  const buf = new ArrayBuffer(44 + pcm.byteLength), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.byteLength, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 24000, true); v.setUint32(28, 48000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, pcm.byteLength, true);
  new Uint8Array(buf).set(pcm, 44);
  return buf;
}

async function fetchManbo(text) {
  try {
    const r = await fetch(`${MANBO_API}?${new URLSearchParams({ text, format: 'mp3' })}`);
    const d = await r.json();
    return d.code === 200 && d.url ? { success: true, audioUrl: d.url } : { success: false, error: d.msg };
  } catch (e) { return { success: false, error: e.message }; }
}
