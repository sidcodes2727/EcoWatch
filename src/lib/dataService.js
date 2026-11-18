import { supabase } from './supabase'

export const DEFAULT_CAMPUS_BINS = [
  {
    id: 'bin-vjti-cafe-01',
    bin_code: 'BIN-CAFE-01',
    location_name: 'Main Canteen & Food Court (Indoor)',
    department: 'Canteen & Quad',
    latitude: 19.0226,
    longitude: 72.8565,
    capacity_liters: 150,
    current_fill_percentage: 85,
    current_severity: 'high',
    is_active: true
  },
  {
    id: 'bin-vjti-cafe-02',
    bin_code: 'BIN-CAFE-02',
    location_name: 'Canteen Pergola & South Quadrangle',
    department: 'Canteen & Quad',
    latitude: 19.0227,
    longitude: 72.8567,
    capacity_liters: 120,
    current_fill_percentage: 78,
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
    id: 'bin-vjti-lib-02',
    bin_code: 'BIN-LIB-02',
    location_name: 'Library Reading Hall & PG Section',
    department: 'Library',
    latitude: 19.0218,
    longitude: 72.8556,
    capacity_liters: 80,
    current_fill_percentage: 25,
    current_severity: 'low',
    is_active: true
  },
  {
    id: 'bin-vjti-it-01',
    bin_code: 'BIN-IT-01',
    location_name: 'IT & MCA Department Entrance',
    department: 'Information Technology',
    latitude: 19.0215,
    longitude: 72.8566,
    capacity_liters: 100,
    current_fill_percentage: 20,
    current_severity: 'low',
    is_active: true
  },
  {
    id: 'bin-vjti-it-02',
    bin_code: 'BIN-IT-02',
    location_name: 'Computer Engineering Software Labs',
    department: 'Computer Technology',
    latitude: 19.0216,
    longitude: 72.8568,
    capacity_liters: 100,
    current_fill_percentage: 55,
    current_severity: 'medium',
    is_active: true
  },
  {
    id: 'bin-vjti-mech-01',
    bin_code: 'BIN-MECH-01',
    location_name: 'Mechanical Engineering Heavy Workshop',
    department: 'Mechanical',
    latitude: 19.0228,
    longitude: 72.8554,
    capacity_liters: 150,
    current_fill_percentage: 65,
    current_severity: 'medium',
    is_active: true
  },
  {
    id: 'bin-vjti-mech-02',
    bin_code: 'BIN-MECH-02',
    location_name: 'Automobile & IC Engines Laboratory',
    department: 'Mechanical',
    latitude: 19.0229,
    longitude: 72.8551,
    capacity_liters: 120,
    current_fill_percentage: 30,
    current_severity: 'low',
    is_active: true
  },
  {
    id: 'bin-vjti-civil-01',
    bin_code: 'BIN-CIVIL-01',
    location_name: 'Civil Engineering Wing & Survey Lab',
    department: 'Civil',
    latitude: 19.0221,
    longitude: 72.8552,
    capacity_liters: 100,
    current_fill_percentage: 72,
    current_severity: 'high',
    is_active: true
  },
  {
    id: 'bin-vjti-elec-01',
    bin_code: 'BIN-ELEC-01',
    location_name: 'Electrical High Voltage Labs & North Wing',
    department: 'Electrical',
    latitude: 19.0225,
    longitude: 72.8551,
    capacity_liters: 100,
    current_fill_percentage: 35,
    current_severity: 'low',
    is_active: true
  },
  {
    id: 'bin-vjti-text-01',
    bin_code: 'BIN-TEXT-01',
    location_name: 'Textile Technology Department & Machinery Wing',
    department: 'Textile',
    latitude: 19.0224,
    longitude: 72.8548,
    capacity_liters: 150,
    current_fill_percentage: 40,
    current_severity: 'low',
    is_active: true
  },
  {
    id: 'bin-vjti-hostel-01',
    bin_code: 'BIN-HOSTEL-01',
    location_name: 'Boys Hostel Block A & B Main Gate',
    department: 'Hostel',
    latitude: 19.0235,
    longitude: 72.8570,
    capacity_liters: 150,
    current_fill_percentage: 90,
    current_severity: 'high',
    is_active: true
  },
  {
    id: 'bin-vjti-hostel-02',
    bin_code: 'BIN-HOSTEL-02',
    location_name: 'Boys Hostel Block C & D Courtyard',
    department: 'Hostel',
    latitude: 19.0238,
    longitude: 72.8573,
    capacity_liters: 120,
    current_fill_percentage: 60,
    current_severity: 'medium',
    is_active: true
  },
  {
    id: 'bin-vjti-girls-01',
    bin_code: 'BIN-GIRLS-01',
    location_name: 'Girls Hostel Main Complex & Mess',
    department: 'Hostel',
    latitude: 19.0232,
    longitude: 72.8576,
    capacity_liters: 120,
    current_fill_percentage: 50,
    current_severity: 'medium',
    is_active: true
  },
  {
    id: 'bin-vjti-sports-01',
    bin_code: 'BIN-SPORTS-01',
    location_name: 'VJTI Cricket Ground & Sports Pavilion',
    department: 'Gymkhana',
    latitude: 19.0212,
    longitude: 72.8559,
    capacity_liters: 150,
    current_fill_percentage: 82,
    current_severity: 'high',
    is_active: true
  },
  {
    id: 'bin-vjti-sports-02',
    bin_code: 'BIN-SPORTS-02',
    location_name: 'Gymkhana & Basketball Courts',
    department: 'Gymkhana',
    latitude: 19.0210,
    longitude: 72.8563,
    capacity_liters: 100,
    current_fill_percentage: 35,
    current_severity: 'low',
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
  },
  {
    id: 'bin-vjti-gate-01',
    bin_code: 'BIN-GATE-01',
    location_name: 'Main Campus Gate 1 (H.R. Mahajani Marg)',
    department: 'Security & Gate',
    latitude: 19.0224,
    longitude: 72.8572,
    capacity_liters: 100,
    current_fill_percentage: 70,
    current_severity: 'medium',
    is_active: true
  },
  {
    id: 'bin-vjti-gate-02',
    bin_code: 'BIN-GATE-02',
    location_name: 'North Gate 2 (Post Office & Don Bosco Side)',
    department: 'Security & Gate',
    latitude: 19.0231,
    longitude: 72.8560,
    capacity_liters: 100,
    current_fill_percentage: 40,
    current_severity: 'low',
    is_active: true
  },
  {
    id: 'bin-vjti-park-01',
    bin_code: 'BIN-PARK-01',
    location_name: 'Two-Wheeler Parking & Workshop Alley',
    department: 'Facilities',
    latitude: 19.0220,
    longitude: 72.8569,
    capacity_liters: 120,
    current_fill_percentage: 88,
    current_severity: 'high',
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
    bins: DEFAULT_CAMPUS_BINS[11]
  },
  {
    id: 'task-vjti-03',
    bin_id: 'bin-vjti-park-01',
    status: 'pending',
    priority: 1,
    notes: 'Beverage cups and paper bags accumulating near parking racks.',
    created_at: new Date(Date.now() - 9000000).toISOString(),
    assigned_worker_id: null,
    bins: DEFAULT_CAMPUS_BINS[19]
  },
  {
    id: 'task-vjti-04',
    bin_id: 'bin-vjti-sports-01',
    status: 'pending',
    priority: 1,
    notes: 'Post-match hydration bottles around pavilion benches.',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    assigned_worker_id: null,
    bins: DEFAULT_CAMPUS_BINS[14]
  },
  {
    id: 'task-vjti-05',
    bin_id: 'bin-vjti-mech-01',
    status: 'pending',
    priority: 2,
    notes: 'Workshop area metal shavings and beverage containers.',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    assigned_worker_id: null,
    bins: DEFAULT_CAMPUS_BINS[6]
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
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    const { data, error } = await Promise.race([fetchPromise, timeoutPromise])
    if (error || !data || data.length < 10) throw error || new Error('No bins')
    setLocal('ecowatch_cached_bins_v2', data)
    return data
  } catch {
    const local = getLocal('ecowatch_cached_bins_v2', null)
    if (local && local.length >= 10) return local
    setLocal('ecowatch_cached_bins_v2', DEFAULT_CAMPUS_BINS)
    return DEFAULT_CAMPUS_BINS
  }
}

