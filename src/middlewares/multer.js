const multer = require('multer')
const path = require('path')

const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext === '.csv' || ext === '.pdf') {
      cb(null, true)
    } else {
      cb(new Error('Apenas arquivos .csv e .pdf são permitidos'))
    }
  }
})

module.exports = upload
