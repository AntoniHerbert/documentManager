# 📁 documentManager

![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma)

Sistema de gerenciamento de documentos com upload, metadados, organização por datasets e consultas inteligentes por IA.  
Desenvolvido com **Node.js**, **Express**, **Prisma**, **PostgreSQL**, e **Docker**.

---

## ✨ Funcionalidades

✅ Upload de arquivos `.pdf` e `.csv`  
✅ Armazenamento e registro de **metadados**  
✅ Organização por **datasets**  
✅ Consultas inteligentes via **Hugging Face Inference API**  
✅ API RESTful documentada com **Swagger UI**  
✅ Autenticação via **JWT**

---

## 🧱 Tecnologias Utilizadas

- ⚙️ [Node.js](https://nodejs.org/)
- 🧬 [Prisma ORM](https://www.prisma.io/)
- 🐘 [PostgreSQL](https://www.postgresql.org/)
- 🐳 [Docker](https://www.docker.com/)
- 🛡️ [JWT](https://jwt.io/)
- 🧠 [Hugging Face](https://huggingface.co/)
- 📘 [Swagger UI](https://swagger.io/tools/swagger-ui/)

---

## 🐳 Como Rodar com Docker

### ✅ Pré-requisitos

- [Git](https://git-scm.com/)
- [Docker + Docker Compose](https://docs.docker.com/compose/)

### 📦 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/documentManager.git
cd documentManager
```

### ⚙️ 2. Configure as variáveis de ambiente

Crie um arquivo `.env` com o seguinte conteúdo:

```env
DATABASE_URL="postgresql://postgres:postgres@db:5432/documentmanager"
JWT_SECRET="sua_chave_secreta"
HUGGINGFACE_API_KEY="qwerqqweq"
```

## 🧠 Integração com Hugging Face

A API aceita perguntas sobre os dados armazenados e retorna respostas geradas por IA com base no conteúdo dos arquivos.

### 🔑 Como obter sua Hugging Face API Key

Para utilizar funcionalidades que dependem da API da Hugging Face, você precisa gerar uma chave de API:

1. Acesse: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Clique em **"New token"**.
3. Dê um nome ao token e selecione o tipo de permissão como **"Read"**.
4. Clique em **"Generate"**.
5. Copie o token gerado e adicione-o ao seu arquivo `.env` como valor da variável:

```env
HUGGINGFACE_API_KEY="seu_token_aqui"
```

### ▶️ 3. Suba a aplicação

```bash
docker-compose up --build
```

Esse comando irá:

- Subir o banco de dados PostgreSQL
- Executar:
  - `npx prisma generate`
  - `npx prisma migrate dev`
  - `npx prisma migrate deploy`
- Iniciar o servidor Node.js

---

## 📚 Documentação da API

Após iniciar, acesse:

📄 `http://localhost:3000/api-docs` — Interface Swagger

(Caso acesse localhost:3000 será direcionado para a api docs tbm)

---

## 🗂 Estrutura de Pastas

```
📦documentManager
 ┣ 📁controllers     → Lógica dos endpoints
 ┣ 📁middlewares     → Autenticação e validações
 ┣ 📁routes          → Rotas da API
 ┣ 📁docs            → documentação do swagger
 ┣ 📁prisma          → Esquema do banco e migrações
 ┣ 📄docker-compose.yml
 ┣ 📄Dockerfile
 ┣ 📄README.md
 ┣ 📄package.json
```

---

## 🔐 Autenticação JWT

Para acessar endpoints protegidos, envie o token JWT no header:

```http
Authorization: Bearer <seu_token>
```

---

## 📌 Comandos Úteis

| Comando | Descrição |
|--------|-----------|
| `docker-compose up --build` | Sobe toda a aplicação com build |
| `npx prisma migrate dev` | Gera e aplica novas migrações |
| `npx prisma studio` | Interface web para visualizar o banco |
| `npx prisma generate` | Gera os clientes Prisma |
| `npx prisma migrate deploy` | Aplica migrações no ambiente de produção |
| `npm tests` | Roda os testes unitários |


---

## 👨‍💻 Autor

Desenvolvido por [Antonio Herbert](https://github.com/AntoniHerbert)  
