const fs = require('fs');

const pageCode = `'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Database, Cloud, Server, FileText, MoreVertical, Search, BarChart2, ShieldCheck,
  Package, PieChart, Zap, Box, Sparkles, Terminal, LayoutGrid,
  Code2, FlaskConical, User, Crown, Shield, Cpu, Layers, PlayCircle, ArrowRight,
  CheckCircle, Github, Linkedin, Activity, Circle, Target, Lock, Network, Headphones
} from 'lucide-react';

// Static starfield
const STARS = [
  { x: 3, y: 8, size: 1, opacity: 0.3 }, { x: 7, y: 22, size: 1, opacity: 0.2 },
  { x: 12, y: 5, size: 2, opacity: 0.15 }, { x: 18, y: 35, size: 1, opacity: 0.25 },
  { x: 24, y: 15, size: 1, opacity: 0.3 }, { x: 31, y: 42, size: 2, opacity: 0.15 },
  { x: 38, y: 8, size: 1, opacity: 0.2 }, { x: 44, y: 28, size: 1, opacity: 0.35 },
  { x: 50, y: 18, size: 2, opacity: 0.1 }, { x: 56, y: 45, size: 1, opacity: 0.25 },
  { x: 63, y: 12, size: 1, opacity: 0.3 }, { x: 69, y: 32, size: 2, opacity: 0.15 },
  { x: 75, y: 6, size: 1, opacity: 0.2 }, { x: 82, y: 38, size: 1, opacity: 0.3 },
  { x: 88, y: 20, size: 2, opacity: 0.15 }, { x: 94, y: 48, size: 1, opacity: 0.25 },
  { x: 5, y: 55, size: 1, opacity: 0.2 }, { x: 11, y: 72, size: 2, opacity: 0.1 },
  { x: 17, y: 62, size: 1, opacity: 0.3 }, { x: 23, y: 85, size: 1, opacity: 0.15 },
  { x: 29, y: 58, size: 2, opacity: 0.2 }, { x: 35, y: 78, size: 1, opacity: 0.25 },
  { x: 41, y: 65, size: 1, opacity: 0.35 }, { x: 47, y: 90, size: 2, opacity: 0.1 },
  { x: 53, y: 55, size: 1, opacity: 0.2 }, { x: 59, y: 82, size: 1, opacity: 0.3 },
  { x: 65, y: 68, size: 2, opacity: 0.15 }, { x: 71, y: 52, size: 1, opacity: 0.25 },
  { x: 77, y: 88, size: 1, opacity: 0.2 }, { x: 83, y: 72, size: 2, opacity: 0.1 },
  { x: 89, y: 58, size: 1, opacity: 0.3 }, { x: 95, y: 78, size: 1, opacity: 0.15 },
  { x: 2, y: 92, size: 2, opacity: 0.1 }, { x: 9, y: 40, size: 1, opacity: 0.25 },
  { x: 15, y: 48, size: 1, opacity: 0.2 }, { x: 21, y: 95, size: 2, opacity: 0.1 },
  { x: 27, y: 30, size: 1, opacity: 0.3 }, { x: 33, y: 68, size: 1, opacity: 0.2 },
  { x: 39, y: 92, size: 2, opacity: 0.15 }, { x: 45, y: 52, size: 1, opacity: 0.25 },
  { x: 51, y: 38, size: 1, opacity: 0.3 }, { x: 57, y: 75, size: 2, opacity: 0.1 },
  { x: 63, y: 95, size: 1, opacity: 0.2 }, { x: 70, y: 22, size: 1, opacity: 0.35 },
  { x: 76, y: 62, size: 2, opacity: 0.15 }, { x: 82, y: 85, size: 1, opacity: 0.2 },
  { x: 88, y: 42, size: 1, opacity: 0.3 }, { x: 97, y: 15, size: 2, opacity: 0.1 },
];

function Sparkline() {
  return (
    <svg width="90" height="24" viewBox="0 0 90 24" fill="none">
      <polyline points="0,20 15,16 30,12 45,8 60,5 75,3 90,1" stroke="#60a5fa" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

function MiniBarChart() {
  const bars = [20, 35, 28, 50, 42, 60, 55, 75];
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" fill="none">
      {bars.map((h, i) => (
        <rect key={i} x={i * 8 + 1} y={28 - h * 0.36} width="6" height={h * 0.36} rx="1" fill={"rgba(59,130,246," + (0.4 + i * 0.08) + ")"} />
      ))}
    </svg>
  );
}

function NodeGraph() {
  return (
    <svg width="56" height="40" viewBox="0 0 56 40" fill="none">
      <line x1="28" y1="20" x2="8" y2="8" stroke="#3b82f6" strokeWidth="1" opacity="0.6" />
      <line x1="28" y1="20" x2="48" y2="8" stroke="#3b82f6" strokeWidth="1" opacity="0.6" />
      <line x1="28" y1="20" x2="8" y2="32" stroke="#3b82f6" strokeWidth="1" opacity="0.6" />
      <line x1="28" y1="20" x2="48" y2="32" stroke="#3b82f6" strokeWidth="1" opacity="0.6" />
      <circle cx="28" cy="20" r="5" fill="#3b82f6" opacity="0.9" />
      <circle cx="8" cy="8" r="3" fill="#60a5fa" opacity="0.7" />
      <circle cx="48" cy="8" r="3" fill="#60a5fa" opacity="0.7" />
      <circle cx="8" cy="32" r="3" fill="#60a5fa" opacity="0.7" />
      <circle cx="48" cy="32" r="3" fill="#60a5fa" opacity="0.7" />
    </svg>
  );
}

function CircularProgress({ percent }: { percent: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r={r} stroke="#1e3a5f" strokeWidth="4" />
      <circle cx="24" cy="24" r={r} stroke="#3b82f6" strokeWidth="4" strokeDasharray={dash + " " + circ} strokeLinecap="round" transform="rotate(-90 24 24)" filter="drop-shadow(0 0 4px rgba(59,130,246,0.7))" />
    </svg>
  );
}

function LogoMark({ size = 32 }: { size?: number }) {
  const gid = "hg" + size;
  const fid = "hf" + size;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id={fid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="none" stroke={"url(#" + gid + ")"} strokeWidth="1.5" />
      <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill={"url(#" + fid + ")"} opacity="0.15" />
      <text x="16" y="21" textAnchor="middle" fill={"url(#" + gid + ")"} fontSize="14" fontWeight="700" fontFamily="Inter,sans-serif">S</text>
    </svg>
  );
}

function TerrainMesh() {
  return (
    <svg className="w-full h-32 text-blue-500/20" viewBox="0 0 1200 120" fill="none" preserveAspectRatio="none">
      <path d="M0 100 Q 150 40, 300 80 T 600 60 T 900 90 T 1200 50 V 120 H 0 Z" fill="url(#terrainGrad)" opacity="0.4" />
      <path d="M0 80 Q 200 30, 400 70 T 800 40 T 1200 70" stroke="#3b82f6" strokeWidth="1" opacity="0.5" fill="none" />
      <path d="M0 100 Q 150 50, 300 90 T 700 50 T 1200 90" stroke="#60a5fa" strokeWidth="1" opacity="0.3" fill="none" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line key={i} x1={i * 50} y1="30" x2={i * 50 + 20} y2="120" stroke="#1e3a5f" strokeWidth="0.8" opacity="0.4" />
      ))}
      <defs>
        <linearGradient id="terrainGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#020817" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const PIPELINE_STAGES = [
  { num: '01', label: 'INGEST', icon: Database, lines: ['Connect to any source', 'Batch or real-time', 'Secure ingestion'], status: 'completed' },
  { num: '02', label: 'DISCOVER', icon: Search, lines: ['Auto-detect schemas,', 'relationships & assets', 'Profiling & lineage'], status: 'completed' },
  { num: '03', label: 'PROFILE', icon: BarChart2, lines: ['Data profiling', 'Patterns, distributions', 'Anomaly detection'], status: 'completed' },
  { num: '04', label: 'VALIDATE', icon: ShieldCheck, lines: ['Data quality checks', 'Business rules', 'Actionable alerts'], status: 'completed' },
  { num: '05', label: 'MODEL', icon: Package, lines: ['Auto-generate models', 'Star schemas', 'Dimensional design'], status: 'inprogress' },
  { num: '06', label: 'ANALYZE', icon: PieChart, lines: ['KPIs, metrics & charts', 'Ad-hoc analysis', 'Deeper insights'], status: 'pending' },
  { num: '07', label: 'ACT', icon: Zap, lines: ['Share, export & act', 'Operationalize', 'Drive decisions'], status: 'pending' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold tracking-wider"><CheckCircle size={10} /> COMPLETED</span>;
  if (status === 'inprogress') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-semibold tracking-wider"><Activity size={10} /> IN PROGRESS</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-semibold tracking-wider"><Circle size={10} /> PENDING</span>;
}

function PipelineProgressBar({ inView }: { inView: boolean }) {
  return (
    <div className="mt-10 max-w-5xl mx-auto px-4">
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-4 flex items-center justify-between gap-4 shadow-lg">
        <span className="text-slate-400 text-xs font-medium whitespace-nowrap">Pipeline Progress</span>
        <div className="flex-1 bg-[#1e3a5f] rounded-full h-2 overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={inView ? { width: '71.4%' } : { width: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut', delay: 0.6 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.8)] relative"
          >
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute right-0 top-0 bottom-0 w-3 bg-white blur-[2px] rounded-full"
            />
          </motion.div>
        </div>
        <span className="text-slate-300 text-xs font-semibold whitespace-nowrap">5 of 7 Completed</span>
      </div>
    </div>
  );
}

const CAPABILITIES_8 = [
  { icon: Database, title: 'Smart Data Ingestion', desc: 'Connect to databases, cloud storage, APIs and files with secure, automated ingestion.' },
  { icon: Search, title: 'Intelligent Discovery', desc: 'Auto-detect schemas, keys, relationships and data lineage instantly.' },
  { icon: BarChart2, title: 'Advanced Profiling', desc: 'Deep data profiling with statistical insights, patterns, anomalies and distributions.' },
  { icon: ShieldCheck, title: 'Data Quality & Rules', desc: 'Define rules, validate data quality and get AI-driven recommendations.' },
  { icon: Box, title: 'Warehouse Automation', desc: 'Auto-generate star schemas, DDL scripts and deploy to your data warehouse in one click.' },
  { icon: Sparkles, title: 'KPI Recommendations', desc: 'AI suggests the most relevant KPIs based on your data and business context.' },
  { icon: LayoutGrid, title: 'Dashboard Builder', desc: 'Build interactive dashboards with powerful visualizations in minutes.' },
  { icon: Terminal, title: 'SQL Workspace', desc: 'Write, run and save SQL queries with auto-completion and query history.' },
];

const PERSONAS_5 = [
  {
    icon: Code2,
    title: 'Data Engineers',
    desc: 'Automate pipelines, model data and build scalable data infrastructure.',
    items: ['Automated Workflows', 'Data Modeling', 'Warehouse Deployment']
  },
  {
    icon: BarChart2,
    title: 'Data Analysts',
    desc: 'Explore data, run queries and create insights to drive business decisions.',
    items: ['SQL Workspace', 'Ad-hoc Analysis', 'Insight Generation']
  },
  {
    icon: FlaskConical,
    title: 'Data Scientists',
    desc: 'Access clean, trusted data and accelerate model development.',
    items: ['Data Exploration', 'Feature Engineering', 'Model Integration']
  },
  {
    icon: User,
    title: 'Business Users',
    desc: 'Access dashboards and KPIs to monitor performance and track goals.',
    items: ['Interactive Dashboards', 'KPI Tracking', 'Export & Share']
  },
  {
    icon: Crown,
    title: 'Data Leaders',
    desc: 'Ensure data quality, governance and drive data-driven transformation.',
    items: ['Data Governance', 'Quality Monitoring', 'Impact at Scale']
  }
];

const SECTION5_CARDS = [
  { icon: Target, title: 'No Credit Card Required', desc: 'Get started instantly with full access.' },
  { icon: Lock, title: 'Enterprise Grade Security', desc: 'Your data is encrypted and always protected.' },
  { icon: Network, title: 'Scalable by Design', desc: 'Built to grow with your data and your team.' },
  { icon: Headphones, title: 'Support That Cares', desc: 'Expert support when you need it.' }
];

export default function LandingPage() {
  const router = useRouter();

  const pipelineRef = useRef(null);
  const pipelineInView = useInView(pipelineRef, { once: true, amount: 0.1 });

  const capabilitiesRef = useRef(null);
  const capabilitiesInView = useInView(capabilitiesRef, { once: true, amount: 0.1 });

  const builtForRef = useRef(null);
  const builtForInView = useInView(builtForRef, { once: true, amount: 0.1 });

  const ctaRef = useRef(null);
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.15 });

  const navLinks = ['Product', 'Solutions', 'Resources', 'Pricing', 'Docs', 'Enterprise'];

  return (
    <div className="bg-[#020817] text-white min-h-screen font-sans overflow-x-hidden">

      {/* SECTION 1: NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 h-16 z-50 bg-[#020817]/85 backdrop-blur-md border-b border-[#1e3a5f]/80 flex items-center justify-between px-8">
        <div className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer" onClick={() => router.push('/')}>
          <LogoMark size={32} />
          <div className="flex flex-col leading-none">
            <span className="text-white font-bold text-base tracking-wider">STRATUM</span>
            <span className="text-blue-400 text-[10px] tracking-[0.25em] mt-0.5 font-medium">ANALYTICS PLATFORM</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link}
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors duration-200 bg-transparent border-none cursor-pointer"
            >
              {link}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/login')}
            className="border border-slate-700 text-slate-200 hover:border-blue-500 hover:text-white px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-transparent cursor-pointer"
          >
            Log In
          </button>
          <button
            onClick={() => router.push('/register')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg shadow-blue-500/20 border-none cursor-pointer"
          >
            Request Demo
          </button>
        </div>
      </nav>

      {/* SECTION 2: HERO */}
      <section className="relative h-screen min-h-[720px] overflow-hidden flex flex-col items-center justify-center pt-16">
        <div className="absolute inset-0 bg-[#020817] z-0" />
        <div className="absolute bottom-[12%] left-[-20%] w-[140%] h-[220px] rounded-[50%_50%_0_0] border border-blue-500/30 blur-sm z-1 shadow-[0_0_80px_rgba(59,130,246,0.25)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_110%,rgba(59,130,246,0.22)_0%,transparent_65%)] z-1" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_85%_10%,rgba(139,92,246,0.08)_0%,transparent_60%)] z-1" />
        
        <div className="absolute inset-0 z-2 pointer-events-none">
          {STARS.map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{ left: s.x + "%", top: s.y + "%", width: s.size, height: s.size, opacity: s.opacity }}
            />
          ))}
        </div>
        
        <div className="absolute inset-0 z-2 bg-[repeating-linear-gradient(rgba(30,58,95,0.15)_0_1px,transparent_1px_60px),repeating-linear-gradient(90deg,rgba(30,58,95,0.15)_0_1px,transparent_1px_60px)] bg-[size:60px_60px]" />

        {/* Floating Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{ opacity: { duration: 0.6, delay: 0.3 }, y: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
          className="absolute top-[15%] left-[4%] z-10 bg-[#0d1f3c]/90 backdrop-blur-md border border-[#1e3a5f] rounded-xl p-4 w-48 shadow-xl border-t-blue-500/20"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400 text-xs">Data Ingestion</span>
            <MoreVertical size={14} className="text-slate-500 cursor-pointer" />
          </div>
          <div className="text-white text-sm font-semibold mb-2.5">120+ Sources</div>
          <div className="flex gap-1.5">
            {[Database, Cloud, Server, FileText].map((Icon, i) => (
              <div key={i} className="bg-blue-500/10 border border-blue-500/20 rounded-md p-1.5 flex items-center justify-center">
                <Icon size={14} className="text-blue-400" />
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{ opacity: { duration: 0.6, delay: 0.5 }, y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 } }}
          className="absolute top-[38%] left-[2%] z-10 bg-[#0d1f3c]/90 backdrop-blur-md border border-[#1e3a5f] rounded-xl p-4 w-48 shadow-xl border-t-blue-500/20"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400 text-xs">Schemas Detected</span>
            <MoreVertical size={14} className="text-slate-500 cursor-pointer" />
          </div>
          <div className="text-white text-2xl font-bold leading-tight">842</div>
          <Sparkline />
          <div className="text-emerald-400 text-xs mt-1 font-medium">+12% this week</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{ opacity: { duration: 0.6, delay: 0.7 }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 } }}
          className="absolute bottom-[22%] left-[5%] z-10 bg-[#0d1f3c]/90 backdrop-blur-md border border-[#1e3a5f] rounded-xl p-4 w-48 shadow-xl border-t-blue-500/20"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400 text-xs">Relationships Mapped</span>
            <MoreVertical size={14} className="text-slate-500 cursor-pointer" />
          </div>
          <div className="text-white text-2xl font-bold leading-tight">1.2K</div>
          <div className="my-1"><NodeGraph /></div>
          <div className="text-emerald-400 text-xs font-medium">+16% this week</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{ opacity: { duration: 0.6, delay: 0.4 }, y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.1 } }}
          className="absolute top-[15%] right-[4%] z-10 bg-[#0d1f3c]/90 backdrop-blur-md border border-[#1e3a5f] rounded-xl p-4 w-48 shadow-xl border-t-blue-500/20"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400 text-xs">Insights Generated</span>
            <MoreVertical size={14} className="text-slate-500 cursor-pointer" />
          </div>
          <div className="text-white text-2xl font-bold leading-tight">3.2K</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-white text-sm font-semibold">320</span>
            <MiniBarChart />
          </div>
          <div className="text-emerald-400 text-xs mt-1 font-medium">+24% this week</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{ opacity: { duration: 0.6, delay: 0.6 }, y: { duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 } }}
          className="absolute top-[42%] right-[2%] z-10 bg-[#0d1f3c]/90 backdrop-blur-md border border-[#1e3a5f] rounded-xl p-4 w-48 shadow-xl border-t-blue-500/20"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400 text-xs">Query Executed</span>
            <MoreVertical size={14} className="text-slate-500 cursor-pointer" />
          </div>
          <div className="text-white text-2xl font-bold leading-tight">2.4K</div>
          <Sparkline />
          <div className="text-emerald-400 text-xs mt-1 font-medium">+15% this week</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{ opacity: { duration: 0.6, delay: 0.8 }, y: { duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 } }}
          className="absolute bottom-[22%] right-[5%] z-10 bg-[#0d1f3c]/90 backdrop-blur-md border border-[#1e3a5f] rounded-xl p-4 w-48 shadow-xl border-t-blue-500/20 flex items-center justify-between gap-2"
        >
          <div>
            <div className="text-slate-400 text-xs mb-1">Accuracy Score</div>
            <div className="text-white text-2.5xl font-bold leading-none">98.6%</div>
            <div className="text-blue-400 text-xs mt-1.5 font-medium">High Confidence</div>
          </div>
          <CircularProgress percent={98.6} />
        </motion.div>

        {/* Hero Center */}
        <div className="relative z-10 text-center max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0 }}
            className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 mb-6"
          >
            <Cpu size={14} className="text-blue-400" />
            <span className="text-blue-400 text-xs tracking-widest font-medium">AI-POWERED ANALYTICS PLATFORM</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="font-extrabold text-[clamp(44px,5.5vw,72px)] leading-[1.05] tracking-tight">
              <span className="text-white block">Unify. Model. Analyze.</span>
              <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-violet-400 bg-clip-text text-transparent block mt-1">
                Drive Intelligence.
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-slate-400 text-lg max-w-xl mx-auto mt-6 leading-relaxed"
          >
            Stratum connects your data, models your business, and delivers actionable insights through automated analytics and intelligent workflows.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex gap-4 justify-center mt-10 flex-wrap"
          >
            <button
              onClick={() => router.push('/register')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all duration-200 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] border-none cursor-pointer"
            >
              Get Started Free
            </button>
            <button
              onClick={() => router.push('/demo')}
              className="bg-transparent border border-slate-600 hover:border-slate-400 text-slate-200 hover:text-white font-medium px-8 py-3.5 rounded-xl text-base transition-all duration-200 flex items-center gap-2 cursor-pointer"
            >
              <span>View Live Demo</span>
              <PlayCircle size={18} />
            </button>
          </motion.div>
        </div>

        {/* Hero Bottom Trust Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="absolute bottom-8 left-0 right-0 flex justify-center gap-12 z-10 flex-wrap px-6"
        >
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-blue-400" />
            <div className="text-left">
              <div className="text-slate-300 text-sm font-semibold leading-tight">Enterprise Ready</div>
              <div className="text-slate-500 text-xs">Secure & Scalable</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Cpu size={20} className="text-blue-400" />
            <div className="text-left">
              <div className="text-slate-300 text-sm font-semibold leading-tight">AI-Powered</div>
              <div className="text-slate-500 text-xs">Intelligent Automation</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Layers size={20} className="text-blue-400" />
            <div className="text-left">
              <div className="text-slate-300 text-sm font-semibold leading-tight">Open & Flexible</div>
              <div className="text-slate-500 text-xs">Built for Your Stack</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* SECTION 3: PIPELINE (SECTION 2 BADGE) */}
      <section ref={pipelineRef} className="py-28 bg-[#020817] relative overflow-hidden">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(rgba(30,58,95,0.08)_0_1px,transparent_1px_80px),repeating-linear-gradient(90deg,rgba(30,58,95,0.08)_0_1px,transparent_1px_80px)] bg-[size:80px_80px] z-0" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={pipelineInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-block bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1 text-blue-400 text-[10px] tracking-[0.25em] font-semibold mb-4">
              SECTION 2
            </div>
            <h2 className="text-white font-bold text-3xl md:text-4xl mb-4">
              End-to-End Analytics Engineering{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Pipeline
              </span>
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              Stratum orchestrates the complete journey from raw data to real business impact.
            </p>
          </motion.div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-2 overflow-x-auto pb-4 pt-6">
            <div className="flex flex-col gap-2.5 mr-2 flex-shrink-0">
              {[Database, Cloud, Terminal, FileText].map((Icon, i) => (
                <div key={i} className="w-9 h-9 rounded-lg bg-[#0a1628] border border-[#1e3a5f] flex items-center justify-center shadow-md">
                  <Icon size={16} className="text-blue-400" />
                </div>
              ))}
            </div>

            {PIPELINE_STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isCompleted = stage.status === 'completed';
              const isInProgress = stage.status === 'inprogress';

              return (
                <motion.div
                  key={stage.num}
                  initial={{ opacity: 0, y: 30 }}
                  animate={pipelineInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="flex-1 flex items-center min-w-[125px]"
                >
                  <div className="flex flex-col items-center text-center w-full px-1">
                    <div className={"w-14 h-14 rounded-2xl flex items-center justify-center mb-3 relative transition-all duration-300 " + (
                      isCompleted
                        ? 'bg-blue-600/20 border border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.25)]'
                        : isInProgress
                          ? 'bg-blue-600/10 border border-blue-500/40 shadow-[0_0_24px_rgba(59,130,246,0.3)]'
                          : 'bg-[#0a1628] border border-[#1e3a5f]'
                    )}>
                      {isInProgress && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                          className="absolute -inset-1 rounded-[18px] border-2 border-transparent border-t-blue-500"
                        />
                      )}
                      <Icon size={22} className={isCompleted || isInProgress ? 'text-blue-400' : 'text-slate-600'} />
                    </div>

                    <span className="text-blue-400 text-[10px] font-bold tracking-widest mb-0.5">{stage.num}</span>
                    <span className={"text-xs font-bold tracking-wider mb-2 " + (isCompleted || isInProgress ? 'text-white' : 'text-slate-500')}>
                      {stage.label}
                    </span>

                    <div className="text-[10px] text-slate-400 leading-tight space-y-0.5 mb-3 min-h-[36px]">
                      {stage.lines.map((line, li) => (
                        <div key={li}>{line}</div>
                      ))}
                    </div>

                    <StatusBadge status={stage.status} />
                  </div>

                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className="hidden md:block w-8 h-[1px] bg-[#1e3a5f] relative flex-shrink-0 -mt-16">
                      {i < 4 && (
                        <motion.div
                          animate={{ left: ['0%', '100%', '0%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: i * 0.3 }}
                          className="absolute -top-1 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]"
                        />
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          <PipelineProgressBar inView={pipelineInView} />
        </div>
      </section>

      {/* SECTION 4: CAPABILITIES (SECTION 3 BADGE) */}
      <section ref={capabilitiesRef} className="py-28 bg-[#030c1a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(59,130,246,0.06)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={capabilitiesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-block bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1 text-blue-400 text-[10px] tracking-[0.25em] font-semibold mb-4">
              SECTION 3
            </div>
            <h2 className="text-white font-bold text-3xl md:text-4xl mb-4">
              Powerful{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Capabilities
              </span>{" "}
              for Modern Data Teams
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              Everything you need to build, automate and scale your analytics workflow.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CAPABILITIES_8.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <motion.div
                  key={cap.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={capabilitiesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  whileHover={{
                    borderColor: 'rgba(59,130,246,0.5)',
                    backgroundColor: '#0d1f3c',
                    boxShadow: '0 0 25px rgba(59,130,246,0.15)',
                    y: -4,
                  }}
                  className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-5 flex flex-col justify-between cursor-default transition-all duration-300 group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                      <Icon size={20} className="text-blue-400" />
                    </div>
                    <h3 className="text-white font-semibold text-base mb-2">{cap.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">{cap.desc}</p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <ArrowRight size={14} className="text-blue-400/60 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors no-underline">
              Explore All Features <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 5: BUILT FOR (SECTION 4 BADGE) */}
      <section ref={builtForRef} className="py-28 bg-[#020817]">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={builtForInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-block bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1 text-blue-400 text-[10px] tracking-[0.25em] font-semibold mb-4">
              SECTION 4
            </div>
            <h2 className="text-white font-bold text-3xl md:text-4xl mb-4">
              Built for{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Every
              </span>{" "}
              Data Professional
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              Stratum empowers teams across the organization to turn data into impact.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PERSONAS_5.map((persona, i) => {
              const Icon = persona.icon;
              return (
                <motion.div
                  key={persona.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={builtForInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  whileHover={{ borderColor: 'rgba(59,130,246,0.4)', y: -4 }}
                  className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-5 flex flex-col justify-between transition-all duration-300"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                      <Icon size={20} className="text-blue-400" />
                    </div>
                    <h3 className="text-white font-semibold text-base mb-2">{persona.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed mb-6">{persona.desc}</p>
                  </div>

                  <div className="space-y-2 border-t border-[#1e3a5f]/60 pt-4">
                    {persona.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-300 text-[11px]">
                        <CheckCircle size={12} className="text-blue-400 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 6: FINAL CTA (SECTION 5 BADGE) */}
      <section ref={ctaRef} className="py-20 bg-[#020817] relative">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-[#0a1628] via-[#0d1f3c] to-[#0a1628] border border-[#1e3a5f] rounded-2xl p-8 md:p-12 relative overflow-hidden shadow-2xl"
          >
            <div className="inline-block bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1 text-blue-400 text-[10px] tracking-[0.25em] font-semibold mb-6">
              SECTION 5
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7">
                <h2 className="text-white font-bold text-3xl md:text-4xl leading-tight mb-4">
                  Start Building a{" "}
                  <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                    Smarter Data
                  </span>{" "}
                  Future
                </h2>
                <p className="text-slate-400 text-sm md:text-base max-w-lg mb-8 leading-relaxed">
                  Join data-driven teams who trust Stratum to automate, analyze and accelerate their journey from data to decisions.
                </p>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => router.push('/register')}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center gap-2 border-none cursor-pointer"
                  >
                    <span>Get Started for Free</span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => router.push('/demo')}
                    className="bg-transparent border border-slate-600 hover:border-slate-400 text-slate-200 hover:text-white font-medium px-6 py-3 rounded-xl text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer"
                  >
                    <span>Request a Live Demo</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SECTION5_CARDS.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div key={idx} className="bg-[#0a1628]/80 border border-[#1e3a5f] rounded-xl p-4 flex flex-col justify-center">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Icon size={14} className="text-blue-400" />
                        </div>
                        <h4 className="text-white font-semibold text-xs leading-tight">{card.title}</h4>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-normal pl-9">{card.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 -mb-12 -mx-12 opacity-80 pointer-events-none">
              <TerrainMesh />
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#020817] border-t border-[#1e3a5f] py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2.5">
              <LogoMark size={30} />
              <div className="flex flex-col leading-none">
                <span className="text-white font-bold text-sm tracking-wider">STRATUM</span>
                <span className="text-blue-400 text-[9px] tracking-[0.25em] mt-0.5">ANALYTICS PLATFORM</span>
              </div>
            </div>
            <span className="text-slate-500 text-xs">© 2026 Stratum Analytics. All rights reserved.</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
            {[
              { header: 'Product', links: ['Overview', 'Features', 'Integrations', 'Changelog'] },
              { header: 'Solutions', links: ['Data Teams', 'BI & Analytics', 'Data Engineers', 'Enterprise'] },
              { header: 'Resources', links: ['Documentation', 'Guides', 'Blogs', 'Templates'] },
              { header: 'Company', links: ['About', 'Careers', 'Contact', 'Partners'] },
            ].map(({ header, links }) => (
              <div key={header}>
                <h4 className="text-white font-semibold text-xs mb-4">{header}</h4>
                <ul className="space-y-2.5 p-0 list-none m-0">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-slate-400 hover:text-slate-200 text-xs transition-colors no-underline block">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-[#1e3a5f] flex justify-between items-center flex-wrap gap-4 text-xs text-slate-500">
            <span>Stratum Analytics Platform</span>
            <div className="flex gap-4">
              <a href="#" className="text-slate-500 hover:text-slate-300 transition-colors"><Github size={18} /></a>
              <a href="#" className="text-slate-500 hover:text-slate-300 transition-colors"><Linkedin size={18} /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
`;

fs.writeFileSync('app/page.tsx', pageCode, 'utf-8');
console.log('Successfully wrote app/page.tsx! Size:', fs.statSync('app/page.tsx').size);
