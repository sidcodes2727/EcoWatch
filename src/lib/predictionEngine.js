import { supabase } from './supabase'

/**
 * Waste Prediction Engine
 * Uses historical data to predict overflow times and generate cleaning schedules
 */

/**
 * Generate a predicted daily cleaning schedule based on historical patterns
 * Analyzes the past 5 days to find patterns: which bins fill up at what times
 * @returns {Promise<Object>} Schedule with time slots and assigned bins
 */
export async function generateDailySchedule() {
  try {
    console.log('📊 Generating daily cleaning schedule from historical data...')

    // Fetch all reports from the last 5 days
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()

    const { data: reports, error: reportsError } = await supabase
      .from('waste_reports')
      .select('bin_id, fill_percentage, severity, waste_type, created_at, bins(id, bin_code, location_name, department, latitude, longitude)')
      .gte('created_at', fiveDaysAgo)
      .order('created_at', { ascending: true })

    if (reportsError) throw reportsError

    if (!reports || reports.length === 0) {
      console.warn('⚠️ No historical data found for scheduling')
      return { schedule: [], stats: { totalBins: 0, totalSlots: 0 } }
    }

    console.log(`📋 Analyzing ${reports.length} reports from last 5 days...`)

    // Fetch completed cleaning tasks to understand cleaning patterns
    const { data: completedTasks, error: tasksError } = await supabase
      .from('cleaning_tasks')
      .select('bin_id, completed_at, actual_duration_minutes, priority')
      .eq('status', 'completed')
      .gte('completed_at', fiveDaysAgo)

    if (tasksError) throw tasksError

    // Step 1: Analyze time-of-day patterns for each bin
    const binPatterns = analyzeBinPatterns(reports)

    // Step 2: Analyze cleaning frequency needed
    const cleaningFrequency = analyzeCleaningFrequency(reports, completedTasks || [])

    // Step 3: Generate time slots based on patterns
    const schedule = generateTimeSlots(binPatterns, cleaningFrequency)

    // Step 4: Calculate schedule confidence
    const stats = calculateScheduleStats(schedule, reports)

    console.log(`✅ Schedule generated: ${schedule.length} cleaning slots for today`)

    return { schedule, stats }
  } catch (error) {
    console.error('❌ Error generating schedule:', error)
    return { schedule: [], stats: { totalBins: 0, totalSlots: 0 } }
  }
}

/**
 * Analyze which bins fill up at what time of day
 */
function analyzeBinPatterns(reports) {
  const patterns = {}

  reports.forEach((report) => {
    const binId = report.bin_id
    const hour = new Date(report.created_at).getHours()
    const bin = report.bins

    if (!patterns[binId]) {
      patterns[binId] = {
        binId,
        binCode: bin?.bin_code || 'Unknown',
        locationName: bin?.location_name || 'Unknown',
        department: bin?.department || 'Unknown',
        latitude: bin?.latitude,
        longitude: bin?.longitude,
        hourlyData: {},
        totalReports: 0,
        avgFill: 0,
        maxFill: 0,
        highSeverityCount: 0,
        dominantWasteType: {}
      }
    }

    const p = patterns[binId]
    p.totalReports++
    p.avgFill += report.fill_percentage
    p.maxFill = Math.max(p.maxFill, report.fill_percentage)

    if (report.severity === 'high') p.highSeverityCount++

    // Track waste types
    const wt = report.waste_type || 'Mixed Waste'
    p.dominantWasteType[wt] = (p.dominantWasteType[wt] || 0) + 1

    // Track hourly patterns - group into time slots
    const slot = getTimeSlot(hour)
    if (!p.hourlyData[slot]) {
      p.hourlyData[slot] = { count: 0, avgFill: 0, maxFill: 0, totalFill: 0 }
    }
    p.hourlyData[slot].count++
    p.hourlyData[slot].totalFill += report.fill_percentage
    p.hourlyData[slot].maxFill = Math.max(p.hourlyData[slot].maxFill, report.fill_percentage)
  })

  // Calculate averages
  Object.values(patterns).forEach((p) => {
    p.avgFill = p.avgFill / p.totalReports

    // Get dominant waste type
    let maxCount = 0
    let dominant = 'Mixed Waste'
    Object.entries(p.dominantWasteType).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count
        dominant = type
      }
    })
    p.wasteType = dominant

    // Calculate hourly averages
    Object.values(p.hourlyData).forEach((slotData) => {
      slotData.avgFill = slotData.totalFill / slotData.count
    })
  })

  return patterns
}

