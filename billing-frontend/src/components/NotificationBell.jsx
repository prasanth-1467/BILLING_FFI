import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Info, AlertTriangle, Lightbulb } from 'lucide-react';
import api from '../api/api';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.read).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line
        fetchNotifications();
        // Poll for new notifications every minute
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
            case 'alert': return <AlertTriangle className="text-red-500" size={18} />;
            case 'suggestion': return <Lightbulb className="text-yellow-500" size={18} />;
            default: return <Info className="text-blue-500" size={18} />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors relative"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform transition-all duration-200 ease-out origin-top-right">
                    <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <div className="flex flex-col">
                            <h3 className="font-bold text-gray-800">Agent Insights</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold text-left hover:underline"
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            {notifications.length} Total
                        </span>
                    </div>

                    <div className="max-height-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <p className="text-sm italic">All caught up! No suggestions yet.</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n._id}
                                    className={`p-4 border-b border-gray-50 hover:bg-blue-50/30 transition-colors group relative ${!n.read ? 'bg-blue-50/50' : ''}`}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-1 flex-shrink-0">
                                            {getIcon(n.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold mb-1 ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                {n.message}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!n.read && (
                                            <button
                                                onClick={() => markAsRead(n._id)}
                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 bg-blue-100 px-2 py-1 rounded-md"
                                            >
                                                <Check size={12} /> Mark Read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(n._id)}
                                            className="text-[10px] font-bold text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 bg-red-100 px-2 py-1 rounded-md"
                                        >
                                            <X size={12} /> Dismiss
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                            <button className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                View All Suggestions
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
