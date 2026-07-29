'use client';

import { useRouter } from 'next/navigation';
import { PlayCircle, ArrowLeft, CheckCircle } from 'lucide-react';

export default function DemoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020817] text-white flex flex-col items-center justify-center p-6">
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-2xl p-8 max-w-xl w-full text-center shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
          <PlayCircle size={24} className="text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Stratum Platform Walkthrough</h1>
        <p className="text-slate-400 text-sm mb-6">Experience automated analytics engineering, schema discovery, and AI insights in action.</p>
        
        <div className="aspect-video bg-[#020817] border border-[#1e3a5f] rounded-xl flex flex-col items-center justify-center p-6 mb-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-violet-600/10" />
          <PlayCircle size={48} className="text-blue-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
          <span className="text-white text-sm font-semibold relative z-10">Interactive Interactive Demo Preview</span>
          <span className="text-slate-500 text-xs mt-1 relative z-10">Runtime: 3 mins 45 secs</span>
        </div>

        <div className="flex justify-center gap-4">
          <button onClick={() => router.push('/')} className="bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </button>
          <button onClick={() => router.push('/register')} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors shadow-lg shadow-blue-500/20">
            Start Free Trial
          </button>
        </div>
      </div>
    </div>
  );
}