/**
 * Map an hour to a time slot label
 */
function getTimeSlot(hour) {
  if (hour >= 6 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 14) return 'midday'
  if (hour >= 14 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/**
 * Get display time range for a slot
 */
function getSlotTimeRange(slot) {
  const ranges = {
    morning: { start: '07:00', end: '10:00', label: 'Morning (7 AM - 10 AM)' },
    midday: { start: '10:00', end: '14:00', label: 'Midday (10 AM - 2 PM)' },
    afternoon: { start: '14:00', end: '17:00', label: 'Afternoon (2 PM - 5 PM)' },
    evening: { start: '17:00', end: '20:00', label: 'Evening (5 PM - 8 PM)' },
    night: { start: '20:00', end: '06:00', label: 'Night (8 PM - 6 AM)' }
  }
  return ranges[slot] || ranges.morning
}

/**
 * Analyze how often bins need cleaning
 */
function analyzeCleaningFrequency(reports, completedTasks) {
  const frequency = {}

  // Group reports by bin and day
  reports.forEach((report) => {
    const binId = report.bin_id
    const day = new Date(report.created_at).toISOString().split('T')[0]

    if (!frequency[binId]) {
      frequency[binId] = { daysReported: new Set(), totalHighSeverity: 0, avgTimeBetween: 0 }
    }
    frequency[binId].daysReported.add(day)
    if (report.severity === 'high') frequency[binId].totalHighSeverity++
  })

  // Calculate cleaning needed per day
  Object.entries(frequency).forEach(([binId, data]) => {
    const daysActive = data.daysReported.size
    data.cleaningsPerDay = daysActive > 0 ? Math.ceil(data.totalHighSeverity / daysActive) : 1
    data.cleaningsPerDay = Math.max(data.cleaningsPerDay, 1) // At least once
    data.urgencyScore = data.totalHighSeverity / Math.max(daysActive, 1)
  })

  return frequency
}

/**
 * Generate specific time slots for today's cleaning schedule
 */
function generateTimeSlots(binPatterns, cleaningFrequency) {
  const schedule = []
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  Object.values(binPatterns).forEach((pattern) => {
    const freq = cleaningFrequency[pattern.binId]
    if (!freq) return

    // Find peak slots
    const slots = Object.entries(pattern.hourlyData)
      .sort((a, b) => b[1].avgFill - a[1].avgFill)

    if (slots.length === 0) return

    // Determine priority based on historical severity
    let priority = 3
    if (pattern.highSeverityCount > 3 || pattern.avgFill > 70) {
      priority = 1 // High priority
    } else if (pattern.highSeverityCount > 1 || pattern.avgFill > 50) {
      priority = 2 // Medium priority
    }

    // Schedule cleaning BEFORE peak fill times
    slots.forEach(([slot, data]) => {
      if (data.avgFill < 40) return // Skip low-fill slots

      const timeRange = getSlotTimeRange(slot)

      // Calculate predicted fill for today at this time
      const predictedFill = Math.min(Math.round(data.avgFill * 1.1), 100) // 10% buffer

      // Calculate confidence based on data consistency
      const confidence = Math.min(
        50 + (data.count * 10) + (pattern.totalReports * 2),
        95
      )

      schedule.push({
        binId: pattern.binId,
        binCode: pattern.binCode,
        locationName: pattern.locationName,
        department: pattern.department,
        latitude: pattern.latitude,
        longitude: pattern.longitude,
        timeSlot: slot,
        timeRange: timeRange,
        scheduledTime: timeRange.start,
        predictedFill: predictedFill,
        historicalAvgFill: Math.round(data.avgFill),
        historicalMaxFill: Math.round(data.maxFill),
        wasteType: pattern.wasteType,
        priority: priority,
        confidence: confidence,
        dataPoints: data.count,
        reason: `Bin historically reaches ${Math.round(data.avgFill)}% fill during ${timeRange.label.split('(')[0].trim()} (max: ${Math.round(data.maxFill)}%). Schedule cleaning before this time.`
      })
    })
  })

  // Sort by priority (high first), then by time slot
  const slotOrder = { morning: 1, midday: 2, afternoon: 3, evening: 4, night: 5 }
  schedule.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return (slotOrder[a.timeSlot] || 5) - (slotOrder[b.timeSlot] || 5)
  })

  return schedule
}

