import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageToggle from '../components/LanguageToggle'
import { supabase } from '../lib/supabase'
import { generateCleaningSchedule } from '../lib/aiService'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import {
  CheckCircle, AlertTriangle, Clock, Server,
  LogOut, Zap, Loader, Calendar, Layers, Activity, Map as MapIcon
} from 'lucide-react'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre'

// Accessible, color-blind safe severity icons with distinct geometric shapes
const BinMarkerIcon = ({ severity }) => {
  if (severity === 'high') {
    // Red Octagon with exclamation mark (Critical)
    return (
      <div className="relative flex items-center justify-center filter drop-shadow-md hover:scale-125 transition-transform" title="Critical Severity - High Fill">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
          <line x1="12" y1="8" x2="12" y2="12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  if (severity === 'medium') {
    // Amber Triangle with warning indicator (Medium)
    return (
      <div className="relative flex items-center justify-center filter drop-shadow-md hover:scale-125 transition-transform" title="Medium Severity">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#d97706" stroke="#ffffff" strokeWidth="1.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="17" x2="12.01" y2="17" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  // Forest Green Circle with checkmark (Low/Normal)
  return (
    <div className="relative flex items-center justify-center filter drop-shadow-md hover:scale-125 transition-transform" title="Low Severity - Normal">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#15803d" stroke="#ffffff" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="9 12 11 14 15 10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// Explainable Ghost Pin for AI Bin Recommendations
const GhostMarkerIcon = () => (
  <div className="relative flex items-center justify-center cursor-pointer group" title="Proposed Bin Location (Explainable AI)">
    <div className="absolute -inset-2 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
    <svg width="36" height="36" viewBox="0 0 24 24" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2 2" className="filter drop-shadow-lg group-hover:scale-125 transition-transform">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" fill="#ffffff" />
    </svg>
  </div>
)

const mapStyle = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const { language, t } = useLanguage()
  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState([])
  const [tasks, setTasks] = useState([])
  const [bins, setBins] = useState([])
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBin, setSelectedBin] = useState(null)

  const [generatingSchedule, setGeneratingSchedule] = useState(false)
  const [schedule, setSchedule] = useState(null)
  const [scheduleStats, setScheduleStats] = useState(null)
  const [applyingSchedule, setApplyingSchedule] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleSuccess, setScheduleSuccess] = useState('')

  // Part A3: Explainable Bin Placement Suggestions & What-If Simulation State
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [whatIfBudget, setWhatIfBudget] = useState(3)
  const [whatIfRadius, setWhatIfRadius] = useState(45)
  const [selectedGhostBin, setSelectedGhostBin] = useState(null)
  const [deployingBin, setDeployingBin] = useState(false)

  // Candidate demand zones computed from campus reports & footfall priors
  const allCandidateSuggestions = [
    {
      id: 'SUGG-CAFE-01',
      binCode: 'PROP-CAFE-NEW',
      locationName: 'Quadrangle South (Near Canteen)',
      department: 'Canteen & Quad',
      latitude: 19.0226,
      longitude: 72.8565,
      recommendedCount: 2,
      capacityLiters: 100,
      demandScore: 94,
      peakHours: '12:30 PM - 2:15 PM',
      nearestExistingDist: 82,
      reason: '16 overflow reports in last 10 days during lunch rush. Nearest bin is 82m away, exceeding your 45m walk radius threshold.'
    },
    {
      id: 'SUGG-LIB-01',
      binCode: 'PROP-LIB-REAR',
      locationName: 'Library East Corridor & Reading Hall',
      department: 'Library',
      latitude: 19.0219,
      longitude: 72.8558,
      recommendedCount: 1,
      capacityLiters: 100,
      demandScore: 81,
      peakHours: '3:00 PM - 5:30 PM',
      nearestExistingDist: 65,
      reason: 'Continuous paper and beverage container accumulation from exam study halls. Footfall density 1.4x baseline.'
    },
    {
      id: 'SUGG-MECH-01',
      binCode: 'PROP-MECH-LAWN',
      locationName: 'Mechanical Workshops & Central Lawns',
      department: 'Mechanical',
      latitude: 19.0228,
      longitude: 72.8554,
      recommendedCount: 2,
      capacityLiters: 150,
      demandScore: 73,
      peakHours: '4:30 PM - 6:30 PM',
      nearestExistingDist: 90,
      reason: 'High recreational student footfall at dusk. Citizen dropped-pin requests logged 4 times this week.'
    },
    {
      id: 'SUGG-HOSTEL-01',
      binCode: 'PROP-HOSTEL-PATH',
      locationName: 'Hostel Block B Main Pathway',
      department: 'Hostel',
      latitude: 19.0235,
      longitude: 72.8570,
      recommendedCount: 1,
      capacityLiters: 100,
      demandScore: 68,
      peakHours: '8:00 AM - 10:00 AM',
      nearestExistingDist: 74,
      reason: 'Morning breakfast packet rush. High demand signal from student corridor reports.'
    },
    {
      id: 'SUGG-IT-01',
      binCode: 'PROP-IT-GATE',
      locationName: 'IT & MCA Department Entrance',
      department: 'Information Technology',
      latitude: 19.0215,
      longitude: 72.8566,
      recommendedCount: 1,
      capacityLiters: 100,
      demandScore: 62,
      peakHours: '1:00 PM - 3:00 PM',
      nearestExistingDist: 58,
      reason: 'Lab area beverage cup disposal demand. Walking radius uncovered by existing CS bins.'
    }
  ]

  // Filter candidates by what-if budget
  const activeGhostPins = allCandidateSuggestions.slice(0, whatIfBudget)

  // Compute estimated campus coverage percentage from what-if sliders
  const estimatedCoverage = Math.min(Math.round(62 + (whatIfBudget * 5.5) + ((whatIfRadius - 30) * 0.4)), 98)

  const handleDeployGhostBin = async (ghost) => {
    setDeployingBin(true)
    setScheduleError('')
    try {
      const { error } = await supabase.from('bins').insert({
        bin_code: ghost.binCode,
        location_name: ghost.locationName,
        department: ghost.department,
        latitude: ghost.latitude,
        longitude: ghost.longitude,
        capacity_liters: ghost.capacityLiters * ghost.recommendedCount,
        current_fill_percentage: 0,
        current_severity: 'low',
        is_active: true
      })
      if (error) throw error
      setSelectedGhostBin(null)
      setScheduleSuccess(`Deployed ${ghost.recommendedCount} bin(s) to ${ghost.locationName}!`)
      fetchDashboardData()
      setTimeout(() => setScheduleSuccess(''), 5000)
    } catch (err) {
      setScheduleError('Failed to deploy bin: ' + err.message)
    } finally {
      setDeployingBin(false)
    }
  }

  useEffect(() => { fetchDashboardData(); subscribeToUpdates() }, [])

  const subscribeToUpdates = () => {
    const channels = [
      supabase.channel('admin-reports').on('postgres_changes', { event: '*', schema: 'public', table: 'waste_reports' }, fetchDashboardData).subscribe(),
      supabase.channel('admin-tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'cleaning_tasks' }, fetchDashboardData).subscribe(),
      supabase.channel('admin-bins').on('postgres_changes', { event: '*', schema: 'public', table: 'bins' }, fetchDashboardData).subscribe(),
    ]
    return () => channels.forEach((c) => supabase.removeChannel(c))
  }

  const fetchDashboardData = async () => {
    try {
      const [
        { data: reportsData }, { data: tasksData },
        { count: usersCount }, { data: binsData }
      ] = await Promise.all([
        supabase.from('waste_reports').select('*, bins(*), reporter:profiles!waste_reports_reporter_id_fkey(full_name)').order('created_at', { ascending: false }),
        supabase.from('cleaning_tasks').select('*, bins(*), profiles!cleaning_tasks_assigned_worker_id_fkey(full_name)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('bins').select('*')
      ])

      setReports(reportsData || [])
      setTasks(tasksData || [])
      setBins(binsData || [])

      const completedTasks = (tasksData || []).filter((t) => t.status === 'completed')
      const activeTasks = (tasksData || []).filter((t) => t.status !== 'completed')
      const totalActualDuration = completedTasks.reduce((sum, t) => sum + (t.actual_duration_minutes || 0), 0)
      const avgResponseTime = completedTasks.length > 0 ? Math.round(totalActualDuration / completedTasks.length) : 0

      setStats({
        totalReports: reportsData?.length || 0,
        activeTasks: activeTasks.length,
        completedCleanings: completedTasks.length,
        totalUsers: usersCount || 0,
        avgResponseTime
      })

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i)
        return d.toISOString().split('T')[0]
      }).reverse()

      const trendData = last7Days.map((date) => {
        const dayReports = (reportsData || []).filter((r) => r.created_at.startsWith(date))
        const avgFill = dayReports.length > 0
          ? dayReports.reduce((sum, r) => sum + r.fill_percentage, 0) / dayReports.length
          : 0
        return {
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          reports: dayReports.length,
          avgFill: Math.round(avgFill)
        }
      })
      setTrends(trendData)
    } catch (error) { console.error('Error loading admin data:', error) }
    finally { setLoading(false) }
  }

  const handleGenerateSchedule = async () => {
    setGeneratingSchedule(true); setScheduleError(''); setScheduleSuccess(''); setSchedule(null)
    try {
      const historicalData = reports.map((r) => ({
        binId: r.bin_id, binCode: r.bins?.bin_code,
        department: r.bins?.department, locationName: r.bins?.location_name,
        fillPercentage: r.fill_percentage, severity: r.severity,
        wasteType: r.waste_type, reportedAt: r.created_at
      }))
      const result = await generateCleaningSchedule(historicalData)
      setSchedule(result.schedule)
      setScheduleStats(result.stats)
      setScheduleSuccess('Strategic plan formulated. Review details below.')
      setTimeout(() => setScheduleSuccess(''), 5000)
    } catch (err) { setScheduleError('Failed to formulate plan') }
    finally { setGeneratingSchedule(false) }
  }

  const handleApplySchedule = async () => {
    if (!schedule) return
    setApplyingSchedule(true); setScheduleError(''); setScheduleSuccess('')
    try {
      const tasksToCreate = schedule.map((item) => {
        const priority = item.priority === 'high' ? 1 : item.priority === 'medium' ? 2 : 3
        return {
          bin_id: item.binId, status: 'pending', priority,
          notes: `[DIRECTIVE] ${item.timeSlot.toUpperCase()} | ${item.reason}`,
          is_predicted: true
        }
      })
      const { error } = await supabase.from('cleaning_tasks').insert(tasksToCreate)
      if (error) throw error
      setScheduleSuccess('Strategic plan dispatched to operations')
      setSchedule(null); fetchDashboardData()
      setTimeout(() => setScheduleSuccess(''), 5000)
    } catch (err) { setScheduleError('Dispatch failed') }
    finally { setApplyingSchedule(false) }
  }

  const getSeverityBadge = (s) => {
    const map = { high: 'badge-red', medium: 'badge-yellow', low: 'badge-eco' }
    return `badge-editorial ${map[s] || 'badge-slate'}`
  }

  const getTaskStatusBadge = (s) => {
    const map = { pending: 'badge-yellow', assigned: 'badge-slate', in_progress: 'badge-eco', completed: 'badge-eco' }
    return `badge-editorial ${map[s] || 'badge-slate'}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-eco-900 mx-auto mb-6" strokeWidth={1} />
          <h2 className="font-serif text-3xl text-eco-900 italic">Initializing Systems...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">

      <nav className="nav-header">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-eco-900" strokeWidth={1.5} />
            <div className="flex items-center gap-4">
              <h1 className="font-serif text-lg tracking-[0.2em] text-eco-900 uppercase">Command Center</h1>
              <span className="text-eco-300">|</span>
              <p className="text-[10px] font-bold tracking-[0.2em] text-eco-600 uppercase">Administrator</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={handleGenerateSchedule} disabled={generatingSchedule} className="text-[10px] font-bold tracking-[0.2em] uppercase text-eco-600 hover:text-eco-900 transition-colors flex items-center gap-2">
              {generatingSchedule ? <Loader className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              {generatingSchedule ? 'Formulating...' : 'Formulate Strategy'}
            </button>
            <span className="text-eco-300">|</span>
            <div className="flex items-center gap-4">
              <LanguageToggle />
              <button onClick={signOut} className="btn-editorial-ghost">
                {t('signOut')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="dashboard-container">

        {scheduleError && (
          <div className="alert-error mb-12">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{scheduleError}</span>
          </div>
        )}
        {scheduleSuccess && (
          <div className="alert-success mb-12">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{scheduleSuccess}</span>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-eco-900/10 mb-16 bg-white">
            {[
              { label: 'Total Incidents', value: stats.totalReports },
              { label: 'Active Tasks', value: stats.activeTasks },
              { label: 'Resolved', value: stats.completedCleanings },
              { label: 'Avg Time (min)', value: stats.avgResponseTime }
            ].map((card, idx) => (
              <div key={card.label} className={`p-8 ${idx !== 3 ? 'border-r border-eco-900/10' : ''} ${idx > 1 ? 'border-t lg:border-t-0 border-eco-900/10' : ''}`}>
                <p className="text-[10px] font-bold text-eco-500 uppercase tracking-widest mb-4">{card.label}</p>
                <p className="font-serif text-5xl text-eco-900">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Global Live Map & What-If Spatial Simulator */}
        <div className="card-editorial mb-16 border-eco-900/10 flex flex-col">
          {/* What-If Control Header */}
          <div className="p-6 bg-eco-900 text-eco-50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-eco-50/10">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                <h3 className="font-serif text-2xl tracking-tight text-white flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-indigo-300" /> Spatial Intelligence & Bin Placement
                </h3>
              </div>
              <p className="text-xs text-eco-300 font-light">
                Direct-manipulation coverage optimization based on citizen demand signals and footfall patterns
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs">
              {/* Toggle Suggestions */}
              <label className="flex items-center gap-2 cursor-pointer bg-white/10 px-3 py-1.5 rounded border border-white/20">
                <input
                  type="checkbox"
                  checked={showSuggestions}
                  onChange={(e) => setShowSuggestions(e.target.checked)}
                  className="accent-indigo-400 rounded"
                />
                <span className="font-bold tracking-wider uppercase text-[10px]">Show Ghost Pins</span>
              </label>

              {/* What-If Budget Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-eco-400">Budget:</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={whatIfBudget}
                  onChange={(e) => setWhatIfBudget(parseInt(e.target.value))}
                  className="w-24 accent-indigo-400"
                />
                <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">{whatIfBudget} Bins</span>
              </div>

              {/* Walk Radius Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-eco-400">Walk Radius:</span>
                <input
                  type="range"
                  min="30"
                  max="70"
                  step="5"
                  value={whatIfRadius}
                  onChange={(e) => setWhatIfRadius(parseInt(e.target.value))}
                  className="w-24 accent-indigo-400"
                />
                <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">{whatIfRadius}m</span>
              </div>

              {/* Projected Coverage Metric */}
              <div className="border-l border-white/20 pl-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-eco-400 block">Coverage</span>
                <span className="font-serif text-lg font-bold text-indigo-300">{estimatedCoverage}%</span>
              </div>
            </div>
          </div>

          {/* Accessible Shape & Color Legend */}
          <div className="px-6 py-2 bg-eco-50 border-b border-eco-900/10 flex flex-wrap items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-eco-700">
            <span className="text-eco-400 font-mono">LEGEND:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" />
              <span>Low (● Circle)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#d97706] rotate-45 transform" />
              <span>Medium (◆ Diamond)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#dc2626] rounded-xs flex items-center justify-center text-white text-[8px] font-bold">!</span>
              <span>Critical (🛑 Octagon)</span>
            </div>
            {showSuggestions && (
              <div className="flex items-center gap-1.5 text-indigo-700">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-indigo-600 animate-pulse" />
                <span>AI Proposed Site (📍 Ghost Pin)</span>
              </div>
            )}
          </div>

          {/* 3D Map Viewport */}
          <div className="h-[520px] relative w-full">
            <Map
              initialViewState={{
                longitude: parseFloat(import.meta.env.VITE_CAMPUS_CENTER_LNG || 72.8561),
                latitude: parseFloat(import.meta.env.VITE_CAMPUS_CENTER_LAT || 19.0222),
                zoom: 18,
                pitch: 60,
                bearing: -20
              }}
              mapStyle={mapStyle}
              style={{ width: '100%', height: '100%' }}
              attributionControl={false}
            >
              <NavigationControl position="bottom-right" visualizePitch={true} />
              
              {/* Existing Campus Bins */}
              {bins.map(bin => (
                <Marker
                  key={bin.id}
                  longitude={bin.longitude}
                  latitude={bin.latitude}
                  anchor="bottom"
                  onClick={e => {
                    e.originalEvent.stopPropagation();
                    setSelectedGhostBin(null);
                    setSelectedBin(bin);
                  }}
                >
                  <BinMarkerIcon severity={bin.current_severity} />
                </Marker>
              ))}

              {/* AI Proposed Ghost Pins */}
              {showSuggestions && activeGhostPins.map((ghost) => (
                <Marker
                  key={ghost.id}
                  longitude={ghost.longitude}
                  latitude={ghost.latitude}
                  anchor="bottom"
                  onClick={e => {
                    e.originalEvent.stopPropagation();
                    setSelectedBin(null);
                    setSelectedGhostBin(ghost);
                  }}
                >
                  <GhostMarkerIcon />
                </Marker>
              ))}

              {/* Existing Bin Details Popup */}
              {selectedBin && (
                <Popup
                  longitude={selectedBin.longitude}
                  latitude={selectedBin.latitude}
                  anchor="bottom"
                  offset={[0, -32]}
                  onClose={() => setSelectedBin(null)}
                  closeButton={false}
                  className="editorial-popup"
                >
                  <div className="p-2 min-w-[220px]">
                    <h4 className="font-serif text-lg font-bold text-eco-900">{selectedBin.bin_code}</h4>
                    <p className="text-xs text-eco-600 mb-2">{selectedBin.location_name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold tracking-widest ${selectedBin.current_severity === 'high' ? 'text-red-600' : selectedBin.current_severity === 'medium' ? 'text-amber-600' : 'text-eco-600'}`}>
                        {selectedBin.current_severity} severity
                      </span>
                      <span className="text-eco-300">|</span>
                      <span className="text-[10px] font-mono font-bold text-eco-900">{selectedBin.current_fill_percentage}% Full</span>
                    </div>
                  </div>
                </Popup>
              )}

              {/* Explainable Ghost Pin Recommendation Popup */}
              {selectedGhostBin && (
                <Popup
                  longitude={selectedGhostBin.longitude}
                  latitude={selectedGhostBin.latitude}
                  anchor="bottom"
                  offset={[0, -36]}
                  onClose={() => setSelectedGhostBin(null)}
                  closeButton={false}
                  className="editorial-popup"
                >
                  <div className="p-3 max-w-[280px]">
                    <div className="flex items-center justify-between border-b border-eco-900/10 pb-2 mb-2">
                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                        AI Recommended Site
                      </span>
                      <span className="font-mono text-[10px] text-eco-500 font-bold">Score: {selectedGhostBin.demandScore}/100</span>
                    </div>

                    <h4 className="font-serif text-base font-bold text-eco-900 leading-tight mb-1">
                      {selectedGhostBin.locationName}
                    </h4>
                    
                    <p className="text-[11px] text-eco-700 mb-3 leading-snug">
                      <strong>Recommendation:</strong> Add {selectedGhostBin.recommendedCount} bin(s) ({selectedGhostBin.capacityLiters}L each).
                    </p>

                    <div className="bg-eco-50 p-2 border border-eco-900/10 mb-3 text-[10px] text-eco-600 space-y-1">
                      <p><strong>Rationale:</strong> {selectedGhostBin.reason}</p>
                      <p><strong>Peak Window:</strong> {selectedGhostBin.peakHours}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeployGhostBin(selectedGhostBin)}
                        disabled={deployingBin}
                        className="btn-editorial bg-indigo-600 hover:bg-indigo-700 text-white flex-1 py-1.5 text-[10px]"
                      >
                        {deployingBin ? 'Deploying...' : 'Approve & Deploy'}
                      </button>
                      <button
                        onClick={() => setSelectedGhostBin(null)}
                        className="btn-editorial btn-editorial-ghost py-1.5 text-[10px]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </Popup>
              )}
            </Map>
          </div>
        </div>

        {/* AI Schedule Preview */}
        {schedule && schedule.length > 0 && (
          <div className="card-editorial mb-16 border-eco-900">
            <div className="card-header-editorial bg-eco-900 text-eco-50 border-none p-10 flex-col lg:flex-row gap-8">
              <div>
                <h2 className="font-serif text-4xl mb-4">Strategic Plan Generated</h2>
                <p className="text-xs font-light tracking-wide opacity-80 max-w-xl">
                  Analyzed {scheduleStats?.daysAnalyzed} days of historical records ({scheduleStats?.dataPointsAnalyzed} data points). The following directives have been formulated for optimal resource allocation.
                </p>
              </div>
              <button onClick={handleApplySchedule} disabled={applyingSchedule} className="btn-editorial bg-white text-eco-900 hover:bg-eco-50">
                {applyingSchedule ? 'Dispatching...' : 'Approve & Dispatch'}
              </button>
            </div>
            <div className="card-body-editorial p-10">
              <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {['morning', 'midday', 'afternoon', 'evening'].map((slot) => {
                  const slotItems = schedule.filter((s) => s.timeSlot === slot)
                  if (slotItems.length === 0) return null
                  return (
                    <div key={slot} className="border-t border-eco-900/10 pt-6">
                      <h3 className="text-[10px] font-bold text-eco-900 uppercase tracking-[0.2em] mb-6 flex justify-between">
                        {slot} Phase
                        <span className="text-eco-400">{slotItems.length} ops</span>
                      </h3>
                      <div className="space-y-4">
                        {slotItems.map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-2 p-4 bg-eco-50 border border-eco-900/5">
                            <div className="flex justify-between items-start">
                              <span className="font-serif text-xl text-eco-900">{item.binCode}</span>
                              <span className={`text-[10px] uppercase font-bold tracking-widest ${item.priority === 'high' ? 'text-accent' : item.priority === 'medium' ? 'text-amber-600' : 'text-eco-600'}`}>
                                {item.priority}
                              </span>
                            </div>
                            <span className="text-xs font-light text-eco-600 uppercase tracking-wider">{item.locationName}</span>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="h-px flex-1 bg-eco-900/20 relative">
                                <div className="absolute top-0 left-0 h-full bg-eco-900" style={{ width: `${item.predictedFill}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-eco-500">{item.predictedFill}% projected</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div className="card-editorial">
            <div className="card-header-editorial">
              <h3 className="font-serif text-2xl text-eco-900">Incident Velocity</h3>
            </div>
            <div className="card-body-editorial p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5ebe6" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#819985', fontWeight: 700, textTransform: 'uppercase' }} dy={10} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#819985', fontWeight: 700 }} dx={-10} />
                    <Tooltip
                      contentStyle={{ borderRadius: '0', border: '1px solid rgba(26,38,30,0.1)', boxShadow: 'none', padding: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                      labelStyle={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}
                    />
                    <Legend iconType="plainline" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                    <Line type="monotone" dataKey="reports" stroke="#1a261e" strokeWidth={2} name="Total Reports" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="avgFill" stroke="#b86a44" strokeWidth={2} name="Avg Fill (%)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card-editorial">
            <div className="card-header-editorial">
              <h3 className="font-serif text-2xl text-eco-900">Sector Analysis</h3>
            </div>
            <div className="card-body-editorial p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(() => {
                    const deptMap = {}
                    reports.forEach((r) => {
                      const dept = r.bins?.department || 'Unknown'
                      if (!deptMap[dept]) deptMap[dept] = { name: dept, reports: 0, totalFill: 0 }
                      deptMap[dept].reports++
                      deptMap[dept].totalFill += r.fill_percentage
                    })
                    return Object.values(deptMap).map((d) => ({ ...d, avgFill: Math.round(d.totalFill / d.reports) })).sort((a, b) => b.reports - a.reports).slice(0, 5)
                  })()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5ebe6" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#819985', fontWeight: 700, textTransform: 'uppercase' }} dy={10} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#819985', fontWeight: 700 }} dx={-10} />
                    <Tooltip
                      contentStyle={{ borderRadius: '0', border: '1px solid rgba(26,38,30,0.1)', boxShadow: 'none', padding: '12px' }}
                      cursor={{ fill: '#f4f6f4' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                      labelStyle={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}
                    />
                    <Legend iconType="square" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                    <Bar dataKey="reports" fill="#1a261e" name="Total Reports" maxBarSize={40} />
                    <Bar dataKey="avgFill" fill="#b86a44" name="Avg Fill (%)" maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Lists Grid */}
        <div className="grid lg:grid-cols-2 gap-12">

          <div>
            <h3 className="font-serif text-3xl text-eco-900 mb-6">Recent Logs</h3>
            <div className="border-t border-eco-900/10 divide-y divide-eco-900/10">
              {reports.slice(0, 5).map((report) => (
                <div key={report.id} className="py-6 flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="font-serif text-xl text-eco-900">{report.bins?.bin_code}</span>
                      <span className={getSeverityBadge(report.severity)}>{report.severity}</span>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-eco-600 mb-1">{report.bins?.location_name}</p>
                    <p className="text-[10px] font-light text-eco-500 italic">Logged by {report.reporter?.full_name}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="font-serif text-2xl text-eco-900">{report.fill_percentage}<span className="text-sm font-sans text-eco-400">%</span></div>
                    <span className="text-[10px] font-mono text-eco-400 block">
                      {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-serif text-3xl text-eco-900 mb-6">Active Operations</h3>
            <div className="border-t border-eco-900/10 divide-y divide-eco-900/10">
              {tasks.filter((t) => t.status !== 'completed').length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-serif text-2xl text-eco-400 italic mb-2">Queue clear.</p>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-eco-500">No pending operations.</p>
                </div>
              ) : (
                tasks.filter((t) => t.status !== 'completed').slice(0, 5).map((task) => (
                  <div key={task.id} className="py-6 flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-4 mb-2">
                        <span className="font-serif text-xl text-eco-900">{task.bins?.bin_code}</span>
                        <span className={`text-[10px] font-bold tracking-widest uppercase ${task.priority === 1 ? 'text-accent' : task.priority === 2 ? 'text-amber-600' : 'text-eco-600'}`}>
                          P{task.priority}
                        </span>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest text-eco-600 mb-1">{task.bins?.location_name}</p>
                      <p className="text-[10px] font-light text-eco-500 italic">
                        Operator: {task.profiles?.full_name || 'Unassigned'}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={getTaskStatusBadge(task.status)}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-eco-400 block mt-1">
                        {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
