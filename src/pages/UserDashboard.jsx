import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { analyzeWasteImage } from '../lib/aiService'
import { findNearestBin } from '../lib/routeOptimizer'
import { Camera, Loader, CheckCircle, XCircle, AlertCircle, Upload } from 'lucide-react'

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
          // Fallback to campus center if GPS fails
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

      // Get user location
      const userLocation = await getUserLocation()
      setLocation(userLocation)

      // Show location info
      if (userLocation.isFallback) {
        setError('⚠️ Using campus center location (GPS unavailable)')
      } else {
        setError(`📍 Location accuracy: ±${Math.round(userLocation.accuracy)}m`)
      }

      // Fetch all bins
      const { data: bins, error: binsError } = await supabase
        .from('bins')
        .select('*')
        .eq('is_active', true)

      if (binsError) throw binsError

      if (!bins || bins.length === 0) {
        throw new Error('No bins available in database')
      }

      // Find nearest bin
      const nearest = findNearestBin(userLocation, bins)
      setNearestBin(nearest)

      console.log('📍 Your location:', userLocation)
      console.log('🗑️ Nearest bin:', nearest.bin_code, 'Distance:', Math.round(nearest.distance), 'm')

      setError('')

      // Start camera
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

      // Get user location
      const userLocation = await getUserLocation()
      setLocation(userLocation)

      // Show location info
      if (userLocation.isFallback) {
        setError('⚠️ Using campus center location (GPS unavailable)')
      } else {
        setError(`📍 Location accuracy: ±${Math.round(userLocation.accuracy)}m`)
      }

      // Fetch all bins
      const { data: bins, error: binsError } = await supabase
        .from('bins')
        .select('*')
        .eq('is_active', true)

      if (binsError) throw binsError

      if (!bins || bins.length === 0) {
        throw new Error('No bins available in database')
      }

      // Find nearest bin
      const nearest = findNearestBin(userLocation, bins)
      setNearestBin(nearest)

      console.log('📍 Your location:', userLocation)
      console.log('🗑️ Nearest bin:', nearest.bin_code, 'Distance:', Math.round(nearest.distance), 'm')

      setError('')

      // Trigger file input
      fileInputRef.current?.click()
    } catch (err) {
      setError('Failed to get location: ' + err.message)
      console.error('Location error:', err)
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
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

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      setCapturing(false)

      // Analyze image
      await analyzeImage(file)
    }, 'image/jpeg', 0.8)
  }

  const analyzeImage = async (imageFile) => {
    setAnalyzing(true)
    setError('')

    try {
      // Analyze with Gemini Vision
      const result = await analyzeWasteImage(imageFile)
      setAnalysis(result)

      // Upload image to Supabase Storage
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('waste-images')
        .upload(fileName, imageFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('waste-images')
        .getPublicUrl(fileName)

      // Create report
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

      // Auto-create cleaning task for ALL reports (different priorities based on severity)
      let priority = 3 // Default: LOW priority
      if (result.severity === 'high' || result.fillPercentage > 70) {
        priority = 1 // HIGH priority
      } else if (result.severity === 'medium' || result.fillPercentage > 40) {
        priority = 2 // MEDIUM priority
      }

      console.log(`📋 Creating cleaning task with priority ${priority} for bin ${nearestBin.bin_code}`)

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
        console.log('✅ Cleaning task created successfully')
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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {profile?.full_name}</p>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
            <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Options Modal */}
        {showOptions && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Choose Image Source
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                How would you like to provide the bin image?
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleCameraCapture}
                  className="w-full bg-primary text-white p-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-3"
                >
                  <Camera className="w-6 h-6" />
                  <span className="font-medium">Capture with Camera</span>
                </button>

                <button
                  onClick={handleFileUpload}
                  className="w-full bg-secondary text-white p-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-3"
                >
                  <Upload className="w-6 h-6" />
                  <span className="font-medium">Upload from Gallery</span>
                </button>

                <button
                  onClick={() => setShowOptions(false)}
                  className="w-full bg-gray-100 text-gray-700 p-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Action Card */}
        {!capturing && !capturedImage && !showOptions && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Report Waste Bin
            </h2>
            <p className="text-gray-600 mb-6">
              Click below to capture an image and report bin status
            </p>
            <button
              onClick={handleStartReport}
              className="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Start Report
            </button>
          </div>
        )}

        {/* Camera Capture */}
        {capturing && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Capture Bin Image
              </h3>
              {location && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-xs font-semibold text-blue-900 mb-1">📍 Your Location</p>
                  <p className="text-xs text-blue-700">
                    Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                  </p>
                  {location.accuracy && (
                    <p className="text-xs text-blue-600 mt-1">
                      Accuracy: ±{Math.round(location.accuracy)}m
                    </p>
                  )}
                  {location.isFallback && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ Using fallback location (GPS unavailable)
                    </p>
                  )}
                </div>
              )}
              {nearestBin && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-900 mb-1">🗑️ Nearest Bin</p>
                  <p className="text-sm font-medium text-green-800">{nearestBin.bin_code}</p>
                  <p className="text-xs text-green-700 mt-1">{nearestBin.location_name}</p>
                  <p className="text-xs text-green-700">Department: {nearestBin.department}</p>
                  <p className="text-xs font-semibold text-green-900 mt-2">
                    📏 Distance: {Math.round(nearestBin.distance)}m away
                  </p>
                </div>
              )}
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCapture}
                className="flex-1 bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Capture Image
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {capturedImage && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Analysis Results
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full rounded-lg border"
                />
              </div>

              <div className="space-y-4">
                {analyzing ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader className="w-8 h-8 animate-spin text-primary mb-2" />
                    <p className="text-gray-600">Analyzing with AI...</p>
                  </div>
                ) : analysis ? (
                  <>
                    <div>
                      <label className="text-sm text-gray-600">Fill Percentage</label>
                      <div className="mt-1">
                        <div className="bg-gray-200 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-500"
                            style={{ width: `${analysis.fillPercentage}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                            {analysis.fillPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Severity Level</label>
                      <div className={`mt-1 px-4 py-3 rounded-lg border ${getSeverityColor(analysis.severity)}`}>
                        <span className="font-semibold uppercase">{analysis.severity}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Waste Type</label>
                      <p className="mt-1 text-gray-900 font-medium">{analysis.wasteType}</p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">AI Confidence</label>
                      <p className="mt-1 text-gray-900 font-medium">{analysis.confidence.toFixed(0)}%</p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Observations</label>
                      <p className="mt-1 text-gray-700 text-sm">{analysis.observations}</p>
                    </div>

                    <button
                      onClick={handleReset}
                      className="w-full bg-secondary text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
                    >
                      Submit Another Report
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Recent Reports */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            My Recent Reports
          </h3>

          {myReports.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No reports yet</p>
          ) : (
            <div className="space-y-3">
              {myReports.map((report) => (
                <div
                  key={report.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {report.bins?.bin_code} - {report.bins?.location_name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Fill: {report.fill_percentage.toFixed(1)}% | Type: {report.waste_type}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(
                        report.severity
                      )}`}
                    >
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
