import { useRef, useState, useCallback } from 'react';

// Wraps the browser Speech Synthesis API. Long text is split into sentences
// because Chrome stops reading very long utterances.
export default function useSpeech() {
  const [status, setStatus] = useState('idle'); // idle | playing | paused
  const run = useRef(0);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = useCallback(() => {
    if (!supported) return;
    run.current++;
    window.speechSynthesis.cancel();
    setStatus('idle');
  }, [supported]);

  const speak = useCallback((text) => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    const id = ++run.current;
    const parts = text.match(/[^.!?\n]+[.!?]*/g) || [text];
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part.trim());
      if (i === 0) u.onstart = () => run.current === id && setStatus('playing');
      if (i === parts.length - 1) u.onend = () => run.current === id && setStatus('idle');
      u.onerror = () => run.current === id && setStatus('idle');
      window.speechSynthesis.speak(u);
    });
  }, [supported]);

  const pause = () => { window.speechSynthesis.pause(); setStatus('paused'); };
  const resume = () => { window.speechSynthesis.resume(); setStatus('playing'); };

  return { supported, status, speak, pause, resume, stop };
}
