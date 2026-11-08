import React from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Plus } from 'lucide-react';

const EmptyState = ({
    icon: CustomIcon,
    title = 'No records found',
    description = 'There are no items to display at this time.',
    actionText,
    onAction,
    actionLink,
    className = ''
}) => {
    const RenderIcon = CustomIcon || Inbox;

    return (
        <div className={`bg-[#111726] rounded-2xl border border-dashed border-[#1F2B45] p-8 sm:p-12 text-center max-w-xl mx-auto my-6 shadow-sm ${className}`}>
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#172033] border border-[#1F2B45] flex items-center justify-center text-[#FF7A18] shadow-inner">
                <RenderIcon size={26} strokeWidth={1.75} />
            </div>

            <h3 className="text-base font-bold text-[#F8FAFC] mb-1">
                {title}
            </h3>

            <p className="text-sm text-[#94A3B8] max-w-sm mx-auto mb-6 leading-relaxed">
                {description}
            </p>

            {actionLink && actionText && (
                <Link
                    to={actionLink}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#FF7A18] hover:bg-[#FF923D] rounded-xl shadow-md shadow-[#FF7A18]/25 hover:shadow-[#FF7A18]/35 transition-all duration-150"
                >
                    <Plus size={16} />
                    {actionText}
                </Link>
            )}

            {!actionLink && onAction && actionText && (
                <button
                    onClick={onAction}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#FF7A18] hover:bg-[#FF923D] rounded-xl shadow-md shadow-[#FF7A18]/25 hover:shadow-[#FF7A18]/35 transition-all duration-150 cursor-pointer"
                >
                    <Plus size={16} />
                    {actionText}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