/**
 * Calculate schedule statistics
 */
function calculateScheduleStats(schedule, reports) {
  const uniqueBins = new Set(schedule.map((s) => s.binId))
  const slotCounts = {}

  schedule.forEach((s) => {
    slotCounts[s.timeSlot] = (slotCounts[s.timeSlot] || 0) + 1
  })

  const avgConfidence = schedule.length > 0
    ? Math.round(schedule.reduce((sum, s) => sum + s.confidence, 0) / schedule.length)
    : 0

  return {
    totalBins: uniqueBins.size,
    totalSlots: schedule.length,
    highPriority: schedule.filter((s) => s.priority === 1).length,
    mediumPriority: schedule.filter((s) => s.priority === 2).length,
    lowPriority: schedule.filter((s) => s.priority === 3).length,
    slotBreakdown: slotCounts,
    avgConfidence,
    dataPointsAnalyzed: reports.length,
    daysAnalyzed: 5
  }
}

/**
 * Auto-create scheduled tasks from generated schedule and assign to workers
 * @param {Array} schedule - Generated schedule items
 * @returns {Promise<Object>} Result with created task count
 */
export async function createScheduledTasks(schedule) {
  try {
    console.log(`📋 Creating ${schedule.length} scheduled tasks...`)

    // Get available workers
    const { data: workers, error: workersError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'worker')

    if (workersError) throw workersError

    if (!workers || workers.length === 0) {
      console.warn('⚠️ No workers found for task assignment')
      return { created: 0, skipped: 0, error: 'No workers available' }
    }

    let created = 0
    let skipped = 0
    let workerIndex = 0

    for (const item of schedule) {
      // Check if task already exists for this bin today
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: existingTask } = await supabase
        .from('cleaning_tasks')
        .select('id')
        .eq('bin_id', item.binId)
        .in('status', ['pending', 'assigned', 'in_progress'])
        .gte('created_at', todayStart.toISOString())
        .limit(1)

      if (existingTask && existingTask.length > 0) {
        skipped++
        continue
      }

      // Round-robin assign to workers
      const assignedWorker = workers[workerIndex % workers.length]
      workerIndex++

      // Create the scheduled task
      const { error: insertError } = await supabase.from('cleaning_tasks').insert({
        bin_id: item.binId,
        assigned_worker_id: assignedWorker.id,
        status: 'assigned',
        priority: item.priority,
        is_predicted: true,
        predicted_overflow_time: getScheduledDateTime(item.scheduledTime),
        assigned_at: new Date().toISOString(),
        notes: `[SCHEDULED] ${item.timeRange.label} | Predicted fill: ${item.predictedFill}% | ${item.reason}`
      })

      if (insertError) {
        console.error(`Failed to create task for ${item.binCode}:`, insertError)
      } else {
        created++
        console.log(`✅ Scheduled: ${item.binCode} at ${item.timeRange.label} → ${assignedWorker.full_name}`)
      }
    }

    console.log(`📋 Schedule applied: ${created} tasks created, ${skipped} skipped (already exist)`)

    return { created, skipped, totalWorkers: workers.length }
  } catch (error) {
    console.error('❌ Error creating scheduled tasks:', error)
    return { created: 0, skipped: 0, error: error.message }
  }
}

