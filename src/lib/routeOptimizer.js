/**
 * Route Optimization using Nearest Neighbor Algorithm
 * Optimized for campus waste collection
 */

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Optimize route using Nearest Neighbor Algorithm
 * @param {Array} bins - Array of bin objects with {id, latitude, longitude, priority}
 * @param {Object} startLocation - Starting location {latitude, longitude}
 * @returns {Object} Optimized route with sequence and total distance
 */
export function optimizeRoute(bins, startLocation = null) {
  if (!bins || bins.length === 0) {
    return {
      sequence: [],
      totalDistance: 0,
      estimatedTime: 0
    }
  }

  // Single bin - no optimization needed
  if (bins.length === 1) {
    const distance = startLocation
      ? calculateDistance(
          startLocation.latitude,
          startLocation.longitude,
          bins[0].latitude,
          bins[0].longitude
        )
      : 0

    return {
      sequence: [bins[0]],
      totalDistance: distance,
      estimatedTime: calculateWalkingTime(distance)
    }
  }

  // Sort bins by priority first (higher priority = lower number)
  const sortedBins = [...bins].sort((a, b) => {
    const priorityA = a.priority || 999
    const priorityB = b.priority || 999
    return priorityA - priorityB
  })

  // Start with highest priority bin
  const unvisited = [...sortedBins]
  const route = []
  let currentLocation = startLocation || {
    latitude: unvisited[0].latitude,
    longitude: unvisited[0].longitude
  }
  let totalDistance = 0

  // Nearest Neighbor Algorithm
  while (unvisited.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Infinity

    // Find nearest unvisited bin
    unvisited.forEach((bin, index) => {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        bin.latitude,
        bin.longitude
      )

      // Weight by priority: higher priority (lower number) reduces effective distance
      const priorityWeight = (bin.priority || 999) / 1000
      const weightedDistance = distance * priorityWeight

      if (weightedDistance < nearestDistance) {
        nearestDistance = distance // Use actual distance for total
        nearestIndex = index
      }
    })

    // Add nearest bin to route
    const nextBin = unvisited[nearestIndex]
    route.push(nextBin)
    totalDistance += nearestDistance

    // Update current location
    currentLocation = {
      latitude: nextBin.latitude,
      longitude: nextBin.longitude
    }

    // Remove from unvisited
    unvisited.splice(nearestIndex, 1)
  }

  return {
    sequence: route,
    totalDistance: Math.round(totalDistance),
    estimatedTime: calculateWalkingTime(totalDistance)
  }
}

/**
 * Calculate estimated walking time
 * Average walking speed: 5 km/h
 * Add 5 minutes per bin for cleaning
 * @param {number} distanceMeters - Total distance in meters
 * @returns {number} Estimated time in minutes
 */
export function calculateWalkingTime(distanceMeters) {
  const walkingSpeedKmh = 5
  const walkingSpeedMs = (walkingSpeedKmh * 1000) / 60 // meters per minute
  const walkingTime = distanceMeters / walkingSpeedMs
  return Math.ceil(walkingTime)
}

/**
 * Calculate cleaning time based on number of bins
 * @param {number} binCount - Number of bins
 * @returns {number} Cleaning time in minutes
 */
export function calculateCleaningTime(binCount) {
  const minutesPerBin = 5
  return binCount * minutesPerBin
}

/**
 * Get total estimated completion time
 * @param {number} distanceMeters - Total walking distance
 * @param {number} binCount - Number of bins
 * @returns {number} Total time in minutes
 */
export function getTotalEstimatedTime(distanceMeters, binCount) {
  return calculateWalkingTime(distanceMeters) + calculateCleaningTime(binCount)
}

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(2)}km`
}

/**
 * Format time for display
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time string
 */
export function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}min`
}

/**
 * Find nearest bin to a location
 * @param {Object} location - Current location {latitude, longitude}
 * @param {Array} bins - Array of bins
 * @returns {Object} Nearest bin with distance
 */
export function findNearestBin(location, bins) {
  if (!bins || bins.length === 0) return null

  let nearest = null
  let minDistance = Infinity

  bins.forEach((bin) => {
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      bin.latitude,
      bin.longitude
    )

    if (distance < minDistance) {
      minDistance = distance
      nearest = { ...bin, distance }
    }
  })

  return nearest
}
