import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { analyzeWasteImage } from '../lib/aiService'
import { findNearestBin } from '../lib/routeOptimizer'
import {
  Camera, Loader, CheckCircle, Upload,
  MapPin, Leaf, LogOut, Clock, Sparkles, AlertCircle
} from 'lucide-react'

export default function UserDashboard() {
  const { profile, signOut } = useAuth()
  const [location, setLocation] = useState(null)
  const [nearestBin, setNearestBin] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [myReports, setMyReports] = useState([])
  const [showOptions, setShowOptions] = useState(false)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
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
        latitude: parseFloat(import.meta.env.VITE_CAMPUS_CENTER_LAT || 19.0222),
        longitude: parseFloat(import.meta.env.VITE_CAMPUS_CENTER_LNG || 72.8561),
        accuracy: null, isFallback: true
      }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })

  const setupLocationAndBin = async () => {
    setError('Getting location...')
    const userLocation = await getUserLocation()
    setLocation(userLocation)
    if (userLocation.isFallback) setError('Using campus center (GPS off)')
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
    } catch (err) { setError('Camera failed: ' + err.message) }
  }

  const handleFileUpload = async () => {
    setShowOptions(false)
    try {
      await setupLocationAndBin()
      fileInputRef.current?.click()
    } catch (err) { setError('Location failed: ' + err.message) }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please select an image')
    if (file.size > 5 * 1024 * 1024) return setError('Image too large (max 5MB)')
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
      setError('Analysis failed: ' + err.message)
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

  const getSeverityBadge = (s) => {
    const map = { high: 'badge-red', medium: 'badge-yellow', low: 'badge-eco' }
    return `badge-editorial ${map[s] || 'badge-slate'}`
  }

  return (
    <div className="min-h-screen">
      <nav className="nav-header">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="w-5 h-5 text-eco-900" strokeWidth={1.5} />
            <div className="flex items-center gap-4">
              <h1 className="font-serif text-lg tracking-[0.2em] text-eco-900 uppercase">EcoWatch</h1>
              <span className="text-eco-300">|</span>
              <p className="text-[10px] font-bold tracking-[0.2em] text-eco-600 uppercase">{profile?.full_name}</p>
            </div>
          </div>
          <button onClick={signOut} className="btn-editorial-ghost">
            Sign out
          </button>
        </div>
      </nav>

      <div className="dashboard-container max-w-4xl">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {error && (
          <div className="alert-error mb-10">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert-success mb-10">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {showOptions && (
          <div className="modal-overlay-editorial">
            <div className="card-editorial w-full max-w-md bg-white">
              <div className="card-header-editorial">
                <h3 className="font-serif text-2xl text-eco-900">Select Source</h3>
              </div>
              <div className="card-body-editorial space-y-4">
                <button onClick={handleCameraCapture} className="btn-editorial btn-editorial-primary w-full">
                  <Camera className="w-4 h-4 mr-3" /> Camera
                </button>
                <button onClick={handleFileUpload} className="btn-editorial btn-editorial-secondary w-full">
                  <Upload className="w-4 h-4 mr-3" /> Upload File
                </button>
                <button onClick={() => setShowOptions(false)} className="btn-editorial btn-editorial-ghost w-full mt-4">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {!capturing && !capturedImage && !showOptions && (
          <div className="card-editorial mb-12">
            <div className="card-body-editorial flex flex-col items-center text-center py-20 px-8">
              <Leaf className="w-10 h-10 text-eco-300 mb-8" strokeWidth={1} />
              <h2 className="font-serif text-5xl text-eco-900 mb-6 tracking-tight">Report an Incident</h2>
              <p className="text-eco-600 font-light max-w-md text-base leading-relaxed mb-10">
                Submit photographic evidence. Our AI analysis will determine fill levels and deploy appropriate personnel.
              </p>
              <button onClick={() => { setError(''); setSuccess(''); setShowOptions(true) }} className="btn-editorial btn-editorial-primary">
                Initialize Report
              </button>
            </div>
          </div>
        )}

        {capturing && (
          <div className="card-editorial mb-12">
            <div className="card-header-editorial">
              <h3 className="font-serif text-3xl text-eco-900">Capture Proof</h3>
            </div>
            <div className="card-body-editorial p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 mb-6">
                {location && (
                  <div className="flex-1 border-b border-eco-900/10 pb-4">
                    <p className="text-[10px] font-bold text-eco-400 uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Coordinates</p>
                    <p className="text-sm font-mono text-eco-900">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
                  </div>
                )}
                {nearestBin && (
                  <div className="flex-1 border-b border-eco-900/10 pb-4">
                    <p className="text-[10px] font-bold text-eco-600 uppercase tracking-widest mb-1 flex items-center gap-1">Detected Target</p>
                    <div className="flex items-center justify-between">
                      <p className="font-serif text-lg text-eco-900">{nearestBin.bin_code}</p>
                      <span className="text-xs text-eco-500 font-mono">{Math.round(nearestBin.distance)}m</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative border border-eco-900/10 bg-eco-50 mb-8 aspect-[4/3] sm:aspect-video flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale-[20%]" />
              </div>
              <div className="flex gap-4">
                <button onClick={handleCapture} className="btn-editorial btn-editorial-primary flex-1">
                  Capture Image
                </button>
                <button onClick={handleCancel} className="btn-editorial btn-editorial-secondary flex-1">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {capturedImage && (
          <div className="card-editorial mb-12">
            <div className="card-header-editorial">
              <h3 className="font-serif text-3xl text-eco-900 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-eco-400" />
                Diagnostic Analysis
              </h3>
            </div>
            <div className="card-body-editorial p-0">
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-eco-900/10">
                <div className="p-8">
                  <div className="border border-eco-900/10 mb-6 relative">
                    <img src={capturedImage} alt="Captured" className="w-full h-auto object-cover grayscale-[10%]" />
                    {nearestBin && (
                      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur border border-eco-900/10 p-3 flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-eco-500" />
                        <div>
                          <p className="text-sm font-bold text-eco-900">{nearestBin.bin_code}</p>
                          <p className="text-[10px] uppercase tracking-wider text-eco-500">{nearestBin.location_name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 flex flex-col justify-center">
                  {analyzing ? (
                    <div className="text-center">
                      <Loader className="w-6 h-6 animate-spin text-eco-300 mx-auto mb-4" />
                      <p className="font-serif text-2xl text-eco-900 mb-2">Analyzing...</p>
                      <p className="text-xs font-light text-eco-500 uppercase tracking-widest">Evaluating parameters</p>
                    </div>
                  ) : analysis ? (
                    <div className="space-y-8">
                      <div>
                        <div className="flex justify-between items-end mb-3">
                          <span className="text-[10px] font-bold text-eco-500 tracking-[0.2em] uppercase">Fill Volume</span>
                          <span className="font-serif text-4xl text-eco-900">{analysis.fillPercentage.toFixed(0)}<span className="text-xl text-eco-400 font-sans">%</span></span>
                        </div>
                        <div className="h-1 w-full bg-eco-100 relative">
                          <div className={`absolute top-0 left-0 h-full transition-all duration-1000 ${analysis.fillPercentage > 70 ? 'bg-accent' : 'bg-eco-900'}`} style={{ width: `${analysis.fillPercentage}%` }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <span className="text-[10px] font-bold text-eco-500 uppercase tracking-widest block mb-2">Severity</span>
                          <span className={getSeverityBadge(analysis.severity)}>{analysis.severity}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-eco-500 uppercase tracking-widest block mb-2">Confidence</span>
                          <span className="font-mono text-lg text-eco-900">{analysis.confidence.toFixed(0)}%</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-eco-900/10">
                        <span className="text-[10px] font-bold text-eco-500 uppercase tracking-widest block mb-2">Classification</span>
                        <span className="font-serif text-xl text-eco-900">{analysis.wasteType}</span>
                      </div>

                      <button onClick={handleReset} className="btn-editorial btn-editorial-secondary w-full mt-4">
                        Submit Next Report
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card-editorial">
          <div className="card-header-editorial">
            <h3 className="font-serif text-2xl text-eco-900">Recent Logs</h3>
            <span className="text-xs font-mono text-eco-500">{myReports.length} ENTRIES</span>
          </div>

          {myReports.length === 0 ? (
            <div className="card-body-editorial text-center py-16">
              <p className="font-serif text-2xl text-eco-400 italic">No logs found.</p>
            </div>
          ) : (
            <div className="divide-y divide-eco-900/10">
              {myReports.map((report) => (
                <div key={report.id} className="p-8 hover:bg-eco-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-4 mb-3">
                        <span className="font-serif text-2xl text-eco-900">{report.bins?.bin_code}</span>
                        <span className={getSeverityBadge(report.severity)}>{report.severity}</span>
                      </div>
                      <p className="text-xs font-bold tracking-widest uppercase text-eco-600 mb-2">{report.bins?.location_name}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-eco-800">{report.fill_percentage?.toFixed(0)}% FULL</span>
                        <span className="text-eco-300">|</span>
                        <span className="text-xs text-eco-500 uppercase">{report.waste_type}</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold tracking-[0.2em] text-eco-400 sm:text-right uppercase">
                      {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
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
