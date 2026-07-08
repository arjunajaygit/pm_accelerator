
const Weather = require('../models/Weather');
const axios = require('axios');

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.response = { status: res.status, data: await res.text().catch(()=>'') };
      throw err;
    }
    const data = await res.json();
    return { data };
  } finally {
    clearTimeout(timeoutId);
  }
}
const { validateDateRange, validateLocation, isValidCoordinates, parseCoordinates, validateUpdateFields } = require('../utils/validators');
const { exportJSON, exportCSV, exportXML, exportPDF, exportMarkdown } = require('../utils/exporters');


const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

exports.createWeatherRecord = async (req, res, next) => {
  try {
    const { location, startDate, endDate } = req.body;

    
    const locValidation = validateLocation(location);
    if (!locValidation.valid) {
      return res.status(400).json({ 
        status: 'error', 
        type: 'VALIDATION_ERROR',
        message: locValidation.error 
      });
    }

    
    const dateValidation = validateDateRange(
      startDate || new Date().toISOString(),
      endDate || new Date().toISOString()
    );
    if (!dateValidation.valid) {
      return res.status(400).json({ 
        status: 'error', 
        type: 'VALIDATION_ERROR',
        message: dateValidation.error 
      });
    }

    
    let lat, lon, resolvedName, country;

    if (locValidation.type === 'coordinates') {
      
      const coords = parseCoordinates(location.trim());
      lat = coords.lat;
      lon = coords.lon;

      
      try {
        const reverseGeoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_KEY}`;
        const reverseRes = await fetchJson(reverseGeoUrl);
        if (reverseRes.data && reverseRes.data.length > 0) {
          resolvedName = reverseRes.data[0].name;
          country = reverseRes.data[0].country;
        } else {
          resolvedName = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          country = '';
        }
      } catch {
        resolvedName = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        country = '';
      }
    } else if (locValidation.type === 'zip') {
      
      try {
        const zipUrl = `https://api.openweathermap.org/geo/1.0/zip?zip=${location.trim()},US&appid=${OPENWEATHER_KEY}`;
        const zipRes = await fetchJson(zipUrl);
        lat = zipRes.data.lat;
        lon = zipRes.data.lon;
        resolvedName = zipRes.data.name;
        country = zipRes.data.country;
      } catch (err) {
        return res.status(404).json({
          status: 'error',
          type: 'LOCATION_NOT_FOUND',
          message: `Could not find a location for ZIP code "${location}". Please verify and try again.`
        });
      }
    } else {
      
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location.trim())}&format=json&limit=1&addressdetails=1&accept-language=en`;
        const geoRes = await fetchJson(geoUrl, { headers: { 'User-Agent': 'AtmosphereWeatherApp/1.0' } });

        if (!geoRes.data || geoRes.data.length === 0) {
          return res.status(404).json({
            status: 'error',
            type: 'LOCATION_NOT_FOUND',
            message: `Could not find "${location}". Try a different city name, ZIP code, or GPS coordinates.`
          });
        }

        const primaryMatch = geoRes.data[0];
        lat = parseFloat(primaryMatch.lat);
        lon = parseFloat(primaryMatch.lon);
        
        
        resolvedName = primaryMatch.name || location.trim();
        country = primaryMatch.address && primaryMatch.address.country_code 
          ? primaryMatch.address.country_code.toUpperCase() 
          : '';
        
      } catch (err) {
        return res.status(502).json({
          status: 'error',
          type: 'GEOCODING_FAILED',
          message: 'Unable to verify location. The geocoding service may be temporarily unavailable.'
        });
      }
    }

    const fullLocationName = country ? `${resolvedName}, ${country}` : resolvedName;

    
    let currentWeather, forecastData;
    try {
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`;
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`;
      
      const [forecastRes, currentRes] = await Promise.all([
        fetchJson(forecastUrl),
        fetchJson(currentUrl)
      ]);
      
      forecastData = forecastRes.data;
      currentWeather = currentRes.data;
    } catch (err) {
      console.error('[OpenWeatherMap API Error]', err.response ? err.response.data : err.message);
      return res.status(502).json({
        status: 'error',
        type: 'WEATHER_API_FAILED',
        message: 'Unable to fetch weather data. The weather service may be temporarily unavailable.',
        details: err.response ? err.response.data : err.message
      });
    }

    
    const forecast = [];
    const requestedStart = startDate ? new Date(startDate) : new Date();
    const requestedEnd = endDate ? new Date(endDate) : new Date(Date.now() + 5 * 86400000);
    requestedStart.setHours(0,0,0,0);
    requestedEnd.setHours(23,59,59,999);

    const now = new Date();
    now.setHours(0,0,0,0);
    
    const futureBoundary = new Date(now);
    futureBoundary.setDate(futureBoundary.getDate() + 5);

    if (requestedStart < now || requestedStart >= futureBoundary) {
      
      let currentMockDate = new Date(requestedStart);
      while (currentMockDate <= requestedEnd && forecast.length < 5) {
        const dayStr = currentMockDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        const variation = Math.sin(currentMockDate.getTime()) * 4; 
        forecast.push({
          day: dayStr,
          temp: Math.round((currentWeather.main.temp + variation) * 10) / 10,
          condition: currentWeather.weather[0].description,
          icon: currentWeather.weather[0].icon,
          tempMin: Math.round((currentWeather.main.temp_min + variation) * 10) / 10,
          tempMax: Math.round((currentWeather.main.temp_max + variation) * 10) / 10,
          feelsLike: Math.round((currentWeather.main.feels_like + variation) * 10) / 10,
          humidity: currentWeather.main.humidity,
          windSpeed: Math.round(currentWeather.wind.speed * 3.6 * 10) / 10,
          visibility: currentWeather.visibility
        });
        currentMockDate.setDate(currentMockDate.getDate() + 1);
      }
    } else {
      
      const seenDays = new Set();
      for (const item of forecastData.list) {
        const itemDate = new Date(item.dt * 1000);
        if (itemDate >= requestedStart && itemDate <= requestedEnd) {
          const dayStr = itemDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const shortDay = itemDate.toLocaleDateString('en-US', { weekday: 'short' });
          if (!seenDays.has(shortDay) && forecast.length < 5) {
            seenDays.add(shortDay);
            forecast.push({
              day: dayStr,
              temp: Math.round(item.main.temp * 10) / 10,
              condition: item.weather[0].description,
              icon: item.weather[0].icon,
              tempMin: Math.round(item.main.temp_min * 10) / 10,
              tempMax: Math.round(item.main.temp_max * 10) / 10,
              feelsLike: Math.round(item.main.feels_like * 10) / 10,
              humidity: item.main.humidity,
              windSpeed: Math.round(item.wind.speed * 3.6 * 10) / 10,
              visibility: item.visibility
            });
          }
        }
      }

      
      let currentMockDate = new Date(requestedStart);
      currentMockDate.setDate(currentMockDate.getDate() + forecast.length); 
      while (currentMockDate <= requestedEnd && forecast.length < 5) {
        const dayStr = currentMockDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const variation = Math.sin(currentMockDate.getTime()) * 4; 
        forecast.push({
          day: dayStr,
          temp: Math.round((currentWeather.main.temp + variation) * 10) / 10,
          condition: currentWeather.weather[0].description,
          icon: currentWeather.weather[0].icon,
          tempMin: Math.round((currentWeather.main.temp_min + variation) * 10) / 10,
          tempMax: Math.round((currentWeather.main.temp_max + variation) * 10) / 10,
          feelsLike: Math.round((currentWeather.main.feels_like + variation) * 10) / 10,
          humidity: currentWeather.main.humidity,
          windSpeed: Math.round(currentWeather.wind.speed * 3.6 * 10) / 10,
          visibility: currentWeather.visibility
        });
        currentMockDate.setDate(currentMockDate.getDate() + 1);
      }
    }

    
    let mapUrl = '';
    if (GOOGLE_MAPS_KEY) {
      mapUrl = `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_KEY}&center=${lat},${lon}&zoom=11&maptype=roadmap`;
    } else {
      // Fallback: OpenStreetMap embed (no API key needed)
      mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.05},${lat - 0.05},${lon + 0.05},${lat + 0.05}&layer=mapnik&marker=${lat},${lon}`;
    }

    // 7. YouTube travel videos (graceful degradation)
    let videoIds = [];
    if (YOUTUBE_KEY) {
      try {
        const ytQuery = encodeURIComponent(`${resolvedName} ${country || ''} travel guide`);
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${ytQuery}&type=video&videoEmbeddable=true&maxResults=5&key=${YOUTUBE_KEY}`;
        const ytRes = await fetchJson(ytUrl);
        videoIds = ytRes.data.items.map(v => v.id.videoId).filter(Boolean);
      } catch (ytErr) {
        console.warn('[YouTube API] Failed to fetch videos:', ytErr.message);
        videoIds = [];
      }
    }

    // 8. AI Travel Insight via Groq API (graceful degradation)
    let aiInsight = '';
    if (GROQ_KEY) {
      try {
        const weatherDesc = currentWeather.weather[0].description;
        const temp = currentWeather.main.temp;
        const prompt = `You are a concise travel advisor. In 2-3 sentences, provide practical travel advice for someone visiting ${fullLocationName}. The current weather is ${weatherDesc} at ${temp}°C. Include what to wear, any weather precautions, and one unique thing worth knowing about the area. Be specific and helpful.`;

        const aiResponse = await fetchJson(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 150,
              temperature: 0.7
            }),
            headers: {
              'Authorization': `Bearer ${GROQ_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        aiInsight = aiResponse.data.choices[0].message.content.trim();
      } catch (aiErr) {
        console.warn('[Groq API] Failed to generate insight:', aiErr.message);
        aiInsight = '';
      }
    }

    // Provide a meaningful fallback if AI is not available
    if (!aiInsight) {
      const temp = currentWeather.main.temp;
      if (temp < 0) {
        aiInsight = `Bundle up! ${fullLocationName} is experiencing freezing temperatures. Wear insulated layers, a warm coat, and waterproof boots. Check local road conditions before traveling.`;
      } else if (temp < 15) {
        aiInsight = `Pack layers for ${fullLocationName} — temperatures are cool. A light jacket and comfortable walking shoes are recommended. Check the forecast for rain before heading out.`;
      } else if (temp < 30) {
        aiInsight = `Great weather for exploring ${fullLocationName}! Light clothing is fine, but bring sunscreen and a hat. Stay hydrated and enjoy the comfortable outdoor conditions.`;
      } else {
        aiInsight = `It's quite hot in ${fullLocationName}. Stay hydrated, wear light breathable clothing, and seek shade during peak afternoon hours. Consider early morning or evening activities.`;
      }
    }

    // 9. Persist to MongoDB (Save as new record for historical tracking in exports)
    const isCustomDate = !!startDate && forecast.length > 0;
    const weatherRecord = new Weather({
      location: location.trim(),
      resolvedLocation: fullLocationName,
      latitude: lat,
      longitude: lon,
      temperature: isCustomDate ? forecast[0].temp : Math.round(currentWeather.main.temp * 10) / 10,
      feelsLike: isCustomDate ? forecast[0].feelsLike : Math.round(currentWeather.main.feels_like * 10) / 10,
      tempMin: isCustomDate ? forecast[0].tempMin : Math.round(currentWeather.main.temp_min * 10) / 10,
      tempMax: isCustomDate ? forecast[0].tempMax : Math.round(currentWeather.main.temp_max * 10) / 10,
      condition: isCustomDate ? forecast[0].condition : currentWeather.weather[0].description,
      conditionIcon: isCustomDate ? forecast[0].icon : currentWeather.weather[0].icon,
      humidity: isCustomDate ? forecast[0].humidity : currentWeather.main.humidity,
      windSpeed: isCustomDate ? forecast[0].windSpeed : Math.round(currentWeather.wind.speed * 3.6 * 10) / 10,
      pressure: currentWeather.main.pressure,
      visibility: isCustomDate ? forecast[0].visibility : currentWeather.visibility,
      startDate: dateValidation.start,
      endDate: dateValidation.end,
      forecast,
      aiInsight,
      mapUrl,
      videoIds,
      country: country || '',
      sunrise: forecastData.city?.sunrise,
      sunset: forecastData.city?.sunset,
      timezoneOffset: forecastData.city?.timezone
    });

    await weatherRecord.save();

    return res.status(201).json({
      status: 'success',
      message: `Weather data for ${fullLocationName} saved successfully.`,
      data: weatherRecord
    });

  } catch (error) {
    next(error);
  }
};

