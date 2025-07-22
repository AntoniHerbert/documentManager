const express = require('express');
const router = express.Router();

const authenticateToken = require('../middlewares/authMiddleware');
const { listDatasets, getDatasetRecords } = require('../controllers/datasetsController');

router.get('/datasets', authenticateToken, listDatasets);
router.get('/dataset/:id/records', authenticateToken, getDatasetRecords);


module.exports = router;
