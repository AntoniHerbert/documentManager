require('dotenv').config();
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const searchRoutes = require('./routes/searchRoutes');
const datasetRoutes = require('./routes/datasetsRoutes');
const queriesRoutes = require('./routes/queryRoutes');

const swaggerDocument = YAML.load(path.join(__dirname, './docs/swagger.yaml'));

app.use(express.json());


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

app.use(authRoutes);
app.use(uploadRoutes);
app.use(searchRoutes);
app.use(datasetRoutes);
app.use(queriesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
