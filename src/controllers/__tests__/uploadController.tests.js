jest.mock('pdf-parse', () => jest.fn())
jest.mock('@prisma/client', () => {
  const mDataset = {
    findFirst: jest.fn(),
    create: jest.fn()
  }
  const mRecord = {
    findMany: jest.fn(),
    create: jest.fn()
  }
  return {
    PrismaClient: jest.fn(() => ({
      dataset: mDataset,
      record: mRecord,
    })),
  }
})

const pdfParse = require('pdf-parse')
const { uploadDataset } = require('../uploadController')
const { PrismaClient } = require('@prisma/client')

describe('uploadDataset controller', () => {
  let prisma
  let req, res

  beforeEach(() => {
    prisma = new PrismaClient()

    req = {
      user: { id: 1 },
      body: {},
      files: []
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    jest.clearAllMocks()
  })

  it('deve retornar 400 se não houver arquivos', async () => {
    req.files = []
    await uploadDataset(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      errors: [{ field: 'files', error: 'Nenhum arquivo enviado' }]
    })
  })

  it('deve retornar 400 se datasetName não for informado', async () => {
    req.files = [{ mimetype: 'text/csv', buffer: Buffer.from('a,b\n1,2'), size: 10 }]
    req.body.datasetName = ''
    req.body.recordNames = 'file1'
    await uploadDataset(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      errors: [{ field: 'datasetName', error: 'Nome do dataset é obrigatório' }]
    })
  })

  it('deve retornar 400 se recordNames não for informado', async () => {
    req.files = [{ mimetype: 'text/csv', buffer: Buffer.from('a,b\n1,2'), size: 10 }]
    req.body.datasetName = 'MeuDataset'
    req.body.recordNames = null
    await uploadDataset(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      errors: [{ field: 'recordNames', error: 'Nomes dos records devem ser enviados' }]
    })
  })

  it('deve retornar 400 se recordNames não corresponder ao número de arquivos', async () => {
    req.files = [
      { mimetype: 'text/csv', buffer: Buffer.from('a,b\n1,2'), size: 10 },
      { mimetype: 'application/pdf', buffer: Buffer.from('PDFcontent'), size: 20 }
    ]
    req.body.datasetName = 'MeuDataset'
    req.body.recordNames = 'file1' 
    await uploadDataset(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      errors: [{
        field: 'recordNames',
        error: 'Nomes dos records devem ser enviados e corresponder ao número de arquivos'
      }]
    })
  })

  it('deve retornar 400 se houver nomes duplicados nos records', async () => {
    req.files = [
      { mimetype: 'text/csv', buffer: Buffer.from('a,b\n1,2'), size: 10 },
      { mimetype: 'application/pdf', buffer: Buffer.from('PDFcontent'), size: 20 }
    ]
    req.body.datasetName = 'MeuDataset'
    req.body.recordNames = 'file1, file1' 
    await uploadDataset(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      errors: expect.arrayContaining([
        expect.objectContaining({ error: expect.stringContaining('duplicado') })
      ])
    })
  })

  it('deve criar novo dataset e records com arquivos CSV e PDF', async () => {
    req.files = [
      { mimetype: 'text/csv', buffer: Buffer.from('a,b\n1,2'), size: 10 },
      { mimetype: 'application/pdf', buffer: Buffer.from('PDFcontent'), size: 20 }
    ]
    req.body.datasetName = 'MeuDataset'
    req.body.recordNames = 'file1, file2'

    prisma.dataset.findFirst.mockResolvedValue(null)
    prisma.dataset.create.mockResolvedValue({ id: 123, name: 'MeuDataset' })

    prisma.record.create
      .mockResolvedValueOnce({ id: 1, name: 'file1', size: 10, createdAt: '2025-07-21' })
      .mockResolvedValueOnce({ id: 2, name: 'file2', size: 20, createdAt: '2025-07-21' })

    pdfParse.mockResolvedValue({ text: 'conteudo do pdf' })

    await uploadDataset(req, res)

    expect(prisma.dataset.findFirst).toHaveBeenCalledWith({
      where: { name: 'MeuDataset', userId: 1 }
    })
    expect(prisma.dataset.create).toHaveBeenCalledWith({
      data: { name: 'MeuDataset', userId: 1 }
    })

    expect(prisma.record.create).toHaveBeenCalledTimes(2)
    expect(prisma.record.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'file1', size: 10 })
    }))
    expect(prisma.record.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'file2', size: 20 })
    }))

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Upload e ingestão concluídos',
      dataset: expect.objectContaining({
        id: 123,
        name: 'MeuDataset',
        records: expect.any(Array)
      })
    }))
  })

  it('deve retornar erro 500 em caso de exceção inesperada', async () => {
    req.files = [{ mimetype: 'text/csv', buffer: Buffer.from('a,b\n1,2'), size: 10 }]
    req.body.datasetName = 'MeuDataset'
    req.body.recordNames = 'file1'

    prisma.dataset.findFirst.mockRejectedValue(new Error('Erro inesperado'))

    await uploadDataset(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao processar upload' })
  })

  it('deve retornar 413 se arquivo exceder limite (mockando erro específico)', async () => {
    req.files = [{ mimetype: 'text/csv', buffer: Buffer.from('a,b\n1,2'), size: 10 }]
    req.body.datasetName = 'MeuDataset'
    req.body.recordNames = 'file1'

    const err = new Error('File too large')
    err.code = 'LIMIT_FILE_SIZE'
    err.field = 'files'

    prisma.dataset.findFirst.mockImplementation(() => { throw err })

    await uploadDataset(req, res)

    expect(res.status).toHaveBeenCalledWith(413)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Arquivo excede o tamanho máximo permitido',
      field: 'files'
    })
  })
})
