

jest.mock('@prisma/client', () => {
  const mPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mPrisma),
  };
});

jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashedPassword')),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'fake-jwt-token'),
}));

const { register, login, getMe } = require('../authController');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('authController', () => {
  const prisma = new PrismaClient();

  let req, res;

  beforeEach(() => {
    req = {
      body: {
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'Senha@123',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });


describe('register', () => {
  beforeEach(() => {
    req.body = {
      name: 'João Silva',
      email: 'joao@example.com',
      password: 'Senha@123',
    };
  });

  it('deve registrar o usuário com sucesso', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashedPassword');
    prisma.user.create.mockResolvedValue({ name: 'João Silva', email: 'joao@example.com' });

    await register(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: req.body.email } });
    expect(bcrypt.hash).toHaveBeenCalledWith(req.body.password, 10);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: req.body.name,
        email: req.body.email,
        password: 'hashedPassword',
      },
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Usuário registrado com sucesso',
      user: {
        name: 'João Silva',
        email: 'joao@example.com',
      },
    });
  });

  it('deve retornar erro se o nome for inválido', async () => {
    req.body.name = ''; 

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
      ]),
    });
  });

  it('deve retornar erro se o email for inválido', async () => {
    req.body.email = 'emailinvalido';

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ]),
    });
  });

  it('deve retornar erro se a senha for fraca', async () => {
    req.body.password = '123';

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ]),
    });
  });

  it('deve retornar erro se email já estiver registrado', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1 });

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: ['Email já registrado'],
    });
  });

  it('deve retornar erro 500 em caso de falha interna no banco', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('DB error'));

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
    });
  });
});


  describe('login', () => {
    beforeEach(() => {
      req.body = {
        email: 'joao@example.com',
        password: 'Senha@123',
      };
    });

    it('deve fazer login com sucesso e retornar token JWT', async () => {
      const userFromDb = {
        id: 1,
        email: 'joao@example.com',
        name: 'João Silva',
        password: 'hashedPassword',
      };

      prisma.user.findUnique.mockResolvedValue(userFromDb);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('fake-jwt-token');

      await login(req, res);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: req.body.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(req.body.password, userFromDb.password);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: userFromDb.id, email: userFromDb.email, name: userFromDb.name },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      expect(res.json).toHaveBeenCalledWith({ token: 'fake-jwt-token' });
    });

    it('deve retornar erro 400 se email não for informado', async () => {
      req.body.email = '';

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ field: 'email', error: 'O email é obrigatório' }],
      });
    });

    it('deve retornar erro 400 se email for inválido', async () => {
      req.body.email = 'emailinvalido';

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ field: 'email', error: 'Formato de email inválido' }],
      });
    });

    it('deve retornar erro 400 se senha não for informada', async () => {
      req.body.password = '';

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ field: 'password', error: 'A senha é obrigatória' }],
      });
    });

    it('deve retornar erro 404 se usuário não for encontrado', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ field: 'email', error: 'Usuário não encontrado' }],
      });
    });

    it('deve retornar erro 401 se senha for incorreta', async () => {
      const userFromDb = {
        id: 1,
        email: 'joao@example.com',
        name: 'João Silva',
        password: 'hashedPassword',
      };

      prisma.user.findUnique.mockResolvedValue(userFromDb);
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ field: 'password', error: 'Senha incorreta' }],
      });
    });

    it('deve retornar erro 500 em caso de exceção', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('DB error'));

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

describe('getMe', () => {
  beforeEach(() => {
    req.user = { id: 1 };
  });

  it('deve retornar os dados do usuário logado', async () => {
    const mockUser = { id: 1, name: 'João Silva', email: 'joao@example.com' };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    await getMe(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockUser);
  });

  it('deve retornar 404 se o usuário não for encontrado', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuário não encontrado' });
  });

  it('deve retornar 500 em caso de erro interno', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('DB error'));

    await getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
  });
});





});
