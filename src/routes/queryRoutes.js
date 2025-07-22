const express = require('express');
const router = express.Router();

const authenticateToken = require('../middlewares/authMiddleware');
const { postQuery } = require('../controllers/queryController');

router.post('/queries', authenticateToken, postQuery);

module.exports = router;
