import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Loader2, AlertCircle, Users, UserPlus, Shield, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { getCurrentUser, logout } from '../services/authService';
import api from '../api/api';

const Profile = () => {
    const user = getCurrentUser();
    const [formData, setFormData] = useState({
        username: user?.username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Settings State
    const [defaultTheme, setDefaultTheme] = useState('indigo');
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [settingsSuccess, setSettingsSuccess] = useState('');
    const [settingsError, setSettingsError] = useState('');

    // User Management State (Admin Only)
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'biller' });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                if (res.data && res.data.defaultTheme) {
                    setDefaultTheme(res.data.defaultTheme);
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            }
        };
        fetchSettings();
        if (user?.role === 'admin') {
            fetchUsers();
        }
    }, []);

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await api.get('/auth/users');
            setUsers(res.data || []);
        } catch (err) {
            console.error("Failed to load user list:", err);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError('');
        setCreateSuccess('');
        try {
            await api.post('/auth/users', newUser);
            setCreateSuccess(`User account "${newUser.username}" created successfully!`);
            setNewUser({ username: '', password: '', role: 'biller' });
            fetchUsers();
        } catch (err) {
            setCreateError(err.response?.data?.error || "Failed to create user");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleToggleStatus = async (userId) => {
        try {
            await api.patch(`/auth/users/${userId}/status`);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to update user status");
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (window.confirm(`Are you sure you want to delete user account "${username}"?`)) {
            try {
                await api.delete(`/auth/users/${userId}`);
                fetchUsers();
            } catch (err) {
                alert(err.response?.data?.error || "Failed to delete user account");
            }
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setError("New passwords do not match");
            setLoading(false);
            return;
        }

        try {
            await api.put('/auth/update-profile', {
                username: formData.username,
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword || undefined
            });

            setSuccess("Profile updated successfully. Logging out...");
            setTimeout(() => {
                logout();
            }, 2000);
        } catch (err) {
            console.error("Profile update error:", err);
            const errorMessage = err.response?.data?.error || err.message || "Failed to update profile";
            const status = err.response?.status;
            setError(`${errorMessage} ${status ? `(Status: ${status})` : ''}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSettingsSubmit = async (e) => {
        e.preventDefault();
        setSettingsSaving(true);
        setSettingsSuccess('');
        setSettingsError('');
        try {
            await api.patch('/settings', { defaultTheme });
            setSettingsSuccess('Settings updated successfully!');
        } catch (err) {
            console.error("Failed to save settings:", err);
            setSettingsError('Failed to save settings');
        } finally {
            setSettingsSaving(false);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">System Profile & Settings</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* User Profile Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <User className="text-blue-500" /> User Security Profile
                        </h2>
                        <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full flex items-center gap-1 uppercase tracking-wider">
                            Role: {user?.role || 'admin'}
                        </span>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-4 bg-green-50 text-green-600 rounded-lg flex items-center gap-2">
                                <Save size={20} />
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                required
                            />
                        </div>

                        <div className="border-t border-gray-200 my-6 pt-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <Lock size={18} className="text-slate-500" /> Change Password
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password (Required)</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        required
                                        placeholder="Enter current password to save changes"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password (Optional)</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Leave blank to keep current password"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading || !formData.currentPassword}
                                className={`btn btn-primary flex items-center gap-2 ${loading || !formData.currentPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                Save Profile Changes
                            </button>
                        </div>
                    </form>
                </div>

                {/* Global Settings Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 h-fit">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Save className="text-emerald-500" /> Global PDF Configuration
                    </h2>

                    <form onSubmit={handleSettingsSubmit} className="space-y-6">
                        {settingsError && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                                <AlertCircle size={20} />
                                {settingsError}
                            </div>
                        )}
                        {settingsSuccess && (
                            <div className="p-4 bg-green-50 text-green-600 rounded-lg flex items-center gap-2">
                                <Save size={20} />
                                {settingsSuccess}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Global Default PDF Theme</label>
                            <p className="text-xs text-gray-500 mb-3">Choose the fallback theme for newly generated Invoices, Quotations, and Purchase Orders when no custom theme is selected.</p>
                            <select
                                value={defaultTheme}
                                onChange={(e) => setDefaultTheme(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer text-sm font-medium bg-gray-50"
                            >
                                <option value="indigo">Classic Indigo</option>
                                <option value="emerald">Forest Emerald</option>
                                <option value="crimson">Warm Crimson</option>
                                <option value="charcoal">Sleek Charcoal</option>
                                <option value="plain">Plain Black & White</option>
                            </select>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={settingsSaving}
                                className={`btn btn-primary flex items-center gap-2 ${settingsSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {settingsSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                Save Default Settings
                            </button>
                        </div>
                    </form>
                </div>

                {/* User Management Card (Admin Only) */}
                {user?.role === 'admin' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:col-span-2">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Users className="text-purple-600" /> Team & Role Management (Admin)
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Create User Form */}
                            <div className="lg:col-span-1 bg-gray-50 p-6 rounded-xl border border-gray-200">
                                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <UserPlus size={18} className="text-indigo-600" /> Create New Staff Account
                                </h3>

                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    {createError && (
                                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium flex items-center gap-2">
                                            <AlertCircle size={16} />
                                            {createError}
                                        </div>
                                    )}
                                    {createSuccess && (
                                        <div className="p-3 bg-green-50 text-green-600 rounded-lg text-xs font-medium flex items-center gap-2">
                                            <Save size={16} />
                                            {createSuccess}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Username</label>
                                        <input
                                            type="text"
                                            required
                                            value={newUser.username}
                                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                            placeholder="e.g. staff_john"
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                            placeholder="Set initial password"
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Assigned Role</label>
                                        <select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm cursor-pointer"
                                        >
                                            <option value="biller">Biller / Sales Staff (Invoicing & Quotes)</option>
                                            <option value="manager">Manager (Full Sales, Purchasing & Master Data)</option>
                                            <option value="viewer">Viewer / Auditor (Read-Only Downloads)</option>
                                            <option value="admin">Administrator (Full System Privilege)</option>
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={createLoading}
                                        className="w-full btn btn-primary bg-purple-600 hover:bg-purple-700 border-purple-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {createLoading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                                        Create User Account
                                    </button>
                                </form>
                            </div>

                            {/* Users List Table */}
                            <div className="lg:col-span-2">
                                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Shield size={18} className="text-emerald-600" /> Active System User Accounts ({users.length})
                                </h3>

                                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider border-b border-gray-200">
                                            <tr>
                                                <th className="p-3">Username</th>
                                                <th className="p-3">Role</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {usersLoading ? (
                                                <tr>
                                                    <td colSpan="4" className="p-6 text-center text-gray-500">
                                                        <Loader2 className="animate-spin inline mr-2" size={18} /> Loading user accounts...
                                                    </td>
                                                </tr>
                                            ) : users.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="p-6 text-center text-gray-400">No extra staff accounts created yet.</td>
                                                </tr>
                                            ) : (
                                                users.map((u) => (
                                                    <tr key={u._id || u.id} className="hover:bg-gray-50/50">
                                                        <td className="p-3 font-semibold text-gray-900">{u.username}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                                u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                                u.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                                                                u.role === 'viewer' ? 'bg-slate-100 text-slate-700' :
                                                                'bg-emerald-100 text-emerald-700'
                                                            }`}>
                                                                {u.role}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${u.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                                                                {u.isActive !== false ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                                {u.isActive !== false ? 'Active' : 'Disabled'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleToggleStatus(u._id || u.id)}
                                                                    className={`px-2 py-1 rounded text-xs font-medium border ${
                                                                        u.isActive !== false ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-green-200 text-green-700 hover:bg-green-50'
                                                                    }`}
                                                                    title={u.isActive !== false ? "Disable Account" : "Enable Account"}
                                                                >
                                                                    {u.isActive !== false ? 'Disable' : 'Enable'}
                                                                </button>
                                                                {u.username !== user?.username && (
                                                                    <button
                                                                        onClick={() => handleDeleteUser(u._id || u.id, u.username)}
                                                                        className="p-1 text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-100"
                                                                        title="Delete User Account"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
