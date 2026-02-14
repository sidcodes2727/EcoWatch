import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { optimizeRoute, formatDistance, formatTime, getTotalEstimatedTime } from '../lib/routeOptimizer'
import { verifyCleaningImage, compareImages } from '../lib/aiService'
import { Camera, MapPin, CheckCircle, Clock, Navigation, Loader, Upload, Leaf, LogOut } from 'lucide-react'

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
      console.log('Profile not loaded yet, skipping task fetch')
      return
    }

    try {
      console.log('Fetching tasks for worker:', profile.id)

      const { data, error } = await supabase
        .from('cleaning_tasks')
        .select('*, bins(*)')
        .or(`assigned_worker_id.eq.${profile.id},status.eq.pending`)
        .in('status', ['pending', 'assigned', 'in_progress'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error

      console.log(`Found ${data?.length || 0} tasks`)
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
        { event: '*', schema: 'public', table: 'cleaning_tasks' },
        () => { fetchTasks() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

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

      console.log('Fetching original waste report...')
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
        console.warn('No original image found - skipping image comparison')
      }

      if (originalImageUrl) {
        console.log('Comparing original and completion images...')
        const comparison = await compareImages(originalImageUrl, capturedImage.file)

        console.log('Comparison result:', comparison)

        if (!comparison.isSameBin) {
          setError(`Image Verification Failed: The images don't appear to be the same bin.\n\nReason: ${comparison.reasoning}\n\nPlease take a photo of the correct bin that was reported.`)
          setCompletingTask(false)
          setUploadingImage(false)
          return
        }

        console.log('Image comparison passed - same bin confirmed')
      }

      console.log('Verifying bin is clean...')
      const verification = await verifyCleaningImage(capturedImage.file)

      console.log('Cleaning verification result:', verification)

      if (!verification.isCleaned) {
        setError(`Cleaning Verification Failed: ${verification.notes}\n\nThe bin must be properly cleaned (less than 15% full) before marking as complete.\n\nCurrent fill: ${verification.fillPercentage}%`)
        setCompletingTask(false)
        setUploadingImage(false)
        return
      }

      console.log('Cleaning verification passed')

      console.log('Uploading completion image...')
      const fileName = `completed-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('waste-images')
        .upload(fileName, capturedImage.file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('waste-images')
        .getPublicUrl(fileName)

      setUploadingImage(false)

      const startTime = new Date(selectedTask.started_at)
      const endTime = new Date()
      const durationMinutes = Math.round((endTime - startTime) / 60000)

      console.log('Marking task as completed...')
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

      console.log('Updating bin status...')
      await supabase
        .from('bins')
        .update({
          current_fill_percentage: verification.fillPercentage || 0,
          current_severity: 'low',
          last_cleaned_at: endTime.toISOString()
        })
        .eq('id', selectedTask.bin_id)

      console.log('Task completed successfully!')
      setSuccess('Task completed successfully! Bin verified as clean.')
      setSelectedTask(null)
      setCapturedImage(null)
      fetchTasks()
    } catch (err) {
      console.error('Error completing task:', err)
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return 'badge badge-yellow'
      case 'assigned': return 'badge badge-blue'
      case 'in_progress': return 'badge badge-purple'
      default: return 'badge bg-gray-100 text-gray-600'
    }
  }

  const getPriorityInfo = (priority) => {
    if (priority === 1) return { text: 'HIGH', class: 'badge badge-red' }
    if (priority === 2) return { text: 'MEDIUM', class: 'badge badge-yellow' }
    return { text: 'LOW', class: 'badge badge-green' }
  }

  const getPriorityBorder = (priority) => {
    if (priority === 1) return 'priority-high'
    if (priority === 2) return 'priority-medium'
    return 'priority-low'
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Worker Dashboard</h1>
              <p className="text-primary-200 text-sm">{profile?.full_name}</p>
            </div>
          </div>
          <button onClick={signOut} className="btn-ghost text-white/80 hover:text-white hover:bg-white/10">
            <LogOut className="w-4 h-4 inline mr-2" />
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
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm whitespace-pre-line animate-scale-in">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 flex items-start gap-3 animate-scale-in">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        {/* Route Overview */}
        {optimizedRoute && optimizedRoute.sequence.length > 0 && (
          <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 rounded-2xl shadow-card p-6 mb-8 text-white animate-fade-in-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Optimized Route</h2>
                <p className="text-primary-200 text-xs">AI-calculated shortest path</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/15 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-xs text-white/70 uppercase tracking-wider font-medium">Bins</p>
                <p className="text-3xl font-extrabold mt-1">{optimizedRoute.sequence.length}</p>
              </div>
              <div className="bg-white/15 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-xs text-white/70 uppercase tracking-wider font-medium">Distance</p>
                <p className="text-3xl font-extrabold mt-1">
                  {formatDistance(optimizedRoute.totalDistance)}
                </p>
              </div>
              <div className="bg-white/15 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-xs text-white/70 uppercase tracking-wider font-medium">Est. Time</p>
                <p className="text-3xl font-extrabold mt-1">
                  {formatTime(
                    getTotalEstimatedTime(
                      optimizedRoute.totalDistance,
                      optimizedRoute.sequence.length
                    )
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Completion Options Modal */}
        {showCompletionOptions && (
          <div className="modal-overlay">
            <div className="glass rounded-3xl p-7 max-w-md w-full shadow-glass animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Completion Proof</h3>
                <p className="text-gray-500 text-sm mt-1">How would you like to submit proof?</p>
              </div>
              <div className="space-y-3">
                <button onClick={handleCameraCapture} className="btn-primary w-full flex items-center justify-center gap-3">
                  <Camera className="w-5 h-5" />
                  Capture with Camera
                </button>
                <button onClick={handleFileUpload} className="btn-secondary w-full flex items-center justify-center gap-3">
                  <Upload className="w-5 h-5" />
                  Upload from Gallery
                </button>
                <button
                  onClick={() => setShowCompletionOptions(false)}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera Capture Modal */}
        {capturing && (
          <div className="modal-overlay">
            <div className="glass rounded-3xl p-6 max-w-2xl w-full shadow-glass animate-scale-in">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Capture Completion Proof</h3>
              <div className="relative bg-dark rounded-2xl overflow-hidden mb-5">
                <video ref={videoRef} autoPlay playsInline className="w-full" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleCapture} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Camera className="w-5 h-5" />
                  Capture
                </button>
                <button onClick={handleCancelCapture} className="btn-ghost border border-gray-200 px-6">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Review Modal */}
        {capturedImage && !capturing && (
          <div className="modal-overlay">
            <div className="glass rounded-3xl p-6 max-w-2xl w-full shadow-glass animate-scale-in">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Review & Submit</h3>
              <img
                src={capturedImage.url}
                alt="Completion proof"
                className="w-full rounded-2xl mb-5 border border-gray-200"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCompleteTask}
                  disabled={completingTask}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {completingTask ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      {uploadingImage ? 'Verifying...' : 'Completing...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Complete Task
                    </>
                  )}
                </button>
                <button
                  onClick={() => setCapturedImage(null)}
                  disabled={completingTask}
                  className="btn-ghost border border-gray-200 px-6"
                >
                  Retake
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Cleaning Tasks</h2>

          {tasks.length === 0 ? (
            <div className="dash-card text-center py-16 animate-fade-in">
              <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-10 h-10 text-primary-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">All Clear!</h3>
              <p className="text-gray-500 text-sm">No pending tasks at the moment.</p>
            </div>
          ) : (
            optimizedRoute?.sequence.map((bin, index) => {
              const task = tasks.find((t) => t.bin_id === bin.id)
              if (!task) return null

              const priorityInfo = getPriorityInfo(task.priority)

              return (
                <div
                  key={task.id}
                  className={`dash-card ${getPriorityBorder(task.priority)} animate-fade-in-up`}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-lg font-extrabold text-white">#{index + 1}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-base font-bold text-gray-900">{bin.bin_code}</h3>
                            <span className={priorityInfo.class}>{priorityInfo.text}</span>
                            {task.is_predicted && (
                              <span className="badge badge-purple">SCHEDULED</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{bin.location_name}</span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>Fill: <span className="font-semibold text-gray-600">{bin.current_fill_percentage.toFixed(0)}%</span></span>
                            <span>Severity: <span className="font-semibold text-gray-600 uppercase">{bin.current_severity}</span></span>
                            {bin.distance && (
                              <span>Distance: <span className="font-semibold text-gray-600">{formatDistance(bin.distance)}</span></span>
                            )}
                          </div>

                          {task.notes && task.notes.startsWith('[SCHEDULED]') ? (
                            <div className="mt-3 bg-accent-50 border border-accent-200 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-3.5 h-3.5 text-accent-600" />
                                <span className="text-xs font-semibold text-accent-700">
                                  {task.notes.split('|')[0].replace('[SCHEDULED]', '').trim()}
                                </span>
                              </div>
                              <p className="text-[11px] text-accent-500 leading-relaxed">
                                {task.notes.split('|').slice(1).join(' | ').trim()}
                              </p>
                            </div>
                          ) : task.notes ? (
                            <p className="mt-2 text-xs text-gray-500 italic">{task.notes}</p>
                          ) : null}
                        </div>
                      </div>

                      <span className={getStatusBadge(task.status)}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                      {task.status === 'pending' && !task.assigned_worker_id && (
                        <button
                          onClick={() => handleAcceptTask(task.id)}
                          className="btn-primary flex-1 py-2.5 text-sm"
                        >
                          Accept Task
                        </button>
                      )}

                      {task.status === 'assigned' && task.assigned_worker_id === profile.id && (
                        <button
                          onClick={() => handleStartTask(task.id)}
                          className="btn-accent flex-1 py-2.5 text-sm"
                        >
                          Start Cleaning
                        </button>
                      )}

                      {task.status === 'in_progress' && (
                        <button
                          onClick={() => handleStartCompletion(task)}
                          className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Complete Task
                        </button>
                      )}
                    </div>
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
