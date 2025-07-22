const express = require('express')
const router = express.Router()
const  authenticateToken  = require('../middlewares/authMiddleware')
const { searchController } = require('../controllers/searchController')

router.get('/records/search', authenticateToken, searchController)

module.exports = router
