import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Leaf, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    fullName: '', role: 'user', department: '', phone: ''
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match')
    if (formData.password.length < 6) return setError('Password must be at least 6 characters')
    
    setLoading(true)
    try {
      await signUp(formData.email, formData.password, {
        fullName: formData.fullName, 
        role: formData.role,
        department: formData.department, 
        phone: formData.phone
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-grid-pattern bg-grid-size relative py-16">
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2">
        <Leaf className="w-5 h-5 text-eco-900" strokeWidth={1.5} />
        <span className="font-serif text-lg tracking-[0.2em] text-eco-900 uppercase">EcoWatch</span>
      </Link>

      <div className="w-full max-w-2xl z-10">
        
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl text-eco-900 tracking-tight mb-4">Join EcoWatch</h1>
          <p className="text-eco-600 font-light text-sm tracking-wide">Register to participate in campus environmental stewardship</p>
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
              <label className="label-editorial mb-4">I am registering as a...</label>
              <div className="grid grid-cols-3 gap-0 border border-eco-900/20 p-1 bg-white">
                {[
                  { value: 'user', label: 'Reporter' },
                  { value: 'worker', label: 'Worker' },
                  { value: 'admin', label: 'Admin' }
                ].map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: role.value })}
                    className={`py-3 text-xs font-bold tracking-widest uppercase transition-all duration-300 \${
                      formData.role === role.value 
                        ? 'bg-eco-900 text-white' 
                        : 'bg-transparent text-eco-600 hover:bg-eco-50'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label className="label-editorial">Full Name</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="input-editorial" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="label-editorial">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="input-editorial" placeholder="name@campus.edu" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label className="label-editorial">Department (Optional)</label>
                <input type="text" name="department" value={formData.department} onChange={handleChange} className="input-editorial" placeholder="e.g. Science" />
              </div>
              <div>
                <label className="label-editorial">Phone Number (Optional)</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input-editorial" placeholder="+1 (555) 000-0000" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label className="label-editorial">Password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required className="input-editorial pr-10" placeholder="Min. 6 chars" />
                  <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-0 top-1/2 -translate-y-1/2 text-eco-400 hover:text-eco-900 p-2">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label-editorial">Confirm Password</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="input-editorial" placeholder="Re-enter password" />
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading} className="btn-editorial btn-editorial-primary w-full">
                {loading ? 'Processing...' : 'Create Account'}
              </button>
            </div>
          </form>
          
          <div className="mt-8 text-center text-xs tracking-wider border-t border-eco-900/10 pt-8">
            <span className="text-eco-500">Already have an account? </span>
            <Link to="/login" className="text-eco-900 font-bold hover:text-accent transition-colors">
              SIGN IN
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
