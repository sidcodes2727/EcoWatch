import { supabase } from './supabase'

/**
 * Waste Prediction Engine
 * Uses historical data to predict overflow times
 */

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
