import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { Lock, ArrowRight, Loader2, Eye, EyeOff, Building2 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('expired') === 'true') {
            setError('Your session has expired. Please log in again.');
        }
    }, []);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(credentials.username, credentials.password);
            // Navigate to the Executive Welcome Landing Portal
            navigate('/welcome');
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] relative overflow-hidden text-[var(--text-primary)]">
            {/* Top Right Theme Toggle Switch */}
            <div className="absolute top-6 right-6 z-20">
                <ThemeToggle />
            </div>

            {/* Ambient Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[#FF7A18]/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF7A18]/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="w-full max-w-md p-6 sm:p-8 relative z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF7A18] to-[#EA580C] shadow-xl shadow-[#FF7A18]/25 mb-4 border border-[#FF7A18]/30">
                        <Building2 className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight mb-1">
                        Fine Flow Irrigation
                    </h1>
                    <p className="text-sm text-[#94A3B8]">Sign in to access your billing & CRM workspace</p>
                </div>

                <div className="bg-[#111726]/90 backdrop-blur-xl border border-[#1F2B45] rounded-3xl p-6 sm:p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs font-semibold text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] ml-1">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={credentials.username}
                                onChange={handleChange}
                                className="w-full bg-[#172033] border border-[#1F2B45] text-[#F8FAFC] rounded-xl py-3 px-4 outline-none focus:border-[#FF7A18] focus:ring-1 focus:ring-[#FF7A18] transition-all placeholder:text-[#64748B]"
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] ml-1">Password</label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    className="w-full bg-[#172033] border border-[#1F2B45] text-[#F8FAFC] rounded-xl py-3 pl-4 pr-12 outline-none focus:border-[#FF7A18] focus:ring-1 focus:ring-[#FF7A18] transition-all placeholder:text-[#64748B]"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F8FAFC] transition-colors p-1 focus:outline-none cursor-pointer"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => alert("Please contact the system administrator to reset credentials.")}
                                className="text-xs font-semibold text-[#FF7A18] hover:text-[#FF923D] transition-colors cursor-pointer"
                            >
                                Forgot Password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#FF7A18] hover:bg-[#FF923D] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#FF7A18]/25 hover:shadow-[#FF7A18]/35 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Enter Workspace</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[#64748B] text-xs mt-6">
                    Protected by enterprise-grade cryptographic security • Coimbatore
                </p>
            </div>
        </div>
    );
};

export default Login;
