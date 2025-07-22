

jest.mock('@prisma/client', () => {
  const mPrisma = {
    dataset: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
const { listDatasets, getDatasetRecords } = require('../datasetsController');

describe('datasetController', () => {
  const prisma = new PrismaClient();

  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1 },
      params: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('listDatasets', () => {
    it('deve retornar lista de datasets com contagem de records', async () => {
      prisma.dataset.findMany.mockResolvedValue([
        { id: 1, name: 'Dataset 1', _count: { records: 5 } },
        { id: 2, name: 'Dataset 2', _count: { records: 3 } },
      ]);

      await listDatasets(req, res);

      expect(prisma.dataset.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        select: {
          id: true,
          name: true,
          _count: { select: { records: true } },
        },
      });

      expect(res.json).toHaveBeenCalledWith([
        { id: 1, name: 'Dataset 1', recordCount: 5 },
        { id: 2, name: 'Dataset 2', recordCount: 3 },
      ]);
    });

    it('deve retornar erro 500 em caso de exceção', async () => {
      prisma.dataset.findMany.mockRejectedValue(new Error('Falha'));

      await listDatasets(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao buscar datasets' });
    });
  });

  describe('getDatasetRecords', () => {
    it('deve retornar os records do dataset se for do usuário', async () => {
      req.params.id = '10';
      prisma.dataset.findUnique.mockResolvedValue({ userId: 1 });

      const mockRecords = [
        { id: 1, name: 'file1', size: 100, createdAt: new Date() },
      ];
      prisma.record.findMany.mockResolvedValue(mockRecords);

      await getDatasetRecords(req, res);

      expect(prisma.dataset.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        select: { userId: true },
      });

      expect(prisma.record.findMany).toHaveBeenCalledWith({
        where: { datasetId: 10 },
        select: { id: true, name: true, size: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });

      expect(res.json).toHaveBeenCalledWith(mockRecords);
    });

    it('deve retornar erro 400 se ID do dataset for inválido', async () => {
      req.params.id = 'abc';

      await getDatasetRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID do dataset inválido' });
    });

    it('deve retornar erro 404 se o dataset não pertencer ao usuário', async () => {
      req.params.id = '20';
      prisma.dataset.findUnique.mockResolvedValue({ userId: 999 });

      await getDatasetRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Dataset não encontrado para este usuário',
      });
    });

    it('deve retornar erro 500 se ocorrer exceção', async () => {
      req.params.id = '30';
      prisma.dataset.findUnique.mockRejectedValue(new Error('Erro qualquer'));

      await getDatasetRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao buscar records' });
    });
  });
});
