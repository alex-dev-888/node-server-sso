const config = require('config.json')

let Connection = require('tedious').Connection
let Request = require('tedious').Request
var TYPES = require('tedious').TYPES

let connectionCfg = {
  server: config.MSSQL_SERVER, //update me
  authentication: {
    type: 'default',
    options: {
      userName: config.MSSQL_SERVER_USERNAME, //update me
      password: config.MSSQL_SERVER_PWD, //update me
    },
  },
  options: {
    // If you are on Microsoft Azure, you need encryption:
    encrypt: true,
    cryptoCredentialsDetails: {
      minVersion: 'TLSv1',
    },
    database: 'NineDragons_Account', //update me
  },
}

module.exports = updatePwd

function updatePwd(username, password) {
  console.log(`---Update password: ${username} - ${password}--- PROCESS ---`)
  let connection = new Connection(connectionCfg)
  connection.connect()
  connection.on('connect', function (err) {
    if (!err) {
      console.log('Connect DB NineDragons_Account Success')

      request = new Request('[dbo].[pr_Update_ND_Account]', (err, rowCount) => {
        if (err) {
          console.error(err)
          return 1 //Create request instance failed
        }
      })

      request.addParameter('user_id', TYPES.VarChar, username)
      request.addParameter('pwd', TYPES.VarChar, password)

      request.on('doneProc', function (rowCount, more, returnStatus, rows) {})

      request.on('returnValue', (paramName, value, metadata) => {
        console.log(paramName + ' : ' + value)
      })

      request.on('doneInProc', function (rowCount, more, rows) {
        console.log('Rooooooowww')
        console.log(rows)
      })

      request.on('requestCompleted', () => {
        console.log('DONE! - Close Connection to DB NineDragons_Account')
        connection.close()
        return 0
      })

      connection.callProcedure(request)
    } else {
      console.log('Connect to DB NineDragons_Account failed')
      console.error(err)
    }
  })
}
