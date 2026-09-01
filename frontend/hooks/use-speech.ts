'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function playBeep(frequency = 880, duration = 120, type: OscillatorType = 'sine') {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
    setTimeout(() => ctx.close(), duration + 50);
  } catch {
    // ignore
  }
}

export function useSpeech(lang = 'fr-FR') {
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    const hasSpeech = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    const hasSynthesis = 'speechSynthesis' in window;
    setSupported(hasSpeech && hasSynthesis);
  }, []);

  const beepStart = useCallback(() => playBeep(880, 120), []);
  const beepEnd = useCallback(() => playBeep(440, 120), []);
  const beepError = useCallback(() => playBeep(220, 200, 'sawtooth'), []);

  const speak = useCallback(
    (text: string) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = 1;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
    },
    [lang],
  );

  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current && listeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      listeningRef.current = false;
    }
  }, []);

  const listen = useCallback(
    (onChange?: (text: string) => void): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!supported) {
          reject(new Error('Reconnaissance vocale non supportee'));
          return;
        }
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SR();
        recognition.lang = lang;
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        let finalText = '';
        let hasResult = false;

        recognition.onstart = () => {
          listeningRef.current = true;
          beepStart();
        };

        recognition.onresult = (event: any) => {
          hasResult = true;
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcript;
            } else {
              interim += transcript;
            }
          }
          onChange?.(finalText + interim);
        };

        recognition.onerror = (event: any) => {
          listeningRef.current = false;
          beepError();
          reject(new Error(event.error || 'Erreur micro'));
        };

        recognition.onend = () => {
          listeningRef.current = false;
          if (hasResult) {
            beepEnd();
            resolve(finalText.trim());
          } else {
            beepError();
            resolve('');
          }
        };

        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch (err) {
          reject(err);
        }
      });
    },
    [supported, lang, beepStart, beepEnd, beepError],
  );

  return { supported, listen, speak, cancel };
}
