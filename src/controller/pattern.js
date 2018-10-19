import Pattern from '../model/pattern';
import {ONE_DAY, INTERVAL_ACCEPTABLE_ERROR, INTERVAL_ACCEPTABLE_VALUES_IN_DAYS} from './constants';

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

// TODO remove skipped field
// skip this pattern and all transactions under this pattern
export function skip(pattern) {
    return Pattern.update({_id: pattern._id}, {recurring: false, skipped: true, updated_at: Date.now()}).then(
        () =>  Promise.all(pattern.transactions, transId => {
            return Transaction.update({trans_id: transId}, {skipped: true, updated_at: Date.now()});
        })
    );
}

export async function detectPattern(company, userId, transId, amount, date) {
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
