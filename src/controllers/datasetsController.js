const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listDatasets = async (req, res) => {
  try {
    const userId = req.user.id;

    const datasets = await prisma.dataset.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        _count: {
          select: { records: true }
        }
      }
    });

    const result = datasets.map(ds => ({
      id: ds.id,
      name: ds.name,
      recordCount: ds._count.records
    }));

    res.json(result);
  } catch (error) {
    console.error('Erro ao listar datasets:', error);
    res.status(500).json({ error: 'Erro ao buscar datasets' });
  }
};

const getDatasetRecords = async (req, res) => {
  const userId = req.user.id;
  const datasetId = parseInt(req.params.id);
  const verbose = req.query.verbose === 'true';

  if (isNaN(datasetId)) {
    return res.status(400).json({ error: 'ID do dataset inválido' });
  }

  try {
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: { userId: true },
    });

    if (!dataset || dataset.userId !== userId) {
      return res.status(404).json({ error: 'Dataset não encontrado para este usuário' });
    }

    const records = await prisma.record.findMany({
      where: { datasetId },
      select: verbose
        ? { id: true, name: true, size: true, createdAt: true, dataJson: true }
        : { id: true, name: true, size: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(records);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar records' });
  }
};

module.exports = {
  listDatasets, getDatasetRecords
};
