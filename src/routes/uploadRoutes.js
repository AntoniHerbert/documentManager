const express = require('express')
const router = express.Router()

const upload = require('../middlewares/multer')
const  authenticateToken  = require('../middlewares/authMiddleware')
const { uploadDataset } = require('../controllers/uploadController')

router.post('/datasets/upload', authenticateToken, upload.array('files'), uploadDataset)

module.exports = router
