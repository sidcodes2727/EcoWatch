import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { analyzeWasteImage } from '../lib/aiService'
import { findNearestBin } from '../lib/routeOptimizer'
import { Camera, Loader, CheckCircle, XCircle, Upload, MapPin, Leaf, LogOut, Clock, Sparkles } from 'lucide-react'

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

  useEffect(() => {
    fetchMyReports()
  }, [])

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
    } catch (err) {
      console.error('Error fetching reports:', err)
    }
  }

  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by your browser'))
      }

      console.log('🌍 Fetching your GPS location...')

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
          console.log('✅ GPS Location obtained:', userLoc)
          resolve(userLoc)
        },
        (error) => {
          console.error('❌ GPS Error:', error.message)
          const fallbackLoc = {
            latitude: parseFloat(import.meta.env.VITE_CAMPUS_CENTER_LAT || 19.0222),
            longitude: parseFloat(import.meta.env.VITE_CAMPUS_CENTER_LNG || 72.8561),
            accuracy: null,
            isFallback: true
          }
          console.warn('⚠️ Using fallback location (campus center):', fallbackLoc)
          resolve(fallbackLoc)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }

  const handleStartReport = async () => {
    setError('')
    setSuccess('')
    setAnalysis(null)
    setCapturedImage(null)
    setShowOptions(true)
  }

  const handleCameraCapture = async () => {
    setShowOptions(false)
    try {
      setError('Getting your location...')

      const userLocation = await getUserLocation()
      setLocation(userLocation)

      if (userLocation.isFallback) {
        setError('Using campus center location (GPS unavailable)')
      } else {
        setError('')
      }

      const { data: bins, error: binsError } = await supabase
        .from('bins')
        .select('*')
        .eq('is_active', true)

      if (binsError) throw binsError
      if (!bins || bins.length === 0) throw new Error('No bins available in database')

      const nearest = findNearestBin(userLocation, bins)
      setNearestBin(nearest)

      console.log('📍 Your location:', userLocation)
      console.log('🗑️ Nearest bin:', nearest.bin_code, 'Distance:', Math.round(nearest.distance), 'm')

      setError('')

      setCapturing(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (err) {
      setError('Failed to start camera: ' + err.message)
      console.error('Camera error:', err)
    }
  }

  const handleFileUpload = async () => {
    setShowOptions(false)
    try {
      setError('Getting your location...')

      const userLocation = await getUserLocation()
      setLocation(userLocation)

      if (userLocation.isFallback) {
        setError('Using campus center location (GPS unavailable)')
      } else {
        setError('')
      }

      const { data: bins, error: binsError } = await supabase
        .from('bins')
        .select('*')
        .eq('is_active', true)

      if (binsError) throw binsError
      if (!bins || bins.length === 0) throw new Error('No bins available in database')

      const nearest = findNearestBin(userLocation, bins)
      setNearestBin(nearest)

      console.log('📍 Your location:', userLocation)
      console.log('🗑️ Nearest bin:', nearest.bin_code, 'Distance:', Math.round(nearest.distance), 'm')

      setError('')
      fileInputRef.current?.click()
    } catch (err) {
      setError('Failed to get location: ' + err.message)
      console.error('Location error:', err)
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large. Please select an image under 5MB')
      return
    }

    setCapturedImage(URL.createObjectURL(file))
    await analyzeImage(file)
  }

  const handleCapture = () => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0)

    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'waste-report.jpg', { type: 'image/jpeg' })
      setCapturedImage(URL.createObjectURL(blob))

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      setCapturing(false)

      await analyzeImage(file)
    }, 'image/jpeg', 0.8)
  }

  const analyzeImage = async (imageFile) => {
    setAnalyzing(true)
    setError('')

    try {
      const result = await analyzeWasteImage(imageFile)
      setAnalysis(result)

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('waste-images')
        .upload(fileName, imageFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('waste-images')
        .getPublicUrl(fileName)

      const { data: report, error: reportError } = await supabase
        .from('waste_reports')
        .insert({
          bin_id: nearestBin.id,
          reporter_id: profile.id,
          image_url: publicUrl,
          fill_percentage: result.fillPercentage,
          severity: result.severity,
          waste_type: result.wasteType,
          ai_confidence: result.confidence,
          ai_analysis_json: result.rawResponse,
          latitude: location.latitude,
          longitude: location.longitude
        })
        .select()
        .single()

      if (reportError) throw reportError

      let priority = 3
      if (result.severity === 'high' || result.fillPercentage > 70) {
        priority = 1
      } else if (result.severity === 'medium' || result.fillPercentage > 40) {
        priority = 2
      }

      console.log(`Creating cleaning task with priority ${priority} for bin ${nearestBin.bin_code}`)

      const { error: taskError } = await supabase.from('cleaning_tasks').insert({
        bin_id: nearestBin.id,
        report_id: report.id,
        priority: priority,
        status: 'pending',
        notes: `${result.wasteType} - ${result.fillPercentage}% full (${result.severity} severity)`
      })

      if (taskError) {
        console.error('Error creating task:', taskError)
      } else {
        console.log('Cleaning task created successfully')
      }

      setSuccess('Report submitted successfully!')
      fetchMyReports()
    } catch (err) {
      setError('Failed to analyze: ' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    setCapturing(false)
    setCapturedImage(null)
    setAnalysis(null)
    setError('')
  }

  const handleReset = () => {
    setCapturedImage(null)
    setAnalysis(null)
    setNearestBin(null)
    setLocation(null)
    setError('')
    setSuccess('')
  }

  const getFillColor = (pct) => {
    if (pct > 70) return 'from-red-500 to-red-400'
    if (pct > 40) return 'from-amber-500 to-yellow-400'
    return 'from-emerald-500 to-green-400'
  }

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'high': return 'badge badge-red'
      case 'medium': return 'badge badge-yellow'
      case 'low': return 'badge badge-green'
      default: return 'badge bg-gray-100 text-gray-600'
    }
  }

  const getSeverityBorder = (severity) => {
    switch (severity) {
      case 'high': return 'border-l-red-500'
      case 'medium': return 'border-l-amber-500'
      case 'low': return 'border-l-emerald-500'
      default: return 'border-l-gray-300'
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-primary-900/70 backdrop-blur-xl shadow-lg sticky top-0 z-[1000] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Report Dashboard</h1>
              <p className="text-primary-200 text-sm">{profile?.full_name}</p>
            </div>
          </div>
          <button onClick={signOut} className="btn-ghost text-white/80 hover:text-white hover:bg-white/10">
            <LogOut className="w-4 h-4 inline mr-2" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Status Messages */}
        {error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-3 animate-scale-in">
            <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 flex items-start gap-3 animate-scale-in">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        {/* Options Modal */}
        {showOptions && (
          <div className="modal-overlay">
            <div className="glass rounded-3xl p-7 max-w-md w-full shadow-glass animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Choose Image Source</h3>
                <p className="text-gray-500 text-sm mt-1">How would you like to provide the bin image?</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCameraCapture}
                  className="btn-primary w-full flex items-center justify-center gap-3"
                >
                  <Camera className="w-5 h-5" />
                  Capture with Camera
                </button>

                <button
                  onClick={handleFileUpload}
                  className="btn-secondary w-full flex items-center justify-center gap-3"
                >
                  <Upload className="w-5 h-5" />
                  Upload from Gallery
                </button>

                <button
                  onClick={() => setShowOptions(false)}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Action Card */}
        {!capturing && !capturedImage && !showOptions && (
          <div className="dash-card p-10 mb-8 text-center animate-fade-in-up">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-glow-primary">
              <Camera className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Report a Waste Bin
            </h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              Capture or upload a bin image. AI will analyze fill level, waste type, and severity instantly.
            </p>
            <button
              onClick={handleStartReport}
              className="btn-primary inline-flex items-center gap-2 px-10"
            >
              <Sparkles className="w-5 h-5" />
              Start Report
            </button>
          </div>
        )}

        {/* Camera Capture */}
        {capturing && (
          <div className="dash-card p-6 mb-8 animate-fade-in">
            <div className="grid md:grid-cols-3 gap-4 mb-5">
              {location && (
                <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-secondary-600" />
                    <span className="text-xs font-semibold text-secondary-800 uppercase tracking-wider">Location</span>
                  </div>
                  <p className="text-xs text-secondary-700 font-mono">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>
                  {location.accuracy && (
                    <p className="text-[10px] text-secondary-500 mt-1">
                      Accuracy: +/-{Math.round(location.accuracy)}m
                    </p>
                  )}
                </div>
              )}
              {nearestBin && (
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 md:col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 bg-primary-500 rounded flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">B</span>
                    </div>
                    <span className="text-xs font-semibold text-primary-800 uppercase tracking-wider">Nearest Bin</span>
                  </div>
                  <p className="text-sm font-bold text-primary-900">{nearestBin.bin_code}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-primary-700">{nearestBin.location_name}</span>
                    <span className="badge badge-green">{Math.round(nearestBin.distance)}m away</span>
                  </div>
                </div>
              )}
            </div>

            <div className="relative bg-dark rounded-2xl overflow-hidden mb-5">
              <video ref={videoRef} autoPlay playsInline className="w-full" />
            </div>

            <div className="flex gap-3">
              <button onClick={handleCapture} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Camera className="w-5 h-5" />
                Capture Image
              </button>
              <button onClick={handleCancel} className="btn-ghost border border-gray-200 px-6">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {capturedImage && (
          <div className="dash-card p-6 mb-8 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-bold text-gray-900">AI Analysis</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full rounded-2xl border border-gray-200 shadow-sm"
                />
                {nearestBin && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-primary-500" />
                    <span className="font-medium">{nearestBin.bin_code}</span>
                    <span className="text-gray-400">-</span>
                    <span>{nearestBin.location_name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {analyzing ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
                      <Loader className="w-8 h-8 animate-spin text-primary-600" />
                    </div>
                    <p className="text-gray-600 font-medium">Analyzing with Gemini AI...</p>
                    <p className="text-xs text-gray-400 mt-1">Detecting fill level & waste type</p>
                  </div>
                ) : analysis ? (
                  <>
                    {/* Fill Percentage */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fill Level</span>
                        <span className="text-2xl font-extrabold text-gray-900">{analysis.fillPercentage.toFixed(0)}%</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-4 relative overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${getFillColor(analysis.fillPercentage)} h-full rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${analysis.fillPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Severity</span>
                        <div className="mt-1">
                          <span className={getSeverityBadge(analysis.severity)}>
                            {analysis.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Confidence</span>
                        <p className="mt-1 text-lg font-bold text-gray-900">{analysis.confidence.toFixed(0)}%</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Waste Type</span>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{analysis.wasteType}</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Observations</span>
                      <p className="mt-1 text-sm text-gray-600 leading-relaxed">{analysis.observations}</p>
                    </div>

                    <button
                      onClick={handleReset}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Submit Another Report
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Recent Reports */}
        <div className="dash-card animate-fade-in">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Recent Reports</h3>
          </div>

          {myReports.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 font-medium">No reports yet</p>
              <p className="text-xs text-gray-300 mt-1">Submit your first bin report above</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {myReports.map((report, i) => (
                <div
                  key={report.id}
                  className={`px-6 py-4 border-l-4 ${getSeverityBorder(report.severity)} hover:bg-gray-50/50 transition-colors`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{report.bins?.bin_code}</p>
                        <span className="text-gray-300">-</span>
                        <p className="text-sm text-gray-600 truncate">{report.bins?.location_name}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-500">
                          Fill: <span className="font-semibold text-gray-700">{report.fill_percentage.toFixed(0)}%</span>
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs text-gray-500">{report.waste_type}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-[11px] text-gray-400">
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className={getSeverityBadge(report.severity)}>
                      {report.severity.toUpperCase()}
                    </span>
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
