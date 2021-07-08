const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema({
  orderId: { type: String, unique: true, required: true },
  amount: { type: Number, required: true, default: 0 },
  coin_receive: { type: Number, required: true, default: 0 },
  bank: { type: String, required: true },
  // username: { type: Schema.Types.ObjectId, ref: 'Account' },
  userId: { type: Schema.Types.ObjectId, ref: 'Account' },
  isActived: { type: Boolean, default: false },
  created: { type: Date, default: Date.now },
  updated: Date,
})

// schema.virtual('isActived').get(function () {
//   return this.isActived
// })

schema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    // remove these props when object is serialized
    delete ret._id
    // delete ret.passwordHash
  },
})

module.exports = mongoose.model('Deposit', schema)
