import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Loader2, AlertCircle, Users, UserPlus, Shield, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { getCurrentUser, logout } from '../services/authService';
import ThemeToggle from '../components/ThemeToggle';
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
        <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn pb-16">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">System Profile & Settings</h1>
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">Manage credentials, staff authorizations, and enterprise defaults</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* User Profile Card */}
                <div className="bg-[#111726] rounded-2xl shadow-sm border border-[#1F2B45] p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6 border-b border-[#1F2B45] pb-4">
                        <h2 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                            <User className="text-[#FF7A18]" size={20} /> User Security Profile
                        </h2>
                        <span className="px-3 py-1 bg-[#FF7A18]/10 border border-[#FF7A18]/30 text-[#FF7A18] text-xs font-bold rounded-full flex items-center gap-1 uppercase tracking-wider">
                            Role: {user?.role || 'admin'}
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] rounded-xl flex items-center gap-2 text-xs font-semibold">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-4 bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] rounded-xl flex items-center gap-2 text-xs font-semibold">
                                <Save size={18} />
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-[#0B0F19] border border-[#1F2B45] rounded-xl text-[#F8FAFC] text-sm focus:border-[#FF7A18] outline-none transition-colors"
                                required
                            />
                        </div>

                        <div className="border-t border-[#1F2B45] my-6 pt-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F8FAFC] mb-4 flex items-center gap-2">
                                <Lock size={16} className="text-[#FF7A18]" /> Change Password
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#94A3B8] uppercase mb-1">Current Password (Required)</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-[#0B0F19] border border-[#1F2B45] rounded-xl text-[#F8FAFC] text-sm focus:border-[#FF7A18] outline-none transition-colors"
                                        required
                                        placeholder="Enter current password to save changes"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#94A3B8] uppercase mb-1">New Password (Optional)</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-[#0B0F19] border border-[#1F2B45] rounded-xl text-[#F8FAFC] text-sm focus:border-[#FF7A18] outline-none transition-colors"
                                        placeholder="Leave blank to keep current password"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#94A3B8] uppercase mb-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-[#0B0F19] border border-[#1F2B45] rounded-xl text-[#F8FAFC] text-sm focus:border-[#FF7A18] outline-none transition-colors"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-[#1F2B45]">
                            <button
                                type="submit"
                                disabled={loading || !formData.currentPassword}
                                className={`btn btn-primary flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer ${loading || !formData.currentPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                Save Profile Changes
                            </button>
                        </div>
                    </form>
                </div>

                {/* Global Settings Card */}
                <div className="bg-[#111726] rounded-2xl shadow-sm border border-[#1F2B45] p-6 sm:p-8 h-fit">
                    <h2 className="text-lg font-bold text-[#F8FAFC] mb-6 flex items-center gap-2 border-b border-[#1F2B45] pb-4">
                        <Save className="text-[#FF7A18]" size={20} /> Global PDF Configuration
                    </h2>

                    <form onSubmit={handleSettingsSubmit} className="space-y-6">
                        {settingsError && (
                            <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] rounded-xl flex items-center gap-2 text-xs font-semibold">
                                <AlertCircle size={18} />
                                {settingsError}
                            </div>
                        )}
                        {settingsSuccess && (
                            <div className="p-4 bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] rounded-xl flex items-center gap-2 text-xs font-semibold">
                                <Save size={18} />
                                {settingsSuccess}
                            </div>
                        )}

                        <div className="p-4 rounded-xl border border-[#1F2B45] bg-[#0B0F19] flex items-center justify-between">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#F8FAFC]">Application UI Theme</label>
                                <p className="text-xs text-[#94A3B8] mt-0.5">Toggle between Obsidian Dark and Clean Blush Navy Light mode</p>
                            </div>
                            <ThemeToggle />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-2">Global Default PDF Theme</label>
                            <p className="text-xs text-[#94A3B8] mb-3">Choose the fallback theme for newly generated Invoices, Quotations, and Purchase Orders when no custom theme is selected.</p>
                            <select
                                value={defaultTheme}
                                onChange={(e) => setDefaultTheme(e.target.value)}
                                className="w-full px-4 py-2.5 border border-[#1F2B45] rounded-xl focus:border-[#FF7A18] outline-none cursor-pointer text-sm font-semibold bg-[#0B0F19] text-[#F8FAFC]"
                            >
                                <option value="charcoal">Sleek Charcoal (Recommended)</option>
                                <option value="indigo">Classic Indigo</option>
                                <option value="emerald">Forest Emerald</option>
                                <option value="crimson">Warm Crimson</option>
                                <option value="plain">Plain Black & White</option>
                            </select>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-[#1F2B45]">
                            <button
                                type="submit"
                                disabled={settingsSaving}
                                className={`btn btn-primary flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer ${settingsSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {settingsSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                Save Default Settings
                            </button>
                        </div>
                    </form>
                </div>

                {/* User Management Card (Admin Only) */}
                {user?.role === 'admin' && (
                    <div className="bg-[#111726] rounded-2xl shadow-sm border border-[#1F2B45] p-6 sm:p-8 md:col-span-2">
                        <h2 className="text-lg font-bold text-[#F8FAFC] mb-6 flex items-center gap-2 border-b border-[#1F2B45] pb-4">
                            <Users className="text-[#FF7A18]" size={20} /> Team & Role Management (Admin)
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Create User Form */}
                            <div className="lg:col-span-1 bg-[#0B0F19] p-6 rounded-xl border border-[#1F2B45]">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-[#F8FAFC] mb-4 flex items-center gap-2">
                                    <UserPlus size={16} className="text-[#FF7A18]" /> Create New Staff Account
                                </h3>

                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    {createError && (
                                        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] rounded-lg text-xs font-medium flex items-center gap-2">
                                            <AlertCircle size={16} />
                                            {createError}
                                        </div>
                                    )}
                                    {createSuccess && (
                                        <div className="p-3 bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] rounded-lg text-xs font-medium flex items-center gap-2">
                                            <Save size={16} />
                                            {createSuccess}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Username</label>
                                        <input
                                            type="text"
                                            required
                                            value={newUser.username}
                                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                            placeholder="e.g. staff_john"
                                            className="w-full px-3 py-2 bg-[#111726] border border-[#1F2B45] text-[#F8FAFC] rounded-xl outline-none focus:border-[#FF7A18] text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                            placeholder="Set initial password"
                                            className="w-full px-3 py-2 bg-[#111726] border border-[#1F2B45] text-[#F8FAFC] rounded-xl outline-none focus:border-[#FF7A18] text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Assigned Role</label>
                                        <select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-full px-3 py-2 bg-[#111726] border border-[#1F2B45] text-[#F8FAFC] rounded-xl outline-none focus:border-[#FF7A18] text-sm cursor-pointer"
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
                                        className="w-full btn btn-primary font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer text-xs"
                                    >
                                        {createLoading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                                        Create User Account
                                    </button>
                                </form>
                            </div>

                            {/* Users List Table */}
                            <div className="lg:col-span-2">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-[#F8FAFC] mb-4 flex items-center gap-2">
                                    <Shield size={16} className="text-[#FF7A18]" /> Active System User Accounts ({users.length})
                                </h3>

                                <div className="overflow-x-auto border border-[#1F2B45] rounded-xl bg-[#0B0F19]">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-[#0B0F19] text-[#94A3B8] uppercase text-[10px] font-bold tracking-wider border-b border-[#1F2B45]">
                                            <tr>
                                                <th className="p-3">Username</th>
                                                <th className="p-3">Role</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1F2B45]">
                                            {usersLoading ? (
                                                <tr>
                                                    <td colSpan="4" className="p-6 text-center text-[#94A3B8]">
                                                        <Loader2 className="animate-spin inline mr-2 text-[#FF7A18]" size={18} /> Loading user accounts...
                                                    </td>
                                                </tr>
                                            ) : users.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="p-6 text-center text-[#94A3B8]">No extra staff accounts created yet.</td>
                                                </tr>
                                            ) : (
                                                users.map((u) => (
                                                    <tr key={u._id || u.id} className="table-record-row hover:bg-[#FFF0E5] dark:hover:bg-[#172033]/50 transition-colors">
                                                        <td className="p-3 font-semibold text-[#F8FAFC]">{u.username}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                                u.role === 'admin' ? 'bg-[#FF7A18]/20 text-[#FF7A18] border border-[#FF7A18]/40' :
                                                                u.role === 'manager' ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40' :
                                                                u.role === 'viewer' ? 'bg-[#94A3B8]/20 text-[#94A3B8] border border-[#94A3B8]/40' :
                                                                'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40'
                                                            }`}>
                                                                {u.role}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${u.isActive !== false ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                                                                {u.isActive !== false ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                                {u.isActive !== false ? 'Active' : 'Disabled'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleToggleStatus(u._id || u.id)}
                                                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                                                                        u.isActive !== false
                                                                            ? 'border-[#1F2B45] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033]'
                                                                            : 'border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/10'
                                                                    }`}
                                                                    title={u.isActive !== false ? "Disable Account" : "Enable Account"}
                                                                >
                                                                    {u.isActive !== false ? 'Disable' : 'Enable'}
                                                                </button>
                                                                {u.username !== user?.username && (
                                                                    <button
                                                                        onClick={() => handleDeleteUser(u._id || u.id, u.username)}
                                                                        className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors cursor-pointer"
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
