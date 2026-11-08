import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ showLabel = true, className = '' }) => {
    const { theme, isDark, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            onClick={toggleTheme}
            className={`group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-[#1F2B45] bg-[#0B0F19] hover:border-[#FF7A18]/50 transition-all duration-200 cursor-pointer select-none ${className}`}
            title={`Current theme: ${isDark ? 'Dark (Obsidian + Orange)' : 'Light (White + Navy + Blush)'}. Click to toggle.`}
        >
            {/* The sliding toggle switch */}
            <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isDark ? 'bg-[#FF7A18]' : 'bg-[#0F2942]'
            }`}>
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isDark ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
            </div>

            {/* Optional text badge */}
            {showLabel && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] group-hover:text-[#F8FAFC] transition-colors pr-1">
                    {isDark ? 'Dark' : 'Light'}
                </span>
            )}
        </button>
    );
};

export default ThemeToggle;

