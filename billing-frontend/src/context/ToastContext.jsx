import React, { createContext, useContext, useState, useCallback } from 'react';
import SwipeToast from '../components/SwipeToast';
import { CheckCircle2, AlertTriangle, Info, Sparkles, Receipt, FileText } from 'lucide-react';
import { useTheme } from './ThemeContext';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const { isDark } = useTheme();

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(({
        title,
        description = '',
        type = 'success',
        duration = 4500,
        actionLabel = '',
        onAction = null,
        icon = null
    }) => {
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);

        // Map icons based on type
        let toastIcon = icon;
        let fuseColor = '#FF7A18';

        if (!toastIcon) {
            switch (type) {
                case 'success':
                    toastIcon = <CheckCircle2 size={18} className="text-[#22C55E]" />;
                    fuseColor = '#22C55E';
                    break;
                case 'invoice':
                    toastIcon = <Receipt size={18} className="text-[#FF7A18]" />;
                    fuseColor = '#FF7A18';
                    break;
                case 'quotation':
                    toastIcon = <FileText size={18} className="text-[#6366F1]" />;
                    fuseColor = '#6366F1';
                    break;
                case 'alert':
                case 'warning':
                    toastIcon = <AlertTriangle size={18} className="text-[#F59E0B]" />;
                    fuseColor = '#F59E0B';
                    break;
                case 'agent':
                case 'insight':
                    toastIcon = <Sparkles size={18} className="text-[#A855F7]" />;
                    fuseColor = '#A855F7';
                    break;
                case 'info':
                default:
                    toastIcon = <Info size={18} className="text-[#38BDF8]" />;
                    fuseColor = '#38BDF8';
                    break;
            }
        }

        const newToast = {
            id,
            title,
            description,
            icon: toastIcon,
            type,
            duration,
            actionLabel,
            onAction,
            fuseColor,
            open: true
        };

        setToasts((prev) => [...prev, newToast]);
        return id;
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, removeToast }}>
            {children}

            {/* Global SwipeToast Container positioned at bottom-right */}
            <aside
                aria-label="Notifications"
                className="fixed bottom-6 right-6 z-[99999] flex flex-col-reverse gap-3 pointer-events-none select-none max-w-sm w-full px-4 sm:px-0"
            >
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <SwipeToast
                            inline={true}
                            open={toast.open}
                            title={toast.title}
                            description={toast.description}
                            icon={toast.icon}
                            actionLabel={toast.actionLabel}
                            onAction={toast.onAction}
                            duration={toast.duration}
                            fuseColor={toast.fuseColor}
                            background={isDark ? '#111726' : '#FFFFFF'}
                            color={isDark ? '#F8FAFC' : '#18181B'}
                            radius={14}
                            closeButton={true}
                            onClose={() => removeToast(toast.id)}
                            className={`border shadow-2xl transition-all ${
                                isDark
                                    ? 'border-[#1F2B45] shadow-black/60'
                                    : 'border-[#E4E4E7] shadow-slate-300/60'
                            }`}
                        />
                    </div>
                ))}
            </aside>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export default ToastContext;

