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
});

TransactionSchema.index({trans_id: 1}, {unique: true});
TransactionSchema.index({company: 1});
TransactionSchema.index({name: 1});
TransactionSchema.index({user_id: 1});

export default mongoose.model('Transaction', TransactionSchema);
