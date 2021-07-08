const config = require('config.json')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const sendEmail = require('_helpers/send-email')
const db = require('_helpers/db')
const Role = require('_helpers/role')

var data = require('../_resource/data')
var all_chr = require('../public/ranks/all_chr.json')

module.exports = {
  getListDepositBonus,
  confirmDeposit,
  getAllDeposit,
  deleteDeposit,
  activeDeposit,
  getAllDepositByUserId,
  getListKTC,
  confirmPurchase,
  getAllPurchaseByUserId,
}

async function getListDepositBonus() {
  return data.deposit_bonus
}

async function confirmDeposit(params, origin) {
  // validate
  const checkOrderId = await db.Deposit.findOne({ orderId: params.orderId })
  if (checkOrderId) {
    // send already registered error in email to prevent account enumeration
    throw 'Đơn hàng đã tồn tại.'
  }

  // create account object
  var deposit = new db.Deposit(params)
  const coin = data.deposit_bonus
    .filter((item) => item.price === params.amount)
    .map((result) => (deposit.coin_receive = result.coin))

  // save deposit
  await deposit.save()
}

async function confirmPurchase(params, origin) {
  // validate
  const vat_pham = data.KTC.filter(
    (item) => parseInt(item.id) === parseInt(params?.orderId)
  )

  if (vat_pham.length !== 1) {
    throw 'Không tồn tại vật phẩm này.'
  }

  const account = await db.Account.findById(params.userId)
  if (!account) throw 'Không tìm thấy Account'

  if (parseInt(account.coin) < parseInt(vat_pham[0].amount)) {
    throw 'Bạn không đủ coin để giao dịch. Vui lòng nạp thêm.'
  }

  account.coin = parseInt(account.coin) - parseInt(vat_pham[0].price)
  await account.save()

  var ktc = new db.KTC(params)
  await ktc.save()

  if (params?.type === 'CS') {
    const filterItem = all_chr.filter((item) => {
      if (
        item?.chr_name === params?.chr_name &&
        item?.user_id === account?.username
      ) {
        return item
      }
    })

    if (filterItem === null || filterItem.length == 0) {
      throw 'Kiểm tra lại tài khoản hoặc bạn không đủ cấp độ yêu cầu'
    }

    if (parseInt(filterItem[0]?.chuyen_sinh) == 30) {
      throw 'Bạn đã vượt quá 30 lần chuyển sinh rồi.'
    }

    const csChar = await db.CS.findOne({
      userId: params?.userId,
      chr_name: params?.chr_name,
    })

    if (csChar) {
      // Ko giới hạn số lần, nhưng ko có cái gì để đổi nữa cả.
      // if (csChar.chuyen_sinh > 1) {
      //   throw 'Số lần chuyển sinh không được vượt quá 30 lần'
      // }

      csChar.chuyen_sinh = csChar.chuyen_sinh + 1
      await csChar.save()
    } else {
      let cs = new db.CS({
        userId: params?.userId,
        chr_name: params?.chr_name,
        chuyen_sinh: 1,
      })
      await cs.save()
    }
    const updateLevel = require('../_helpers/mssql/update_level.js')
    updateLevel(ktc.chr_name, account.username, params?.orderId)
  } else {
    const insertKTC = require('../_helpers/mssql/insert_ktc.js')
    insertKTC(account.username, params?.orderId)
  }
}

async function getAllDeposit() {
  const depositList = await db.Deposit.find()
    .populate('userId')
    .sort({ created: -1 })

  return depositList
}

async function getAllDepositByUserId(id) {
  const depositList = await db.Deposit.find({})
    .where('userId')
    .equals(id)
    .populate('userId')
    .sort({ created: -1 })

  return depositList
}

async function getAllPurchaseByUserId(id) {
  const purchaseList = await db.KTC.find({})
    .where('userId')
    .equals(id)
    .populate('userId')
    .sort({ created: -1 })

  return purchaseList
}

async function deleteDeposit(id) {
  const deposit = await getDeposit(id)
  await deposit.remove()
}

async function activeDeposit(id, params) {
  const deposit = await getDeposit(id)

  deposit.isActived = true
  deposit.updated = Date.now()

  const account = await db.Account.findById(deposit.userId)
  if (!account) throw 'Không tìm thấy Account'

  account.coin += deposit.coin_receive

  await account.save()
  await deposit.save()
  return deposit
}

async function getListKTC() {
  return data.KTC
}

// helper functions
async function getDeposit(id) {
  if (!db.isValidId(id)) throw 'Không tìm thấy Deposit'
  const deposit = await db.Deposit.findById(id)
  if (!deposit) throw 'Không tìm thấy Deposit'
  return deposit
}