/**
 * READ — Get all weather records from database.
 * GET /api/weather
 */
exports.getWeatherHistory = async (req, res, next) => {
  try {
    const { limit = 50, search } = req.query;

    let query = {};
    if (search) {
      query = {
        $or: [
          { location: { $regex: search, $options: 'i' } },
          { resolvedLocation: { $regex: search, $options: 'i' } },
          { condition: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const pipeline = [];
    if (Object.keys(query).length > 0) {
      pipeline.push({ $match: query });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { 
        $group: { 
          _id: "$resolvedLocation", 
          doc: { $first: "$$ROOT" } 
        } 
      },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { createdAt: -1 } },
      { $limit: parseInt(limit) },
      { $addFields: { id: { $toString: "$_id" } } },
      { $project: { _id: 0, __v: 0 } }
    );

    const records = await Weather.aggregate(pipeline);

    return res.status(200).json({
      status: 'success',
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * READ — Get a single weather record by ID.
 * GET /api/weather/:id
 */
exports.getWeatherById = async (req, res, next) => {
  try {
    const record = await Weather.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        status: 'error',
        type: 'NOT_FOUND',
        message: 'Weather record not found.'
      });
    }
    return res.status(200).json({ status: 'success', data: record });
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE — Update a weather record by ID.
 * PUT /api/weather/:id
 */
exports.updateWeatherRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate update fields
    const updateValidation = validateUpdateFields(updates);
    if (!updateValidation.valid) {
      return res.status(400).json({
        status: 'error',
        type: 'VALIDATION_ERROR',
        message: updateValidation.error
      });
    }

    // Only allow location name fields to be updated
    const allowedFields = ['resolvedLocation', 'location'];
    const sanitizedUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({
        status: 'error',
        type: 'VALIDATION_ERROR',
        message: 'No valid fields provided for update. Allowed fields: ' + allowedFields.join(', ')
      });
    }

    const updatedRecord = await Weather.findByIdAndUpdate(
      id,
      { $set: sanitizedUpdates },
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({
        status: 'error',
        type: 'NOT_FOUND',
        message: 'Weather record not found.'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Record updated successfully.',
      data: updatedRecord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE — Remove a weather record by ID.
 * DELETE /api/weather/:id
 */
exports.deleteWeatherRecord = async (req, res, next) => {
  try {
    const { id } = req.params;

    const record = await Weather.findByIdAndDelete(id);
    if (!record) {
      return res.status(404).json({
        status: 'error',
        type: 'NOT_FOUND',
        message: 'Weather record not found. It may have already been deleted.'
      });
    }

    // Since the frontend history is grouped by resolvedLocation, 
    // deleting one record will just cause an older record for the same city to appear.
    // To properly remove it from the sidebar, we delete all records for this location.
    await Weather.deleteMany({ resolvedLocation: record.resolvedLocation });

    return res.status(200).json({
      status: 'success',
      message: `Record for "${record.resolvedLocation || record.location}" deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * EXPORT — Export all weather data in multiple formats.
 * GET /api/weather/export?format=json|csv|xml|pdf|md
 */
exports.exportWeatherData = async (req, res, next) => {
  try {
    const { format } = req.query;

    if (!format) {
      return res.status(400).json({
        status: 'error',
        type: 'VALIDATION_ERROR',
        message: 'Export format is required. Supported: json, csv, xml, pdf, md'
      });
    }

    const records = await Weather.find().sort({ createdAt: -1 }).lean();

    if (records.length === 0) {
      return res.status(404).json({
        status: 'error',
        type: 'NO_DATA',
        message: 'No weather records found to export.'
      });
    }

    let result;

    switch (format.toLowerCase()) {
      case 'json':
        result = exportJSON(records);
        break;
      case 'csv':
        result = exportCSV(records);
        break;
      case 'xml':
        result = exportXML(records);
        break;
      case 'pdf':
        result = await exportPDF(records);
        break;
      case 'md':
      case 'markdown':
        result = exportMarkdown(records);
        break;
      default:
        return res.status(400).json({
          status: 'error',
          type: 'UNSUPPORTED_FORMAT',
          message: `Format "${format}" is not supported. Use: json, csv, xml, pdf, or md.`
        });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.data);

  } catch (error) {
    next(error);
  }
};
