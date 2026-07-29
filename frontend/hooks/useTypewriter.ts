'use client';

import { useEffect, useRef, useState } from 'react';

type Phase = 'typing' | 'holding' | 'deleting' | 'gap';

interface UseTypewriterOptions {
  typingMs?: number;
  holdMs?: number;
  deletingMs?: number;
  gapMs?: number;
  caretBlinkMs?: number;
}

interface UseTypewriterResult {
  text: string;
  caretVisible: boolean;
}

/**
 * Type/hold/delete/gap loop through `words`. When `enabled` is false (reduced
 * motion or static render) it just holds the first word with no caret.
 */
export function useTypewriter(
  words: string[],
  enabled: boolean,
  options: UseTypewriterOptions = {}
): UseTypewriterResult {
  const { typingMs = 48, holdMs = 2000, deletingMs = 30, gapMs = 250, caretBlinkMs = 420 } = options;

  const [wordIndex, setWordIndex] = useState(0);
  const [charCount, setCharCount] = useState(enabled ? 0 : words[0].length);
  const [phase, setPhase] = useState<Phase>(enabled ? 'typing' : 'holding');
  const [caretVisible, setCaretVisible] = useState(true);

  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Reset the loop whenever `enabled` changes.
  useEffect(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setWordIndex(0);
    if (enabled) {
      setCharCount(0);
      setPhase('typing');
    } else {
      setCharCount(words[0].length);
      setPhase('holding');
    }
    // words is expected to be a stable reference (defined outside the component).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const currentWord = words[wordIndex];
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    if (phase === 'typing') {
      if (charCount < currentWord.length) {
        timeoutRef.current = window.setTimeout(() => setCharCount((c) => c + 1), typingMs);
      } else {
        setPhase('holding');
      }
    } else if (phase === 'holding') {
      timeoutRef.current = window.setTimeout(() => setPhase('deleting'), holdMs);
    } else if (phase === 'deleting') {
      if (charCount > 0) {
        timeoutRef.current = window.setTimeout(() => setCharCount((c) => c - 1), deletingMs);
      } else {
        timeoutRef.current = window.setTimeout(() => setPhase('gap'), gapMs);
      }
    } else if (phase === 'gap') {
      timeoutRef.current = window.setTimeout(() => {
        setWordIndex((i) => (i + 1) % words.length);
        setCharCount(0);
        setPhase('typing');
      }, gapMs);
    }

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [phase, wordIndex, charCount, enabled, words, typingMs, holdMs, deletingMs, gapMs]);

  useEffect(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (!enabled || (phase !== 'typing' && phase !== 'holding')) {
      setCaretVisible(false);
      return;
    }
    setCaretVisible(true);
    intervalRef.current = window.setInterval(() => setCaretVisible((v) => !v), caretBlinkMs);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [phase, enabled, caretBlinkMs]);

  return { text: words[wordIndex].slice(0, charCount), caretVisible };
}
