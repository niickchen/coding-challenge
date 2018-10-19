import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const PatternSchema = new Schema({
  company: {type: String, required: true},
  user_id: {type: String, required: true},
  last_transaction_id: {type: String},
  last_transaction_time: {type: Date},
  transactions: {type: [String]},
  created_at: {type: Date, default: Date.now},
  updated_at: {type: Date, default: Date.now},
  recurring: {type: Boolean, default: false},
  archived: {type: Boolean, default: false},
  average_amount: {type: Number, default: 0},
  average_interval: {type: Number, default: 0}, // milliseconds
});

PatternSchema.index({company: 1, user_id: 1});
PatternSchema.index({last_transaction_id: 1});

PatternSchema.pre('find', function(next) {
  // by default, don't return archived items
  if (typeof this._conditions.archived === 'undefined') {
    this._conditions.archived = false;
  }

  next();
});

PatternSchema.pre('findOne', function(next) {
  // by default, don't return archived items
  if (typeof this._conditions.archived === 'undefined') {
    this._conditions.archived = false;
  }

  next();
});

PatternSchema.pre('countDocuments', function(next) {
  // by default, don't count archived items
  if (typeof this._conditions.archived === 'undefined') {
    this._conditions.archived = false;
  }

  next();
});

export default mongoose.model('Pattern', PatternSchema);
