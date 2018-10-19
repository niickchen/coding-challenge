import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  trans_id: {type: String, unique: true, required: true},
  user_id: {type: String, required: true},
  name: {type: String, required: true},
  amount: {type: Number, required: true},
  company: {type: String},
  date: {type: Date, required: true},
  created_at: {type: Date, default: Date.now},
  updated_at: {type: Date, default: Date.now},
  skipped: {type: Boolean, default: false},
});

TransactionSchema.index({company: 1});
TransactionSchema.index({name: 1});
TransactionSchema.index({user_id: 1});
TransactionSchema.index({trans_id: 1}, {unique: true});

TransactionSchema.pre('find', function(next) {
  // by default, don't return skipped items
  if (typeof this._conditions.skipped === 'undefined') {
    this._conditions.skipped = false;
  }

  next();
});

TransactionSchema.pre('findOne', function(next) {
  // by default, don't return skipped items
  if (typeof this._conditions.skipped === 'undefined') {
    this._conditions.skipped = false;
  }

  next();
});

TransactionSchema.pre('countDocuments', function(next) {
  // by default, don't count skipped items
  if (typeof this._conditions.skipped === 'undefined') {
    this._conditions.skipped = false;
  }

  next();
});

export default mongoose.model('Transaction', TransactionSchema);