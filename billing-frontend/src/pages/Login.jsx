import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const Login = () => {
    const [formData, setFormData] = useState({ accessKey: '', secret: '' }); // mapping username->accessKey visually if needed, but sticking to standard for now
    // Actually, sticking to username/password as per backend
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(credentials.username, credentials.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f1014] relative overflow-hidden">
            {/* Ambient Background Efects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />

            <div className="w-full max-w-md p-8 relative z-10 animate-fade-in-up">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 shadow-lg shadow-blue-500/30 mb-6">
                        <Lock className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome Back</h1>
                    <p className="text-gray-400">Sign in to access your billing dashboard</p>
                </div>

                <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Username</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    name="username"
                                    value={credentials.username}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl py-3 pl-16 pr-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-500 !bg-gray-800/50 !text-white"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
                            <div className="relative group">
                                <input
                                    type="password"
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl py-3 pl-16 pr-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-500 !bg-gray-800/50 !text-white"
                                    placeholder="Enter your password" // Fixed placeholder
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button type="button" onClick={() => alert("Please contact system administrator to reset password.")} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                Forgot Password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-gray-500 text-sm mt-8">
                    Protected by enterprise-grade security
                </p>
            </div>
        </div>
    );
};

export default Login;
