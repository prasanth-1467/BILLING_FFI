import React, { useState } from 'react';
import { User, Lock, Save, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/authService';
import api from '../api/api';

const Profile = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: user?.username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">User Profile</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl">
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
                        <div className="relative">
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 my-6 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password (Required)</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        placeholder="Enter current password to save changes"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password (Optional)</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Leave blank to keep current password"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading || !formData.currentPassword}
                            className={`btn btn-primary ${loading || !formData.currentPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
