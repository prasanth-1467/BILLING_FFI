import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Info, AlertTriangle, Lightbulb } from 'lucide-react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const seenIdsRef = useRef(new Set());
    const initialLoadRef = useRef(true);
    const { showToast } = useToast();

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            const data = response.data || [];
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);

            // Trigger SwipeToast for new unread notifications (skip initial mass spam, toast newest 2)
            if (!initialLoadRef.current) {
                const newUnread = data.filter(n => !n.read && !seenIdsRef.current.has(n._id));
                newUnread.slice(0, 2).forEach(n => {
                    showToast({
                        title: n.title,
                        description: n.message,
                        type: n.type === 'alert' ? 'alert' : 'agent',
                        actionLabel: n.actionUrl ? 'View' : '',
                        onAction: n.actionUrl ? () => window.location.href = n.actionUrl : undefined
                    });
                });
            } else {
                initialLoadRef.current = false;
            }

            data.forEach(n => seenIdsRef.current.add(n._id));
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(notifications.filter(n => n._id !== id));
            if (!notifications.find(n => n._id === id).read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'alert': return <AlertTriangle className="text-[#EF4444]" size={18} />;
            case 'suggestion': return <Lightbulb className="text-[#FF7A18]" size={18} />;
            default: return <Info className="text-[#38BDF8]" size={18} />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] rounded-xl transition-colors relative cursor-pointer"
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-[#FF7A18] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border-2 border-[var(--sidebar-bg)] shadow-sm">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-[#111726] rounded-2xl shadow-2xl border border-[#1F2B45] z-50 overflow-hidden transform transition-all duration-200 ease-out origin-top-right">
                    <div className="p-4 border-b border-[#1F2B45] flex justify-between items-center bg-[#172033]">
                        <div className="flex flex-col">
                            <h3 className="font-bold text-sm text-[#F8FAFC]">Agent Insights Feed</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[11px] text-[#FF7A18] hover:text-[#FF923D] font-bold text-left hover:underline cursor-pointer"
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>
                        <span className="text-xs bg-[#111726] text-[#94A3B8] border border-[#1F2B45] px-2.5 py-0.5 rounded-full font-bold">
                            {notifications.length} Total
                        </span>
                    </div>

                    <div className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-[#1F2B45]/60">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-[#64748B]">
                                <p className="text-sm italic">All caught up! No active recommendations.</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n._id}
                                    className={`p-4 hover:bg-[#172033] transition-colors group relative ${!n.read ? 'bg-[#FF7A18]/5' : ''}`}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 flex-shrink-0">
                                            {getIcon(n.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold mb-1 ${!n.read ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-[#94A3B8] leading-relaxed">
                                                {n.message}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!n.read && (
                                            <button
                                                onClick={() => markAsRead(n._id)}
                                                className="text-[10px] font-bold text-[#FF7A18] hover:bg-[#FF7A18]/25 transition-colors flex items-center gap-1 bg-[#FF7A18]/15 border border-[#FF7A18]/30 px-2 py-1 rounded-md cursor-pointer"
                                            >
                                                <Check size={12} /> Mark Read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(n._id)}
                                            className="text-[10px] font-bold text-[#EF4444] hover:bg-[#EF4444]/25 transition-colors flex items-center gap-1 bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-1 rounded-md cursor-pointer"
                                        >
                                            <X size={12} /> Dismiss
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
