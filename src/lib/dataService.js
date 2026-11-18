import { supabase } from './supabase'

export const DEFAULT_CAMPUS_BINS = [
  {
    id: 'bin-vjti-cafe-01',
    bin_code: 'BIN-CAFE-01',
    location_name: 'Main Quadrangle & Cafeteria',
    department: 'Canteen & Quad',
    latitude: 19.0226,
    longitude: 72.8565,
    capacity_liters: 150,
    current_fill_percentage: 85,
    current_severity: 'high',
    is_active: true
  },
  {
    id: 'bin-vjti-lib-01',
    bin_code: 'BIN-LIB-01',
    location_name: 'Central Library Main Entrance',
    department: 'Library',
    latitude: 19.0219,
    longitude: 72.8558,
    capacity_liters: 100,
    current_fill_percentage: 45,
    current_severity: 'medium',
    is_active: true
  },
  {
    id: 'bin-vjti-it-01',
    bin_code: 'BIN-IT-01',
    location_name: 'IT & Computer Department Block',
    department: 'Information Technology',
    latitude: 19.0215,
    longitude: 72.8566,
    capacity_liters: 100,
    current_fill_percentage: 20,
    current_severity: 'low',
    is_active: true
  },
  {
    id: 'bin-vjti-mech-01',
    bin_code: 'BIN-MECH-01',
    location_name: 'Mechanical Workshops & Central Lawns',
    department: 'Mechanical',
    latitude: 19.0228,
    longitude: 72.8554,
    capacity_liters: 150,
    current_fill_percentage: 65,
    current_severity: 'medium',
    is_active: true
  },
  {
    id: 'bin-vjti-hostel-01',
    bin_code: 'BIN-HOSTEL-01',
    location_name: 'Hostel Block B Main Pathway',
    department: 'Hostel',
    latitude: 19.0235,
    longitude: 72.8570,
    capacity_liters: 120,
    current_fill_percentage: 90,
    current_severity: 'high',
    is_active: true
  },
  {
    id: 'bin-vjti-admin-01',
    bin_code: 'BIN-ADMIN-01',
    location_name: 'Main Administrative Building Entrance',
    department: 'Administration',
    latitude: 19.0222,
    longitude: 72.8561,
    capacity_liters: 80,
    current_fill_percentage: 15,
    current_severity: 'low',
    is_active: true
  }
]

export const DEFAULT_INITIAL_TASKS = [
  {
    id: 'task-vjti-01',
    bin_id: 'bin-vjti-cafe-01',
    status: 'assigned',
    priority: 1,
    notes: 'Overflow reported during lunch hours. Immediate clearance needed.',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    assigned_worker_id: 'demo-worker-id',
    bins: DEFAULT_CAMPUS_BINS[0]
  },
  {
    id: 'task-vjti-02',
    bin_id: 'bin-vjti-hostel-01',
    status: 'pending',
    priority: 1,
    notes: 'Morning packaging accumulation at hostel entryway.',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    assigned_worker_id: null,
    bins: DEFAULT_CAMPUS_BINS[4]
  },
  {
    id: 'task-vjti-03',
    bin_id: 'bin-vjti-mech-01',
    status: 'pending',
    priority: 2,
    notes: 'Workshop area metal shavings and beverage containers.',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    assigned_worker_id: null,
    bins: DEFAULT_CAMPUS_BINS[3]
  }
]

const getLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const setLocal = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {}
}

export const fetchCampusBins = async () => {
  try {
    const fetchPromise = supabase.from('bins').select('*').eq('is_active', true)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
    const { data, error } = await Promise.race([fetchPromise, timeoutPromise])
    if (error || !data || !data.length) throw error || new Error('No bins')
    setLocal('ecowatch_cached_bins', data)
    return data
  } catch {
    const local = getLocal('ecowatch_cached_bins', DEFAULT_CAMPUS_BINS)
    return local
  }
}

export const fetchCampusReports = async (reporterId = null) => {
  try {
    let query = supabase.from('waste_reports').select('*, bins(*), reporter:profiles!waste_reports_reporter_id_fkey(full_name)').order('created_at', { ascending: false })
    if (reporterId) query = query.eq('reporter_id', reporterId)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
    const { data, error } = await Promise.race([query, timeoutPromise])
    if (error || !data) throw error || new Error('No reports')
    setLocal('ecowatch_cached_reports', data)
    return data
  } catch {
    const all = getLocal('ecowatch_cached_reports', [
      {
        id: 'rep-hist-01',
        bin_id: 'bin-vjti-cafe-01',
        fill_percentage: 85,
        severity: 'high',
        waste_type: 'Plastic & Food',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        reporter_id: 'demo-user-id',
        reporter: { full_name: 'Mohammed Mehdi Hedayati' },
        bins: DEFAULT_CAMPUS_BINS[0]
      },
      {
        id: 'rep-hist-02',
        bin_id: 'bin-vjti-lib-01',
        fill_percentage: 45,
        severity: 'medium',
        waste_type: 'Paper',
        created_at: new Date(Date.now() - 14400000).toISOString(),
        reporter_id: 'demo-user-id',
        reporter: { full_name: 'Campus Student' },
        bins: DEFAULT_CAMPUS_BINS[1]
      }
    ])
    if (reporterId) {
      return all.filter(r => !r.reporter_id || r.reporter_id === reporterId)
    }
    return all
  }
}

