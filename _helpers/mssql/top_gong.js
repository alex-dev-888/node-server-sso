const config = require('config.json')

let Connection = require('tedious').Connection
let Request = require('tedious').Request
var TYPES = require('tedious').TYPES

const fs = require('fs')

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

module.exports = executeTopGong

function executeTopGong() {
  let connection = new Connection(connectionCfg)
  connection.connect()
  connection.on('connect', function (err) {
    if (!err) {
      console.log('Connect DB NineDragons_Account - Process Top Gong Success')
      var sql = `SELECT TOP 50 [chr_name], [party], [class], [class_grade], [delete_flag], [inner_level], [honor], [gong], [level_rate], [chuyen_sinh], [final_level] FROM [ND_GAME_0].[dbo].[VIEW_ALL_CHAR_WEB] where gm = 0 and delete_flag = 0 and gong > 0 order by gong desc`

      request = new Request(sql, function (err, rowCount) {
        if (err) {
          console.log(err)
        } else {
          console.log(rowCount + ' rows')
        }
      })

      const result = []
      request.on('row', function (columns) {
        var obj = {}
        columns.forEach(function (column) {
          if (column.value !== null) {
            var key = column.metadata.colName
            var val = column.value
            obj[key] = val
          }
        })
        result.push(obj)
      })

      request.on('requestCompleted', function (rowCount, more, rows) {
        // console.log('JSON: ', JSON.stringify(result))
        fs.writeFileSync('./public/ranks/top_gong.json', JSON.stringify(result))
        return result
      })

      connection.execSql(request)

      request.on('requestCompleted', () => {
        console.log('DONE! - Close Connection to DB CIS_DB - Process Top Gong')
        connection.close()
        return 0
      })
    } else {
      console.log('Connect to DB CIS_DB failed')
      console.error(err)
    }
  })
}
