/**
 * Validation utilities for weather data inputs.
 * Enforces data integrity before API calls and database writes.
 */

/**
 * Validates that a date range is coherent.
 * @param {string} startDate - ISO date string for range start.
 * @param {string} endDate - ISO date string for range end.
 * @returns {{ valid: boolean, error?: string, start?: Date, end?: Date }}
 */
function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { valid: false, error: 'Both start date and end date are required.' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return { valid: false, error: 'Start date is not a valid date format.' };
  }

  if (isNaN(end.getTime())) {
    return { valid: false, error: 'End date is not a valid date format.' };
  }

  if (end < start) {
    return { valid: false, error: 'End date must be on or after the start date.' };
  }

  // Limit range to 30 days to prevent abuse
  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 30) {
    return { valid: false, error: 'Date range cannot exceed 30 days.' };
  }

  return { valid: true, start, end };
}

/**
 * Validates location input string.
 * @param {string} location - User-provided location string.
 * @returns {{ valid: boolean, error?: string, type?: string }}
 */
function validateLocation(location) {
  if (!location || typeof location !== 'string') {
    return { valid: false, error: 'Location is required and must be a string.' };
  }

  const trimmed = location.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Location cannot be empty.' };
  }

  if (trimmed.length > 200) {
    return { valid: false, error: 'Location must be under 200 characters.' };
  }

  // Detect coordinates format (lat,lon)
  if (isValidCoordinates(trimmed)) {
    return { valid: true, type: 'coordinates' };
  }

  // Detect ZIP/postal code (US 5-digit or 5+4)
  if (/^\d{5}(-\d{4})?$/.test(trimmed)) {
    return { valid: true, type: 'zip' };
  }

  // General text (city name, landmark, etc.)
  return { valid: true, type: 'name' };
}

/**
 * Checks if a string is valid GPS coordinates.
 * Accepts formats: "lat,lon" or "lat, lon"
 * @param {string} str - Input string.
 * @returns {boolean}
 */
function isValidCoordinates(str) {
  const coordRegex = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
  if (!coordRegex.test(str)) return false;

  const parts = str.split(',').map(s => parseFloat(s.trim()));
  const [lat, lon] = parts;

  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Parses coordinate string into lat/lon object.
 * @param {string} str - Coordinate string "lat,lon".
 * @returns {{ lat: number, lon: number } | null}
 */
function parseCoordinates(str) {
  if (!isValidCoordinates(str)) return null;
  const parts = str.split(',').map(s => parseFloat(s.trim()));
  return { lat: parts[0], lon: parts[1] };
}

/**
 * Validates update fields to prevent incoherent mutations.
 * @param {object} updates - Fields being updated.
 * @returns {{ valid: boolean, error?: string }}
 */
function validateUpdateFields(updates) {
  if (updates.temperature !== undefined) {
    const temp = parseFloat(updates.temperature);
    if (isNaN(temp) || temp < -100 || temp > 70) {
      return { valid: false, error: 'Temperature must be a number between -100 and 70°C.' };
    }
  }

  if (updates.humidity !== undefined) {
    const hum = parseFloat(updates.humidity);
    if (isNaN(hum) || hum < 0 || hum > 100) {
      return { valid: false, error: 'Humidity must be a number between 0 and 100%.' };
    }
  }

  if (updates.windSpeed !== undefined) {
    const ws = parseFloat(updates.windSpeed);
    if (isNaN(ws) || ws < 0) {
      return { valid: false, error: 'Wind speed must be a non-negative number.' };
    }
  }

  if (updates.condition !== undefined) {
    if (typeof updates.condition !== 'string' || updates.condition.trim().length === 0) {
      return { valid: false, error: 'Condition must be a non-empty string.' };
    }
  }

  if (updates.location !== undefined) {
    const locVal = validateLocation(updates.location);
    if (!locVal.valid) return locVal;
  }

  return { valid: true };
}

module.exports = {
  validateDateRange,
  validateLocation,
  isValidCoordinates,
  parseCoordinates,
  validateUpdateFields
};
