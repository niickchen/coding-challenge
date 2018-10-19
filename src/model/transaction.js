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

  // TODO
  // find Transactions by query and grouped by user_id
  findByQueryAndGroupByUser: query => {
    return Transaction.aggregate([
      {$match: {...query, skipped: false}},
      {$group: {_id: '$user_id'}},
      {$project: {
        _id: '$user_id',
        
      }}
    ]).exec();
  },

  // get count by query
  getCountByQuery: query => {
    return Transaction.countDocuments(query);
  },

  /*
   * update transaction
   * @param {Object} query to locate the transaction
   * @param {Object} fields to be updated
   */
  update: (query, fields, opt) => {
    return Transaction.update(query, {$set: fields}, opt);
  },
};