/**
 * Convert a time string like "07:00" to today's ISO datetime
 */
function getScheduledDateTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const dt = new Date()
  dt.setHours(hours, minutes, 0, 0)
  return dt.toISOString()
}

/**
 * Calculate fill rate and predict overflow
 * @param {string} binId - Bin ID
 * @returns {Promise<Object>} Prediction data
 */
export async function predictBinOverflow(binId) {
  try {
    // Fetch recent reports for this bin (last 7 days)
    const { data: reports, error } = await supabase
      .from('waste_reports')
      .select('fill_percentage, created_at')
      .eq('bin_id', binId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    if (!reports || reports.length < 2) {
      return null // Not enough data for prediction
    }

    // Calculate fill rate using linear regression
    const fillRate = calculateFillRate(reports)

    if (fillRate <= 0) {
      return null // Bin is not filling up or getting emptier
    }

    // Get current fill percentage
    const currentFill = reports[reports.length - 1].fill_percentage

    // Calculate hours until overflow (100%)
    const remainingPercentage = 100 - currentFill
    const hoursToOverflow = remainingPercentage / fillRate

    // Calculate predicted overflow time
    const now = new Date()
    const predictedOverflowTime = new Date(now.getTime() + hoursToOverflow * 60 * 60 * 1000)

    // Calculate confidence based on data consistency
    const confidence = calculatePredictionConfidence(reports, fillRate)

    const prediction = {
      binId,
      currentFillPercentage: currentFill,
      fillRatePerHour: fillRate,
      hoursToOverflow,
      predictedOverflowTime,
      confidence,
      dataPointsUsed: reports.length
    }

    // Store prediction in database
    await supabase.from('waste_predictions').insert({
      bin_id: binId,
      current_fill_percentage: currentFill,
      predicted_fill_percentage: 100,
      fill_rate_per_hour: fillRate,
      predicted_overflow_time: predictedOverflowTime.toISOString(),
      confidence_score: confidence,
      data_points_used: reports.length
    })

    return prediction
  } catch (error) {
    console.error('Error predicting overflow:', error)
    return null
  }
}

/**
 * Calculate fill rate using linear regression
 * @param {Array} reports - Array of reports with fill_percentage and created_at
 * @returns {number} Fill rate per hour
 */
function calculateFillRate(reports) {
  if (reports.length < 2) return 0

  const dataPoints = reports.map((report) => ({
    x: new Date(report.created_at).getTime(),
    y: report.fill_percentage
  }))

  // Calculate linear regression
  const n = dataPoints.length
  const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0)
  const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0)
  const sumXY = dataPoints.reduce((sum, point) => sum + point.x * point.y, 0)
  const sumXX = dataPoints.reduce((sum, point) => sum + point.x * point.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

  // Convert slope from milliseconds to hours
  const fillRatePerHour = slope * (60 * 60 * 1000)

  return Math.max(fillRatePerHour, 0)
}

/**
 * Calculate prediction confidence based on data consistency
 * @param {Array} reports - Historical reports
 * @param {number} fillRate - Calculated fill rate
 * @returns {number} Confidence score (0-100)
 */
function calculatePredictionConfidence(reports, fillRate) {
  if (reports.length < 3) return 50

  // Calculate variance in fill rate
  const fillRates = []
  for (let i = 1; i < reports.length; i++) {
    const timeDiff = new Date(reports[i].created_at) - new Date(reports[i - 1].created_at)
    const fillDiff = reports[i].fill_percentage - reports[i - 1].fill_percentage
    const rate = (fillDiff / timeDiff) * (60 * 60 * 1000) // per hour
    if (rate > 0) fillRates.push(rate)
  }

  if (fillRates.length === 0) return 30

  const mean = fillRates.reduce((sum, rate) => sum + rate, 0) / fillRates.length
  const variance = fillRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / fillRates.length
  const stdDev = Math.sqrt(variance)

  // Lower variance = higher confidence
  const coefficientOfVariation = stdDev / mean
  let confidence = 100 - coefficientOfVariation * 100

  // Boost confidence with more data points
  confidence += Math.min(reports.length * 2, 20)

  return Math.max(Math.min(confidence, 95), 30)
}

