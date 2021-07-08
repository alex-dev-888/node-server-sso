require('rootpath')()
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const errorHandler = require('_middleware/error-handler')
const { setRandomFallback } = require('bcryptjs')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())

// allow cors requests from any origin and with credentials
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
)

// api routes
app.use('/accounts', require('./accounts/accounts.controller'))

// cart routes
app.use('/cart', require('./cart/cart.controller'))

// swagger docs route
// app.use('/api-docs', require('_helpers/swagger'))

app.use('/images', express.static(__dirname + '/public/ktc'))

app.use('/news', express.static(__dirname + '/public/news/news.json'))

app.use(
  '/top-level',
  express.static(__dirname + '/public/ranks/top_level.json')
)
app.use(
  '/top-honor',
  express.static(__dirname + '/public/ranks/top_honor.json')
)
app.use('/top-gong', express.static(__dirname + '/public/ranks/top_gong.json'))
app.use('/all-chr', express.static(__dirname + '/public/ranks/all_chr.json'))

// global error handler
app.use(errorHandler)

// app.use('/rank', require('./_helpers/mssql/rank.js'))

monitor = setInterval(() => {
  const executeTopLevel = require('./_helpers/mssql/top_level.js')
  executeTopLevel()
  const executeTopHonor = require('./_helpers/mssql/top_honor.js')
  executeTopHonor()
  const executeTopGong = require('./_helpers/mssql/top_gong.js')
  executeTopGong()
}, 30 * 60 * 1000)

monitor2 = setInterval(() => {
  const executeAllChr = require('./_helpers/mssql/all_chr.js')
  executeAllChr()
}, 15 * 60 * 1000)

// require('./_helpers/mssql/mssql.js')
// const result = await createNewAccount('deru20', '101010')
// console.log('result: ', result)

// const createNewAccount = require('./_helpers/mssql_v2/create_account.js')
// const result = await createNewAccount('deru20', '101010')
// console.log('result: ', result)

// const updateLevel = require('./_helpers/mssql/update_level.js')
// const returnValue = updateLevel('201101', '__gau__', 2200001)
// console.log('Update level: ', returnValue)

// const createNewAccount = require('./_helpers/mssql/create_account.js')
// createNewAccount('deru12', '101010')

// const createNewAccount = require('./_helpers/create_account')
// const resultValue = await createNewAccount('deru', '101010')
// console.log('ResultValue: ', resultValue)

// start server
const port =
  process.env.NODE_ENV === 'production' ? process.env.PORT || 80 : 4000
app.listen(port, () => {
  console.log('Server listening on port ' + port)
})
