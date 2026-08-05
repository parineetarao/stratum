'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { getDemoProject } from '@/lib/api';

export default function DemoPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDemoProject()
      .then(({ project_id }) => {
        if (!cancelled) router.replace(`/projects/${project_id}`);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#020305] text-white flex flex-col items-center justify-center p-6">
      <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-8 max-w-xl w-full text-center shadow-2xl">
        {!failed ? (
          <>
            <Loader2 size={28} className="animate-spin mx-auto mb-4 text-[#8b7dff]" />
            <h1 className="text-xl font-bold mb-2">Loading the Stratum demo…</h1>
            <p className="text-slate-400 text-sm">Taking you into a live, pre-built Pagila DVD rental analysis.</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={22} className="text-red-400" />
            </div>
            <h1 className="text-xl font-bold mb-2">Demo is temporarily unavailable</h1>
            <p className="text-slate-400 text-sm mb-6">Please check back soon.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} /> Back to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
