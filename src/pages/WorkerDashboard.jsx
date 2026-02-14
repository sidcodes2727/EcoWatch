import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { optimizeRoute, formatDistance, formatTime, getTotalEstimatedTime } from '../lib/routeOptimizer'
import { verifyCleaningImage, compareImages } from '../lib/aiService'
import { Camera, MapPin, CheckCircle, Clock, Navigation, Loader, Upload } from 'lucide-react'

export default function WorkerDashboard() {
  const { profile, signOut } = useAuth()
  const [tasks, setTasks] = useState([])
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [completingTask, setCompletingTask] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [showCompletionOptions, setShowCompletionOptions] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchTasks()
    subscribeToTasks()
  }, [profile?.id])

  useEffect(() => {
    if (tasks.length > 0) {
      calculateOptimizedRoute()
    }
  }, [tasks])

  const fetchTasks = async () => {
    if (!profile?.id) {
      console.log('⚠️ Profile not loaded yet, skipping task fetch')
      return
    }

    try {
      console.log('🔍 Fetching tasks for worker:', profile.id)

      const { data, error } = await supabase
        .from('cleaning_tasks')
        .select('*, bins(*)')
        .or(`assigned_worker_id.eq.${profile.id},status.eq.pending`)
        .in('status', ['pending', 'assigned', 'in_progress'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error

      console.log(`✅ Found ${data?.length || 0} tasks`)
      setTasks(data || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError('Failed to load tasks')
    }
  }

  const subscribeToTasks = () => {
    const channel = supabase
      .channel('worker-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cleaning_tasks'
        },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const calculateOptimizedRoute = () => {
    const pendingTasks = tasks.filter((t) => t.status !== 'completed')
    if (pendingTasks.length === 0) {
      setOptimizedRoute(null)
      return
    }

    const bins = pendingTasks.map((task) => ({
      ...task.bins,
      taskId: task.id,
      priority: task.priority
    }))

    const route = optimizeRoute(bins)
    setOptimizedRoute(route)
  }

  const handleAcceptTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('cleaning_tasks')
        .update({
          assigned_worker_id: profile.id,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error
      fetchTasks()
      setSuccess('Task accepted!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to accept task')
    }
  }

  const handleStartTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('cleaning_tasks')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error
      fetchTasks()
      setSuccess('Task started!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to start task')
    }
  }

  const handleStartCompletion = async (task) => {
    setSelectedTask(task)
    setShowCompletionOptions(true)
    setError('')
  }

  const handleCameraCapture = async () => {
    setShowCompletionOptions(false)
    setCapturing(true)
    setError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (err) {
      setError('Failed to start camera: ' + err.message)
      setCapturing(false)
    }
  }

  const handleFileUpload = () => {
    setShowCompletionOptions(false)
    fileInputRef.current?.click()
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

    setCapturedImage({ url: URL.createObjectURL(file), file })
  }

  const handleCapture = () => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0)

    canvas.toBlob((blob) => {
      const file = new File([blob], 'completion-proof.jpg', { type: 'image/jpeg' })
      setCapturedImage({ url: URL.createObjectURL(blob), file })

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      setCapturing(false)
    }, 'image/jpeg', 0.8)
  }

  const handleCompleteTask = async () => {
    if (!capturedImage || !selectedTask) return

    setCompletingTask(true)
    setError('')

    try {
      setUploadingImage(true)

      // Step 1: Fetch the original waste report to get the original image
      console.log('🔍 Fetching original waste report...')
      const { data: wasteReports, error: reportError } = await supabase
        .from('waste_reports')
        .select('image_url')
        .eq('bin_id', selectedTask.bin_id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (reportError) {
        console.error('Error fetching original report:', reportError)
        throw new Error('Could not fetch original report')
      }

      const originalImageUrl = wasteReports?.[0]?.image_url

      if (!originalImageUrl) {
        console.warn('⚠️ No original image found - skipping image comparison')
      }

      // Step 2: Compare images if original image exists
      if (originalImageUrl) {
        console.log('🔄 Comparing original and completion images...')
        const comparison = await compareImages(originalImageUrl, capturedImage.file)

        console.log('📊 Comparison result:', comparison)

        if (!comparison.isSameBin) {
          setError(`Image Verification Failed: The images don't appear to be the same bin.\n\nReason: ${comparison.reasoning}\n\nPlease take a photo of the correct bin that was reported.`)
          setCompletingTask(false)
          setUploadingImage(false)
          return
        }

        console.log('✅ Image comparison passed - same bin confirmed')
      }

      // Step 3: Verify cleaning with AI
      console.log('🧹 Verifying bin is clean...')
      const verification = await verifyCleaningImage(capturedImage.file)

      console.log('📊 Cleaning verification result:', verification)

      if (!verification.isCleaned) {
        setError(`Cleaning Verification Failed: ${verification.notes}\n\nThe bin must be properly cleaned (less than 15% full) before marking as complete.\n\nCurrent fill: ${verification.fillPercentage}%`)
        setCompletingTask(false)
        setUploadingImage(false)
        return
      }

      console.log('✅ Cleaning verification passed')

      // Step 4: Upload completion image
      console.log('📤 Uploading completion image...')
      const fileName = `completed-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('waste-images')
        .upload(fileName, capturedImage.file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('waste-images')
        .getPublicUrl(fileName)

      setUploadingImage(false)

      // Calculate duration
      const startTime = new Date(selectedTask.started_at)
      const endTime = new Date()
      const durationMinutes = Math.round((endTime - startTime) / 60000)

      // Step 5: Complete task
      console.log('✅ Marking task as completed...')
      const { error: completeError } = await supabase
        .from('cleaning_tasks')
        .update({
          status: 'completed',
          completed_at: endTime.toISOString(),
          completion_image_url: publicUrl,
          actual_duration_minutes: durationMinutes
        })
        .eq('id', selectedTask.id)

      if (completeError) throw completeError

      // Step 6: Update bin status
      console.log('🗑️ Updating bin status...')
      await supabase
        .from('bins')
        .update({
          current_fill_percentage: verification.fillPercentage || 0,
          current_severity: 'low',
          last_cleaned_at: endTime.toISOString()
        })
        .eq('id', selectedTask.bin_id)

      console.log('🎉 Task completed successfully!')
      setSuccess('Task completed successfully! Bin verified as clean.')
      setSelectedTask(null)
      setCapturedImage(null)
      fetchTasks()
    } catch (err) {
      console.error('❌ Error completing task:', err)
      setError('Failed to complete task: ' + err.message)
    } finally {
      setCompletingTask(false)
    }
  }

  const handleCancelCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    setCapturing(false)
    setCapturedImage(null)
    setSelectedTask(null)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'assigned':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityBadge = (priority) => {
    if (priority === 1) return { text: 'HIGH', class: 'bg-red-100 text-red-800' }
    if (priority === 2) return { text: 'MEDIUM', class: 'bg-yellow-100 text-yellow-800' }
    return { text: 'LOW', class: 'bg-green-100 text-green-800' }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 whitespace-pre-line">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Route Overview */}
        {optimizedRoute && optimizedRoute.sequence.length > 0 && (
          <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Navigation className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Optimized Route</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-sm opacity-90">Total Bins</div>
                <div className="text-3xl font-bold">{optimizedRoute.sequence.length}</div>
              </div>
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-sm opacity-90">Total Distance</div>
                <div className="text-3xl font-bold">
                  {formatDistance(optimizedRoute.totalDistance)}
                </div>
              </div>
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-sm opacity-90">Estimated Time</div>
                <div className="text-3xl font-bold">
                  {formatTime(
                    getTotalEstimatedTime(
                      optimizedRoute.totalDistance,
                      optimizedRoute.sequence.length
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completion Options Modal */}
        {showCompletionOptions && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Choose Completion Method
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                How would you like to submit completion proof?
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
                  onClick={() => setShowCompletionOptions(false)}
                  className="w-full bg-gray-100 text-gray-700 p-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera Capture Modal */}
        {capturing && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
              <h3 className="text-lg font-semibold mb-4">Capture Completion Proof</h3>
              <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                <video ref={videoRef} autoPlay playsInline className="w-full" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCapture}
                  className="flex-1 bg-primary text-white py-3 rounded-lg font-medium"
                >
                  Capture
                </button>
                <button
                  onClick={handleCancelCapture}
                  className="px-6 py-3 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Review Modal */}
        {capturedImage && !capturing && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
              <h3 className="text-lg font-semibold mb-4">Review & Submit</h3>
              <img
                src={capturedImage.url}
                alt="Completion proof"
                className="w-full rounded-lg mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCompleteTask}
                  disabled={completingTask}
                  className="flex-1 bg-secondary text-white py-3 rounded-lg font-medium disabled:opacity-50"
                >
                  {completingTask ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin inline mr-2" />
                      {uploadingImage ? 'Uploading...' : 'Completing...'}
                    </>
                  ) : (
                    'Complete Task'
                  )}
                </button>
                <button
                  onClick={() => setCapturedImage(null)}
                  disabled={completingTask}
                  className="px-6 py-3 border border-gray-300 rounded-lg"
                >
                  Retake
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Cleaning Tasks</h2>

          {tasks.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clear!</h3>
              <p className="text-gray-600">No pending tasks at the moment.</p>
            </div>
          ) : (
            optimizedRoute?.sequence.map((bin, index) => {
              const task = tasks.find((t) => t.bin_id === bin.id)
              if (!task) return null

              const priorityInfo = getPriorityBadge(task.priority)

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-primary">#{index + 1}</span>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {bin.bin_code}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${priorityInfo.class}`}>
                            {priorityInfo.text}
                          </span>
                          {task.is_predicted && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              SCHEDULED
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                          <MapPin className="w-4 h-4" />
                          <span>{bin.location_name}</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Fill: {bin.current_fill_percentage.toFixed(0)}%</span>
                          <span>Severity: {bin.current_severity.toUpperCase()}</span>
                          {bin.distance && (
                            <span>Distance: {formatDistance(bin.distance)}</span>
                          )}
                        </div>

                        {task.notes && task.notes.startsWith('[SCHEDULED]') ? (
                          <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-800">
                                {task.notes.split('|')[0].replace('[SCHEDULED]', '').trim()}
                              </span>
                            </div>
                            <p className="text-xs text-purple-600">
                              {task.notes.split('|').slice(1).join(' | ').trim()}
                            </p>
                          </div>
                        ) : task.notes ? (
                          <p className="mt-2 text-sm text-gray-600 italic">{task.notes}</p>
                        ) : null}
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="flex gap-3 mt-4">
                    {task.status === 'pending' && !task.assigned_worker_id && (
                      <button
                        onClick={() => handleAcceptTask(task.id)}
                        className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-blue-600"
                      >
                        Accept Task
                      </button>
                    )}

                    {task.status === 'assigned' && task.assigned_worker_id === profile.id && (
                      <button
                        onClick={() => handleStartTask(task.id)}
                        className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700"
                      >
                        Start Cleaning
                      </button>
                    )}

                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => handleStartCompletion(task)}
                        className="flex-1 bg-secondary text-white py-2 rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2"
                      >
                        <Camera className="w-5 h-5" />
                        Complete Task
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