/**
 * Check all bins and predict overflows
 * Should be run periodically (e.g., every hour)
 * @returns {Promise<Array>} Array of predictions
 */
export async function checkAllBinsPredictions() {
  try {
    // Get all active bins
    const { data: bins, error } = await supabase
      .from('bins')
      .select('id, bin_code, current_fill_percentage')
      .eq('is_active', true)

    if (error) throw error

    const predictions = []

    for (const bin of bins) {
      // Only predict for bins that are filling up (> 30%)
      if (bin.current_fill_percentage > 30) {
        const prediction = await predictBinOverflow(bin.id)

        if (prediction && prediction.hoursToOverflow < 24 && prediction.confidence > 50) {
          predictions.push({
            ...prediction,
            binCode: bin.bin_code
          })

          // Update bin severity to predicted_overflow
          await supabase
            .from('bins')
            .update({ current_severity: 'predicted_overflow' })
            .eq('id', bin.id)

          // Create preventive cleaning task if not exists
          await createPreventiveTask(bin.id, prediction)
        }
      }
    }

    return predictions
  } catch (error) {
    console.error('Error checking predictions:', error)
    return []
  }
}

/**
 * Create preventive cleaning task
 * @param {string} binId - Bin ID
 * @param {Object} prediction - Prediction data
 */
async function createPreventiveTask(binId, prediction) {
  try {
    // Check if task already exists
    const { data: existingTask } = await supabase
      .from('cleaning_tasks')
      .select('id')
      .eq('bin_id', binId)
      .in('status', ['pending', 'assigned', 'in_progress'])
      .single()

    if (existingTask) {
      return // Task already exists
    }

    // Create new preventive task
    await supabase.from('cleaning_tasks').insert({
      bin_id: binId,
      status: 'pending',
      priority: 2, // High priority
      is_predicted: true,
      predicted_overflow_time: prediction.predictedOverflowTime,
      notes: `Predicted overflow in ${Math.round(prediction.hoursToOverflow)} hours (${prediction.confidence.toFixed(0)}% confidence)`
    })

    console.log(`Created preventive task for bin ${binId}`)
  } catch (error) {
    console.error('Error creating preventive task:', error)
  }
}

/**
 * Get waste trends for analytics
 * @param {string} department - Optional department filter
 * @param {number} days - Number of days to analyze
 * @returns {Promise<Object>} Trend data
 */
export async function getWasteTrends(department = null, days = 7) {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    let query = supabase
      .from('waste_reports')
      .select('fill_percentage, severity, created_at, bins(department)')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true })

    if (department) {
      query = query.eq('bins.department', department)
    }

    const { data: reports, error } = await query

    if (error) throw error

    // Group by day
    const trendsByDay = {}
    reports.forEach((report) => {
      const day = new Date(report.created_at).toISOString().split('T')[0]
      if (!trendsByDay[day]) {
        trendsByDay[day] = {
          date: day,
          reports: 0,
          avgFill: 0,
          highSeverity: 0
        }
      }
      trendsByDay[day].reports++
      trendsByDay[day].avgFill += report.fill_percentage
      if (report.severity === 'high') trendsByDay[day].highSeverity++
    })

    // Calculate averages
    const trends = Object.values(trendsByDay).map((day) => ({
      ...day,
      avgFill: day.avgFill / day.reports
    }))

    return trends
  } catch (error) {
    console.error('Error getting waste trends:', error)
    return []
  }
}
