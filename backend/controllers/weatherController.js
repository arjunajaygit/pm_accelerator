

const Weather = require('../models/Weather');
const { fetchAndBuildWeatherData } = require('../utils/weatherHelper');
const axios = require('axios');
axios.defaults.headers.common['Accept-Encoding'] = 'gzip,deflate';
axios.defaults.headers.common['Connection'] = 'close';
const { validateDateRange, validateLocation, isValidCoordinates, parseCoordinates, validateUpdateFields } = require('../utils/validators');
const { exportJSON, exportCSV, exportXML, exportPDF, exportMarkdown } = require('../utils/exporters');


const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;


exports.createWeatherRecord = async (req, res, next) => {
  try {
    const { location, startDate, endDate } = req.body;
    
    const result = await fetchAndBuildWeatherData(location, startDate, endDate);
    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const weatherRecord = new Weather(result.data);
    await weatherRecord.save();

    return res.status(201).json({
      status: 'success',
      message: `Weather data for ${result.data.resolvedLocation} saved successfully.`,
      data: weatherRecord
    });

  } catch (error) {
    next(error);
  }
};

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


exports.updateWeatherRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updateValidation = validateUpdateFields(updates);
    if (!updateValidation.valid) {
      return res.status(400).json({
        status: 'error',
        type: 'VALIDATION_ERROR',
        message: updateValidation.error
      });
    }

    const allowedFields = ['resolvedLocation', 'location', 'temperature', 'humidity', 'windSpeed', 'condition', 'feelsLike', 'tempMin', 'tempMax', 'pressure', 'visibility'];
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

    const hasLocationUpdate = sanitizedUpdates.resolvedLocation || sanitizedUpdates.location;
    const hasWeatherDataUpdate = sanitizedUpdates.temperature !== undefined || sanitizedUpdates.condition !== undefined;

    if (hasLocationUpdate && !hasWeatherDataUpdate) {
      const locationQuery = sanitizedUpdates.location || sanitizedUpdates.resolvedLocation;
      const existingRecord = await Weather.findById(id);
      
      if (!existingRecord) {
        return res.status(404).json({
          status: 'error',
          type: 'NOT_FOUND',
          message: 'Weather record not found.'
        });
      }

      const result = await fetchAndBuildWeatherData(locationQuery, undefined, undefined);
      if (result.status === 200) {
        Object.assign(sanitizedUpdates, result.data);
      }
    }

    const updatedRecord = await Weather.findByIdAndUpdate(
      id,
      { $set: sanitizedUpdates },
      { returnDocument: 'after', runValidators: true }
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

    
    
    
    await Weather.deleteMany({ resolvedLocation: record.resolvedLocation });

    return res.status(200).json({
      status: 'success',
      message: `Record for "${record.resolvedLocation || record.location}" deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};


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
