import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Leaf, Mail, Lock, ArrowRight, Recycle, BarChart3, Route, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { signIn }              = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Recycle,   title: 'AI Image Analysis',      desc: 'Gemini Vision detects waste levels instantly' },
    { icon: BarChart3, title: 'Predictive Scheduling',  desc: 'ML-driven cleaning schedules from historical data' },
    { icon: Route,     title: 'Route Optimization',     desc: 'Shortest-path algorithms for maximum efficiency' },
  ]

  return (
    <div className="min-h-screen auth-bg relative overflow-hidden flex">

      {/* ── Decorative orbs ── */}
      <div className="orb w-[480px] h-[480px] bg-primary-400 -top-24 -left-24 animate-float-slow" />
      <div className="orb w-80 h-80 bg-secondary-400 bottom-[-10%] right-[-8%] animate-float" />
      <div className="orb w-52 h-52 bg-accent-400 top-1/2 left-[38%]" style={{ animationDelay: '3s' }} />

      {/* ── LEFT PANEL – Branding ── */}
      <div className="hidden lg:flex lg:w-[55%] relative z-10 flex-col justify-center px-16 xl:px-24">
        <div className="animate-fade-in-up">

          {/* Logo */}
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-glow-primary animate-glow-pulse"
                 style={{ background: 'linear-gradient(135deg,#10b981,#0891b2)' }}>
              <Leaf className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none">EcoWatch</h1>
              <p className="text-primary-300 text-sm font-medium mt-0.5">Smart Waste Monitoring</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            AI-Powered
            <br />
            <span className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(90deg,#34d399,#67e8f9)' }}>
              Campus Clean
            </span>
          </h2>

          <p className="text-gray-400 text-lg mb-12 max-w-md leading-relaxed">
            Monitor, predict, and optimize waste collection across your campus with
            intelligent route planning and real-time analytics.
          </p>

          {/* Feature list */}
          <div className="space-y-5">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="flex items-start gap-4 animate-slide-in-right"
                style={{ animationDelay: `${0.2 + i * 0.12}s` }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                     style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Icon className="w-5 h-5 text-primary-300" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{title}</h3>
                  <p className="text-gray-400 text-sm mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL – Form ── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-md animate-fade-in">

          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-glow-primary"
                 style={{ background: 'linear-gradient(135deg,#10b981,#0891b2)' }}>
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">EcoWatch</h1>
            <p className="text-primary-300 text-sm mt-1">Smart Waste Monitoring</p>
          </div>

          {/* Card */}
          <div className="glass rounded-3xl p-8 shadow-glass-dark">

            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Welcome back</h2>
              <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
            </div>

            {/* Error */}
            {error && (
              <div className="alert-error mb-5 text-sm">
                <span className="text-red-500 text-lg">⚠</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-field pl-10"
                    placeholder="you@campus.edu"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-field pl-10 pr-10"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Register link */}
            <div className="mt-6 text-center">
              <Link
                to="/register"
                className="text-primary-600 hover:text-primary-700 text-sm font-semibold transition-colors hover:underline underline-offset-2"
              >
                Don't have an account? <span className="text-primary-500">Register</span>
              </Link>
            </div>

            {/* Demo credentials */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 text-center leading-6">
                <span className="font-semibold text-gray-500">Demo accounts</span><br />
                user@campus.edu · worker@campus.edu · admin@campus.edu
                <br />
                <span className="font-mono tracking-wide">password123</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
