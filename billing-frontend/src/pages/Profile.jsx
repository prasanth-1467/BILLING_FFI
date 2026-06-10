import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Loader2, AlertCircle } from 'lucide-react';
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
    }, []);

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
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <User className="text-blue-500" /> User Security Profile
                    </h2>
                    
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
            </div>
        </div>
    );
};

export default Profile;
