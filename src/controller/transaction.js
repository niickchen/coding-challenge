import dayjs from 'dayjs';
import Transaction from '../model/transaction';
import helper from './helper';
import Pattern from '../model/pattern';
import {detectPattern} from './pattern';
import {INTERVAL_ACCEPTABLE_ERROR, TRANSACTION_FIELDS} from './constants';

const PULL_DATE = new Date('2018-08-10'); // for testing TODO change to Date.now()


async function upsertHandler(req, res) {
    // get and parse post request parameters
    const transactions = req.body.transactions;

    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let transaction of transactions) {
        await upsertOneTx(transaction);
    }

    const ret = await getRecurring(); // TODO company should be updated company list
    if (!ret.ok) res.status(400).send({recurring_trans: []})
    else res.send({recurring_trans: ret.recurring_trans});
}

function upsertOneTx(transaction) {
    if (!transaction) {
        console.log('Empty transaction');
        return;
    }

    const {name, amount} = transaction;
    const dateobj = transaction.date;
    const date = dateobj instanceof Date ? dateobj : new Date(dateobj);
    const userId = transaction.user_id;
    const transId = transaction.trans_id;
    if (!transId || !userId || !name || !date || (amount === undefined && typeof amount === 'undefined')) {
        console.log(`Missing parameters for transaction ${transId || 'unknown'} (${name || 'unknown name'})`);
        return;
    }

    // extract company name from tx name
    const endingDigitsRegex = /[ 0-9]*$/g;
    const mixOfABAndDigitsRegex = /([0-9]+[a-zA-Z]+|[a-zA-Z]+[0-9]+)[0-9a-zA-Z]*/g;
    const company = name.replace(endingDigitsRegex, '').replace(mixOfABAndDigitsRegex, '').trim().replace(/ +/g, ' ').toLowerCase();
    return Transaction.add({
        trans_id: transId,
        user_id: userId,
        name,
        amount,
        date,
        company,
    }).then(() => detectPattern(company, userId, transId, amount, date), e => console.log(e));
}

async function getRecurringHandler(req, res) {
    const ret = await getRecurring();
    if (!ret.ok) res.status(400).send({recurring_trans: []});
    else res.send({recurring_trans: ret.recurring_trans});
}

// TODO remove skipped field
// skip this pattern and all transactions under this pattern
function skip(pattern) {
    return Pattern.update({_id: pattern._id}, {recurring: false, skipped: true, updated_at: Date.now()}).then(
        () =>  Promise.all(pattern.transactions, transId => {
            return Transaction.update({trans_id: transId}, {skipped: true, updated_at: Date.now()});
        })
    );
}

async function getRecurring() {
    return Pattern.findByQuery({recurring: true}).then(patterns => {
        if (!patterns) return {ok: true, recurring_trans: {}};

        const companyTxDict = {}; // key: company, value: recurring transactions under the company by all users
        return Promise.each(patterns, pattern => {
            if (!pattern || !pattern.transactions || pattern.transactions.length < 1) return;

            // if did not pass next predicted date
            if (PULL_DATE - pattern.last_transaction_time < pattern.average_interval + INTERVAL_ACCEPTABLE_ERROR) {
                companyTxDict[pattern.company] = companyTxDict[pattern.company] || [];
                return Promise.each(pattern.transactions, transId => {
                    return Transaction.getByTxId(transId).then(tx => companyTxDict[pattern.company].push(tx));
                });

            } else return skip(pattern);
        }).then(() => {

            const recurring_trans = [];

            for (let [company, trans] of Object.entries(companyTxDict)) {
                trans.sort((a, b) => b.date - a.date) // sort by date in descending order
                const latestTransaction = trans[0];
                recurring_trans.push({
                    name: latestTransaction.name,
                    user_id: latestTransaction.user_id,
                    next_amt: 1, // TODO
                    next_date: 1, // TODO
                    transactions: helper.keepFields(trans, TRANSACTION_FIELDS),
                })
            }
            recurring_trans.sort((a, b) => a.name.localeCompare(b.name)); // sort by name
            return {ok: true, recurring_trans};
        });
    }, err => {
        console.log(err);
        return {ok: false};
    });
}

export default {
    upsertHandler, getRecurringHandler,
};