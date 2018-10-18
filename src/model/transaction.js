import Transaction from '../schema/transaction';

export default {
  // add a new Transaction
  add: tx => {
    return new Transaction(tx).save();
  },

  // find one Transaction by id
  getById: id => {
    return Transaction.findOne({_id: id}, null).lean();
  },

  // find one Transaction by trans_id
  getByTxId: trans_id => {
    return Transaction.findOne({trans_id}, null).lean();
  },

  // find one Transaction by query
  getByQuery: (query, opt) => {
    return Transaction.findOne(query, null, opt).lean();
  },

  // find Transactions by query
  findByQuery: (query, opt) => {
    return Transaction.find(query, null, opt).lean();
  },

  // get count by query
  getCountByQuery: query => {
    return Transaction.countDocuments(query);
  },

  /*
   * update transaction
   * @param {Object} conditions to locate the transaction
   * @param {Object} fields to be updated
   */
  update: (conditions, fields, opt) => {
    return Transaction.update(conditions, {$set: fields}, opt);
  },
};
