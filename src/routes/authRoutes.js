const express = require('express')
const router = express.Router()
const { register, login, getMe } = require('../controllers/authController')
const authenticateToken = require('../middlewares/authMiddleware')

router.post('/auth/register', register)
router.post('/auth/login', login)
router.get('/me', authenticateToken, getMe)

module.exports = router
