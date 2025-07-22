const validator = require('validator')

function validatePassword(password) {
  const errors = []

  if (!password || password.length === 0) {
    errors.push({ field: 'password', message: 'Senha é obrigatória' })
    return errors
  }

  if (password.length < 8) {
    errors.push({ field: 'password', message: 'A senha deve ter no mínimo 8 caracteres' })
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({ field: 'password', message: 'A senha deve conter pelo menos uma letra maiúscula' })
  }

  if (!/[a-z]/.test(password)) {
    errors.push({ field: 'password', message: 'A senha deve conter pelo menos uma letra minúscula' })
  }

  if (!/[0-9]/.test(password)) {
    errors.push({ field: 'password', message: 'A senha deve conter pelo menos um número' })
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push({ field: 'password', message: 'A senha deve conter pelo menos um caractere especial' })
  }

  return errors
}

function validateName(name) {
  const errors = []

  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Nome é obrigatório' })
    return errors
  }

  if (/\d/.test(name)) {
    errors.push({ field: 'name', message: 'Nome não pode conter números' })
  }

  const specialCharsOrEmojiRegex = /[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/u
  if (specialCharsOrEmojiRegex.test(name)) {
    errors.push({ field: 'name', message: 'Nome não pode conter caracteres especiais ou emojis' })
  }

  if (name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Nome deve ter ao menos 2 caracteres' })
  }

  return errors
}



function validateEmail(email) {
  const errors = []

  if (!email || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email é obrigatório' })
    return errors
  }

  if (!validator.isEmail(email)) {
    errors.push({ field: 'email', message: 'Formato de email inválido' })
  }

  return errors
}

module.exports = { validateEmail, validateName, validatePassword };