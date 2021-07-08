const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema({
  orderId: { type: String, required: true },
  orderName: { type: String, required: true },
  amount: { type: Number, required: true, default: 0 },
  type: { type: String, default: '' },
  userId: { type: Schema.Types.ObjectId, ref: 'Account' },
  chr_name: { type: String },
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

module.exports = mongoose.model('KTC', schema)