export const fetchCampusReports = async (reporterId = null) => {
  try {
    let query = supabase.from('waste_reports').select('*, bins(*), reporter:profiles!waste_reports_reporter_id_fkey(full_name)').order('created_at', { ascending: false })
    if (reporterId) query = query.eq('reporter_id', reporterId)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    const { data, error } = await Promise.race([query, timeoutPromise])
    if (error || !data) throw error || new Error('No reports')
    setLocal('ecowatch_cached_reports_v2', data)
    return data
  } catch {
    const all = getLocal('ecowatch_cached_reports_v2', [
      {
        id: 'rep-hist-01',
        bin_id: 'bin-vjti-cafe-01',
        fill_percentage: 85,
        severity: 'high',
        waste_type: 'Plastic & Food Containers',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        reporter_id: 'demo-user-id',
        reporter: { full_name: 'Mohammed Mehdi Hedayati' },
        bins: DEFAULT_CAMPUS_BINS[0]
      },
      {
        id: 'rep-hist-02',
        bin_id: 'bin-vjti-park-01',
        fill_percentage: 88,
        severity: 'high',
        waste_type: 'Mixed Beverage Containers',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        reporter_id: 'demo-user-id',
        reporter: { full_name: 'Campus Student' },
        bins: DEFAULT_CAMPUS_BINS[19]
      },
      {
        id: 'rep-hist-03',
        bin_id: 'bin-vjti-lib-01',
        fill_percentage: 45,
        severity: 'medium',
        waste_type: 'Paper & Study Materials',
        created_at: new Date(Date.now() - 14400000).toISOString(),
        reporter_id: 'demo-user-id',
        reporter: { full_name: 'Library Assistant' },
        bins: DEFAULT_CAMPUS_BINS[2]
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
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    const { data, error } = await Promise.race([query, timeoutPromise])
    if (error || !data) throw error || new Error('No tasks')
    setLocal('ecowatch_cached_tasks_v2', data)
    return data
  } catch {
    const all = getLocal('ecowatch_cached_tasks_v2', DEFAULT_INITIAL_TASKS)
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
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
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
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    await Promise.race([insertPromise, timeoutPromise])
  } catch {}

  const reports = getLocal('ecowatch_cached_reports_v2', [])
  reports.unshift(newReport)
  setLocal('ecowatch_cached_reports_v2', reports)

  const bins = getLocal('ecowatch_cached_bins_v2', DEFAULT_CAMPUS_BINS)
  const binIdx = bins.findIndex(b => b.id === bin.id)
  if (binIdx >= 0) {
    bins[binIdx].current_fill_percentage = fillPercentage
    bins[binIdx].current_severity = severity
    bins[binIdx].last_reported_at = new Date().toISOString()
    setLocal('ecowatch_cached_bins_v2', bins)
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
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      await Promise.race([taskPromise, timeoutPromise])
    } catch {}

    const tasks = getLocal('ecowatch_cached_tasks_v2', DEFAULT_INITIAL_TASKS)
    tasks.unshift(newTask)
    setLocal('ecowatch_cached_tasks_v2', tasks)
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
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    await Promise.race([insertPromise, timeoutPromise])
  } catch {}

  const reports = getLocal('ecowatch_cached_reports_v2', [])
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
  setLocal('ecowatch_cached_reports_v2', reports)

  return newPinBin
}

export const updateTaskState = async (taskId, updates) => {
  try {
    const updatePromise = supabase.from('cleaning_tasks').update(updates).eq('id', taskId)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    await Promise.race([updatePromise, timeoutPromise])
  } catch {}

  const tasks = getLocal('ecowatch_cached_tasks_v2', DEFAULT_INITIAL_TASKS)
  const idx = tasks.findIndex(t => t.id === taskId)
  if (idx >= 0) {
    tasks[idx] = { ...tasks[idx], ...updates }
    setLocal('ecowatch_cached_tasks_v2', tasks)
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
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
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

  const bins = getLocal('ecowatch_cached_bins_v2', DEFAULT_CAMPUS_BINS)
  const binIdx = bins.findIndex(b => b.id === (task.bin_id || task.bins?.id))
  if (binIdx >= 0) {
    bins[binIdx].current_fill_percentage = verification.fillPercentage || 0
    bins[binIdx].current_severity = 'low'
    bins[binIdx].last_cleaned_at = endTime.toISOString()
    setLocal('ecowatch_cached_bins_v2', bins)
  }

  try {
    const updateBinPromise = supabase.from('bins').update({
      current_fill_percentage: verification.fillPercentage || 0,
      current_severity: 'low',
      last_cleaned_at: endTime.toISOString()
    }).eq('id', task.bin_id || task.bins?.id)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
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
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    await Promise.race([insertPromise, timeoutPromise])
  } catch {}

  const bins = getLocal('ecowatch_cached_bins_v2', DEFAULT_CAMPUS_BINS)
  bins.push(newBin)
  setLocal('ecowatch_cached_bins_v2', bins)

  return newBin
}
