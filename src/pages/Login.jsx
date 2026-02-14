import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Leaf, Mail, Lock, ArrowRight, Recycle, BarChart3, Route } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

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

  return (
    <div className="min-h-screen auth-bg relative overflow-hidden flex">
      {/* Decorative orbs */}
      <div className="orb w-96 h-96 bg-primary-400 top-[-10%] left-[-5%]" />
      <div className="orb w-72 h-72 bg-secondary-400 bottom-[-10%] right-[-5%]" />
      <div className="orb w-48 h-48 bg-accent-400 top-[40%] left-[30%]" />

      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center px-16 xl:px-24">
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-glow-primary">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">EcoWatch</h1>
              <p className="text-primary-300 text-sm font-medium">Smart Waste Monitoring</p>
            </div>
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            AI-Powered Campus
            <br />
            <span className="text-primary-400">Cleanliness</span>
          </h2>

          <p className="text-gray-400 text-lg mb-12 max-w-md leading-relaxed">
            Monitor, predict, and optimize waste collection across your campus with
            intelligent route planning and real-time analytics.
          </p>

          <div className="space-y-6">
            {[
              { icon: Recycle, title: 'AI Image Analysis', desc: 'Gemini Vision detects waste levels instantly' },
              { icon: BarChart3, title: 'Predictive Scheduling', desc: 'ML-driven cleaning schedules from historical data' },
              { icon: Route, title: 'Route Optimization', desc: 'Shortest path algorithms for worker efficiency' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{title}</h3>
                  <p className="text-gray-400 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-glow-primary">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">EcoWatch</h1>
            <p className="text-primary-300 text-sm">Smart Waste Monitoring</p>
          </div>

          <div className="glass rounded-3xl p-8 shadow-glass">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-scale-in">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-field pl-11"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-field pl-11"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/register" className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors">
                Don't have an account? Register
              </Link>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-200/60">
              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                Demo: user@campus.edu / worker@campus.edu / admin@campus.edu
                <br />
                Password: password123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
