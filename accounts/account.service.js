const config = require('config.json')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const sendEmail = require('_helpers/send-email')
const db = require('_helpers/db')
const Role = require('_helpers/role')

module.exports = {
  authenticate,
  refreshToken,
  revokeToken,
  register,
  // verifyEmail,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getAll,
  getById,
  create,
  update,
  delete: _delete,
}

async function authenticate({ username, password, ipAddress }) {
  const account = await db.Account.findOne({ username })

  if (
    !account ||
    !account.isVerified ||
    //password !== account.passwordHash
    !bcrypt.compareSync(password, account.passwordHash)
  ) {
    throw 'Tên đăng nhập hoặc mật khẩu không đúng.'
  }

  // authentication successful so generate jwt and refresh tokens
  const jwtToken = generateJwtToken(account)
  const refreshToken = generateRefreshToken(account, ipAddress)

  // save refresh token
  await refreshToken.save()

  // return basic details and tokens
  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: refreshToken.token,
  }
}

async function refreshToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token)
  const { account } = refreshToken

  // replace old refresh token with a new one and save
  const newRefreshToken = generateRefreshToken(account, ipAddress)
  refreshToken.revoked = Date.now()
  refreshToken.revokedByIp = ipAddress
  refreshToken.replacedByToken = newRefreshToken.token
  await refreshToken.save()
  await newRefreshToken.save()

  // generate new jwt
  const jwtToken = generateJwtToken(account)

  // return basic details and tokens
  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: newRefreshToken.token,
  }
}

async function revokeToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token)

  // revoke token and save
  refreshToken.revoked = Date.now()
  refreshToken.revokedByIp = ipAddress
  await refreshToken.save()
}

async function register(params, origin) {
  // validate
  const checkAccount = await db.Account.findOne({ username: params.username })
  if (checkAccount) {
    throw `Tên đăng nhập ${params.username} đã tồn tại`
    // send already registered error in email to prevent account enumeration
    // return await sendAlreadyRegisteredEmail(checkAccount.email, origin)
  }

  // create account object
  const account = new db.Account(params)
  account.verified = Date.now()
  account.verificationToken = undefined

  // first registered account is an admin
  const isFirstAccount = (await db.Account.countDocuments({})) === 0
  if (isFirstAccount) account.coin = 20000000 // 20 ty
  account.role = isFirstAccount ? Role.Admin : Role.User
  account.verificationToken = randomTokenString()

  // hash password
  account.passwordHash = hash(params.password)

  // save account
  await account.save()

  if (account.role === Role.User) {
    // save to mssql
    createAccountOnMSSQL(account, params.password)
  }

  // send email
  // dont send email when register bcz limit 500 emails/day with Gmail. Only send when reset pass.
  // await sendVerificationEmail(account, origin)
}

// async function verifyEmail({ token }) {
//   const account = await db.Account.findOne({ verificationToken: token })

//   if (!account) throw 'Xác thực lỗi.'

//   account.verified = Date.now()
//   account.verificationToken = undefined

//   // save to mssql
//   createAccountOnMSSQL(account)

//   await account.save()
// }

function createAccountOnMSSQL(account, password) {
  if (account.role === Role.User) {
    const createNewAccount = require('../_helpers/mssql/create_account.js')
    createNewAccount(account.username, password)
  }
}

async function forgotPassword({ email }, origin) {
  const account = await db.Account.findOne({ email })

  // always return ok response to prevent email enumeration
  if (!account) return

  // create reset token that expires after 24 hours
  account.resetToken = {
    token: randomTokenString(),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }
  await account.save()

  // send email
  await sendPasswordResetEmail(account, origin)
}

async function validateResetToken({ token }) {
  const account = await db.Account.findOne({
    'resetToken.token': token,
    'resetToken.expires': { $gt: Date.now() },
  })

  if (!account) throw 'Sai token'
}

async function resetPassword({ token, password }) {
  const account = await db.Account.findOne({
    'resetToken.token': token,
    'resetToken.expires': { $gt: Date.now() },
  })

  if (!account) throw 'Sai token'

  // update password and remove reset token
  account.passwordHash = hash(password)
  account.passwordReset = Date.now()
  account.resetToken = undefined
  await account.save()

  const updatePwd = require('../_helpers/mssql/update_password.js')
  updatePwd(account.username, password)
}

async function getAll() {
  const accounts = await db.Account.find()
  return accounts.map((x) => basicDetails(x))
}

async function getById(id) {
  const account = await getAccount(id)
  return basicDetails(account)
}

