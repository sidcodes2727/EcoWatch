import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageToggle from '../components/LanguageToggle'
import { extractStudentIdData } from '../lib/aiService'
import {
  Leaf, AlertCircle, Eye, EyeOff, Camera, Upload,
  CheckCircle, ShieldCheck, ArrowRight, ArrowLeft,
  RefreshCw, BadgeCheck, FileText
} from 'lucide-react'

export const VJTI_EMAIL_REGEX = /^[^\s@]+@([a-z0-9-]+\.)*vjti\.ac\.in$/i

export default function Register() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'user',
    department: '',
    phone: '',
    idNumber: '',
    validityYear: '',
    dob: ''
  })
  
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailWarning, setEmailWarning] = useState('')
  
  const [idImage, setIdImage] = useState(null)
  const [idFile, setIdFile] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const [verificationPassed, setVerificationPassed] = useState(false)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  const { signUp } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()

  const handleEmailChange = (e) => {
    const val = e.target.value
    setFormData({ ...formData, email: val })
    if (val && !VJTI_EMAIL_REGEX.test(val.trim())) {
      setEmailWarning(language === 'hi'
        ? 'सूचना: आधिकारिक VJTI ईमेल आवश्यक है (उदा. name@vjti.ac.in या student@it.vjti.ac.in)'
        : 'Note: Official VJTI email is required (e.g. name@vjti.ac.in or student@it.vjti.ac.in)')
    } else {
      setEmailWarning('')
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleProceedToId = (e) => {
    e.preventDefault()
    setError('')

    if (formData.role === 'user') {
      if (!formData.email) return setError(language === 'hi' ? 'ईमेल पता आवश्यक है' : 'Email address is required')
      if (!formData.fullName.trim()) return setError(language === 'hi' ? 'पूरा नाम आवश्यक है' : 'Full name is required')
      if (formData.password !== formData.confirmPassword) return setError(language === 'hi' ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match')
      if (formData.password.length < 6) return setError(language === 'hi' ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' : 'Password must be at least 6 characters')

      if (!VJTI_EMAIL_REGEX.test(formData.email.trim())) {
        if (!window.confirm(language === 'hi'
          ? 'आपने गैर-VJTI ईमेल दर्ज किया है। क्या आप डेमो के लिए जारी रखना चाहते हैं?'
          : 'You have entered a non-VJTI email. For demonstration, proceed anyway?')) {
          return
        }
      }
      setStep(2)
    } else {
      handleSubmitRegistration()
    }
  }

  const startCamera = async () => {
    setError('')
    setCapturing(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (err) {
      setError((language === 'hi' ? 'कैमरा शुरू करने में असमर्थ: ' : 'Unable to access camera: ') + err.message)
      setCapturing(false)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0)

    canvas.toBlob((blob) => {
      const file = new File([blob], 'vjti-id-card.jpg', { type: 'image/jpeg' })
      setIdFile(file)
      setIdImage(URL.createObjectURL(blob))
      stopCamera()
      processIdImage(file)
    }, 'image/jpeg', 0.9)
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCapturing(false)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setError(language === 'hi' ? 'कृपया फोटो फ़ाइल चुनें' : 'Please select an image file')
    if (file.size > 8 * 1024 * 1024) return setError(language === 'hi' ? 'फोटो का आकार 8MB से अधिक है' : 'Image size exceeds 8MB')

    setError('')
    setIdFile(file)
    setIdImage(URL.createObjectURL(file))
    processIdImage(file)
  }

  const processIdImage = async (file) => {
    setScanning(true)
    setError('')
    try {
      const result = await extractStudentIdData(file)
      setOcrResult(result)

      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || result.fullName || '',
        department: result.department || prev.department || '',
        idNumber: result.idNumber || '',
        validityYear: result.validityYear ? result.validityYear.toString() : '',
        dob: result.dob || ''
      }))

      const isCardValid = result.isVjtiCard && result.confidence >= 70
      setVerificationPassed(isCardValid)

      if (!result.isVjtiCard) {
        setError(language === 'hi'
          ? 'कार्ड सत्यापन चेतावनी: VJTI के सुरक्षा चिह्न (ESTD 1887 या VJTI लोगो) स्पष्ट रूप से नहीं दिखे। कृपया विवरण जांचें।'
          : 'Card verification warning: VJTI institutional markers (ESTD 1887 or vertical VJTI text) were not clearly detected. Please verify details manually.')
      }

      setStep(3)
    } catch (err) {
      setError((language === 'hi' ? 'AI जांच में त्रुटि: ' : 'AI extraction failed: ') + err.message)
      setStep(3)
    } finally {
      setScanning(false)
    }
  }

  const handleSubmitRegistration = async () => {
    setLoading(true)
    setError('')
    try {
      await signUp(formData.email, formData.password, {
        fullName: formData.fullName,
        role: formData.role,
        department: formData.department,
        phone: formData.phone,
        idNumber: formData.idNumber,
        validityYear: formData.validityYear
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || (language === 'hi' ? 'पंजीकरण विफल रहा' : 'Failed to complete registration'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-grid-pattern bg-grid-size relative py-16">
      <div className="absolute top-8 right-8 z-50">
        <LanguageToggle />
      </div>
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2">
        <Leaf className="w-5 h-5 text-eco-900" strokeWidth={1.5} />
        <span className="font-serif text-lg tracking-[0.2em] text-eco-900 uppercase">EcoWatch</span>
      </Link>

      <div className="w-full max-w-2xl z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-eco-900 text-eco-50 rounded-full text-[10px] font-bold tracking-widest uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-eco-300" />
            {t('vjtiGatekeeper')}
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-eco-900 tracking-tight mb-2">
            {t('campusRegistration')}
          </h1>
          <p className="text-eco-600 font-light text-sm tracking-wide">
            {t('vjtiSubtitle')}
          </p>
        </div>

        {formData.role === 'user' && (
          <div className="flex items-center justify-center gap-4 mb-8">
            {[
              { num: 1, label: t('stepAccount') },
              { num: 2, label: t('stepIdScan') },
              { num: 3, label: t('stepVerification') }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s.num
                    ? 'bg-eco-900 text-white ring-4 ring-eco-900/10'
                    : step > s.num
                    ? 'bg-eco-700 text-white'
                    : 'bg-eco-200 text-eco-600'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={`text-xs font-bold tracking-widest uppercase hidden sm:block ${
                  step === s.num ? 'text-eco-900' : 'text-eco-400'
                }`}>
                  {s.label}
                </span>
                {idx < 2 && <div className="w-8 h-px bg-eco-900/15" />}
              </div>
            ))}
          </div>
        )}

        <div className="card-editorial card-body-editorial bg-white/95 backdrop-blur-xl">
          {error && (
            <div className="alert-error mb-8">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {emailWarning && (
            <div className="p-3 mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>{emailWarning}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleProceedToId} className="space-y-8">
              <div>
                <label className="label-editorial mb-4">{t('registrationPathway')}</label>
                <div className="grid grid-cols-3 gap-0 border border-eco-900/20 p-1 bg-white">
                  {[
                    { value: 'user', label: t('roleUser') },
                    { value: 'worker', label: t('roleWorker') },
                    { value: 'admin', label: t('roleAdmin') }
                  ].map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: role.value })}
                      className={`py-3 text-xs font-bold tracking-widest uppercase transition-all duration-300 ${
                        formData.role === role.value 
                          ? 'bg-eco-900 text-white shadow-sm' 
                          : 'bg-transparent text-eco-600 hover:bg-eco-50'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.role !== 'user' && (
                <div className="p-4 bg-eco-50 border border-eco-900/10 text-xs text-eco-700 leading-relaxed">
                  <p className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-eco-600" /> {t('staffPolicyNotice')}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="label-editorial">{t('fullNameAsOnId')}</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="input-editorial"
                    placeholder="e.g. Mohammed Mehdi Hedayati"
                  />
                </div>
                <div>
                  <label className="label-editorial">{t('vjtiEmailAddress')}</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleEmailChange}
                    required
                    className="input-editorial"
                    placeholder="student@vjti.ac.in"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="label-editorial">{t('departmentOptional')}</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="input-editorial"
                    placeholder="e.g. Information Technology"
                  />
                </div>
                <div>
                  <label className="label-editorial">{t('contactPhone')}</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-editorial"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="label-editorial">{t('password')}</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="input-editorial pr-10"
                      placeholder={t('minChars')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(p => !p)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-eco-400 hover:text-eco-900 p-2"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label-editorial">{t('confirmPassword')}</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="input-editorial"
                    placeholder={t('reEnterPassword')}
                  />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="btn-editorial btn-editorial-primary w-full group">
                  {formData.role === 'user' ? t('proceedToId') : t('registerAccount')}
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="border-b border-eco-900/10 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-2xl text-eco-900">{t('scanVjtiId')}</h3>
                  <p className="text-xs text-eco-600 font-light mt-1">
                    {t('scanSubtitle')}
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-eco-500 hover:text-eco-900 flex items-center gap-1 uppercase tracking-wider"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> {t('back')}
                </button>
              </div>

              {capturing ? (
                <div className="relative border-2 border-eco-900/20 bg-eco-950 aspect-[4/3] rounded-sm overflow-hidden flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  
                  <div className="absolute inset-6 border-2 border-dashed border-white/70 pointer-events-none rounded flex flex-col justify-between p-4">
                    <div className="flex justify-between items-start text-[10px] font-mono text-white/80 bg-black/40 px-2 py-1 rounded">
                      <span>{t('alignCardPrompt')}</span>
                      <span>{t('idCenterPrompt')}</span>
                    </div>
                    <div className="w-16 h-20 border border-white/50 rounded self-start flex items-center justify-center text-[9px] text-white/70">
                      PHOTO
                    </div>
                    <div className="text-center text-[10px] font-mono text-white/80 bg-black/40 px-2 py-1 rounded">
                      {t('keepFlatPrompt')}
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex gap-4">
                    <button
                      onClick={capturePhoto}
                      className="btn-editorial bg-white text-eco-900 hover:bg-eco-100 flex-1 py-3"
                    >
                      <Camera className="w-4 h-4 mr-2" /> {t('snapIdPhoto')}
                    </button>
                    <button
                      onClick={stopCamera}
                      className="btn-editorial bg-red-600/80 text-white hover:bg-red-700 py-3"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              ) : scanning ? (
                <div className="border border-eco-900/10 p-12 text-center bg-eco-50">
                  <RefreshCw className="w-8 h-8 animate-spin text-eco-900 mx-auto mb-4" />
                  <h4 className="font-serif text-2xl text-eco-900 mb-2">{t('analyzingCard')}</h4>
                  <p className="text-xs text-eco-600 tracking-wider uppercase font-mono">
                    {t('analyzingCardSub')}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-eco-900/20 bg-eco-50/50 p-8 text-center rounded-sm">
                    <FileText className="w-12 h-12 text-eco-400 mx-auto mb-4" />
                    <h4 className="font-serif text-xl text-eco-900 mb-2">{t('scanVjtiId')}</h4>
                    <p className="text-xs text-eco-600 font-light max-w-md mx-auto mb-6">
                      {t('scanSubtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={startCamera}
                        className="btn-editorial btn-editorial-primary flex items-center justify-center"
                      >
                        <Camera className="w-4 h-4 mr-2" /> {t('openCamera')}
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-editorial btn-editorial-secondary flex items-center justify-center"
                      >
                        <Upload className="w-4 h-4 mr-2" /> {t('uploadIdImage')}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-eco-50 border border-eco-900/10 text-xs text-eco-700 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 flex-shrink-0 text-eco-600 mt-0.5" />
                    <p>
                      <strong>{t('privacy')}:</strong> {t('privacyNotice')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="border-b border-eco-900/10 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-2xl text-eco-900 flex items-center gap-2">
                    <BadgeCheck className="w-6 h-6 text-eco-600" />
                    {t('verificationResults')}
                  </h3>
                  <p className="text-xs text-eco-600 font-light mt-1">
                    {t('reviewExtractedSub')}
                  </p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-eco-500 hover:text-eco-900 flex items-center gap-1 uppercase tracking-wider"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> {t('rescanCard')}
                </button>
              </div>

              <div className={`p-4 border flex items-center gap-4 ${
                verificationPassed 
                  ? 'bg-eco-500/10 border-eco-500/30 text-eco-900' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-900'
              }`}>
                {verificationPassed ? (
                  <CheckCircle className="w-6 h-6 text-eco-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-bold">
                    {verificationPassed ? t('vjtiCardVerified') : t('manualReviewRec')}
                  </p>
                  <p className="text-xs opacity-80">
                    {ocrResult?.observations || t('reviewExtractedSub')}
                  </p>
                </div>
                {ocrResult?.confidence && (
                  <span className="ml-auto font-mono text-xs font-bold bg-white px-2.5 py-1 border border-eco-900/10">
                    {ocrResult.confidence}% {t('confidence').toUpperCase()}
                  </span>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6 bg-eco-50/50 p-6 border border-eco-900/10">
                <div>
                  <label className="label-editorial">{t('studentIdNumber')}</label>
                  <input
                    type="text"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleChange}
                    className="input-editorial bg-white px-3 font-mono text-sm"
                    placeholder="e.g. 241080023"
                  />
                </div>
                <div>
                  <label className="label-editorial">{t('verifiedName')}</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="input-editorial bg-white px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="label-editorial">{t('deptDegree')}</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="input-editorial bg-white px-3 text-sm"
                    placeholder="Information Technology"
                  />
                </div>
                <div>
                  <label className="label-editorial">{t('validityYear')}</label>
                  <input
                    type="text"
                    name="validityYear"
                    value={formData.validityYear}
                    onChange={handleChange}
                    className="input-editorial bg-white px-3 font-mono text-sm"
                    placeholder="2028"
                  />
                </div>
              </div>

              {ocrResult?.securityMarkersFound?.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-eco-400 uppercase tracking-widest block mb-2">
                    {t('verifiedMarkers')}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ocrResult.securityMarkersFound.map((marker, i) => (
                      <span key={i} className="badge-editorial badge-eco">
                        ✓ {marker.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-eco-900/10">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-editorial btn-editorial-secondary flex-1"
                >
                  {t('rescanCard')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRegistration}
                  disabled={loading}
                  className="btn-editorial btn-editorial-primary flex-1"
                >
                  {loading ? t('authenticating') : t('confirmCompleteReg')}
                </button>
              </div>
            </div>
          )}
          
          <div className="mt-8 text-center text-xs tracking-wider border-t border-eco-900/10 pt-8">
            <span className="text-eco-500">{t('alreadyRegistered')} </span>
            <Link to="/login" className="text-eco-900 font-bold hover:text-accent transition-colors">
              {t('signIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
