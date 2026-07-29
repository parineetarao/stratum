'use client';

import { useEffect, useState } from 'react';

export function useHasHover(): boolean {
  const [hasHover, setHasHover] = useState(true);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setHasHover(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return hasHover;
}