async function create(params) {
  // validate
  if (await db.Account.findOne({ username: params.username })) {
    throw `Tên đăng nhập ${params.username} đã tồn tại`
  }

  const account = new db.Account(params)
  account.verified = Date.now()
  account.verificationToken = undefined

  // hash password
  account.passwordHash = hash(params.password)

  // save account
  await account.save()

  // save to mssql
  createAccountOnMSSQL(account, params.password)

  return basicDetails(account)
}

async function update(id, params) {
  const account = await getAccount(id)

  // validate (if username was changed)
  if (params.username && account.username !== params.username) {
    throw `Tên đăng nhập không ${params.email} được thay đổi`
  }

  // validate (if email was changed)
  if (
    params.email &&
    account.email !== params.email &&
    (await db.Account.findOne({ email: params.email }))
  ) {
    throw 'Email "' + params.email + '" đã được sử dụng'
  }

  // hash password if it was entered
  if (params.password) {
    params.passwordHash = hash(params.password)
  }

  // copy params to account and save
  Object.assign(account, params)
  account.updated = Date.now()
  await account.save()

  if (params.password) {
    // update in MSSQL
    const updatePwd = require('../_helpers/mssql/update_password.js')
    updatePwd(account.username, params.password)
  }

  return basicDetails(account)
}

async function _delete(id) {
  const account = await getAccount(id)
  await account.remove()
}

// helper functions

async function getAccount(id) {
  if (!db.isValidId(id)) throw 'Không tìm thấy tài khoản'
  const account = await db.Account.findById(id)
  if (!account) throw 'Không tìm thấy tài khoản'
  return account
}

async function getRefreshToken(token) {
  const refreshToken = await db.RefreshToken.findOne({ token }).populate(
    'account'
  )
  if (!refreshToken || !refreshToken.isActive) throw 'Sai token'
  return refreshToken
}

function hash(password) {
  return bcrypt.hashSync(password, 10)
  // return password
}

function generateJwtToken(account) {
  // create a jwt token containing the account id that expires in 15 minutes
  return jwt.sign({ sub: account.id, id: account.id }, config.secret, {
    expiresIn: '15m',
  })
}

function generateRefreshToken(account, ipAddress) {
  // create a refresh token that expires in 7 days
  return new db.RefreshToken({
    account: account.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByIp: ipAddress,
  })
}

function randomTokenString() {
  return crypto.randomBytes(40).toString('hex')
}

function basicDetails(account) {
  const { id, username, email, role, created, updated, isVerified, coin } =
    account
  return {
    id,
    username,
    email,
    role,
    created,
    updated,
    isVerified,
    coin,
  }
}

async function sendVerificationEmail(account, origin) {
  let message
  if (origin) {
    const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`
    message = `<p>Click vào link dưới để xác thực tài khoản đăng nhập:</p>
                   <p><a href="${verifyUrl}">${verifyUrl}</a></p>`
  } else {
    message = `<p>Dùng token bên dưới để xác thực email <code>/account/verify-email</code> api route:</p>
                   <p><code>${account.verificationToken}</code></p>`
  }

  await sendEmail({
    to: account.email,
    subject: 'Cửu long VNG - Xác thực tài khoản',
    html: `<h4>Xác thực tài khoản</h4>
               <p>Cảm ơn bạn đã đăng ký!</p>
               ${message}`,
  })
}

async function sendAlreadyRegisteredEmail(email, origin) {
  let message
  if (origin) {
    message = `<p>Nếu bạn không nhớ mật khẩu, vui lòng truy cập chức năng <a href="${origin}/account/forgot-password">quên mật khẩu</a>.</p>`
  } else {
    message = `<p>Nếu bạn không nhớ mật khẩu, bạn có thể reset tại <code>/account/forgot-password</code> api route.</p>`
  }

  await sendEmail({
    to: email,
    subject: 'Cửu long VNG - Email đã được đăng ký',
    html: `<h4>Email đã được đăng ký</h4>
               <p>Email <strong>${email}</strong> đã được đăng ký.</p>
               ${message}`,
  })
}

async function sendPasswordResetEmail(account, origin) {
  let message
  if (origin) {
    const resetUrl = `${origin}/account/reset-password?token=${account.resetToken.token}`
    message = `<p>Dùng link dưới để reset Mật khẩu, link dưới có thời hạn trong vòng 1 ngày:</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>`
  } else {
    message = `<p>Dùng token này để reset mật khẩu <code>/account/reset-password</code> api route:</p>
                   <p><code>${account.resetToken.token}</code></p>`
  }

  await sendEmail({
    to: account.email,
    subject: 'Cửu long VNG - Reset mật khẩu',
    html: `<h4>Reset Mật khẩu</h4>
               ${message}`,
  })
}
