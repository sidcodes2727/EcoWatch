import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { verifyCleaningImage } from '../lib/aiService'
import { optimizeRoute, formatDistance, formatTime, getTotalEstimatedTime } from '../lib/routeOptimizer'
import {
  Camera, MapPin, CheckCircle, Clock, Navigation,
  Loader, Upload, Leaf, LogOut, AlertCircle, XCircle
} from 'lucide-react'

export default function WorkerDashboard() {
  const { profile, signOut } = useAuth()
  const [tasks, setTasks]               = useState([])
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [completingTask, setCompletingTask] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [capturedImage, setCapturedImage]   = useState(null)
  const [capturing, setCapturing]           = useState(false)
  const [showCompletionOptions, setShowCompletionOptions] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchTasks(); subscribeToTasks() }, [profile?.id])
  useEffect(() => { if (tasks.length > 0) calculateOptimizedRoute() }, [tasks])

  const fetchTasks = async () => {
    if (!profile?.id) return
    try {
      const { data, error } = await supabase
        .from('cleaning_tasks')
        .select('*, bins(*)')
        .or(`assigned_worker_id.eq.${profile.id},status.eq.pending`)
        .in('status', ['pending', 'assigned', 'in_progress'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      setTasks(data || [])
    } catch (err) { setError('Failed to load tasks') }
  }

  const subscribeToTasks = () => {
    const channel = supabase.channel('worker-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleaning_tasks' }, fetchTasks)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  const calculateOptimizedRoute = () => {
    const pending = tasks.filter(t => t.status !== 'completed')
    if (!pending.length) { setOptimizedRoute(null); return }
    const bins = pending.map(t => ({ ...t.bins, taskId: t.id, priority: t.priority }))
    setOptimizedRoute(optimizeRoute(bins))
  }

  const handleAcceptTask = async (taskId) => {
    try {
      const { error } = await supabase.from('cleaning_tasks')
        .update({ assigned_worker_id: profile.id, status: 'assigned', assigned_at: new Date().toISOString() })
        .eq('id', taskId)
      if (error) throw error
      fetchTasks(); setSuccess('Task accepted!'); setTimeout(() => setSuccess(''), 3000)
    } catch { setError('Failed to accept task') }
  }

  const handleStartTask = async (taskId) => {
    try {
      const { error } = await supabase.from('cleaning_tasks')
        .update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', taskId)
      if (error) throw error
      fetchTasks(); setSuccess('Task started!'); setTimeout(() => setSuccess(''), 3000)
    } catch { setError('Failed to start task') }
  }

  const handleStartCompletion = (task) => {
    setSelectedTask(task); setShowCompletionOptions(true); setError('')
  }

  const handleCameraCapture = async () => {
    setShowCompletionOptions(false); setCapturing(true); setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) { videoRef.current.srcObject = stream; streamRef.current = stream }
    } catch (err) { setError('Failed to start camera: ' + err.message); setCapturing(false) }
  }

  const handleFileUpload = () => { setShowCompletionOptions(false); fileInputRef.current?.click() }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please select an image file')
    if (file.size > 5 * 1024 * 1024) return setError('Image too large. Max 5 MB')
    setCapturedImage({ url: URL.createObjectURL(file), file })
  }

  const handleCapture = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    canvas.toBlob((blob) => {
      const file = new File([blob], 'completion-proof.jpg', { type: 'image/jpeg' })
      setCapturedImage({ url: URL.createObjectURL(blob), file })
      streamRef.current?.getTracks().forEach(t => t.stop())
      setCapturing(false)
    }, 'image/jpeg', 0.8)
  }

  const handleCompleteTask = async () => {
    if (!capturedImage || !selectedTask) return
    setCompletingTask(true); setError('')
    try {
      setUploadingImage(true)
      let verification = null
      try {
        verification = await Promise.race([
          verifyCleaningImage(capturedImage.file),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out')), 15000))
        ])
        if (!verification.isCleaned) {
          setError(`Bin not cleaned properly.\n\n${verification.notes}\n\nFill: ${verification.fillPercentage}%\n\nPlease clean and try again.`)
          setCompletingTask(false); setUploadingImage(false); return
        }
      } catch { verification = { isCleaned: true, fillPercentage: 0 } }

      const fileName = `completed-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('waste-images').upload(fileName, capturedImage.file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('waste-images').getPublicUrl(fileName)
      setUploadingImage(false)

      const endTime = new Date()
      const durationMinutes = Math.round((endTime - new Date(selectedTask.started_at)) / 60000)
      const { error: completeError } = await supabase.from('cleaning_tasks')
        .update({ status: 'completed', completed_at: endTime.toISOString(), completion_image_url: publicUrl, actual_duration_minutes: durationMinutes })
        .eq('id', selectedTask.id)
      if (completeError) throw completeError

      await supabase.from('bins')
        .update({ current_fill_percentage: verification.fillPercentage || 0, current_severity: 'low', last_cleaned_at: endTime.toISOString() })
        .eq('id', selectedTask.bin_id)

      setSuccess('Task completed! Bin verified as clean.')
      setSelectedTask(null); setCapturedImage(null); fetchTasks()
    } catch (err) {
      setError('Failed to complete task: ' + err.message)
    } finally {
      setCompletingTask(false)
    }
  }

  const handleCancelCapture = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCapturing(false); setCapturedImage(null); setSelectedTask(null)
  }

  const getStatusBadge = (s) => {
    const map = { pending: 'badge badge-yellow', assigned: 'badge badge-blue', in_progress: 'badge badge-purple' }
    return map[s] || 'badge bg-gray-100 text-gray-600'
  }

  const getPriorityInfo = (p) => {
    if (p === 1) return { text: 'HIGH',   cls: 'badge badge-red' }
    if (p === 2) return { text: 'MEDIUM', cls: 'badge badge-yellow' }
    return { text: 'LOW', cls: 'badge badge-green' }
  }

  const getPriorityBorder = (p) => {
    if (p === 1) return 'priority-high'
    if (p === 2) return 'priority-medium'
    return 'priority-low'
  }

  return (
    <div className="min-h-screen bg-mesh">
      {/* ── NAV ── */}
      <nav className="nav-header">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#10b981,#0891b2)' }}>
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight leading-none">Worker Dashboard</h1>
              <p className="text-primary-300 text-xs mt-0.5">{profile?.full_name}</p>
            </div>
          </div>
          <button onClick={signOut}
            className="flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-5 py-8">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {/* ── Status Messages ── */}
        {error && (
          <div className="alert-error mb-5 whitespace-pre-line">
            <XCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="alert-success mb-5">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        {/* ── Route Overview ── */}
        {optimizedRoute && optimizedRoute.sequence.length > 0 && (
          <div className="rounded-2xl p-6 mb-8 text-white animate-fade-in-up"
               style={{ background: 'linear-gradient(135deg,#065f46,#0e7490)', boxShadow: '0 12px 40px -6px rgba(6,78,59,0.4)' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold">Optimized Route</h2>
                <p className="text-primary-200 text-xs">AI-calculated shortest path for today</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Bins to Clean', value: optimizedRoute.sequence.length },
                { label: 'Total Distance', value: formatDistance(optimizedRoute.totalDistance) },
                { label: 'Est. Time',
                  value: formatTime(getTotalEstimatedTime(optimizedRoute.totalDistance, optimizedRoute.sequence.length)) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-4"
                     style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-1">{label}</p>
                  <p className="text-3xl font-extrabold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Completion Options Modal ── */}
        {showCompletionOptions && (
          <div className="modal-overlay">
            <div className="glass rounded-3xl p-7 max-w-sm w-full shadow-card-lg animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                     style={{ background: 'linear-gradient(135deg,#059669,#0891b2)' }}>
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">Completion Proof</h3>
                <p className="text-gray-500 text-sm mt-1">Submit a photo of the cleaned bin</p>
              </div>
              <div className="space-y-3">
                <button onClick={handleCameraCapture} className="btn-primary w-full py-3.5">
                  <Camera className="w-5 h-5" /> Capture with Camera
                </button>
                <button onClick={handleFileUpload} className="btn-secondary w-full py-3.5">
                  <Upload className="w-5 h-5" /> Upload from Gallery
                </button>
                <button onClick={() => setShowCompletionOptions(false)}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Camera Capture Modal ── */}
        {capturing && (
          <div className="modal-overlay">
            <div className="glass rounded-3xl p-6 max-w-2xl w-full shadow-card-lg animate-scale-in">
              <h3 className="text-lg font-extrabold text-gray-900 mb-4">Capture Completion Proof</h3>
              <div className="relative bg-dark rounded-2xl overflow-hidden mb-4 ring-1 ring-white/5">
                <video ref={videoRef} autoPlay playsInline className="w-full" />
                <div className="absolute inset-0 pointer-events-none"
                     style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4)' }} />
              </div>
              <div className="flex gap-3">
                <button onClick={handleCapture} className="btn-primary flex-1 py-3">
                  <Camera className="w-5 h-5" /> Capture
                </button>
                <button onClick={handleCancelCapture} className="btn-ghost border border-gray-200 px-6">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Image Review Modal ── */}
        {capturedImage && !capturing && (
          <div className="modal-overlay">
            <div className="glass rounded-3xl p-6 max-w-2xl w-full shadow-card-lg animate-scale-in">
              <h3 className="text-lg font-extrabold text-gray-900 mb-4">Review & Submit</h3>
              <img src={capturedImage.url} alt="Completion proof"
                className="w-full rounded-2xl mb-4 border border-gray-100 shadow-sm object-cover" />
              {completingTask && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-primary-50 rounded-xl border border-primary-100">
                  <Loader className="w-5 h-5 animate-spin text-primary-600 flex-shrink-0" />
                  <p className="text-sm text-primary-700 font-medium">
                    {uploadingImage ? 'Verifying bin is clean with AI…' : 'Completing task…'}
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={handleCompleteTask} disabled={completingTask}
                  className="btn-primary flex-1 py-3">
                  {completingTask ? (
                    <><Loader className="w-5 h-5 animate-spin" /> Processing…</>
                  ) : (
                    <><CheckCircle className="w-5 h-5" /> Complete Task</>
                  )}
                </button>
                <button onClick={() => setCapturedImage(null)} disabled={completingTask}
                  className="btn-ghost border border-gray-200 px-6">Retake</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Task List ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold text-gray-900">Cleaning Tasks</h2>
            {tasks.length > 0 && (
              <span className="badge badge-green">{tasks.length} active</span>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="dash-card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <CheckCircle className="w-10 h-10 text-primary-400" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">All Clear!</h3>
                <p className="text-gray-500 text-sm">No pending cleaning tasks at the moment.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {optimizedRoute?.sequence.map((bin, index) => {
                const task = tasks.find(t => t.id === bin.taskId)
                if (!task) return null
                const pInfo = getPriorityInfo(task.priority)

                return (
                  <div
                    key={task.id}
                    className={`dash-card ${getPriorityBorder(task.priority)} animate-fade-in-up`}
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Step number */}
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-white text-lg shadow-sm"
                               style={{ background: 'linear-gradient(135deg,#059669,#0891b2)' }}>
                            #{index + 1}
                          </div>
                          {index < (optimizedRoute?.sequence.length || 0) - 1 && (
                            <div className="step-connector" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="text-base font-extrabold text-gray-900">{bin.bin_code}</h3>
                                <span className={pInfo.cls}>{pInfo.text}</span>
                                {task.is_predicted && <span className="badge badge-purple">SCHEDULED</span>}
                              </div>
                              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{bin.location_name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                <span>Fill: <span className="font-bold text-gray-700">{bin.current_fill_percentage?.toFixed(0)}%</span></span>
                                <span>Severity: <span className="font-bold text-gray-700 uppercase">{bin.current_severity}</span></span>
                                {bin.distance && (
                                  <span>Dist: <span className="font-bold text-gray-700">{formatDistance(bin.distance)}</span></span>
                                )}
                              </div>
                            </div>
                            <span className={`${getStatusBadge(task.status)} flex-shrink-0`}>
                              {task.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>

                          {/* Scheduled note */}
                          {task.notes && task.notes.startsWith('[SCHEDULED]') && (
                            <div className="mt-3 bg-accent-50 border border-accent-100 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-3.5 h-3.5 text-accent-500" />
                                <span className="text-xs font-bold text-accent-700">
                                  {task.notes.split('|')[0].replace('[SCHEDULED]', '').trim()}
                                </span>
                              </div>
                              <p className="text-[11px] text-accent-500 leading-relaxed">
                                {task.notes.split('|').slice(1).join(' | ').trim()}
                              </p>
                            </div>
                          )}
                          {task.notes && !task.notes.startsWith('[SCHEDULED]') && (
                            <p className="mt-2 text-xs text-gray-400 italic">{task.notes}</p>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                            {task.status === 'pending' && !task.assigned_worker_id && (
                              <button onClick={() => handleAcceptTask(task.id)} className="btn-primary flex-1 py-2.5 text-sm">
                                Accept Task
                              </button>
                            )}
                            {task.status === 'assigned' && task.assigned_worker_id === profile.id && (
                              <button onClick={() => handleStartTask(task.id)} className="btn-accent flex-1 py-2.5 text-sm">
                                Start Cleaning
                              </button>
                            )}
                            {task.status === 'in_progress' && (
                              <button onClick={() => handleStartCompletion(task)} className="btn-primary flex-1 py-2.5 text-sm">
                                <Camera className="w-4 h-4" /> Complete Task
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
