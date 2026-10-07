import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Leaf, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
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
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-grid-pattern bg-grid-size relative">
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2">
        <Leaf className="w-5 h-5 text-eco-900" strokeWidth={1.5} />
        <span className="font-serif text-lg tracking-[0.2em] text-eco-900 uppercase">EcoWatch</span>
      </Link>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl text-eco-900 tracking-tight mb-4">Welcome back</h1>
          <p className="text-eco-600 font-light text-sm tracking-wide">Enter your credentials to access your dashboard</p>
        </div>

        <div className="card-editorial card-body-editorial bg-white/90 backdrop-blur-xl">
          {error && (
            <div className="alert-error mb-8">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="label-editorial">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-editorial"
                placeholder="name@campus.edu"
              />
            </div>

            <div>
              <label className="label-editorial">Password</label>
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
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center text-xs tracking-wider border-t border-eco-900/10 pt-8">
            <span className="text-eco-500">Don't have an account? </span>
            <Link to="/register" className="text-eco-900 font-bold hover:text-accent transition-colors">
              CREATE ONE
            </Link>
          </div>
        </div>

        <div className="mt-12 text-center border border-eco-900/10 bg-white/50 p-6 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eco-500 mb-4">Demo Credentials</p>
          <div className="flex justify-center gap-6 mb-4">
            {['user', 'worker', 'admin'].map(role => (
              <span key={role} className="text-xs font-serif italic text-eco-900">{role}@campus.edu</span>
            ))}
          </div>
          <p className="text-xs text-eco-600">Password: <span className="font-bold">password123</span></p>
        </div>
      </div>
    </div>
  )
}
