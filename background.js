// 曼波配音 - 后台：MiMo TTS + 中转站双引擎
'use strict';

const bAPI = typeof browser !== 'undefined' ? browser : chrome;
const MANBO_API = 'https://api.milorapart.top/apis/mbAIsc';
const MIMO_TTS_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
let lastSpeakTime = 0;
let mimoKey = '', mimoVoiceB64 = '', engine = 'mimo';

// 音色表（火山引擎）
const VOLCANO_VOICES = {
  manbo: { name: '曼波', voiceId: 'S_TvzAcVZ72' },
  jelpeta: { name: '杰尔佩塔', voiceId: 'S_6lXkcVZ72' }
};

let volcanoKey = '', volcanoVoice = 'S_TvzAcVZ72', currentVoice = 'manbo';

console.log('[MB] 后台就绪');

// 加载配置
bAPI.storage.local.get(['mimo_key', 'mimo_voice_b64', 'engine', 'volcano_key', 'current_voice'], r => {
  if (r.mimo_key) mimoKey = r.mimo_key;
  if (r.mimo_voice_b64) mimoVoiceB64 = r.mimo_voice_b64;
  if (r.engine) engine = r.engine;
  if (r.volcano_key) volcanoKey = r.volcano_key;
  if (r.current_voice) currentVoice = r.current_voice;
  volcanoVoice = VOLCANO_VOICES[currentVoice]?.voiceId || VOLCANO_VOICES.manbo.voiceId;
  console.log('[MB] 引擎:', engine, '| MiMo:', mimoKey ? '已配' : '未配', '| 火山:', volcanoKey ? '已配' : '未配');
});

bAPI.storage.onChanged.addListener(ch => {
  if (ch.mimo_key) mimoKey = ch.mimo_key.newValue || '';
  if (ch.mimo_voice_b64) mimoVoiceB64 = ch.mimo_voice_b64.newValue || '';
  if (ch.engine) engine = ch.engine.newValue || 'mimo';
  if (ch.volcano_key) volcanoKey = ch.volcano_key.newValue || '';
  if (ch.current_voice) {
    currentVoice = ch.current_voice.newValue || 'manbo';
    volcanoVoice = VOLCANO_VOICES[currentVoice]?.voiceId || VOLCANO_VOICES.manbo.voiceId;
  }
});

bAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchAudio') {
    fetchAudio(message.text).then(r => sendResponse(r)).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  return false;
});

// ====== 主入口：按引擎优先级调用 ======
async function fetchAudio(text) {
  const now = Date.now();
  if (now - lastSpeakTime < 500) return { success: false, reason: 'throttled' };
  lastSpeakTime = now;

  // MiMo TTS（克隆声音）
  if (engine === 'mimo' && mimoKey && mimoVoiceB64) {
    const r = await fetchMiMo(text);
    if (r.success) return r;
    console.log('[MB] MiMo 失败:', r.error);
  }

  // 火山引擎
  if (engine === 'volcano' && volcanoKey && volcanoVoice) {
    const r = await fetchVolcano(text);
    if (r.success) return r;
    console.log('[MB] 火山失败:', r.error);
  }

  // 中转站兜底
  return fetchManbo(text);
}

// ====== MiMo TTS API ======
async function fetchMiMo(text) {
  try {
    const r = await fetch(MIMO_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mimoKey}`
      },
      body: JSON.stringify({
        model: 'mimo-v2.5-tts-voiceclone',
        messages: [{ role: 'assistant', content: text }],
        audio: { format: 'pcm16', voice: mimoVoiceB64 },
        stream: false
      })
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      return { success: false, error: `MiMo HTTP ${r.status}: ${errText.slice(0, 100)}` };
    }

    const data = await r.json();
    const audioData = data.choices?.[0]?.message?.audio?.data;
    if (audioData) {
      // PCM16 -> WAV
      const pcmBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
      const wavBuffer = buildWav(pcmBytes);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      return { success: true, audioUrl: url };
    }
    return { success: false, error: '无音频数据' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// PCM16 -> WAV
function buildWav(pcmData) {
  const SAMPLE_RATE = 24000, CHANNELS = 1, BITS = 16;
  const len = pcmData.byteLength;
  const buf = new ArrayBuffer(44 + len);
  const v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + len, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, CHANNELS, true); v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * CHANNELS * (BITS / 8), true);
  v.setUint16(32, CHANNELS * (BITS / 8), true); v.setUint16(34, BITS, true);
  w(36, 'data'); v.setUint32(40, len, true);
  new Uint8Array(buf).set(pcmData, 44);
  return buf;
}

// ====== 火山引擎 ======
async function fetchVolcano(text) {
  try {
    const r = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
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

// ====== 中转站 ======
async function fetchManbo(text) {
  try {
    const r = await fetch(`${MANBO_API}?${new URLSearchParams({ text, format: 'mp3' })}`);
    const d = await r.json();
    return d.code === 200 && d.url ? { success: true, audioUrl: d.url } : { success: false, error: d.msg };
  } catch (e) { return { success: false, error: e.message }; }
}
