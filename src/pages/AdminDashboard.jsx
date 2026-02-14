import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getWasteTrends, checkAllBinsPredictions, generateDailySchedule, createScheduledTasks } from '../lib/predictionEngine'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Activity, TrendingUp, AlertTriangle, CheckCircle, MapPin, Calendar, Clock, Zap, Leaf, LogOut, Loader } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom marker icons
const createIcon = (color) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  })

const severityIcons = {
  low: createIcon('#10b981'),
  medium: createIcon('#f59e0b'),
  high: createIcon('#ef4444'),
  predicted_overflow: createIcon('#ff6b35')
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [bins, setBins] = useState([])
  const [tasks, setTasks] = useState([])
  const [reports, setReports] = useState([])
  const [workers, setWorkers] = useState([])
  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState([])
  const [selectedBin, setSelectedBin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [runningPrediction, setRunningPrediction] = useState(false)
  const [schedule, setSchedule] = useState(null)
  const [scheduleStats, setScheduleStats] = useState(null)
  const [generatingSchedule, setGeneratingSchedule] = useState(false)
  const [applyingSchedule, setApplyingSchedule] = useState(false)

  const campusCenter = [
    parseFloat(import.meta.env.VITE_CAMPUS_CENTER_LAT || 19.0222),
    parseFloat(import.meta.env.VITE_CAMPUS_CENTER_LNG || 72.8561)
  ]

  useEffect(() => {
    fetchData()
    subscribeToUpdates()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchBins(),
        fetchTasks(),
        fetchReports(),
        fetchWorkers(),
        calculateStats(),
        fetchTrends()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBins = async () => {
    const { data, error } = await supabase
      .from('bins')
      .select('*')
      .eq('is_active', true)
      .order('current_fill_percentage', { ascending: false })

    if (!error) setBins(data || [])
  }

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('cleaning_tasks')
      .select('*, bins(bin_code, location_name), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error) setTasks(data || [])
  }

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('waste_reports')
      .select('*, bins(bin_code, location_name), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error) setReports(data || [])
  }

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'worker')

    if (!error) setWorkers(data || [])
  }

  const calculateStats = async () => {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [reportsCount, tasksCount, avgResponse, highSeverity] = await Promise.all([
      supabase
        .from('waste_reports')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', last24h),

      supabase
        .from('cleaning_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', last24h),

      supabase
        .from('cleaning_tasks')
        .select('created_at, started_at')
        .eq('status', 'completed')
        .gte('completed_at', last24h)
        .not('started_at', 'is', null),

      supabase
        .from('waste_reports')
        .select('id', { count: 'exact', head: true })
        .eq('severity', 'high')
        .gte('created_at', last24h)
    ])

    let avgResponseTime = 0
    if (avgResponse.data && avgResponse.data.length > 0) {
      const responseTimes = avgResponse.data.map((task) => {
        const created = new Date(task.created_at)
        const started = new Date(task.started_at)
        return (started - created) / 60000 // minutes
      })
      avgResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    }

    setStats({
      reportsLast24h: reportsCount.count || 0,
      cleaningsLast24h: tasksCount.count || 0,
      avgResponseTime: Math.round(avgResponseTime),
      highSeverityCount: highSeverity.count || 0
    })
  }

  const fetchTrends = async () => {
    const trendData = await getWasteTrends(null, 7)
    setTrends(trendData)
  }

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('admin-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bins' },
        fetchBins
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cleaning_tasks' },
        () => {
          fetchTasks()
          calculateStats()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waste_reports' },
        () => {
          fetchReports()
          calculateStats()
          fetchTrends()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleRunPredictions = async () => {
    setRunningPrediction(true)
    try {
      await checkAllBinsPredictions()
      await fetchBins()
      await fetchTasks()
      alert('Predictions updated successfully!')
    } catch (error) {
      alert('Failed to run predictions')
    } finally {
      setRunningPrediction(false)
    }
  }

  const handleGenerateSchedule = async () => {
    setGeneratingSchedule(true)
    try {
      console.log('Generating daily schedule...')
      const result = await generateDailySchedule()
      setSchedule(result.schedule)
      setScheduleStats(result.stats)
      console.log('Schedule generated:', result)
    } catch (error) {
      console.error('Failed to generate schedule:', error)
      alert('Failed to generate schedule')
    } finally {
      setGeneratingSchedule(false)
    }
  }

  const handleApplySchedule = async () => {
    if (!schedule || schedule.length === 0) return
    setApplyingSchedule(true)
    try {
      console.log('Applying schedule - creating tasks for workers...')
      const result = await createScheduledTasks(schedule)
      console.log('Schedule applied:', result)
      alert(`Schedule applied! ${result.created} tasks created, ${result.skipped} skipped (already exist). Tasks assigned to ${result.totalWorkers} worker(s).`)
      await fetchTasks()
    } catch (error) {
      console.error('Failed to apply schedule:', error)
      alert('Failed to apply schedule')
    } finally {
      setApplyingSchedule(false)
    }
  }

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 1: return { text: 'HIGH', class: 'badge badge-red' }
      case 2: return { text: 'MEDIUM', class: 'badge badge-yellow' }
      default: return { text: 'LOW', class: 'badge badge-green' }
    }
  }

  const getSlotColor = (slot) => {
    switch (slot) {
      case 'morning': return 'bg-orange-50/80 border-orange-200'
      case 'midday': return 'bg-amber-50/80 border-amber-200'
      case 'afternoon': return 'bg-cyan-50/80 border-cyan-200'
      case 'evening': return 'bg-violet-50/80 border-violet-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getSlotIcon = (slot) => {
    switch (slot) {
      case 'morning': return 'text-orange-500'
      case 'midday': return 'text-amber-500'
      case 'afternoon': return 'text-cyan-600'
      case 'evening': return 'text-violet-500'
      default: return 'text-gray-500'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-amber-600'
      case 'low': return 'text-emerald-600'
      case 'predicted_overflow': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'high': return 'badge badge-red'
      case 'medium': return 'badge badge-yellow'
      case 'low': return 'badge badge-green'
      case 'predicted_overflow': return 'badge badge-orange'
      default: return 'badge bg-gray-100 text-gray-600'
    }
  }

  const getTaskStatusBadge = (status) => {
    switch (status) {
      case 'pending': return 'badge badge-yellow'
      case 'in_progress': return 'badge badge-purple'
      case 'assigned': return 'badge badge-blue'
      default: return 'badge bg-gray-100 text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-slow">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const statCards = stats ? [
    {
      label: 'Reports (24h)',
      value: stats.reportsLast24h,
      icon: Activity,
      gradient: 'from-cyan-500 to-blue-500',
      bg: 'bg-cyan-50'
    },
    {
      label: 'Cleanings (24h)',
      value: stats.cleaningsLast24h,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-green-500',
      bg: 'bg-emerald-50'
    },
    {
      label: 'Avg Response',
      value: `${stats.avgResponseTime}m`,
      icon: TrendingUp,
      gradient: 'from-violet-500 to-purple-500',
      bg: 'bg-violet-50'
    },
    {
      label: 'High Severity',
      value: stats.highSeverityCount,
      icon: AlertTriangle,
      gradient: 'from-red-500 to-rose-500',
      bg: 'bg-red-50'
    }
  ] : []

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-gradient-to-r from-dark via-dark-50 to-primary-900 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-xl flex items-center justify-center shadow-glow-primary">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Admin Dashboard</h1>
              <p className="text-primary-300 text-sm">{profile?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateSchedule}
              disabled={generatingSchedule}
              className="btn-accent py-2.5 text-sm flex items-center gap-2"
            >
              {generatingSchedule ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              {generatingSchedule ? 'Generating...' : 'Generate Schedule'}
            </button>
            <button
              onClick={handleRunPredictions}
              disabled={runningPrediction}
              className="btn-secondary py-2.5 text-sm flex items-center gap-2"
            >
              {runningPrediction ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {runningPrediction ? 'Running...' : 'Predictions'}
            </button>
            <button onClick={signOut} className="btn-ghost text-white/70 hover:text-white hover:bg-white/10">
              <LogOut className="w-4 h-4 inline mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
            {statCards.map((card, index) => (
              <div
                key={card.label}
                className="stat-card animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center shadow-md`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.label}</p>
                </div>
                <p className="text-4xl font-extrabold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="dash-card p-6 mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Campus Waste Map</h2>
            </div>
            <div className="flex gap-3">
              {[
                { color: 'bg-emerald-500', label: 'Low' },
                { color: 'bg-amber-500', label: 'Medium' },
                { color: 'bg-red-500', label: 'High' },
                { color: 'bg-orange-500', label: 'Predicted' }
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-xs font-medium text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-[500px] rounded-2xl overflow-hidden border border-gray-200">
            <MapContainer
              center={campusCenter}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {bins.map((bin) => (
                <Marker
                  key={bin.id}
                  position={[bin.latitude, bin.longitude]}
                  icon={severityIcons[bin.current_severity]}
                  eventHandlers={{
                    click: () => setSelectedBin(bin)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-1">{bin.bin_code}</h3>
                      <p className="text-sm text-gray-600 mb-2">{bin.location_name}</p>
                      <div className="space-y-1 text-sm">
                        <p>Fill: <span className="font-medium">{bin.current_fill_percentage.toFixed(0)}%</span></p>
                        <p>Severity: <span className={`font-medium uppercase ${getSeverityColor(bin.current_severity)}`}>
                          {bin.current_severity.replace('_', ' ')}
                        </span></p>
                        <p>Department: <span className="font-medium">{bin.department}</span></p>
                        {bin.last_cleaned_at && (
                          <p className="text-xs text-gray-500">
                            Last cleaned: {new Date(bin.last_cleaned_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Waste Trends */}
          <div className="dash-card p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-base font-bold text-gray-900">7-Day Waste Trends</h3>
            </div>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '13px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="reports" stroke="#0891b2" strokeWidth={2} name="Reports" dot={{ fill: '#0891b2', r: 4 }} />
                  <Line type="monotone" dataKey="avgFill" stroke="#059669" strokeWidth={2} name="Avg Fill %" dot={{ fill: '#059669', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">No trend data available</p>
              </div>
            )}
          </div>

          {/* Department Distribution */}
          <div className="dash-card p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Bins by Department</h3>
            </div>
            {bins.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={Object.entries(
                    bins.reduce((acc, bin) => {
                      acc[bin.department] = (acc[bin.department] || 0) + 1
                      return acc
                    }, {})
                  ).map(([name, count]) => ({ name, count }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '13px'
                    }}
                  />
                  <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">No bin data available</p>
              </div>
            )}
          </div>
        </div>

        {/* AI-Generated Schedule */}
        {schedule && schedule.length > 0 && (
          <div className="dash-card mb-8 overflow-visible animate-fade-in-up">
            <div className="bg-gradient-to-r from-accent-600 via-accent-500 to-primary-500 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">AI-Predicted Cleaning Schedule</h2>
                    <p className="text-white/70 text-xs mt-0.5">
                      Based on {scheduleStats?.daysAnalyzed || 5} days of historical data ({scheduleStats?.dataPointsAnalyzed || 0} reports analyzed)
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleApplySchedule}
                  disabled={applyingSchedule}
                  className="bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all duration-200 disabled:opacity-50"
                >
                  {applyingSchedule ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {applyingSchedule ? 'Applying...' : 'Apply & Notify'}
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Schedule Stats */}
              {scheduleStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  {[
                    { value: scheduleStats.totalSlots, label: 'Total Cleanings', color: 'text-accent-700', bg: 'bg-accent-50' },
                    { value: scheduleStats.totalBins, label: 'Bins Scheduled', color: 'text-secondary-700', bg: 'bg-cyan-50' },
                    { value: scheduleStats.highPriority, label: 'High Priority', color: 'text-red-700', bg: 'bg-red-50' },
                    { value: scheduleStats.mediumPriority, label: 'Medium Priority', color: 'text-amber-700', bg: 'bg-amber-50' },
                    { value: `${scheduleStats.avgConfidence}%`, label: 'Avg Confidence', color: 'text-emerald-700', bg: 'bg-emerald-50' }
                  ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
                      <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Schedule by Time Slot */}
              {['morning', 'midday', 'afternoon', 'evening'].map((slot) => {
                const slotItems = schedule.filter((s) => s.timeSlot === slot)
                if (slotItems.length === 0) return null

                const slotLabels = {
                  morning: 'Morning (7 AM - 10 AM)',
                  midday: 'Midday (10 AM - 2 PM)',
                  afternoon: 'Afternoon (2 PM - 5 PM)',
                  evening: 'Evening (5 PM - 8 PM)'
                }

                return (
                  <div key={slot} className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className={`w-4 h-4 ${getSlotIcon(slot)}`} />
                      <h3 className="font-semibold text-gray-800 text-sm">{slotLabels[slot]}</h3>
                      <span className="badge bg-gray-100 text-gray-600">
                        {slotItems.length} bin{slotItems.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {slotItems.map((item, idx) => {
                        const priorityInfo = getPriorityLabel(item.priority)

                        return (
                          <div
                            key={`${item.binId}-${slot}-${idx}`}
                            className={`border rounded-xl p-4 ${getSlotColor(slot)} hover:shadow-md transition-all duration-200`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-bold text-gray-900 text-sm">{item.binCode}</span>
                              <span className={priorityInfo.class}>{priorityInfo.text}</span>
                            </div>

                            <p className="text-sm text-gray-700 mb-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span>{item.locationName}</span>
                            </p>

                            <p className="text-xs text-gray-500 mb-2">{item.department}</p>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="bg-white/70 px-2 py-1 rounded-lg font-medium">
                                Fill: {item.predictedFill}%
                              </span>
                              <span className="bg-white/70 px-2 py-1 rounded-lg font-medium">
                                Conf: {item.confidence}%
                              </span>
                            </div>

                            <p className="text-[11px] text-gray-500 mt-2 italic">{item.wasteType}</p>

                            <div className="mt-2 pt-2 border-t border-gray-200/50">
                              <p className="text-[11px] text-gray-500 leading-relaxed">{item.reason}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Reports */}
        <div className="dash-card p-6 mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Recent Reports</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-modern">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Bin</th>
                  <th className="px-4 py-3 text-left">Reporter</th>
                  <th className="px-4 py-3 text-left">Fill %</th>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Waste Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.slice(0, 10).map((report) => (
                  <tr key={report.id}>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {new Date(report.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
                      {report.bins?.bin_code}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {report.profiles?.full_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              report.fill_percentage > 80 ? 'bg-red-500' :
                              report.fill_percentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(report.fill_percentage, 100)}%` }}
                          />
                        </div>
                        <span className="font-medium text-gray-700">{report.fill_percentage.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <span className={getSeverityBadge(report.severity)}>
                        {report.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {report.waste_type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="dash-card p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Active Cleaning Tasks</h3>
          </div>
          <div className="space-y-3">
            {tasks
              .filter((t) => t.status !== 'completed')
              .slice(0, 5)
              .map((task, index) => {
                const priorityInfo = getPriorityLabel(task.priority)
                return (
                  <div
                    key={task.id}
                    className={`border border-gray-100 rounded-xl p-4 hover:shadow-card transition-all duration-200 animate-fade-in-up ${
                      task.priority === 1 ? 'priority-high' :
                      task.priority === 2 ? 'priority-medium' : 'priority-low'
                    }`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">
                            {task.bins?.bin_code}
                          </p>
                          <span className="text-gray-400">-</span>
                          <p className="text-sm text-gray-600">{task.bins?.location_name}</p>
                          <span className={priorityInfo.class}>{priorityInfo.text}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                          <span>Worker: <span className="text-gray-600 font-medium">{task.profiles?.full_name || 'Unassigned'}</span></span>
                          <span>Created: {new Date(task.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <span className={getTaskStatusBadge(task.status)}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                )
              })}
            {tasks.filter((t) => t.status !== 'completed').length === 0 && (
              <div className="text-center py-12 animate-fade-in">
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-primary-400" />
                </div>
                <p className="text-gray-400 text-sm font-medium">No active tasks</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
