'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPublicDemoProject } from '@/lib/api';

interface ExploreDemoButtonProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/** Resolves the public demo project id at click time (never hardcoded — it
 * differs between local/deployed environments) and routes straight into the
 * real workspace, no auth required. Falls back to /login if no demo project
 * is currently configured. */
export default function ExploreDemoButton({ className, style, children }: ExploreDemoButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const demo = await getPublicDemoProject();
      router.push(`/projects/${demo.id}`);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
      style={{ border: 'none', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, ...style }}
    >
      {children}
    </button>
  );
}
