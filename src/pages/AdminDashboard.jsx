import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
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

const BinMarkerIcon = ({ severity }) => {
  const color = severity === 'high' ? '#153322' : severity === 'medium' ? '#22c55e' : '#86efac'
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill={color} stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.4))' }}>
      <path d="M3 6h18"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      <line x1="10" x2="10" y1="11" y2="17"/>
      <line x1="14" x2="14" y1="11" y2="17"/>
    </svg>
  )
}

const mapStyle = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
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
            <button onClick={signOut} className="btn-editorial-ghost">
              Sign out
            </button>
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

        {/* Global Live Map */}
        <div className="card-editorial mb-16 border-eco-900/10 h-[500px] flex flex-col relative">
          <div className="absolute top-6 left-6 z-[400] bg-white/90 backdrop-blur-md px-6 py-4 border border-eco-900/10 shadow-lg">
            <h3 className="font-serif text-2xl text-eco-900 flex items-center gap-3">
              <MapIcon className="w-5 h-5 text-eco-500" /> Live Grid
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-eco-600 mt-2">Active Sensors: {bins.length}</p>
          </div>

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
            
            {bins.map(bin => (
              <Marker
                key={bin.id}
                longitude={bin.longitude}
                latitude={bin.latitude}
                anchor="bottom"
                onClick={e => {
                  e.originalEvent.stopPropagation();
                  setSelectedBin(bin);
                }}
              >
                <div className="cursor-pointer hover:scale-110 transition-transform">
                  <BinMarkerIcon severity={bin.current_severity} />
                </div>
              </Marker>
            ))}

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
                <div className="p-2 min-w-[200px]">
                  <h4 className="font-serif text-lg font-bold text-eco-900">{selectedBin.bin_code}</h4>
                  <p className="text-xs text-eco-600 mb-2">{selectedBin.location_name}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold tracking-widest ${selectedBin.current_severity === 'high' ? 'text-accent' : selectedBin.current_severity === 'medium' ? 'text-amber-600' : 'text-eco-600'}`}>
                      {selectedBin.current_severity} severity
                    </span>
                    <span className="text-eco-300">|</span>
                    <span className="text-[10px] font-mono font-bold text-eco-900">{selectedBin.current_fill_percentage}% Full</span>
                  </div>
                </div>
              </Popup>
            )}
          </Map>
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
                  <div className="text-right">
                    <div className="font-serif text-2xl text-eco-900">{report.fill_percentage}<span className="text-sm font-sans text-eco-400">%</span></div>
                    <span className="text-[10px] font-mono text-eco-400 mt-1 block">
                      {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <div className="text-right">
                      <span className={getTaskStatusBadge(task.status)}>
                        {task.status.replace('_', ' ')}
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