export const fetchCampusTasks = async (workerId = null) => {
  try {
    let query = supabase.from('cleaning_tasks').select('*, bins(*), profiles!cleaning_tasks_assigned_worker_id_fkey(full_name)').order('priority', { ascending: true }).order('created_at', { ascending: true })
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
    const { data, error } = await Promise.race([query, timeoutPromise])
    if (error || !data) throw error || new Error('No tasks')
    setLocal('ecowatch_cached_tasks', data)
    return data
  } catch {
    const all = getLocal('ecowatch_cached_tasks', DEFAULT_INITIAL_TASKS)
    return all
  }
}

export const submitWasteReport = async ({
  bin,
  reporter,
  file,
  fillPercentage,
  severity,
  wasteType,
  confidence,
  observations,
  location
}) => {
  let publicUrl = ''
  if (file) {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
      const uploadPromise = supabase.storage.from('waste-images').upload(fileName, file)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
      const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise])
      if (!uploadError) {
        const { data } = supabase.storage.from('waste-images').getPublicUrl(fileName)
        publicUrl = data?.publicUrl || ''
      }
    } catch {
      publicUrl = URL.createObjectURL(file)
    }
  }

  const newReport = {
    id: `report-${Date.now()}`,
    bin_id: bin.id,
    reporter_id: reporter?.id || 'demo-user-id',
    image_url: publicUrl,
    fill_percentage: fillPercentage,
    severity,
    waste_type: wasteType,
    ai_confidence: confidence,
    ai_analysis_json: observations,
    latitude: location?.latitude || bin.latitude,
    longitude: location?.longitude || bin.longitude,
    created_at: new Date().toISOString(),
    reporter: { full_name: reporter?.full_name || 'Mohammed Mehdi Hedayati' },
    bins: bin
  }

  try {
    const insertPromise = supabase.from('waste_reports').insert({
      bin_id: bin.id,
      reporter_id: reporter?.id || 'demo-user-id',
      image_url: publicUrl,
      fill_percentage: fillPercentage,
      severity,
      waste_type: wasteType,
      ai_confidence: confidence,
      ai_analysis_json: observations,
      latitude: location?.latitude || bin.latitude,
      longitude: location?.longitude || bin.longitude
    }).select().single()
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
    await Promise.race([insertPromise, timeoutPromise])
  } catch {}

  const reports = getLocal('ecowatch_cached_reports', [])
  reports.unshift(newReport)
  setLocal('ecowatch_cached_reports', reports)

  const bins = getLocal('ecowatch_cached_bins', DEFAULT_CAMPUS_BINS)
  const binIdx = bins.findIndex(b => b.id === bin.id)
  if (binIdx >= 0) {
    bins[binIdx].current_fill_percentage = fillPercentage
    bins[binIdx].current_severity = severity
    bins[binIdx].last_reported_at = new Date().toISOString()
    setLocal('ecowatch_cached_bins', bins)
  }

  if (fillPercentage >= 30) {
    let priority = 3
    if (severity === 'high' || fillPercentage > 70) priority = 1
    else if (severity === 'medium' || fillPercentage > 40) priority = 2

    const newTask = {
      id: `task-${Date.now()}`,
      bin_id: bin.id,
      status: 'pending',
      priority,
      notes: `${wasteType} - ${fillPercentage}% full (${severity})`,
      created_at: new Date().toISOString(),
      assigned_worker_id: null,
      bins: bin
    }

    try {
      const taskPromise = supabase.from('cleaning_tasks').insert({
        bin_id: bin.id,
        priority,
        status: 'pending',
        notes: newTask.notes
      })
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
      await Promise.race([taskPromise, timeoutPromise])
    } catch {}

    const tasks = getLocal('ecowatch_cached_tasks', DEFAULT_INITIAL_TASKS)
    tasks.unshift(newTask)
    setLocal('ecowatch_cached_tasks', tasks)
  }

  return newReport
}

