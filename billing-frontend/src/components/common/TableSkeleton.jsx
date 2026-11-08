import React from 'react';

const TableSkeleton = ({ rows = 5, cols = 5, showHeader = true }) => {
    return (
        <div className="bg-[#111726] rounded-2xl border border-[#1F2B45] shadow-sm overflow-hidden animate-pulse">
            {showHeader && (
                <div className="bg-[#172033] border-b border-[#1F2B45] px-6 py-4 flex items-center justify-between gap-4">
                    <div className="h-4 bg-[#1F2B45] rounded-md w-1/4"></div>
                    <div className="h-8 bg-[#1F2B45] rounded-lg w-48"></div>
                </div>
            )}
            <div className="p-6 space-y-4">
                {Array.from({ length: rows }).map((_, rIdx) => (
                    <div
                        key={rIdx}
                        className="flex items-center gap-4 py-3 border-b border-[#1F2B45]/60 last:border-none"
                    >
                        {Array.from({ length: cols }).map((_, cIdx) => (
                            <div
                                key={cIdx}
                                className={`h-4 bg-[#172033] rounded-md ${
                                    cIdx === 0
                                        ? 'w-1/4'
                                        : cIdx === cols - 1
                                        ? 'w-16 ml-auto'
                                        : 'w-1/6'
                                }`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TableSkeleton;
