import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageToggle from '../components/LanguageToggle'
import { Leaf, AlertCircle, Eye, EyeOff, User, Wrench, Shield } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || (language === 'hi' ? 'लॉग इन करने में विफल' : 'Failed to sign in'))
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemoLogin = async (demoEmail) => {
    setEmail(demoEmail)
    setPassword('password123')
    setError('')
    setLoading(true)
    try {
      await signIn(demoEmail, 'password123')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || (language === 'hi' ? 'लॉग इन करने में विफल' : 'Failed to sign in'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-grid-pattern bg-grid-size relative">
      <div className="absolute top-8 right-8 z-50">
        <LanguageToggle />
      </div>
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2">
        <Leaf className="w-5 h-5 text-eco-900" strokeWidth={1.5} />
        <span className="font-serif text-lg tracking-[0.2em] text-eco-900 uppercase">EcoWatch</span>
      </Link>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <h1 className="font-serif text-5xl text-eco-900 tracking-tight mb-3">{t('welcomeBack')}</h1>
          <p className="text-eco-600 font-light text-sm tracking-wide">{t('enterCredentials')}</p>
        </div>

        <div className="card-editorial card-body-editorial bg-white/95 backdrop-blur-xl">
          {error && (
            <div className="alert-error mb-8">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label-editorial">{t('emailAddress')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-editorial"
                placeholder="name@campus.edu or student@vjti.ac.in"
              />
            </div>

            <div>
              <label className="label-editorial">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-editorial pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-eco-400 hover:text-eco-900 transition-colors p-2"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-editorial btn-editorial-primary w-full mt-4"
            >
              {loading ? t('authenticating') : t('signIn')}
            </button>
          </form>

          <div className="mt-8 text-center text-xs tracking-wider border-t border-eco-900/10 pt-6">
            <span className="text-eco-500">{t('dontHaveAccount')} </span>
            <Link to="/register" className="text-eco-900 font-bold hover:text-accent transition-colors">
              {t('createOne')}
            </Link>
          </div>
        </div>

        <div className="mt-8 border border-eco-900/10 bg-white/70 p-6 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eco-500 mb-3 text-center">
            {t('demoCredentials')} (Click to Instant Login)
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('user@campus.edu')}
              className="p-2.5 bg-eco-50 hover:bg-eco-900 hover:text-white border border-eco-900/10 rounded flex flex-col items-center gap-1 transition-all text-eco-900 group"
            >
              <User className="w-4 h-4 text-eco-700 group-hover:text-white" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Student</span>
              <span className="text-[9px] font-mono text-eco-500 group-hover:text-eco-200 truncate w-full text-center">user@</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('worker@campus.edu')}
              className="p-2.5 bg-eco-50 hover:bg-eco-900 hover:text-white border border-eco-900/10 rounded flex flex-col items-center gap-1 transition-all text-eco-900 group"
            >
              <Wrench className="w-4 h-4 text-eco-700 group-hover:text-white" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Worker</span>
              <span className="text-[9px] font-mono text-eco-500 group-hover:text-eco-200 truncate w-full text-center">worker@</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@campus.edu')}
              className="p-2.5 bg-eco-50 hover:bg-eco-900 hover:text-white border border-eco-900/10 rounded flex flex-col items-center gap-1 transition-all text-eco-900 group"
            >
              <Shield className="w-4 h-4 text-eco-700 group-hover:text-white" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Admin</span>
              <span className="text-[9px] font-mono text-eco-500 group-hover:text-eco-200 truncate w-full text-center">admin@</span>
            </button>
          </div>
          <p className="text-[11px] text-eco-600 text-center font-mono">
            {t('password')}: <span className="font-bold text-eco-900">password123</span>
          </p>
        </div>
      </div>
    </div>
  )
}
