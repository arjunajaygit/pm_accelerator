const mongoose = require('mongoose');

const ForecastDaySchema = new mongoose.Schema({
  day: { type: String, required: true },
  temp: { type: Number, required: true },
  condition: { type: String, required: true },
  icon: { type: String }
}, { _id: false });

const WeatherSchema = new mongoose.Schema({
  location: {
    type: String,
    required: [true, 'Location is required.'],
    trim: true,
    maxlength: [200, 'Location must be under 200 characters.']
  },
  resolvedLocation: {
    type: String,
    trim: true
  },
  latitude: { type: Number },
  longitude: { type: Number },
  temperature: {
    type: Number,
    required: [true, 'Temperature is required.'],
    min: [-100, 'Temperature cannot be below -100°C.'],
    max: [70, 'Temperature cannot exceed 70°C.']
  },
  feelsLike: { type: Number },
  tempMin: { type: Number },
  tempMax: { type: Number },
  condition: {
    type: String,
    required: [true, 'Weather condition is required.'],
    trim: true
  },
  conditionIcon: { type: String },
  humidity: {
    type: Number,
    required: true,
    min: [0, 'Humidity cannot be negative.'],
    max: [100, 'Humidity cannot exceed 100%.']
  },
  windSpeed: {
    type: Number,
    required: true,
    min: [0, 'Wind speed cannot be negative.']
  },
  pressure: { type: Number },
  visibility: { type: Number },
  startDate: {
    type: Date,
    required: [true, 'Start date is required.']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required.'],
    validate: {
      validator: function(value) {
        return value >= this.startDate;
      },
      message: 'End date must be on or after start date.'
    }
  },
  forecast: {
    type: [ForecastDaySchema],
    validate: {
      validator: function(arr) {
        return arr.length <= 7;
      },
      message: 'Forecast cannot exceed 7 days.'
    }
  },
  aiInsight: { type: String },
  mapUrl: { type: String },
  videoIds: [{ type: String }],
  country: { type: String },
  sunrise: { type: Number },
  sunset: { type: Number },
  timezoneOffset: { type: Number }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for efficient queries
WeatherSchema.index({ createdAt: -1 });
WeatherSchema.index({ location: 'text' });

module.exports = mongoose.model('Weather', WeatherSchema);
