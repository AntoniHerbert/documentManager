
jest.mock('@prisma/client', () => {
  const mPrisma = {
    dataset: {
      findMany: jest.fn(),
    },
    record: {
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mPrisma),
  };
});

const { PrismaClient } = require('@prisma/client');
const { searchController } = require('../searchController');

describe('searchController', () => {
  const prisma = new PrismaClient();

  let req, res;

  beforeEach(() => {
    req = {
      params: { userId: '1' },
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('deve retornar 400 se query não informada ou inválida', async () => {
    req.query.query = null;
    await searchController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Query não informada ou inválida' });

    req.query.query = 123; 
    await searchController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Query não informada ou inválida' });
  });

  it('deve retornar matches vazios se não houver datasets', async () => {
    req.query.query = 'teste';
    prisma.dataset.findMany.mockResolvedValue([]);

    await searchController(req, res);

    expect(prisma.dataset.findMany).toHaveBeenCalledWith({
      where: { userId: '1' },
      select: { id: true, name: true },
    });

    expect(res.json).toHaveBeenCalledWith({ matches: [] });
  });

  it('deve buscar e retornar matches corretamente', async () => {
    req.query.query = 'abc';

    const datasets = [
      { id: 1, name: 'Dataset 1' },
      { id: 2, name: 'Dataset 2' },
    ];
    prisma.dataset.findMany.mockResolvedValue(datasets);


    prisma.record.findMany
      .mockResolvedValueOnce([
        { name: 'record1', dataJson: { text: 'abcdef abc' } }, 
        { name: 'record2', dataJson: { text: 'xyz' } },        
      ])

      .mockResolvedValueOnce([
        { name: 'record3', dataJson: { text: 'abcabc' } },     
      ]);

    await searchController(req, res);

    expect(prisma.dataset.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.record.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.record.findMany).toHaveBeenNthCalledWith(1, {
      where: { datasetId: 1 },
      select: { name: true, dataJson: true },
    });
    expect(prisma.record.findMany).toHaveBeenNthCalledWith(2, {
      where: { datasetId: 2 },
      select: { name: true, dataJson: true },
    });

    const calledWith = res.json.mock.calls[0][0];
    expect(calledWith).toHaveProperty('matches');
    expect(calledWith.matches.length).toBe(4);

    for (const m of calledWith.matches) {
      expect(m).toMatchObject({
        datasetName: expect.any(String),
        recordName: expect.any(String),
        start: expect.any(Number),
        end: expect.any(Number),
        query: 'abc',
        match: expect.any(String),
      });
    }
  });

  it('deve ordenar matches conforme a regra: exato antes de parcial e alfabético', async () => {
    req.query.query = 'abc';

    prisma.dataset.findMany.mockResolvedValue([{ id: 1, name: 'DS' }]);
    prisma.record.findMany.mockResolvedValue([
      {
        name: 'R1',
        dataJson: {
          text: 'abc abcd abc',
        },
      },
    ]);

    await searchController(req, res);

    const matches = res.json.mock.calls[0][0].matches;

   
    expect(matches.length).toBeGreaterThanOrEqual(3);

    expect(matches[0].match).toBe('abc');
    expect(matches[1].match).toBe('abc');
    expect(matches[2].match).toMatch(/abc/); 
  });

  it('deve retornar 500 se ocorrer erro', async () => {
    req.query.query = 'abc';
    prisma.dataset.findMany.mockRejectedValue(new Error('Erro no banco'));

    await searchController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao processar busca' });
  });
});
