'use client';

import { useEffect, useState } from 'react';

export function useViewportWidth(initial = 1400): number {
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return width;
}
