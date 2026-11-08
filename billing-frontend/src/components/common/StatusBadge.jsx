import React from 'react';

const STATUS_CONFIGS = {
    // Financial / Invoice Statuses
    paid: {
        bg: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
        dot: 'bg-[#22C55E]',
        label: 'Paid'
    },
    pending: {
        bg: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
        dot: 'bg-[#F59E0B]',
        label: 'Pending'
    },
    overdue: {
        bg: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
        dot: 'bg-[#EF4444]',
        label: 'Overdue'
    },
    'partially paid': {
        bg: 'bg-[#FF7A18]/15 text-[#FF7A18] border-[#FF7A18]/30',
        dot: 'bg-[#FF7A18]',
        label: 'Partially Paid'
    },

    // Quotation Statuses
    draft: {
        bg: 'bg-[#172033] text-[#94A3B8] border-[#1F2B45]',
        dot: 'bg-[#64748B]',
        label: 'Draft'
    },
    sent: {
        bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        dot: 'bg-sky-400',
        label: 'Sent'
    },
    approved: {
        bg: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
        dot: 'bg-[#22C55E]',
        label: 'Approved'
    },
    converted: {
        bg: 'bg-[#FF7A18]/15 text-[#FF7A18] border-[#FF7A18]/30',
        dot: 'bg-[#FF7A18]',
        label: 'Converted'
    },
    rejected: {
        bg: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
        dot: 'bg-[#EF4444]',
        label: 'Rejected'
    },

    // Inventory & General
    'in stock': {
        bg: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
        dot: 'bg-[#22C55E]',
        label: 'In Stock'
    },
    'low stock': {
        bg: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
        dot: 'bg-[#EF4444]',
        label: 'Low Stock'
    },
    'out of stock': {
        bg: 'bg-[#172033] text-[#64748B] border-[#1F2B45]',
        dot: 'bg-[#64748B]',
        label: 'Out of Stock'
    },

    // Customer Categories / Tags
    farmer: {
        bg: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
        dot: 'bg-[#22C55E]',
        label: 'Farmer'
    },
    dealer: {
        bg: 'bg-[#FF7A18]/15 text-[#FF7A18] border-[#FF7A18]/30',
        dot: 'bg-[#FF7A18]',
        label: 'Dealer'
    },
    contractor: {
        bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        dot: 'bg-sky-400',
        label: 'Contractor'
    },
    institution: {
        bg: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
        dot: 'bg-[#F59E0B]',
        label: 'Institution'
    }
};

const StatusBadge = ({
    status = 'pending',
    label,
    size = 'sm',
    className = ''
}) => {
    const normalizedKey = String(status || '').trim().toLowerCase();
    const config = STATUS_CONFIGS[normalizedKey] || {
        bg: 'bg-[#172033] text-[#94A3B8] border-[#1F2B45]',
        dot: 'bg-[#64748B]',
        label: status || 'Unknown'
    };

    const displayLabel = label || config.label;
    const sizeClasses = size === 'md'
        ? 'px-3 py-1 text-xs gap-2'
        : 'px-2.5 py-0.5 text-[11px] gap-1.5';

    return (
        <span
            className={`inline-flex items-center font-bold rounded-full border tracking-wide uppercase ${sizeClasses} ${config.bg} ${className}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {displayLabel}
        </span>
    );
};

export default StatusBadge;
