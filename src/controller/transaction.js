import dayjs from 'dayjs';
import Transaction from '../model/transaction';
import helper from '../helper/helper';
import Pattern from '../model/pattern';

const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const INTERVAL_ACCEPTABLE_ERROR = 6 * ONE_DAY;
const TRANSACTION_FIELDS = ['trans_id', 'user_id', 'name', 'amount', 'date'];
const INTERVAL_ACCEPTABLE_VALUES_IN_DAYS = [5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17, 18, 28, 29, 30, 31, 32, 33, 34, 85, 86, 87, 
    88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 359, 360, 361, 
    362, 363, 364, 365, 366, 367, 368, 369, 370, 371];

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

function updatePattern(transId, amount, date, pattern) {
    const interval = Math.abs(date - pattern.last_transaction_time);
    const newAvgInterval = (pattern.average_interval * (pattern.transactions.length - 1) + interval) / pattern.transactions.length;
    const trans = pattern.transactions;
    trans.push(transId);
    
    return Pattern.update(
        {_id: pattern._id},
        {
            last_transaction_time: date,
            last_transaction_id: transId,
            transactions: trans,
            updated_at: Date.now(),
            average_interval: newAvgInterval,
            amount_pattern: [], // TODO
            recurring: true,
        },
    );
}

async function detectPattern(company, userId, transId, amount, date) {
    const pattern = await Pattern.getByCompanyAndUser(company, userId);

    if (!pattern) {
        Pattern.add({
            company,
            user_id: userId,
            last_transaction_id: transId,
            last_transaction_time: date,
            transactions: [transId],
            amount_pattern: [amount],
            average_interval: 0,
        }).catch(e => console.log(e));
        return;
    }

    // TODO compare amount
    if (pattern.recurring) {
        let interval = Math.abs(date - pattern.last_transaction_time);
        if (interval < pattern.average_interval + INTERVAL_ACCEPTABLE_ERROR 
            && interval > pattern.average_interval - INTERVAL_ACCEPTABLE_ERROR) {
                await updatePattern(transId, amount, date, pattern);
            }

        else {
            // it's okay to miss one time
            interval = interval / 2;
            if (interval < pattern.average_interval + INTERVAL_ACCEPTABLE_ERROR 
                && interval > pattern.average_interval - INTERVAL_ACCEPTABLE_ERROR) {
                    await updatePattern(transId, amount, date, pattern);
                }
            // if past expected time
            else if (Math.abs(date - pattern.last_transaction_time) >= pattern.average_interval + INTERVAL_ACCEPTABLE_ERROR) {
                await skip(pattern);
            }
            // maybe one-time purchase
            else {
                // not add into this pattern
                // TODO: TBD
                return;
            }
        }
    }

    else {
        if (pattern.transactions.length == 1) {
            const dayInterval = Math.round(Math.abs(date - pattern.last_transaction_time) / ONE_DAY);
            // TODO add number range
            if (INTERVAL_ACCEPTABLE_VALUES_IN_DAYS.includes(dayInterval)) {
                await updatePattern(transId, amount, date, pattern);
            }
            else {
                // TODO add to a new list, also change Pattern.get to pattern.find
            }
        }
        // a group of non-occuring transactions
        else {
            
            // TODO i dont think theres cases like this
        }
    }
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
