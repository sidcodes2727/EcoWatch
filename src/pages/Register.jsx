import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Leaf, Mail, Lock, User, Phone, Building, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    fullName: '', role: 'user', department: '', phone: ''
  })
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { signUp }              = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match')
    if (formData.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      await signUp(formData.email, formData.password, {
        fullName: formData.fullName, role: formData.role,
        department: formData.department, phone: formData.phone
      })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const roles = [
    { value: 'user',   label: 'Reporter', desc: 'Report waste bins', emoji: '📸' },
    { value: 'worker', label: 'Worker',   desc: 'Clean assigned bins', emoji: '🧹' },
    { value: 'admin',  label: 'Admin',    desc: 'Manage & monitor', emoji: '⚡' },
  ]

  return (
    <div className="min-h-screen auth-bg relative overflow-hidden flex items-center justify-center py-10">
      {/* Orbs */}
      <div className="orb w-96 h-96 bg-primary-400 -top-20 -right-16 animate-float-slow" />
      <div className="orb w-72 h-72 bg-secondary-400 bottom-[-12%] -left-16 animate-float" />
      <div className="orb w-48 h-48 bg-accent-500 top-[45%] right-[30%]" />

      <div className="w-full max-w-lg mx-4 relative z-10 animate-fade-in">
        {/* Brand */}
        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-glow-primary"
            style={{ background: 'linear-gradient(135deg,#10b981,#0891b2)' }}
          >
            <Leaf className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Join EcoWatch</h1>
          <p className="text-primary-300 text-sm mt-1">Create your account in seconds</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-glass-dark">
          {error && (
            <div className="alert-error mb-5 text-sm">
              <span className="text-red-500">⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                  required className="input-field pl-10" placeholder="Your full name" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  required className="input-field pl-10" placeholder="you@campus.edu" />
              </div>
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Role</label>
              <div className="grid grid-cols-3 gap-2.5">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: role.value })}
                    className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                      formData.role === role.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                        : 'border-gray-200 bg-white/60 text-gray-600 hover:border-primary-300 hover:bg-primary-50/40'
                    }`}
                  >
                    <div className="text-xl mb-0.5">{role.emoji}</div>
                    <p className="text-xs font-bold">{role.label}</p>
                    <p className="text-[9px] mt-0.5 opacity-60 leading-tight">{role.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Dept + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Department</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type="text" name="department" value={formData.department} onChange={handleChange}
                    className="input-field pl-10" placeholder="e.g. CSE" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    className="input-field pl-10" placeholder="Number" />
                </div>
              </div>
            </div>

            {/* Password + Confirm */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type={showPwd ? 'text' : 'password'} name="password" value={formData.password}
                    onChange={handleChange} required className="input-field pl-10 pr-9" placeholder="Min 6 chars" />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Confirm</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type="password" name="confirmPassword" value={formData.confirmPassword}
                    onChange={handleChange} required className="input-field pl-10" placeholder="Re-enter" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base mt-1">
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 text-sm font-semibold transition-colors hover:underline underline-offset-2">
              Already have an account? <span className="text-primary-500">Sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
