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
    database: 'CIS_DB', //update me
  },
}

module.exports = insertKTC

function insertKTC(userID, vat_pham_id) {
  console.log(`---Insert KTC: ${userID} - ${vat_pham_id}-----`)
  let connection = new Connection(connectionCfg)
  connection.connect()
  connection.on('connect', function (err) {
    if (!err) {
      console.log('Connect DB CIS_DB Success')

      request = new Request('[dbo].[Sp_Purchase_Using]', (err, rowCount) => {
        if (err) {
          console.error(err)
          return 1 //Create request instance failed
        }
      })

      request.addParameter('user_id', TYPES.VarChar, userID)
      request.addParameter('cart_itemCode', TYPES.Int, vat_pham_id)
      request.addParameter('game_server', TYPES.Int, 0)
      request.addParameter('item_price', TYPES.Int, 0)
      request.addParameter('order_idx', TYPES.Int, null)
      request.addParameter('v_error', TYPES.Int, 0)

      request.on('doneProc', function (rowCount, more, returnStatus, rows) {
        // console.log(rowCount)
        // console.log(more)
        // console.log(rows)
      })

      request.on('returnValue', (paramName, value, metadata) => {
        console.log(paramName + ' : ' + value)
      })

      request.on('doneInProc', function (rowCount, more, rows) {
        console.log('Rooooooowww', rows)
      })

      request.on('requestCompleted', () => {
        console.log('DONE! - Close Connection to DB CIS_DB')
        connection.close()
        return 0
      })

      connection.callProcedure(request)
    } else {
      console.log('Connect to DB CIS_DB failed')
      console.error(err)
    }
  })
}
