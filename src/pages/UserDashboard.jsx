import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { analyzeWasteImage } from '../lib/aiService'
import { findNearestBin } from '../lib/routeOptimizer'
import {
  Camera, Loader, CheckCircle, XCircle, Upload,
  MapPin, Leaf, LogOut, Clock, Sparkles, ChevronRight
} from 'lucide-react'

export default function UserDashboard() {
  const { profile, signOut } = useAuth()
  const [location, setLocation]       = useState(null)
  const [nearestBin, setNearestBin]   = useState(null)
  const [capturing, setCapturing]     = useState(false)
  const [analyzing, setAnalyzing]     = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [analysis, setAnalysis]       = useState(null)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [myReports, setMyReports]     = useState([])
  const [showOptions, setShowOptions] = useState(false)

  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchMyReports() }, [])

  const fetchMyReports = async () => {
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*, bins(bin_code, location_name)')
        .eq('reporter_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      setMyReports(data || [])
    } catch (err) { console.error('Error fetching reports:', err) }
  }

  const getUserLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve({
        latitude:  parseFloat(import.meta.env.VITE_CAMPUS_CENTER_LAT || 19.0222),
        longitude: parseFloat(import.meta.env.VITE_CAMPUS_CENTER_LNG || 72.8561),
        accuracy: null, isFallback: true
      }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })

  const handleStartReport = () => {
    setError(''); setSuccess(''); setAnalysis(null); setCapturedImage(null); setShowOptions(true)
  }

  const setupLocationAndBin = async () => {
    setError('Getting your location…')
    const userLocation = await getUserLocation()
    setLocation(userLocation)
    if (userLocation.isFallback) setError('Using campus center location (GPS unavailable)')
    else setError('')

    const { data: bins, error: binsError } = await supabase.from('bins').select('*').eq('is_active', true)
    if (binsError) throw binsError
    if (!bins?.length) throw new Error('No bins available')

    const nearest = findNearestBin(userLocation, bins)
    setNearestBin(nearest)
    setError('')
    return { userLocation, nearest }
  }

  const handleCameraCapture = async () => {
    setShowOptions(false)
    try {
      await setupLocationAndBin()
      setCapturing(true)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) { videoRef.current.srcObject = stream; streamRef.current = stream }
    } catch (err) { setError('Failed to start camera: ' + err.message) }
  }

  const handleFileUpload = async () => {
    setShowOptions(false)
    try {
      await setupLocationAndBin()
      fileInputRef.current?.click()
    } catch (err) { setError('Failed to get location: ' + err.message) }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please select an image file')
    if (file.size > 5 * 1024 * 1024) return setError('Image too large. Max 5 MB')
    setCapturedImage(URL.createObjectURL(file))
    await analyzeImage(file)
  }

  const handleCapture = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'waste-report.jpg', { type: 'image/jpeg' })
      setCapturedImage(URL.createObjectURL(blob))
      streamRef.current?.getTracks().forEach(t => t.stop())
      setCapturing(false)
      await analyzeImage(file)
    }, 'image/jpeg', 0.8)
  }

  const analyzeImage = async (imageFile) => {
    setAnalyzing(true); setError('')
    try {
      const result = await analyzeWasteImage(imageFile)
      setAnalysis(result)
      if (result.fillPercentage < 30) {
        setSuccess(`Bin is mostly empty (${result.fillPercentage.toFixed(0)}%). No report needed!`); return
      }
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
      const { error: uploadError } = await supabase.storage.from('waste-images').upload(fileName, imageFile)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('waste-images').getPublicUrl(fileName)

      const { data: report, error: reportError } = await supabase
        .from('waste_reports')
        .insert({
          bin_id: nearestBin.id, reporter_id: profile.id, image_url: publicUrl,
          fill_percentage: result.fillPercentage, severity: result.severity,
          waste_type: result.wasteType, ai_confidence: result.confidence,
          ai_analysis_json: result.rawResponse,
          latitude: location.latitude, longitude: location.longitude
        }).select().single()
      if (reportError) throw reportError

      let priority = 3
      if (result.severity === 'high' || result.fillPercentage > 70) priority = 1
      else if (result.severity === 'medium' || result.fillPercentage > 40) priority = 2

      await supabase.from('cleaning_tasks').insert({
        bin_id: nearestBin.id, report_id: report.id, priority, status: 'pending',
        notes: `${result.wasteType} - ${result.fillPercentage}% full (${result.severity} severity)`
      })
      setSuccess('Report submitted successfully!')
      fetchMyReports()
    } catch (err) {
      setError('Failed to analyze: ' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCancel = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCapturing(false); setCapturedImage(null); setAnalysis(null); setError('')
  }

  const handleReset = () => {
    setCapturedImage(null); setAnalysis(null); setNearestBin(null)
    setLocation(null); setError(''); setSuccess('')
  }

  const getFillColor = (pct) => {
    if (pct > 70) return 'from-red-500 to-red-400'
    if (pct > 40) return 'from-amber-500 to-yellow-400'
    return 'from-emerald-500 to-green-400'
  }

  const getSeverityBadge = (s) => {
    const map = { high: 'badge badge-red', medium: 'badge badge-yellow', low: 'badge badge-green' }
    return map[s] || 'badge bg-gray-100 text-gray-600'
  }

  const getSeverityBorderClass = (s) => {
    const map = { high: 'border-l-red-500', medium: 'border-l-amber-500', low: 'border-l-emerald-500' }
    return map[s] || 'border-l-gray-200'
  }

  return (
    <div className="min-h-screen bg-mesh">
      {/* ── NAV ── */}
      <nav className="nav-header">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#10b981,#0891b2)' }}>
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight leading-none">EcoWatch</h1>
              <p className="text-primary-300 text-xs mt-0.5">{profile?.full_name}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-8">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {/* ── Status Messages ── */}
        {error && (
          <div className="alert-error mb-5">
            <XCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="alert-success mb-5">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        {/* ── Options Modal ── */}
        {showOptions && (
          <div className="modal-overlay">
            <div className="glass rounded-3xl p-7 max-w-sm w-full shadow-card-lg animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                     style={{ background: 'linear-gradient(135deg,#059669,#0891b2)' }}>
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">Choose Image Source</h3>
                <p className="text-gray-500 text-sm mt-1">How would you like to provide the bin image?</p>
              </div>
              <div className="space-y-3">
                <button onClick={handleCameraCapture} className="btn-primary w-full py-3.5">
                  <Camera className="w-5 h-5" /> Capture with Camera
                </button>
                <button onClick={handleFileUpload} className="btn-secondary w-full py-3.5">
                  <Upload className="w-5 h-5" /> Upload from Gallery
                </button>
                <button onClick={() => setShowOptions(false)}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Action Card ── */}
        {!capturing && !capturedImage && !showOptions && (
          <div className="dash-card mb-8 animate-fade-in-up">
            <div className="p-10 text-center">
              {/* Hero icon */}
              <div className="relative inline-flex mb-7">
                <div className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-glow-primary animate-bounce-gentle"
                     style={{ background: 'linear-gradient(135deg,#059669,#0891b2)' }}>
                  <Camera className="w-14 h-14 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center shadow-glow-accent">
                  <Sparkles className="w-4 h-4 text-white" />
                </span>
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                Report a Waste Bin
              </h2>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
                Capture or upload a photo. Our AI instantly analyzes the fill level, waste type, and severity.
              </p>
              <button onClick={handleStartReport} className="btn-primary px-10 py-3.5 text-base">
                <Sparkles className="w-5 h-5" /> Start Report
              </button>
            </div>

            {/* Stats strip */}
            <div className="border-t border-gray-50 grid grid-cols-3 divide-x divide-gray-50">
              {[
                { label: 'AI Powered', sub: 'Gemini Vision' },
                { label: 'Real-time', sub: 'Instant results' },
                { label: 'Secure', sub: 'Supabase backend' },
              ].map(({ label, sub }) => (
                <div key={label} className="py-4 px-6 text-center">
                  <p className="text-xs font-bold text-gray-800">{label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Camera Capture ── */}
        {capturing && (
          <div className="dash-card p-6 mb-8 animate-fade-in">
            {/* Location info */}
            <div className="grid md:grid-cols-3 gap-3 mb-5">
              {location && (
                <div className="info-tile bg-secondary-50 border border-secondary-100">
                  <div className="info-tile-label flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-secondary-500" /> Location
                  </div>
                  <p className="text-xs text-secondary-700 font-mono">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>
                  {location.accuracy && (
                    <p className="text-[10px] text-secondary-400 mt-0.5">±{Math.round(location.accuracy)}m</p>
                  )}
                </div>
              )}
              {nearestBin && (
                <div className="info-tile bg-primary-50 border border-primary-100 md:col-span-2">
                  <div className="info-tile-label flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-primary-500 flex items-center justify-center">
                      <span className="text-[7px] font-bold text-white">B</span>
                    </div>
                    Nearest Bin
                  </div>
                  <p className="text-sm font-extrabold text-primary-900">{nearestBin.bin_code}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-primary-700">{nearestBin.location_name}</span>
                    <span className="badge badge-green">{Math.round(nearestBin.distance)}m away</span>
                  </div>
                </div>
              )}
            </div>
            <div className="relative bg-dark rounded-2xl overflow-hidden mb-4 ring-1 ring-white/5">
              <video ref={videoRef} autoPlay playsInline className="w-full" />
              <div className="absolute inset-0 pointer-events-none"
                   style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4)' }} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleCapture} className="btn-primary flex-1 py-3">
                <Camera className="w-5 h-5" /> Capture Image
              </button>
              <button onClick={handleCancel} className="btn-ghost border border-gray-200 px-6">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Analysis Results ── */}
        {capturedImage && (
          <div className="dash-card p-6 mb-8 animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg,#059669,#0891b2)' }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">AI Analysis</h3>
                <p className="text-xs text-gray-400">Powered by Gemini Vision</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <img src={capturedImage} alt="Captured" className="w-full rounded-2xl border border-gray-100 shadow-sm object-cover" />
                {nearestBin && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                    <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <span className="font-semibold">{nearestBin.bin_code}</span>
                    <span className="text-gray-300">·</span>
                    <span className="truncate">{nearestBin.location_name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {analyzing ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                         style={{ background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)' }}>
                      <Loader className="w-10 h-10 animate-spin text-primary-600" />
                    </div>
                    <p className="text-gray-700 font-semibold">Analyzing with Gemini AI…</p>
                    <p className="text-xs text-gray-400 mt-1">Detecting fill level & waste type</p>
                  </div>
                ) : analysis ? (
                  <>
                    {/* Fill Level */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="info-tile-label">Fill Level</span>
                        <span className="text-3xl font-extrabold text-gray-900">
                          {analysis.fillPercentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${getFillColor(analysis.fillPercentage)} h-full rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${analysis.fillPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="info-tile bg-gray-50 border border-gray-100">
                        <div className="info-tile-label">Severity</div>
                        <span className={getSeverityBadge(analysis.severity)}>
                          {analysis.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="info-tile bg-gray-50 border border-gray-100">
                        <div className="info-tile-label">Confidence</div>
                        <p className="text-xl font-extrabold text-gray-900 mt-0.5">{analysis.confidence.toFixed(0)}%</p>
                      </div>
                    </div>

                    <div className="info-tile bg-gray-50 border border-gray-100">
                      <div className="info-tile-label">Waste Type</div>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{analysis.wasteType}</p>
                    </div>

                    <div className="info-tile bg-gray-50 border border-gray-100">
                      <div className="info-tile-label">Observations</div>
                      <p className="text-sm text-gray-600 leading-relaxed mt-0.5">{analysis.observations}</p>
                    </div>

                    <button onClick={handleReset} className="btn-primary w-full py-3">
                      <Camera className="w-5 h-5" /> Submit Another Report
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* ── Recent Reports ── */}
        <div className="dash-card animate-fade-in">
          <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Recent Reports</h3>
              <p className="text-xs text-gray-400 mt-0.5">Your last {myReports.length || 0} submissions</p>
            </div>
            {myReports.length > 0 && (
              <span className="text-xs text-gray-400">{myReports.length} report{myReports.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {myReports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Camera className="w-10 h-10 text-primary-400" />
              </div>
              <p className="text-gray-600 font-semibold">No reports yet</p>
              <p className="text-xs text-gray-400 mt-1">Submit your first bin report above</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {myReports.map((report, i) => (
                <div
                  key={report.id}
                  className={`px-6 py-4 border-l-4 ${getSeverityBorderClass(report.severity)} hover:bg-gray-50/60 transition-colors duration-150`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 text-sm">{report.bins?.bin_code}</p>
                        <span className="text-gray-300">·</span>
                        <p className="text-sm text-gray-500 truncate">{report.bins?.location_name}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                        <span>Fill: <span className="font-semibold text-gray-700">{report.fill_percentage?.toFixed(0)}%</span></span>
                        <span className="text-gray-200">|</span>
                        <span>{report.waste_type}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3 h-3 text-gray-300" />
                        <span className="text-[11px] text-gray-400">{new Date(report.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className={getSeverityBadge(report.severity)}>{report.severity?.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