export const submitPinDemandRequest = async ({ location, notes, reporter }) => {
  const customId = `req-pin-${Date.now()}`
  const newPinBin = {
    id: customId,
    bin_code: `REQ-PIN-${Math.floor(100 + Math.random() * 900)}`,
    location_name: notes || 'Citizen Requested Bin Placement',
    department: 'Campus General',
    latitude: location.latitude,
    longitude: location.longitude,
    capacity_liters: 100,
    current_fill_percentage: 0,
    current_severity: 'low',
    is_active: false
  }

  try {
    const insertPromise = supabase.from('waste_reports').insert({
      bin_id: 'bin-vjti-cafe-01',
      reporter_id: reporter?.id || 'demo-user-id',
      fill_percentage: 100,
      severity: 'high',
      waste_type: 'Citizen Dropped Pin Request',
      latitude: location.latitude,
      longitude: location.longitude,
      notes: '[REQUEST_BIN_HERE] ' + notes
    })
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
    await Promise.race([insertPromise, timeoutPromise])
  } catch {}

  const reports = getLocal('ecowatch_cached_reports', [])
  reports.unshift({
    id: `rep-${Date.now()}`,
    bin_id: 'bin-vjti-cafe-01',
    fill_percentage: 100,
    severity: 'high',
    waste_type: 'Spatial Pin Request',
    created_at: new Date().toISOString(),
    reporter_id: reporter?.id || 'demo-user-id',
    reporter: { full_name: reporter?.full_name || 'Mohammed Mehdi Hedayati' },
    bins: newPinBin
  })
  setLocal('ecowatch_cached_reports', reports)

  return newPinBin
}

export const updateTaskState = async (taskId, updates) => {
  try {
    const updatePromise = supabase.from('cleaning_tasks').update(updates).eq('id', taskId)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
    await Promise.race([updatePromise, timeoutPromise])
  } catch {}

  const tasks = getLocal('ecowatch_cached_tasks', DEFAULT_INITIAL_TASKS)
  const idx = tasks.findIndex(t => t.id === taskId)
  if (idx >= 0) {
    tasks[idx] = { ...tasks[idx], ...updates }
    setLocal('ecowatch_cached_tasks', tasks)
  }
}

export const completeCleanTask = async (task, verification, imageFile) => {
  const endTime = new Date()
  const durationMinutes = task.started_at
    ? Math.max(1, Math.round((endTime - new Date(task.started_at)) / 60000))
    : 12

  let completionUrl = ''
  if (imageFile) {
    try {
      const fileName = `completed-${Date.now()}.jpg`
      const uploadPromise = supabase.storage.from('waste-images').upload(fileName, imageFile)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
      const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise])
      if (!uploadError) {
        const { data } = supabase.storage.from('waste-images').getPublicUrl(fileName)
        completionUrl = data?.publicUrl || ''
      }
    } catch {
      completionUrl = URL.createObjectURL(imageFile)
    }
  }

  const updates = {
    status: 'completed',
    completed_at: endTime.toISOString(),
    completion_image_url: completionUrl,
    actual_duration_minutes: durationMinutes
  }

  await updateTaskState(task.id, updates)

  const bins = getLocal('ecowatch_cached_bins', DEFAULT_CAMPUS_BINS)
  const binIdx = bins.findIndex(b => b.id === (task.bin_id || task.bins?.id))
  if (binIdx >= 0) {
    bins[binIdx].current_fill_percentage = verification.fillPercentage || 0
    bins[binIdx].current_severity = 'low'
    bins[binIdx].last_cleaned_at = endTime.toISOString()
    setLocal('ecowatch_cached_bins', bins)
  }

  try {
    const updateBinPromise = supabase.from('bins').update({
      current_fill_percentage: verification.fillPercentage || 0,
      current_severity: 'low',
      last_cleaned_at: endTime.toISOString()
    }).eq('id', task.bin_id || task.bins?.id)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
    await Promise.race([updateBinPromise, timeoutPromise])
  } catch {}

  return updates
}

export const deployGhostBinRecord = async (ghost) => {
  const newBin = {
    id: `bin-${Date.now()}`,
    bin_code: ghost.binCode,
    location_name: ghost.locationName,
    department: ghost.department,
    latitude: ghost.latitude,
    longitude: ghost.longitude,
    capacity_liters: ghost.capacityLiters * ghost.recommendedCount,
    current_fill_percentage: 0,
    current_severity: 'low',
    is_active: true
  }

  try {
    const insertPromise = supabase.from('bins').insert(newBin)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
    await Promise.race([insertPromise, timeoutPromise])
  } catch {}

  const bins = getLocal('ecowatch_cached_bins', DEFAULT_CAMPUS_BINS)
  bins.push(newBin)
  setLocal('ecowatch_cached_bins', bins)

  return newBin
}
