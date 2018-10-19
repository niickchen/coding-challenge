import Pattern from '../schema/pattern';

export default {
  // add a new Pattern
  add: pt => {
    return new Pattern(pt).save();
  },

  // find one Pattern by id
  getById: id => {
    return Pattern.findOne({_id: id}, null).lean();
  },

  // find one Pattern by company and user_id
  getByCompanyAndUser: (company, user_id) => {
    return Pattern.findOne({company, user_id}, null).lean();
  },

  // find one Pattern by last_transaction_id
  getByLastTxId: last_transaction_id => {
    return Pattern.findOne({last_transaction_id}, null).lean();
  },

  // find one Pattern by query
  getByQuery: (query, opt) => {
    return Pattern.findOne(query, null, opt).lean();
  },

  // find Patterns by query
  findByQuery: (query, opt) => {
    return Pattern.find(query, null, opt).lean();
  },

  // get count by query
  getCountByQuery: query => {
    return Pattern.countDocuments(query);
  },

  /*
   * update Pattern
   * @param {Object} query to locate the Pattern
   * @param {Object} fields to be updated
   */
  update: (query, fields, opt) => {
    return Pattern.update(query, {$set: fields}, opt);
  },
};
