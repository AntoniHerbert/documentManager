

jest.mock('@prisma/client', () => {
  const mPrisma = {
    dataset: {
      findFirst: jest.fn(),
    },
    query: {
      create: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mPrisma),
  };
});

jest.mock('axios');

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { postQuery } = require('../queryController'); 

describe('postQuery controller', () => {
  const prisma = new PrismaClient();

  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1 },
      body: {
        query: 'Qual é a capital do Brasil?',
        datasetName: 'Dataset Exemplo',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
    process.env.HUGGINGFACE_API_KEY = 'fake-api-key'; 
  });

  it('deve retornar erro 400 se query estiver ausente ou inválida', async () => {
    req.body.query = '';
    await postQuery(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'O campo "query" é obrigatório e deve ser uma string não vazia.',
    });
  });

  it('deve retornar erro 400 se datasetName estiver ausente ou inválido', async () => {
    req.body.datasetName = '   ';
    await postQuery(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'O campo "datasetName" é obrigatório e deve ser uma string não vazia.',
    });
  });

  it('deve retornar 404 se usuário não tiver datasets', async () => {
    prisma.dataset.findFirst.mockResolvedValueOnce(null);
    await postQuery(req, res);
    expect(prisma.dataset.findFirst).toHaveBeenCalledWith({ where: { userId: 1 } });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Usuário não possui nenhum dataset cadastrado.',
    });
  });

  it('deve retornar 404 se dataset específico não encontrado', async () => {
    prisma.dataset.findFirst
      .mockResolvedValueOnce({ id: 1 }) 
      .mockResolvedValueOnce(null); 

    await postQuery(req, res);

    expect(prisma.dataset.findFirst).toHaveBeenNthCalledWith(2, {
      where: { name: req.body.datasetName, userId: 1 },
      include: { records: true },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: `Dataset com nome "${req.body.datasetName}" não encontrado para este usuário.`,
    });
  });

  it('deve chamar API huggingface e salvar query com sucesso', async () => {
    const mockDataset = {
      id: 1,
      name: req.body.datasetName,
      records: [
        { dataJson: '{"text":"dados 1"}' },
        { dataJson: '{"text":"dados 2"}' },
      ],
    };

    prisma.dataset.findFirst
      .mockResolvedValueOnce({ id: 1 }) 
      .mockResolvedValueOnce(mockDataset); 

    const apiResponse = { data: { answer: 'Brasília' } };
    axios.post.mockResolvedValue(apiResponse);

    const mockSavedQuery = {
      id: 123,
      datasetName: mockDataset.name,
      query: req.body.query.trim(),
      content: mockDataset.records.map(r => r.dataJson).join(' '),
      answer: 'Brasília',
      createdAt: new Date(),
    };
    prisma.query.create.mockResolvedValue(mockSavedQuery);

    await postQuery(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('huggingface.co'),
      {
        inputs: {
          question: req.body.query.trim(),
          context: mockDataset.records.map(r => r.dataJson).join(' '),
        },
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer'),
        }),
      })
    );

    expect(prisma.query.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        datasetName: mockDataset.name,
        query: req.body.query.trim(),
        content: mockDataset.records.map(r => r.dataJson).join(' '),
        answer: 'Brasília',
      },
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Consulta realizada e salva com sucesso',
      query: expect.objectContaining({
        id: 123,
        datasetName: mockDataset.name,
        query: req.body.query.trim(),
        answer: 'Brasília',
      }),
    });
  });

  it('deve truncar context se passar MAX_CHARS', async () => {
    const longText = 'a'.repeat(1500);
    const mockDataset = {
      id: 1,
      name: req.body.datasetName,
      records: [{ dataJson: longText }],
    };

    prisma.dataset.findFirst
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(mockDataset);

    axios.post.mockResolvedValue({ data: { answer: 'Resposta truncada' } });

    prisma.query.create.mockResolvedValue({
      id: 1,
      datasetName: mockDataset.name,
      query: req.body.query.trim(),
      content: longText.slice(0, 1000 - req.body.query.trim().length),
      answer: 'Resposta truncada',
      createdAt: new Date(),
    });

    await postQuery(req, res);

    expect(axios.post).toHaveBeenCalled();

    const sentContext = axios.post.mock.calls[0][1].inputs.context;
    expect(sentContext.length + req.body.query.trim().length).toBeLessThanOrEqual(1000);
  });

  it('deve retornar 500 em caso de erro da API externa', async () => {
    prisma.dataset.findFirst
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({
        id: 1,
        name: req.body.datasetName,
        records: [{ dataJson: '{"text":"dados"}' }],
      });

    axios.post.mockRejectedValue(new Error('API Error'));

    await postQuery(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao processar consulta' });
  });
});
