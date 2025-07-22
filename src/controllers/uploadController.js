const pdfParse = require('pdf-parse')
const csv = require('csv-parser')
const { Readable } = require('stream')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const uploadDataset = async (req, res) => {
  const userId = req.user.id
  let { datasetName, recordNames } = req.body 
  const files = req.files

  if (!files || files.length === 0) {
    return res.status(400).json({ errors: [{ field: 'files', error: 'Nenhum arquivo enviado' }] })
  }

  if (!datasetName || typeof datasetName !== 'string') {
    return res.status(400).json({ errors: [{ field: 'datasetName', error: 'Nome do dataset é obrigatório' }] })
  }

  if (!recordNames) {
    return res.status(400).json({ errors: [{ field: 'recordNames', error: 'Nomes dos records devem ser enviados' }] });
  }

  if (typeof recordNames === 'string') {
    recordNames = recordNames.split(',').map(name => name.trim()).filter(name => name.length > 0);
  }

  if (!recordNames || !Array.isArray(recordNames) || recordNames.length !== files.length) {
    return res.status(400).json({ errors: [{ field: 'recordNames', error: 'Nomes dos records devem ser enviados e corresponder ao número de arquivos' }] })
  }

  const duplicatesInInput = findDuplicates(recordNames)
  if (duplicatesInInput.length > 0) {
    return res.status(400).json({
      errors: duplicatesInInput.map(name => ({
        field: 'recordName',
        error: `Nome de record duplicado na requisição: "${name}"`,
        name
      }))
    })
  }

  try {
    const existingDataset = await prisma.dataset.findFirst({
      where: { name: datasetName, userId }
    })

    if (existingDataset) {
      const existingRecords = await prisma.record.findMany({
        where: {
          datasetId: existingDataset.id,
          name: { in: recordNames }
        },
        select: { name: true }
      })

      if (existingRecords.length > 0) {
        const duplicateNames = existingRecords.map(r => r.name)
        return res.status(400).json({
          errors: duplicateNames.map(name => ({
            field: 'recordName',
            error: `Record com nome "${name}" já existe neste dataset.`,
            name
          }))
        })
      }
    }

    const dataset = existingDataset || await prisma.dataset.create({
      data: { name: datasetName, userId }
    })

    const records = await Promise.all(files.map(async (file, idx) => {
      let parsedContent

      if (file.mimetype === 'text/csv') {
        parsedContent = await parseCSV(file.buffer)
      } else if (file.mimetype === 'application/pdf') {
        const data = await pdfParse(file.buffer)
        parsedContent = { text: data.text }
      } else {
        throw new Error('Tipo de arquivo não suportado')
      }

      return prisma.record.create({
        data: {
          name: recordNames[idx],
          size: file.size,
          dataJson: parsedContent,
          datasetId: dataset.id
        }
      })
    }))

    res.status(201).json({
      message: 'Upload e ingestão concluídos',
      dataset: {
        id: dataset.id,
        name: dataset.name,
        records: records.map(r => ({
          id: r.id,
          name: r.name,
          size: r.size,
          createdAt: r.createdAt
        }))
      }
    })
  } catch (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'Arquivo excede o tamanho máximo permitido',
        field: err.field,
      })
    }
    console.error(err)
    res.status(500).json({ error: 'Erro ao processar upload' })
  }
}

const findDuplicates = (arr) => {
  const seen = new Set()
  const duplicates = new Set()
  for (const item of arr) {
    if (seen.has(item)) duplicates.add(item)
    else seen.add(item)
  }
  return [...duplicates]
}

const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = []
    Readable.from(buffer.toString())
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', err => reject(err))
  })
}

module.exports = { uploadDataset }
