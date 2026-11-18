import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageToggle from '../components/LanguageToggle'
import { supabase } from '../lib/supabase'
import { verifyCleaningImage } from '../lib/aiService'
import { optimizeRoute, formatDistance, formatTime, getTotalEstimatedTime } from '../lib/routeOptimizer'
import {
  Camera, MapPin, CheckCircle, Navigation,
  Loader, Upload, Leaf, AlertCircle, Clock, Mic, Sparkles
} from 'lucide-react'

export default function WorkerDashboard() {
  const { profile, signOut } = useAuth()
  const { language, t } = useLanguage()
  const [tasks, setTasks] = useState([])
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [completingTask, setCompletingTask] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [showCompletionOptions, setShowCompletionOptions] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('optimized')

  const [activeListeningTaskId, setActiveListeningTaskId] = useState(null)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceResponse, setVoiceResponse] = useState('')
  const recognitionRef = useRef(null)

  const speak = (text, lang = (language === 'hi' ? 'hi-IN' : 'en-IN')) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.95
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }

  const startVoiceCommand = (scopeId = 'global') => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError(language === 'hi' ? 'आपके ब्राउज़र में वॉयस रिकॉग्निशन समर्थित नहीं है। कृपया Chrome का उपयोग करें।' : 'Voice recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN'

      recognition.onstart = () => {
        setActiveListeningTaskId(scopeId)
        setVoiceTranscript(t('voiceListening'))
      }

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase()
        setVoiceTranscript(transcript)
        handleVoiceAction(transcript, scopeId)
      }

      recognition.onerror = (e) => {
        setActiveListeningTaskId(null)
        setVoiceTranscript('')
      }

      recognition.onend = () => {
        setActiveListeningTaskId(null)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      setActiveListeningTaskId(null)
    }
  }

  const stopVoiceCommand = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setActiveListeningTaskId(null)
  }

  const handleVoiceAction = (cmd, scopeId = 'global') => {
    const activeTasks = displayedTasks.filter(item => item.status !== 'completed')
    const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(cmd) || cmd.includes('agla') || cmd.includes('safai') || cmd.includes('shuru') || cmd.includes('khatam') || cmd.includes('baaki') || cmd.includes('kitne')

    const isNextStop = cmd.includes('next') || cmd.includes('route') || cmd.includes('stop') || cmd.includes('where') || cmd.includes('target') ||
                       cmd.includes('अगला') || cmd.includes('स्टॉप') || cmd.includes('रास्ता') || cmd.includes('कहाँ') || cmd.includes('आगे') || cmd.includes('kahan') || cmd.includes('agla') || cmd.includes('kidhar')

    const isStart = cmd.includes('start') || cmd.includes('begin') || cmd.includes('commence') || cmd.includes('accept') ||
                    cmd.includes('शुरू') || cmd.includes('काम') || cmd.includes('सफाई शुरू') || cmd.includes('प्रारंभ') || cmd.includes('स्वीकार') || cmd.includes('shuru') || cmd.includes('chalu')

    const isDone = cmd.includes('clean') || cmd.includes('photo') || cmd.includes('verify') || cmd.includes('done') || cmd.includes('finish') || cmd.includes('proof') ||
                   cmd.includes('सफाई हो गई') || cmd.includes('साफ') || cmd.includes('हो गया') || cmd.includes('फोटो') || cmd.includes('चेक') || cmd.includes('सत्यापित') || cmd.includes('khatam') || cmd.includes('safai') || cmd.includes('tasveer')

    const isCount = cmd.includes('how many') || cmd.includes('status') || cmd.includes('count') || cmd.includes('pending') || cmd.includes('remaining') ||
                    cmd.includes('कितने') || cmd.includes('बाकी') || cmd.includes('काम बताओ') || cmd.includes('स्थिति') || cmd.includes('kitne') || cmd.includes('baaki')

    if (scopeId !== 'global') {
      const targetTask = tasks.find(item => item.id === scopeId)
      if (targetTask) {
        if (isDone || targetTask.status === 'in_progress') {
          handleStartCompletion(targetTask)
          const msg = isHindi ? 'सत्यापन कैमरा खोला जा रहा है। कृपया साफ डस्टबिन दिखाएं।' : 'Opening verification camera. Please capture the cleaned bin.'
          speak(msg, isHindi ? 'hi-IN' : 'en-IN')
          setVoiceResponse(msg)
          return
        }
        if (isStart || targetTask.status === 'assigned') {
          handleStartTask(targetTask.id)
          const msg = isHindi ? `कार्य शुरू किया गया: ${targetTask.bins?.bin_code || ''}` : `Started task for ${targetTask.bins?.bin_code || ''}`
          speak(msg, isHindi ? 'hi-IN' : 'en-IN')
          setVoiceResponse(msg)
          return
        }
        if (targetTask.status === 'pending') {
          handleAcceptTask(targetTask.id)
          const msg = isHindi ? `कार्य स्वीकार किया गया: ${targetTask.bins?.bin_code || ''}` : `Accepted task for ${targetTask.bins?.bin_code || ''}`
          speak(msg, isHindi ? 'hi-IN' : 'en-IN')
          setVoiceResponse(msg)
          return
        }
      }
    }

    if (isNextStop) {
      if (!activeTasks.length) {
        const msg = isHindi ? 'सभी कार्य पूरे हो चुके हैं। कोई लंबित स्टॉप नहीं है।' : 'All tasks completed. No pending stops.'
        speak(msg, isHindi ? 'hi-IN' : 'en-IN')
        setVoiceResponse(msg)
        return
      }
      const next = activeTasks[0]
      const bin = next.displayBin || next.bins
      const fill = Math.round(bin?.current_fill_percentage || 0)
      const msg = isHindi
        ? `अगला स्टॉप ${bin?.bin_code || 'डस्टबिन'}, ${bin?.location_name || 'परिसर'} पर है। यह अभी ${fill} प्रतिशत भरा हुआ है।`
        : `Next stop is ${bin?.bin_code || 'bin'} at ${bin?.location_name || 'campus'}. Current fill is ${fill} percent.`
      speak(msg, isHindi ? 'hi-IN' : 'en-IN')
      setVoiceResponse(msg)
    } else if (isStart) {
      const assigned = activeTasks.find(item => item.status === 'assigned')
      const pending = activeTasks.find(item => item.status === 'pending')
      if (assigned) {
        handleStartTask(assigned.id)
        const msg = isHindi ? 'सफाई कार्य शुरू कर दिया गया है। ध्यानपूर्वक सफाई करें।' : 'Starting task. Good luck with the cleaning.'
        speak(msg, isHindi ? 'hi-IN' : 'en-IN')
        setVoiceResponse((isHindi ? 'कार्य प्रारंभ: ' : 'Commencing task: ') + (assigned.bins?.bin_code || ''))
      } else if (pending) {
        handleAcceptTask(pending.id)
        const msg = isHindi ? 'नया कार्य स्वीकार कर लिया गया है।' : 'Task accepted and assigned to you.'
        speak(msg, isHindi ? 'hi-IN' : 'en-IN')
        setVoiceResponse(msg)
      } else {
        const msg = isHindi ? 'शुरू करने के लिए कोई नया कार्य अभी नहीं है।' : 'No task is currently in assigned status to start.'
        speak(msg, isHindi ? 'hi-IN' : 'en-IN')
        setVoiceResponse(msg)
      }
    } else if (isDone) {
      const inProgress = activeTasks.find(item => item.status === 'in_progress') || activeTasks[0]
      if (inProgress) {
        handleStartCompletion(inProgress)
        const msg = isHindi ? 'सत्यापन कैमरा खोला जा रहा है। कृपया साफ किया हुआ डस्टबिन दिखाएं।' : 'Opening verification camera. Please show the empty bin clearly.'
        speak(msg, isHindi ? 'hi-IN' : 'en-IN')
        setVoiceResponse(msg)
      } else {
        const msg = isHindi ? 'सत्यापन से पहले कृपया कार्य शुरू करें।' : 'Please start the task before submitting completion.'
        speak(msg, isHindi ? 'hi-IN' : 'en-IN')
        setVoiceResponse(msg)
      }
    } else if (isCount) {
      const count = activeTasks.length
      const msg = isHindi ? `आपके पास कुल ${count} कार्य बाकी हैं।` : `You have ${count} pending cleaning tasks remaining.`
      speak(msg, isHindi ? 'hi-IN' : 'en-IN')
      setVoiceResponse(msg)
    } else {
      const msg = isHindi
        ? `आदेश समझा: "${cmd}". आप कह सकते हैं: 'अगला स्टॉप', 'काम शुरू करें', या 'सफाई हो गई'`
        : `Command recognized: "${cmd}". You can say: 'Next stop', 'Start task', or 'Verify cleaning'`
      speak(msg, isHindi ? 'hi-IN' : 'en-IN')
      setVoiceResponse(msg)
    }
  }

  const displayedTasks = useMemo(() => {
    let list = []
    
    if (optimizedRoute && optimizedRoute.sequence.length > 0) {
      list = optimizedRoute.sequence.map(bin => {
        const task = tasks.find(item => item.id === bin.taskId)
        return task ? { ...task, displayBin: bin } : null
      }).filter(Boolean)
    } else {
      list = tasks.filter(item => item.status !== 'completed').map(task => ({
        ...task, displayBin: task.bins
      }))
    }
    
    list = list.filter(task => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false
      if (priorityFilter !== 'all' && task.priority.toString() !== priorityFilter) return false
      return true
    })
    
    if (sortBy === 'priority') {
      list.sort((a, b) => a.priority - b.priority)
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }
    
    return list
  }, [tasks, optimizedRoute, statusFilter, priorityFilter, sortBy])

  const videoRef = useRef(null)
  const streamRef = useRef(null)
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
    } catch {
      setError('Failed to load tasks')
    }
  }

  const subscribeToTasks = () => {
    const channel = supabase.channel('worker-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleaning_tasks' }, fetchTasks)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  const calculateOptimizedRoute = () => {
    const pending = tasks.filter(item => item.status !== 'completed')
    if (!pending.length) { setOptimizedRoute(null); return }
    const bins = pending.map(item => ({ ...item.bins, taskId: item.id, priority: item.priority }))
    setOptimizedRoute(optimizeRoute(bins))
  }

  const handleAcceptTask = async (taskId) => {
    try {
      const { error } = await supabase.from('cleaning_tasks')
        .update({ assigned_worker_id: profile.id, status: 'assigned', assigned_at: new Date().toISOString() })
        .eq('id', taskId)
      if (error) throw error
      fetchTasks()
      setSuccess(language === 'hi' ? 'कार्य सफलतापूर्वक स्वीकार कर लिया गया' : 'Task accepted')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError(language === 'hi' ? 'कार्य स्वीकार करने में त्रुटि' : 'Failed to accept task')
    }
  }

  const handleStartTask = async (taskId) => {
    try {
      const { error } = await supabase.from('cleaning_tasks')
        .update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', taskId)
      if (error) throw error
      fetchTasks()
      setSuccess(language === 'hi' ? 'सफाई कार्य शुरू हो चुका है' : 'Task started')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError(language === 'hi' ? 'कार्य शुरू करने में त्रुटि' : 'Failed to start task')
    }
  }

  const handleStartCompletion = (task) => {
    setSelectedTask(task)
    setShowCompletionOptions(true)
    setError('')
  }

  const handleCameraCapture = async () => {
    setShowCompletionOptions(false)
    setCapturing(true)
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) { videoRef.current.srcObject = stream; streamRef.current = stream }
    } catch (err) {
      setError('Camera failed: ' + err.message)
      setCapturing(false)
    }
  }

  const handleFileUpload = () => {
    setShowCompletionOptions(false)
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Select an image file')
    if (file.size > 5 * 1024 * 1024) return setError('Image too large (max 5MB)')
    setCapturedImage({ url: URL.createObjectURL(file), file })
  }

  const handleCapture = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    canvas.toBlob((blob) => {
      const file = new File([blob], 'completion-proof.jpg', { type: 'image/jpeg' })
      setCapturedImage({ url: URL.createObjectURL(blob), file })
      streamRef.current?.getTracks().forEach(track => track.stop())
      setCapturing(false)
    }, 'image/jpeg', 0.8)
  }

  const handleCompleteTask = async () => {
    if (!capturedImage || !selectedTask) return
    setCompletingTask(true)
    setError('')
    try {
      setUploadingImage(true)
      let verification = null
      try {
        verification = await Promise.race([
          verifyCleaningImage(capturedImage.file),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out')), 15000))
        ])
        if (!verification.isCleaned) {
          setVerificationResult({
            success: false,
            title: t('verificationFailedTitle'),
            message: t('verificationFailedMsg'),
            details: `Reason: ${verification.notes} (Remaining fill: ${verification.fillPercentage}%)`
          })
          setCompletingTask(false)
          setUploadingImage(false)
          setCapturedImage(null)
          return
        }
      } catch {
        verification = { isCleaned: true, fillPercentage: 0 }
      }

      const fileName = `completed-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('waste-images').upload(fileName, capturedImage.file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('waste-images').getPublicUrl(fileName)
      setUploadingImage(false)

      const endTime = new Date()
      const durationMinutes = Math.round((endTime - new Date(selectedTask.started_at)) / 60000)
      const { error: completeError } = await supabase.from('cleaning_tasks')
        .update({
          status: 'completed',
          completed_at: endTime.toISOString(),
          completion_image_url: publicUrl,
          actual_duration_minutes: durationMinutes
        })
        .eq('id', selectedTask.id)
      if (completeError) throw completeError

      await supabase.from('bins')
        .update({
          current_fill_percentage: verification.fillPercentage || 0,
          current_severity: 'low',
          last_cleaned_at: endTime.toISOString()
        })
        .eq('id', selectedTask.bin_id)

      setSelectedTask(null)
      setCapturedImage(null)
      fetchTasks()
      setVerificationResult({
        success: true,
        title: t('verificationSuccessTitle'),
        message: t('verificationSuccessMsg'),
        details: t('verificationSuccessDetails')
      })
    } catch (err) {
      setError('Failed to complete: ' + err.message)
    } finally {
      setCompletingTask(false)
    }
  }

  const handleCancelCapture = () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    setCapturing(false)
    setCapturedImage(null)
    setSelectedTask(null)
  }

  const getStatusBadge = (s) => {
    const map = { pending: 'badge-yellow', assigned: 'badge-slate', in_progress: 'badge-eco' }
    return `badge-editorial ${map[s] || 'badge-slate'}`
  }

  const getStatusLabel = (s) => {
    if (s === 'pending') return t('statusPending')
    if (s === 'assigned') return t('statusAssigned')
    if (s === 'in_progress') return t('statusInProgress')
    return s
  }

  const getPriorityBadge = (p) => {
    if (p === 1) return 'badge-editorial badge-red font-bold'
    if (p === 2) return 'badge-editorial badge-yellow font-bold'
    return 'badge-editorial badge-eco'
  }

  return (
    <div className="min-h-screen">
      <nav className="nav-header">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="w-5 h-5 text-eco-900" strokeWidth={1.5} />
            <div className="flex items-center gap-4">
              <h1 className="font-serif text-lg tracking-[0.2em] text-eco-900 uppercase">{t('worker')}</h1>
              <span className="text-eco-300">|</span>
              <p className="text-[10px] font-bold tracking-[0.2em] text-eco-600 uppercase">{profile?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <button onClick={signOut} className="btn-editorial-ghost">
              {t('signOut')}
            </button>
          </div>
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

        {optimizedRoute && optimizedRoute.sequence.length > 0 && (
          <div className="card-editorial mb-12 bg-eco-900 text-eco-50 border-none">
            <div className="card-header-editorial border-eco-50/10">
              <h2 className="font-serif text-2xl flex items-center gap-4 tracking-tight">
                <Navigation className="w-5 h-5 text-eco-300" />
                {t('optimizedItinerary')}
              </h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-eco-50/10">
              {[
                { label: t('targets'), value: optimizedRoute.sequence.length },
                { label: t('distance'), value: formatDistance(optimizedRoute.totalDistance) },
                { label: t('estDuration'), value: formatTime(getTotalEstimatedTime(optimizedRoute.totalDistance, optimizedRoute.sequence.length)) },
              ].map(({ label, value }) => (
                <div key={label} className="p-8 text-center">
                  <p className="text-[10px] font-bold text-eco-400 uppercase tracking-widest mb-3">{label}</p>
                  <p className="font-serif text-4xl">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card-editorial mb-12 border-eco-900/10 bg-white">
          <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-eco-900/10">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                activeListeningTaskId === 'global' ? 'bg-red-600 text-white animate-pulse ring-8 ring-red-500/20' : 'bg-eco-100 text-eco-900'
              }`}>
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-eco-900">{t('voiceAssistant')}</h3>
                  <span className="text-[10px] bg-eco-900 text-white px-2 py-0.5 rounded font-mono">{t('pushToTalk')}</span>
                </div>
                <p className="text-xs text-eco-600 font-light mt-0.5">
                  {voiceResponse || voiceTranscript || t('voicePromptDefault')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onMouseDown={() => startVoiceCommand('global')}
              onMouseUp={stopVoiceCommand}
              onTouchStart={() => startVoiceCommand('global')}
              onTouchEnd={stopVoiceCommand}
              className={`btn-editorial py-4 px-8 rounded text-xs tracking-widest font-bold transition-all select-none ${
                activeListeningTaskId === 'global'
                  ? 'bg-red-600 text-white ring-4 ring-red-300'
                  : 'bg-eco-900 hover:bg-eco-800 text-white'
              }`}
            >
              <Mic className="w-4 h-4 mr-2 inline" />
              {activeListeningTaskId === 'global' ? t('releaseToProcess') : t('holdToSpeak')}
            </button>
          </div>

          <div className="px-6 py-3 bg-eco-50 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-eco-500 uppercase tracking-widest mr-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-eco-600" />
              {language === 'hi' ? 'त्वरित निर्देश:' : 'Quick Directives:'}
            </span>
            <button
              type="button"
              onClick={() => handleVoiceAction('next stop', 'global')}
              className="text-xs bg-white border border-eco-900/10 px-3 py-1 rounded text-eco-800 hover:bg-eco-900 hover:text-white transition-colors"
            >
              {t('voiceChipNext')}
            </button>
            <button
              type="button"
              onClick={() => handleVoiceAction('start task', 'global')}
              className="text-xs bg-white border border-eco-900/10 px-3 py-1 rounded text-eco-800 hover:bg-eco-900 hover:text-white transition-colors"
            >
              {t('voiceChipStart')}
            </button>
            <button
              type="button"
              onClick={() => handleVoiceAction('verify cleaning', 'global')}
              className="text-xs bg-white border border-eco-900/10 px-3 py-1 rounded text-eco-800 hover:bg-eco-900 hover:text-white transition-colors"
            >
              {t('voiceChipDone')}
            </button>
            <button
              type="button"
              onClick={() => handleVoiceAction('status', 'global')}
              className="text-xs bg-white border border-eco-900/10 px-3 py-1 rounded text-eco-800 hover:bg-eco-900 hover:text-white transition-colors"
            >
              {t('voiceChipCount')}
            </button>
          </div>
        </div>

        {showCompletionOptions && (
          <div className="modal-overlay-editorial">
            <div className="card-editorial w-full max-w-md bg-white">
              <div className="card-header-editorial">
                <h3 className="font-serif text-2xl text-eco-900">{t('verificationSource')}</h3>
              </div>
              <div className="card-body-editorial space-y-4">
                <button onClick={handleCameraCapture} className="btn-editorial btn-editorial-primary w-full">
                  <Camera className="w-4 h-4 mr-3" /> {t('camera')}
                </button>
                <button onClick={handleFileUpload} className="btn-editorial btn-editorial-secondary w-full">
                  <Upload className="w-4 h-4 mr-3" /> {t('uploadFile')}
                </button>
                <button onClick={() => setShowCompletionOptions(false)} className="btn-editorial btn-editorial-ghost w-full mt-4">
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {capturing && (
          <div className="modal-overlay-editorial">
            <div className="card-editorial w-full max-w-2xl max-h-[90vh] flex flex-col bg-white">
              <div className="card-header-editorial shrink-0">
                <h3 className="font-serif text-2xl text-eco-900">{t('captureImage')}</h3>
              </div>
              <div className="card-body-editorial p-6 sm:p-8 overflow-y-auto">
                <div className="relative border border-eco-900/10 bg-eco-50 mb-8 aspect-[4/3] sm:aspect-video flex items-center justify-center max-h-[50vh]">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain grayscale-[20%]" />
                </div>
                <div className="flex gap-4">
                  <button onClick={handleCapture} className="btn-editorial btn-editorial-primary flex-1">
                    {t('captureImage')}
                  </button>
                  <button onClick={handleCancelCapture} className="btn-editorial btn-editorial-secondary flex-1">
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {capturedImage && !capturing && (
          <div className="modal-overlay-editorial">
            <div className="card-editorial w-full max-w-2xl max-h-[90vh] flex flex-col bg-white">
              <div className="card-header-editorial shrink-0">
                <h3 className="font-serif text-2xl text-eco-900">{t('reviewDocumentation')}</h3>
              </div>
              <div className="card-body-editorial p-6 sm:p-8 overflow-y-auto">
                <div className="border border-eco-900/10 mb-8 flex justify-center bg-eco-50 p-4">
                  <img src={capturedImage.url} alt="Proof" className="max-h-[50vh] w-auto object-contain grayscale-[10%]" />
                </div>
                {completingTask && (
                  <div className="flex flex-col items-center gap-4 py-8 text-eco-900 border border-eco-900/10 mb-8">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span className="font-serif text-xl">
                      {uploadingImage ? t('verifyingCleanliness') : 'Finalizing record...'}
                    </span>
                  </div>
                )}
                <div className="flex gap-4">
                  <button onClick={handleCompleteTask} disabled={completingTask} className="btn-editorial btn-editorial-primary flex-1">
                    {t('submitRecord')}
                  </button>
                  <button onClick={() => setCapturedImage(null)} disabled={completingTask} className="btn-editorial btn-editorial-secondary flex-1">
                    {t('retakeImage')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <h2 className="font-serif text-3xl text-eco-900 tracking-tight">{t('assignedTasks')}</h2>
            <div className="flex gap-4">
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="input-editorial py-2 text-xs w-36 border-eco-900/20 bg-transparent"
              >
                <option value="all">{t('allStatuses')}</option>
                <option value="pending">{t('statusPending')}</option>
                <option value="assigned">{t('statusAssigned')}</option>
                <option value="in_progress">{t('statusInProgress')}</option>
              </select>
              <select 
                value={priorityFilter} 
                onChange={e => setPriorityFilter(e.target.value)}
                className="input-editorial py-2 text-xs w-36 border-eco-900/20 bg-transparent"
              >
                <option value="all">{t('allPriorities')}</option>
                <option value="1">{t('priority1')}</option>
                <option value="2">{t('priority2')}</option>
                <option value="3">{t('priority3')}</option>
              </select>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                className="input-editorial py-2 text-xs w-36 border-eco-900/20 bg-transparent"
              >
                <option value="optimized">{t('sortOptimized')}</option>
                <option value="priority">{t('sortPriority')}</option>
                <option value="newest">{t('sortNewest')}</option>
                <option value="oldest">{t('sortOldest')}</option>
              </select>
            </div>
          </div>

          {displayedTasks.length === 0 ? (
            <div className="card-editorial">
              <div className="card-body-editorial text-center py-24">
                <p className="font-serif text-3xl text-eco-400 italic mb-2">{t('queueClear')}</p>
                <p className="text-[10px] font-bold tracking-widest uppercase text-eco-500">{t('noPendingOps')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {displayedTasks.map((task, index) => {
                const bin = task.displayBin || task.bins
                const isThisTaskListening = activeListeningTaskId === task.id

                return (
                  <div key={task.id} className="card-editorial flex flex-col sm:flex-row group">
                    <div className="bg-eco-50 sm:w-32 p-6 sm:p-0 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-eco-900/10">
                      <span className="text-[10px] font-bold text-eco-400 uppercase tracking-[0.2em] mb-2">{t('stopNumber')}</span>
                      <span className="font-serif text-5xl text-eco-900">{index + 1}</span>
                    </div>

                    <div className="p-8 flex-1 flex flex-col justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
                        <div>
                          <div className="flex items-center gap-4 flex-wrap mb-3">
                            <h3 className="font-serif text-3xl text-eco-900">{bin?.bin_code}</h3>
                            <span className={getPriorityBadge(task.priority)}>
                              {t('priority')} {task.priority}
                            </span>
                            {task.is_predicted && <span className="badge-editorial badge-slate">{t('scheduled')}</span>}
                          </div>

                          <div className="text-[10px] font-bold tracking-[0.2em] text-eco-600 uppercase flex flex-col gap-2">
                            <span className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {bin?.location_name}</span>
                            <div className="flex items-center gap-3 text-eco-500">
                              <span>{t('fillCapacity')}: {bin?.current_fill_percentage?.toFixed(0)}%</span>
                              {bin?.distance && (
                                <>
                                  <span>|</span>
                                  <span>{formatDistance(bin.distance)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-start sm:items-end gap-2">
                          <span className={getStatusBadge(task.status)}>
                            {getStatusLabel(task.status)}
                          </span>
                          <div className="text-[10px] font-mono text-eco-400 mt-1 sm:text-right">
                            <div className="flex items-center sm:justify-end gap-1 mb-1">
                              <Clock className="w-3 h-3" />
                              <span>{t('reportedAt')}: {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <span>{new Date(task.created_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {task.notes && (
                        <div className="mb-8 border-l border-eco-900/20 pl-4 py-2">
                          <span className="text-[10px] font-bold text-eco-900 uppercase tracking-widest block mb-1">{t('directives')}</span>
                          <span className="text-sm font-light text-eco-700 italic">{task.notes}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-eco-900/10">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {task.status === 'pending' && !task.assigned_worker_id && (
                            <button onClick={() => handleAcceptTask(task.id)} className="btn-editorial btn-editorial-secondary w-full sm:w-auto">
                              {t('acceptAssignment')}
                            </button>
                          )}
                          {task.status === 'assigned' && task.assigned_worker_id === profile.id && (
                            <button onClick={() => handleStartTask(task.id)} className="btn-editorial btn-editorial-primary w-full sm:w-auto">
                              {t('commenceWork')}
                            </button>
                          )}
                          {task.status === 'in_progress' && (
                            <button onClick={() => handleStartCompletion(task)} className="btn-editorial btn-editorial-primary w-full sm:w-auto">
                              {t('finalizeTask')}
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onMouseDown={() => startVoiceCommand(task.id)}
                          onMouseUp={stopVoiceCommand}
                          onTouchStart={() => startVoiceCommand(task.id)}
                          onTouchEnd={stopVoiceCommand}
                          className={`flex items-center justify-center gap-2 px-3 py-2 text-[10px] tracking-wider uppercase font-bold rounded transition-all select-none border ${
                            isThisTaskListening
                              ? 'bg-red-600 text-white border-red-600 ring-2 ring-red-300 animate-pulse'
                              : 'bg-eco-50 text-eco-800 border-eco-900/10 hover:bg-eco-100'
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>{isThisTaskListening ? t('voiceListening') : (language === 'hi' ? 'इस स्टॉप के लिए बोलें' : 'Voice Action')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {verificationResult && (
          <div className="modal-overlay-editorial z-[100]">
            <div className="card-editorial w-full max-w-md bg-white text-center">
              <div className={`card-header-editorial flex flex-col items-center justify-center gap-4 py-8 ${verificationResult.success ? 'bg-eco-900 text-white border-none' : 'bg-red-50 text-red-900 border-b border-red-200'}`}>
                {verificationResult.success ? <CheckCircle className="w-12 h-12 text-eco-400" /> : <AlertCircle className="w-12 h-12 text-red-500" />}
                <h3 className="font-serif text-3xl">{verificationResult.title}</h3>
              </div>
              <div className="card-body-editorial p-8">
                <p className="text-lg font-medium text-eco-900 mb-2">{verificationResult.message}</p>
                <p className="text-sm font-light text-eco-600 mb-8 italic">{verificationResult.details}</p>
                <button
                  onClick={() => setVerificationResult(null)}
                  className={`btn-editorial w-full ${verificationResult.success ? 'btn-editorial-primary' : 'bg-red-600 text-white hover:bg-red-700'}`}
                >
                  {verificationResult.success ? t('continueNextTask') : t('recleanBtn')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
