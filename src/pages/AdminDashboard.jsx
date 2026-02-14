import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getWasteTrends, checkAllBinsPredictions } from '../lib/predictionEngine'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Activity, TrendingUp, AlertTriangle, CheckCircle, Users, MapPin } from 'lucide-react'
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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      case 'predicted_overflow':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 border-red-300'
      case 'medium':
        return 'bg-yellow-100 border-yellow-300'
      case 'low':
        return 'bg-green-100 border-green-300'
      case 'predicted_overflow':
        return 'bg-orange-100 border-orange-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {profile?.full_name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRunPredictions}
              disabled={runningPrediction}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {runningPrediction ? 'Running...' : 'Run Predictions'}
            </button>
            <button
              onClick={signOut}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-8 h-8 text-blue-600" />
                <h3 className="text-sm font-medium text-gray-600">Reports (24h)</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.reportsLast24h}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <h3 className="text-sm font-medium text-gray-600">Cleanings (24h)</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.cleaningsLast24h}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <h3 className="text-sm font-medium text-gray-600">Avg Response</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.avgResponseTime}min</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <h3 className="text-sm font-medium text-gray-600">High Severity</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.highSeverityCount}</p>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Campus Waste Map</h2>
            <div className="flex gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span>Predicted</span>
              </div>
            </div>
          </div>

          <div className="h-[500px] rounded-lg overflow-hidden border">
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
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Waste Trends */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">7-Day Waste Trends</h3>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reports" stroke="#3b82f6" name="Reports" />
                  <Line type="monotone" dataKey="avgFill" stroke="#10b981" name="Avg Fill %" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No trend data available</p>
            )}
          </div>

          {/* Department Distribution */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Bins by Department</h3>
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
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No bin data available</p>
            )}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Reports</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fill %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waste Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.slice(0, 10).map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(report.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {report.bins?.bin_code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {report.profiles?.full_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {report.fill_percentage.toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityBg(report.severity)}`}>
                        {report.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {report.waste_type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Active Cleaning Tasks</h3>
          <div className="space-y-3">
            {tasks
              .filter((t) => t.status !== 'completed')
              .slice(0, 5)
              .map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {task.bins?.bin_code} - {task.bins?.location_name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Worker: {task.profiles?.full_name || 'Unassigned'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(task.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : task.status === 'in_progress'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            {tasks.filter((t) => t.status !== 'completed').length === 0 && (
              <p className="text-gray-500 text-center py-8">No active tasks</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
