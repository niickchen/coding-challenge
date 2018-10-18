import dayjs from 'dayjs';
import Transaction from '../model/transaction';
import helper from '../helper/helper';

async function upsert(req, res) {
    // get and parse post request parameters
    const transactions = req.body.transactions;
    for (let transaction of transactions) {
        upsertOneTx(transaction).catch(e => console.log(e));
    }

    const ret = await getRecurringOfUser(1); // TODO user id, company should be updated company list
    if (!ret.ok) res.status(400).send({recurring_trans: []})
    else res.send({recurring_trans: ret.recurring_trans});
}

function upsertOneTx(transaction) {
    if (!transaction) {
        console.log('Invalid transaction');
        return;
    }
    const {name, date, amount} = transaction;
    const userId = transaction.user_id;
    const transId = transaction.trans_id;
    if (!transId || !userId || !name || !amount || !date) {
        console.log(`Missing parameters for the POST request - transaction ${transId || 'unknown'} (${name || 'unknown name'})`);
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
        date: date instanceof Date ? date : new Date(date),
        company,
    });

}

async function getRecurring(req, res) {
    const userId = req.query.user_id;
    const ret = await getRecurringOfUser(userId);
    if (!ret.ok) res.status(400).send({recurring_trans: []})
    else res.send({recurring_trans: ret.recurring_trans});
}

// TODO user ids
function getRecurringOfUser(userId, newTxCompany = null) {
    return Transaction.findByQuery({user_id: userId, recurring: true}).then(txs => {
        if (!txs) return {ok: true, recurring: {}};
        const ret = {};
        const newCompanyTx = [];
        txs.forEach(tx => {
            if (!newTxCompany || tx.company != newTxCompany) {
                ret[tx.company] = ret[tx.company] || [];
                ret[tx.company].push(tx);
            } else newCompanyTx.push(tx);
        });

        newCompanyTx.sort((a, b) => a.date - b.date);
        const dayjsTx = newCompanyTx.map(t => dayjs(t.date));
        let intervals = [];
        let sum = 0, min = 100000, max = -1, avg = 0;
        for (let i = 1; i < dayjsTx.length; i++) {
            const interval = dayjsTx[i].diff(dayjsTx[i - 1], 'days');
            intervals.push(interval);
            sum += interval;
            avg = sum * 1.0 / i;
            min = Math.min(min, interval);
            max = Math.max(max, interval);
        }

        if (max - avg > 2 || avg - min > 2) {
            Promise.map(newCompanyTx, tx => Transaction.update(trans_id === tx.trans_id, {recurring: false}));
        };

        const keys = (Object.keys(ret));
        keys.sort((a, b) => a.name - b.name);
        const recurring = [];
        for (let key of keys) {
            ret[key].sort((a, b) => b.date - a.date);
            const firstElement = ret[key][0];
            recurring.push({
                name: firstElement.name,
                user_id: firstElement.user_id,
                next_amt: firstElement.average_amount,
                next_date: dayjs(firstElement.date).add(firstElement.average_interval, 'day').toDate(),
                transactions: helper.keepFields(ret[key], ['trans_id', 'user_id', 'name', 'amount', 'date']),
            }); // next amt not correct
        }

        return {ok: true, recurring_trans: recurring};
    
    }, err => {
        console.log(err);
        return {ok: false};
    });
}

export default {
    upsert, getRecurring,
};
