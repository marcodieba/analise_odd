
import React, { useState } from 'react';

const NotificationPanel = ({ notifications }) => {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-gray-400 hover:text-white focus:outline-none"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
                    <div className="p-4 font-bold text-white border-b border-gray-700">
                        Notificações
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map(notif => (
                                <div key={notif.id} className={`p-4 border-b border-gray-700 ${!notif.read ? 'bg-emerald-900/50' : ''}`}>
                                    <p className="text-sm text-white">{notif.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(notif.timestamp?.toDate()).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 p-4 text-center">Nenhuma notificação.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;
