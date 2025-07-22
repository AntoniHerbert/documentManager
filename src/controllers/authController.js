const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { validateEmail, validateName, validatePassword } = require('../utils/validators');
const validator = require('validator')



const prisma = new PrismaClient()

const register = async (req, res) => {
  const { name, email, password } = req.body
  const errors = []

  errors.push(...validateName(name))
  errors.push(...validateEmail(email))
  errors.push(...validatePassword(password))


  if (errors.length > 0) {
    return res.status(400).json({ errors })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ errors: ['Email já registrado'] })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });

    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      user: {
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};


const login = async (req, res) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push({ field: 'email', error: 'O email é obrigatório' });
  } else if (!validator.isEmail(email)) {
    errors.push({ field: 'email', error: 'Formato de email inválido' });
  }

  if (!password) {
    errors.push({ field: 'password', error: 'A senha é obrigatória' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({
        errors: [{ field: 'email', error: 'Usuário não encontrado' }]
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({
        errors: [{ field: 'password', error: 'Senha incorreta' }]
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


module.exports = { register, login, getMe }
