import React, { useState, useEffect } from 'react';
import './IrrigationLoader.css';

const TARGET_TOKENS = [
    'FINE-FLOW-2026',
    'FINE-FLOW-SYS',
    '0x7A4F-92C1',
    'FINE-FLOW-DB',
    'GST-VALIDATE',
    'FINE-FLOW-OK',
    'SYSTEM-READY'
];

const STATUS_MESSAGES = [
    'INITIALIZING FINE FLOW ENGINE',
    'LOADING PRODUCT CATALOGUE',
    'SYNCING INVENTORY DATA',
    'VALIDATING CUSTOMER RECORDS',
    'CALCULATING GST TAX RULES',
    'PREPARING WORKSPACE',
    'SECURE SESSION INITIALIZED',
    'SYSTEM READY'
];

const HEX_CHARS = '0123456789ABCDEF#$@%';

const IrrigationLoader = ({
    message = null,
    size = 'md',
    className = '',
    isInitialBoot = false,
    simple = false
}) => {
    // Render simple lightweight loader for page transitions unless isInitialBoot is explicitly true
    if (!isInitialBoot || simple) {
        return (
            <div className={`flex flex-col items-center justify-center p-8 text-center space-y-3 ${className}`}>
                <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
                {message && (
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                        {message}
                    </p>
                )}
            </div>
        );
    }

    const isSmall = size === 'sm';

    // State for Hashing Animation & Progress
    const [tokenIndex, setTokenIndex] = useState(0);
    const [resolvedIndex, setResolvedIndex] = useState(0);
    const [statusIndex, setStatusIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    // Character Scrambling Interval Loop
    useEffect(() => {
        const target = TARGET_TOKENS[tokenIndex % TARGET_TOKENS.length];
        const interval = setInterval(() => {
            setResolvedIndex((prev) => {
                if (prev < target.length) {
                    return prev + 1;
                }
                return prev;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [tokenIndex]);

    // Compute current scrambled text string directly during render
    const targetToken = TARGET_TOKENS[tokenIndex % TARGET_TOKENS.length];
    let scrambledText = '';
    for (let i = 0; i < targetToken.length; i++) {
        if (i < resolvedIndex) {
            scrambledText += targetToken[i];
        } else {
            scrambledText += HEX_CHARS[(i * 3 + resolvedIndex + progress) % HEX_CHARS.length];
        }
    }

    // Advance to next token once current resolves
    useEffect(() => {
        if (resolvedIndex >= targetToken.length) {
            const timeout = setTimeout(() => {
                setResolvedIndex(0);
                setTokenIndex((prev) => (prev + 1) % TARGET_TOKENS.length);
            }, 600);
            return () => clearTimeout(timeout);
        }
    }, [resolvedIndex, targetToken.length]);

    // Cycle Status Messages smoothly
    useEffect(() => {
        const statusInterval = setInterval(() => {
            setStatusIndex((prev) => {
                if (prev < STATUS_MESSAGES.length - 1) {
                    return prev + 1;
                }
                return prev;
            });
        }, 450);

        return () => clearInterval(statusInterval);
    }, []);

    // Smooth Procedural Progress Counter (0% -> 100% over 3.5 seconds)
    useEffect(() => {
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) return 100;
                return prev + 1;
            });
        }, 34);

        return () => clearInterval(progressInterval);
    }, []);

    const activeStatusText = message || (progress >= 100 ? 'SYSTEM READY' : STATUS_MESSAGES[statusIndex]);

    // --- COMPACT / SMALL MODE ---
    if (isSmall) {
        return (
            <div
                className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/95 border border-cyan-500/30 shadow-lg text-slate-100 font-mono text-xs select-none ${className}`}
                role="status"
                aria-label={activeStatusText}
            >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                <span className="text-cyan-400 font-bold tracking-wider">
                    [{scrambledText}]
                </span>
                <span className="text-slate-400 font-medium border-l border-slate-700 pl-3">
                    {activeStatusText}
                </span>
            </div>
        );
    }

    // --- FULL PROCESSOR MODE ---
    return (
        <div
            className={`min-h-screen w-full flex items-center justify-center p-4 bg-[#090D16] text-slate-100 select-none tech-loader-container ${className}`}
            role="status"
            aria-label={activeStatusText}
        >
            <div className="relative w-full max-w-md flex flex-col items-center">
                {/* Background Ambient Glow */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-600/20 via-cyan-500/10 to-emerald-500/20 rounded-3xl blur-2xl tech-glow-bg pointer-events-none" />

                {/* Floating Data Stream Chips */}
                <div className="absolute -top-8 -left-10 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[10px] text-cyan-400 font-mono shadow-md chip-1 hidden sm:flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span>FINE FLOW DATA</span>
                </div>

                <div className="absolute -top-6 -right-8 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[10px] text-emerald-400 font-mono shadow-md chip-2 hidden sm:flex items-center gap-1.5">
                    <span>GST: 18% ACTIVE</span>
                </div>

                <div className="absolute -bottom-8 -left-8 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[10px] text-indigo-400 font-mono shadow-md chip-3 hidden sm:flex items-center gap-1.5">
                    <span>TXN: 0x9A21</span>
                </div>

                <div className="absolute -bottom-6 -right-10 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 font-mono shadow-md chip-4 hidden sm:flex items-center gap-1.5">
                    <span>FINE FLOW SYNCED</span>
                </div>

                {/* Central Processing Glass Core */}
                <div className="relative w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/60 overflow-hidden">
                    {/* CRT Scanline overlay effect */}
                    <div className="absolute inset-0 scanline-overlay pointer-events-none"></div>

                    {/* Top Header & Branding */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]"></div>
                            <div>
                                <h1 className="text-xs font-black tracking-[0.2em] text-white uppercase leading-tight">
                                    FINE FLOW <span className="text-emerald-400">IRRIGATION</span>
                                </h1>
                                <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase">
                                    BILLING SYSTEM ENGINE
                                </p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded tracking-wider">
                            SECURE 256-BIT
                        </span>
                    </div>

                    {/* Central Hashing Display Box */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-6 relative group overflow-hidden">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-2 uppercase tracking-wider">
                            <span>DATA_HASH_VERIFY</span>
                            <span className="text-emerald-400/90 font-mono">STATUS: {progress >= 100 ? 'READY' : 'PROCESSING'}</span>
                        </div>

                        {/* Hashing Character Scramble String featuring FINE FLOW branding */}
                        <div className="flex items-center justify-center py-2">
                            <span className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-300 font-mono tracking-widest drop-shadow-[0_0_12px_rgba(14,165,233,0.3)]">
                                [ {progress >= 100 ? 'SYSTEM-READY' : scrambledText} ]
                            </span>
                            <span className="inline-block w-2 h-5 bg-cyan-400 ml-1.5 terminal-cursor"></span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-900 flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>CORE_ID: FINE_FLOW_01</span>
                            <span>CHECKSUM: OK</span>
                        </div>
                    </div>

                    {/* Progress Bar Track (Smooth 0% -> 100%) */}
                    <div className="space-y-2 mb-5">
                        <div className="flex justify-between text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            <span>PROCESSING DATA</span>
                            <span className="text-cyan-400 font-mono">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 rounded-full transition-all duration-150 progress-bar-fill"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Dynamic System Status Message */}
                    <div className="flex items-center justify-center gap-2 pt-1 text-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        <p className="text-xs font-semibold text-slate-300 tracking-wider uppercase font-mono animate-pulse">
                            {activeStatusText}
                        </p>
                    </div>
                </div>

                {/* Footer Subtitle */}
                <p className="text-[10px] font-medium text-slate-500 tracking-widest uppercase mt-4">
                    Fine Flow Irrigation • Secure Enterprise Workspace
                </p>
            </div>
        </div>
    );
};

export default IrrigationLoader;
