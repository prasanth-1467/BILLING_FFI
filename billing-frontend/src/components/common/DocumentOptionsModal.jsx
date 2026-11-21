import React, { useState, useEffect } from 'react';
import { X, Download, Printer, PenTool, Stamp, Truck, Check, Loader2 } from 'lucide-react';

/**
 * DocumentOptionsModal
 *
 * Contextual modal for configuring document PDF options (Signature, Seal, Shipping Address)
 * right before triggering Download or Print actions.
 */
const DocumentOptionsModal = ({
    isOpen,
    onClose,
    actionType = 'download', // 'download' | 'print'
    documentType = 'invoice', // 'invoice' | 'quotation'
    documentNumber = '',
    onConfirm,
    loading = false
}) => {
    const isQuotation = documentType === 'quotation';

    // Independent options state with sensible defaults based on document type
    // Quotations: Signature=true, Seal=false, Shipping=false
    // Invoices: Signature=true, Seal=true, Shipping=true
    const [includeSignature, setIncludeSignature] = useState(true);
    const [includeSeal, setIncludeSeal] = useState(!isQuotation);
    const [includeShippingDetails, setIncludeShippingDetails] = useState(!isQuotation);

    // Reset options to default every time modal opens based on document type
    useEffect(() => {
        if (isOpen) {
            if (documentType === 'quotation') {
                setIncludeSignature(true);
                setIncludeSeal(false);
                setIncludeShippingDetails(false);
            } else {
                setIncludeSignature(true);
                setIncludeSeal(true);
                setIncludeShippingDetails(true);
            }
        }
    }, [isOpen, documentType]);

    // Keyboard handlers (Escape to close, Enter to submit)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !loading) {
                onClose();
            } else if (e.key === 'Enter' && !loading && !e.shiftKey) {
                if (document.activeElement?.getAttribute('data-action') !== 'cancel') {
                    e.preventDefault();
                    handleConfirm();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, loading, includeSignature, includeSeal, includeShippingDetails]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (loading) return;
        onConfirm({
            includeSignature,
            includeSeal,
            includeShippingAddress: includeShippingDetails
        });
    };

    const isDownload = actionType === 'download';
    const docLabel = documentType === 'quotation' ? 'Quotation' : 'Invoice';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="doc-options-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !loading) onClose();
            }}
        >
            <div className="relative w-full max-w-md bg-[#111726] [data-theme=light]:bg-white rounded-2xl border border-[#1F2B45] [data-theme=light]:border-[#E4E4E7] shadow-2xl p-6 overflow-hidden animate-slideDown">
                {/* Header */}
                <div className="flex items-start justify-between pb-3 border-b border-[#1F2B45]/70 [data-theme=light]:border-[#E4E4E7] mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3
                                id="doc-options-title"
                                className="text-base font-bold text-[#F8FAFC] [data-theme=light]:text-[#18181B]"
                            >
                                Document Options
                            </h3>
                            {documentNumber && (
                                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#FF7A18]/15 text-[#FF7A18] border border-[#FF7A18]/30">
                                    {documentNumber}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[#94A3B8] [data-theme=light]:text-[#71717A] mt-1">
                            Customize how your {docLabel.toLowerCase()} appears before {isDownload ? 'downloading' : 'printing'}.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close dialog"
                        className="text-[#94A3B8] hover:text-[#F8FAFC] [data-theme=light]:hover:text-[#18181B] p-1.5 rounded-lg hover:bg-[#172033] [data-theme=light]:hover:bg-[#F4F4F5] transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Option Cards */}
                <div className="space-y-3 mb-6">
                    {/* Option 1: Signature */}
                    <div
                        onClick={() => !loading && setIncludeSignature(!includeSignature)}
                        className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                            includeSignature
                                ? 'bg-[#FF7A18]/10 border-[#FF7A18]/50 shadow-xs'
                                : 'bg-[#172033]/50 [data-theme=light]:bg-[#F8F8FA] border-[#1F2B45] [data-theme=light]:border-[#E4E4E7] hover:border-[#94A3B8]/40'
                        }`}
                    >
                        <div className="pt-0.5">
                            <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                    includeSignature
                                        ? 'bg-[#FF7A18] text-white shadow-xs'
                                        : 'border border-[#1F2B45] [data-theme=light]:border-[#D4D4D8] bg-[#111726] [data-theme=light]:bg-white'
                                }`}
                            >
                                {includeSignature && <Check size={14} strokeWidth={3} />}
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-[#F8FAFC] [data-theme=light]:text-[#18181B]">
                                <PenTool size={13} className="text-[#FF7A18]" />
                                <span>Include Signature</span>
                            </div>
                            <p className="text-[11px] text-[#94A3B8] [data-theme=light]:text-[#71717A] mt-0.5 leading-relaxed">
                                Include the authorized signatory signature in the document.
                            </p>
                        </div>
                    </div>

                    {/* Option 2: Company Seal */}
                    <div
                        onClick={() => !loading && setIncludeSeal(!includeSeal)}
                        className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                            includeSeal
                                ? 'bg-[#FF7A18]/10 border-[#FF7A18]/50 shadow-xs'
                                : 'bg-[#172033]/50 [data-theme=light]:bg-[#F8F8FA] border-[#1F2B45] [data-theme=light]:border-[#E4E4E7] hover:border-[#94A3B8]/40'
                        }`}
                    >
                        <div className="pt-0.5">
                            <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                    includeSeal
                                        ? 'bg-[#FF7A18] text-white shadow-xs'
                                        : 'border border-[#1F2B45] [data-theme=light]:border-[#D4D4D8] bg-[#111726] [data-theme=light]:bg-white'
                                }`}
                            >
                                {includeSeal && <Check size={14} strokeWidth={3} />}
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-[#F8FAFC] [data-theme=light]:text-[#18181B]">
                                <Stamp size={13} className="text-[#FF7A18]" />
                                <span>Include Company Seal</span>
                            </div>
                            <p className="text-[11px] text-[#94A3B8] [data-theme=light]:text-[#71717A] mt-0.5 leading-relaxed">
                                Include the official company stamp and seal in the document.
                            </p>
                        </div>
                    </div>

                    {/* Option 3: Shipping Details */}
                    <div
                        onClick={() => !loading && setIncludeShippingDetails(!includeShippingDetails)}
                        className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                            includeShippingDetails
                                ? 'bg-[#FF7A18]/10 border-[#FF7A18]/50 shadow-xs'
                                : 'bg-[#172033]/50 [data-theme=light]:bg-[#F8F8FA] border-[#1F2B45] [data-theme=light]:border-[#E4E4E7] hover:border-[#94A3B8]/40'
                        }`}
                    >
                        <div className="pt-0.5">
                            <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                    includeShippingDetails
                                        ? 'bg-[#FF7A18] text-white shadow-xs'
                                        : 'border border-[#1F2B45] [data-theme=light]:border-[#D4D4D8] bg-[#111726] [data-theme=light]:bg-white'
                                }`}
                            >
                                {includeShippingDetails && <Check size={14} strokeWidth={3} />}
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-[#F8FAFC] [data-theme=light]:text-[#18181B]">
                                <Truck size={13} className="text-[#FF7A18]" />
                                <span>Include Shipping Details</span>
                            </div>
                            <p className="text-[11px] text-[#94A3B8] [data-theme=light]:text-[#71717A] mt-0.5 leading-relaxed">
                                Include the shipping address and delivery information.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1F2B45]/70 [data-theme=light]:border-[#E4E4E7]">
                    <button
                        type="button"
                        data-action="cancel"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-xs font-bold rounded-xl text-[#94A3B8] [data-theme=light]:text-[#71717A] hover:text-[#F8FAFC] [data-theme=light]:hover:text-[#18181B] bg-[#172033] [data-theme=light]:bg-[#F4F4F5] border border-[#1F2B45] [data-theme=light]:border-[#E4E4E7] transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading}
                        className="btn btn-primary px-5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-[#FF7A18]/25 cursor-pointer disabled:opacity-60"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={15} className="animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : isDownload ? (
                            <>
                                <Download size={15} />
                                <span>Download PDF</span>
                            </>
                        ) : (
                            <>
                                <Printer size={15} />
                                <span>Print Document</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentOptionsModal;
