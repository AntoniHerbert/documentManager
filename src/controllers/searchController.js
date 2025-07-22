const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const searchController = async (req, res) => {
  const { userId } = req.params
  const { query } = req.query

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query não informada ou inválida' })
  }

  try {
    const regex = new RegExp(query, 'gi')
    const matches = []

    const datasets = await prisma.dataset.findMany({
      where: { userId },
      select: { id: true, name: true }
    })

    for (const dataset of datasets) {
      const records = await prisma.record.findMany({
        where: { datasetId: dataset.id },
        select: { name: true, dataJson: true }
      })

      for (const record of records) {
        const dataText = JSON.stringify(record.dataJson)
        let match
        while ((match = regex.exec(dataText)) !== null) {
          matches.push({
            datasetName: dataset.name,
            recordName: record.name,
            start: match.index,
            end: match.index + match[0].length,
            query,
            match: match[0]
          })
        }
      }
    }

    matches.sort((a, b) => {
      const exactA = a.match === a.query
      const exactB = b.match === b.query
      if (exactA && !exactB) return -1
      if (!exactA && exactB) return 1
      return a.match.localeCompare(b.match)
    })

    return res.json({ matches })
  } catch (error) {
    console.error('Erro na busca:', error)
    return res.status(500).json({ error: 'Erro ao processar busca' })
  }
}

module.exports = { searchController }
