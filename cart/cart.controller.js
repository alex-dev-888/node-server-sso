const express = require('express')
const router = express.Router()
const Joi = require('joi')
const validateRequest = require('_middleware/validate-request')
const authorize = require('_middleware/authorize')
const Role = require('_helpers/role')
const cartService = require('./cart.service')

// routes
router.get('/list-deposit-bonus', authorize(), getListDepositBonus)
router.post(
  '/confirm-deposit',
  authorize(),
  confirmDepositSchema,
  confirmDeposit
)
router.get('/get-all-deposit', authorize(Role.Admin), getAllDeposit)
router.delete('/delete-deposit/:id', authorize(Role.Admin), deleteDeposit)
router.put('/active-deposit/:id', authorize(Role.Admin), activeDeposit)
router.get(
  '/get-all-deposit-by-user-id/:id',
  authorize(),
  getAllDepositByUserId
)

router.get('/list-ktc', authorize(), getListKTC)
router.post('/purchase', authorize(), confirmPurchaseSchema, confirmPurchase)
router.get(
  '/get-all-purchase-by-user-id/:id',
  authorize(),
  getAllPurchaseByUserId
)

module.exports = router

function getListDepositBonus(req, res, next) {
  cartService
    .getListDepositBonus()
    .then((items) => res.json(items))
    .catch(next)
}

function confirmDepositSchema(req, res, next) {
  const schema = Joi.object({
    orderId: Joi.string().required(),
    userId: Joi.string().required(),
    amount: Joi.number().integer().min(1),
    bank: Joi.string().required(),
  })
  validateRequest(req, next, schema)
}

function confirmDeposit(req, res, next) {
  cartService
    .confirmDeposit(req.body, req.get('origin'))
    .then(() =>
      res.json({
        message:
          'Xác nhận chuyển tiền thành công. Vui lòng đợi chúng tôi kiểm tra và phê duyệt.====',
      })
    )
    .catch(next)
}

function getAllDeposit(req, res, next) {
  cartService
    .getAllDeposit()
    .then((depositList) => res.json(depositList))
    .catch(next)
}

function deleteDeposit(req, res, next) {
  cartService
    .deleteDeposit(req.params.id)
    .then(() => res.json({ message: 'Deposit deleted successfully' }))
    .catch(next)
}

function activeDeposit(req, res, next) {
  cartService
    .activeDeposit(req.params.id, req.body)
    .then((deposit) => res.json(deposit))
    .catch(next)
}

function getAllDepositByUserId(req, res, next) {
  // users can get their own account and admins can get any account
  if (req.params.id !== req.user.id && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  cartService
    .getAllDepositByUserId(req.params.id)
    .then((depositList) =>
      depositList ? res.json(depositList) : res.sendStatus(404)
    )
    .catch(next)
}

function getAllPurchaseByUserId(req, res, next) {
  // users can get their own account and admins can get any account
  if (req.params.id !== req.user.id && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  cartService
    .getAllPurchaseByUserId(req.params.id)
    .then((purchaseList) =>
      purchaseList ? res.json(purchaseList) : res.sendStatus(404)
    )
    .catch(next)
}

function getListKTC(req, res, next) {
  cartService
    .getListKTC()
    .then((items) => res.json(items))
    .catch(next)
}

function confirmPurchaseSchema(req, res, next) {
  const schema = Joi.object({
    orderId: Joi.string().required(),
    orderName: Joi.string().required(),
    userId: Joi.string().required(),
    amount: Joi.number().integer().min(1),
    type: Joi.string().empty(''),
    chr_name: Joi.string().empty(''),
  })
  validateRequest(req, next, schema)
}

function confirmPurchase(req, res, next) {
  cartService
    .confirmPurchase(req.body, req.get('origin'))
    .then(() =>
      res.json({
        message: 'Cám ơn bạn đã mua vật phẩm.',
      })
    )
    .catch(next)
}
