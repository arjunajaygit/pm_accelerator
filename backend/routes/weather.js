
const express = require('express');
const router = express.Router();
const {
  createWeatherRecord,
  getWeatherHistory,
  getWeatherById,
  updateWeatherRecord,
  deleteWeatherRecord,
  exportWeatherData
} = require('../controllers/weatherController');


router.get('/export', exportWeatherData);


router.post('/', createWeatherRecord);
router.get('/', getWeatherHistory);
router.get('/:id', getWeatherById);
router.put('/:id', updateWeatherRecord);
router.delete('/:id', deleteWeatherRecord);

module.exports = router;
