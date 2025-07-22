const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/pierreguillou/bert-base-cased-squad-v1.1-portuguese';
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

const MAX_CHARS = 1000;

const postQuery = async (req, res) => {
  const userId = req.user.id;
  const { query, datasetName } = req.body;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'O campo "query" é obrigatório e deve ser uma string não vazia.' });
  }

  if (!datasetName || typeof datasetName !== 'string' || datasetName.trim() === '') {
    return res.status(400).json({ error: 'O campo "datasetName" é obrigatório e deve ser uma string não vazia.' });
  }

  try {
    const anyDataset = await prisma.dataset.findFirst({ where: { userId } });
    if (!anyDataset) {
      return res.status(404).json({ error: 'Usuário não possui nenhum dataset cadastrado.' });
    }

    const dataset = await prisma.dataset.findFirst({
      where: { name: datasetName, userId },
      include: { records: true }
    });

    if (!dataset) {
      return res.status(404).json({ error: `Dataset com nome "${datasetName}" não encontrado para este usuário.` });
    }

    const allData = dataset.records.map(r => {
      if (typeof r.dataJson === 'string') return r.dataJson;
      else return JSON.stringify(r.dataJson);
    }).join(' ');

    const question = query.trim();

    let context = allData;
    const totalLength = question.length + context.length;

    if (totalLength > MAX_CHARS) {
      const allowedContextLength = MAX_CHARS - question.length;
      context = context.slice(0, allowedContextLength);
    }

    const payload = {
      inputs: {
        question,
        context
      }
    };

    const response = await axios.post(HUGGINGFACE_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const answerData = response.data;
    const answer = answerData?.answer || 'Resposta não disponível';

    const savedQuery = await prisma.query.create({
      data: {
        userId,
        datasetName: dataset.name,
        query: question,
        content: context, 
        answer
      }
    });

    return res.status(201).json({
      message: 'Consulta realizada e salva com sucesso',
      query: {
        id: savedQuery.id,
        datasetName: savedQuery.datasetName,
        query: savedQuery.query,
        content: savedQuery.content,
        answer: savedQuery.answer,
        createdAt: savedQuery.createdAt
      }
    });

  } catch (error) {
    if (error.response) {
  console.error('Erro da API Hugging Face:', error.response.status, error.response.data);
} else {
  console.error('Erro ao processar consulta:', error.message);
}
    return res.status(500).json({ error: 'Erro ao processar consulta' });
  }
};

module.exports = { postQuery };
