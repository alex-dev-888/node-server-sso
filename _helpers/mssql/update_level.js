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
    database: 'ND_GAME_0', //update me
  },
}

module.exports = updateLevel

function updateLevel(char_name, username, vat_pham) {
  let connection = new Connection(connectionCfg)
  connection.connect()
  connection.on('connect', function (err) {
    if (!err) {
      console.log('Connect DB ND_GAME_0 Success')
      console.log(
        `---Update level: char_name: ${char_name} - user_id: ${username} - vat_pham: ${vat_pham} --- PROCESS ---`
      )

      // Values contain variables idicated by '@' sign
      const sql = `Update [ND_GAME_0].[dbo].[ND_V01_CharacState] set inner_level = 0, chuyen_sinh = chuyen_sinh + 1, level_rate = 0 where unique_id = (Select unique_id from [ND_GAME_0].[dbo].[ND_V01_Charac] where chr_name=@char_name and user_id=@user_id) and inner_level>=162 and chuyen_sinh < 30`
      //  and level_rate >= 0.989

      const request = new Request(sql, (err, rowCount) => {
        if (err) {
          // throw err
          return
        }
        console.log('rowCount: ', rowCount)
        if (rowCount > 0) {
          console.log(
            `---Update level: char_name: ${char_name} - user_id: ${username} - vat_pham: ${vat_pham} --- SUCCESS ---`
          )

          // insert cai do vo
          const insertKTC = require('./insert_ktc.js')
          insertKTC(username, vat_pham)
        } else {
          console.log(
            `---Update level: char_name: ${char_name} - user_id: ${username} - vat_pham: ${vat_pham} --- FAILURE ---`
          )
        }
      })

      request.addParameter('char_name', TYPES.NVarChar, char_name)
      request.addParameter('user_id', TYPES.NVarChar, username)

      request.on('requestCompleted', () => {
        console.log('DONE! - Close Connection to DB ND_GAME_0')
        connection.close()
      })

      connection.execSql(request)
    } else {
      console.log('Connect to DB ND_GAME_0 failed')
      console.error(err)
    }
  })
}
