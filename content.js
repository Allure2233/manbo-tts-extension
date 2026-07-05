// 曼波配音 - 音量/语速/延迟可调 + 播放指示
(function () {
  'use strict';
  const bAPI = typeof browser !== 'undefined' ? browser : chrome;

  let enabled = false, hoverTimer = null;
  let audioEl = null, lastSrc = '';
  let volume = 1.0, speed = 1.0, hoverDelay = 300;
  let currentHoveredEl = null, playingEl = null;

  function sg(k){return new Promise(r=>{try{const v=bAPI.storage.local.get(k);if(v&&typeof v.then==='function'){v.then(r).catch(()=>r({}));return}}catch(_){}try{bAPI.storage.local.get(k,v=>r(v||{}))}catch(_){r({})}})}
  function sm(m){return new Promise(r=>{try{const v=bAPI.runtime.sendMessage(m);if(v&&typeof v.then==='function'){v.then(r).catch(()=>r(null));return}}catch(_){}try{bAPI.runtime.sendMessage(m,v=>r(v||null))}catch(_){r(null)}})}

  // ====== 播放指示：元素短暂高亮 ======
  function showPlaying(el) {
    if (!el) return;
    playingEl = el;
    const orig = el.style.outline;
    el.style.outline = '2px solid #667eea';
    el.style.outlineOffset = '1px';
    el.style.transition = 'outline 0.15s';
    setTimeout(() => {
      el.style.outline = orig || '';
      el.style.outlineOffset = '';
      playingEl = null;
    }, 800);
  }

  // ====== 音频 ======
  function ensureAudio() {
    if (!audioEl) { audioEl = document.createElement('audio'); audioEl.style.display = 'none'; audioEl.setAttribute('playsinline', ''); (document.body || document.documentElement).appendChild(audioEl); }
    return audioEl;
  }

  async function speakText(text) {
    const el = currentHoveredEl; // 记录触发朗读的元素
    const r = await sm({ action: 'fetchAudio', text });
    if (r && r.success && r.audioUrl) {
      const a = ensureAudio(); a.pause(); a.currentTime = 0;
      a.volume = volume; a.playbackRate = speed;
      if (r.audioUrl !== lastSrc) { lastSrc = r.audioUrl; a.src = r.audioUrl; }
      a.play().catch(() => {});
      showPlaying(el); // 播放指示
    }
  }

  // ====== 光标 ======
  function setReadCursor(el) { el.style.cursor = 'pointer'; }
  function resetCursor(el) { el.style.cursor = ''; }

  // ====== 文字提取 ======
  function allText(el) {
    try { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return ''; } catch (_) { return ''; }
    let t = ''; for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) t += n.textContent;
      else if (n.nodeType === Node.ELEMENT_NODE) { let v = true; try { const cs = getComputedStyle(n); v = cs.display !== 'none' && cs.visibility !== 'hidden'; } catch (_) { } if (v) t += allText(n); }
    } return t;
  }
  function elText(el) {
    if (!el) return ''; let t = allText(el); if (t.trim()) return t.trim();
    t = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || el.getAttribute('placeholder') || '';
    if (t.trim()) return t.trim();
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') { t = el.value || ''; if (t.trim()) return t.trim(); } return '';
  }
  function ok(t) { return t && t.length >= 1 && t.length <= 300 && /[\u4e00-\u9fff\u3400-\u4dbfa-zA-Z]/.test(t); }

  // ====== 鼠标 ======
  function mm(e) {
    if (!enabled) return;
    let el; try { el = document.elementFromPoint(e.clientX, e.clientY); } catch (_) { return; }

    // 恢复上一个
    if (currentHoveredEl && currentHoveredEl !== el) { resetCursor(currentHoveredEl); }
    currentHoveredEl = null;

    if (!el || el === document.body || el === document.documentElement) return;

    const ig = new Set(['SCRIPT', 'STYLE', 'SVG', 'PATH', 'CIRCLE', 'RECT', 'G', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'IFRAME', 'BR', 'HR', 'META', 'LINK', 'HEAD', 'NOSCRIPT']);
    if (ig.has(el.tagName)) return;

    const text = elText(el);
    if (!ok(text)) return;

    currentHoveredEl = el;
    setReadCursor(el);
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => speakText(text), hoverDelay);
  }
  function ml() {
    clearTimeout(hoverTimer);
    if (currentHoveredEl) { resetCursor(currentHoveredEl); currentHoveredEl = null; }
  }

  // ====== 启停 ======
  let li = false;
  function on() { if (li) return; li = true; document.addEventListener('mousemove', mm, { passive: true }); document.addEventListener('mouseleave', ml); }
  function off() { if (!li) return; li = false; document.removeEventListener('mousemove', mm); document.removeEventListener('mouseleave', ml); clearTimeout(hoverTimer); if (currentHoveredEl) { resetCursor(currentHoveredEl); currentHoveredEl = null; } }

  // ====== 初始化 ======
  sg(['enabled', 'volume', 'speed', 'delay']).then(r => {
    enabled = r.enabled !== undefined ? r.enabled : true;
    volume = (r.volume || 100) / 100;
    speed = (r.speed || 100) / 100;
    hoverDelay = r.delay || 300;
    if (enabled) on();
  });
  bAPI.storage.onChanged.addListener(ch => {
    if (ch.enabled) { enabled = ch.enabled.newValue; enabled ? on() : off(); }
    if (ch.volume) volume = ch.volume.newValue / 100;
    if (ch.speed) speed = ch.speed.newValue / 100;
    if (ch.delay) hoverDelay = ch.delay.newValue;
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { if (enabled) on(); });
})();
