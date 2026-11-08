import React from 'react';

const PageHeader = ({
    title,
    subtitle,
    badge,
    actions,
    children,
    className = ''
}) => {
    return (
        <div className={`mb-6 space-y-4 ${className}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black tracking-tight text-[#F8FAFC] truncate">
                            {title}
                        </h1>
                        {badge && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FF7A18]/15 text-[#FF7A18] border border-[#FF7A18]/30">
                                {badge}
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className="mt-1 text-sm text-[#94A3B8] leading-relaxed">
                            {subtitle}
                        </p>
                    )}
                </div>

                {actions && (
                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>

            {children && (
                <div className="pt-2">
                    {children}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
