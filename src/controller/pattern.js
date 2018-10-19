import Pattern from '../model/pattern';
import {ONE_DAY, INTERVAL_ACCEPTABLE_ERROR, INTERVAL_ACCEPTABLE_VALUES_IN_DAYS, ACCEPTABLE_AMOUNT_DIFFERENCE} from './constants';
import Transaction from '../model/transaction';

function updatePattern(transId, amount, date, pattern, updateIntervalValue = true, updateAverageAmount = true) {
    let newAvgInterval = 0, newAvgAmount = 0;

    if (updateIntervalValue) {
        const interval = Math.abs(date - pattern.last_transaction_time);
        newAvgInterval = (pattern.average_interval * (pattern.transactions.length - 1) + interval) / pattern.transactions.length;
    } else {
        newAvgInterval = pattern.average_interval;
    }

    if (updateAverageAmount) {
        // TODO remember to exclude noise value from transaction length
        newAvgAmount = (amount + pattern.transactions.length * pattern.average_amount) / (pattern.transactions.length + 1);
    } else {
        newAvgAmount = pattern.average_amount;
    }
    
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
            average_amount: newAvgAmount,
            recurring: true,
        },
    );
}

// archive this pattern
export function archive(pattern) {
    return Pattern.update({_id: pattern._id}, {recurring: false, archived: true, updated_at: Date.now()});
}

export function markRecurring(pattern) {
    return Pattern.update({_id: pattern._id}, {recurring: true, updated_at: Date.now()});
}

export function markNonRecurring(pattern) {
    return Pattern.update({_id: pattern._id}, {recurring: false, updated_at: Date.now()});
}

async function reDetection(company, userId) {
    const trans = await Transaction.findByQuery({company, user_id: userId}, {sort: {date: 1}});
    return Promise.each(trans, transaction => detectPattern(company, userId, transaction.trans_id, transaction.amount, transaction.date));
}

export async function detectPattern(company, userId, transId, amount, date) {
    const addNewPattern = () =>
        Pattern.add({
            company,
            user_id: userId,
            last_transaction_id: transId,
            last_transaction_time: date,
            transactions: [transId],
            average_amount: amount,
            average_interval: 0,
        }).catch(e => console.log(e));

    const patterns = await Pattern.findByQuery({company, user_id: userId});

    if (!patterns || patterns.length == 0) {
        await addNewPattern();
        return;
    }

    let latestTime = null;

    for (let pattern of patterns) {
        if (latestTime < pattern.last_transaction_time) latestTime = pattern.last_transaction_time;
    }

    // if this was an old transaction, archive all current patterns associated with this company 
    // and user_id and re-calculate / detect all influenced transactions
    if (latestTime > date) {
        await Promise.each(patterns, pattern => archive(pattern));
        return reDetection(company, userId);
    }

    // sort by transactions list length (descending), by last_transaction_time (ascending)
    patterns.sort((a, b) => b.transactions.length - a.transactions.length || a.last_transaction_time - b.last_transaction_time);

    let foundPatternFlag = false;

    // iterate thru all patterns and look for a suitable one
    // return if find one
    await Promise.each(patterns, pattern => {
        
        if (foundPatternFlag) return;
        if (pattern.average_amount == 0 && Math.abs(amount) > 30) return; // uh a magic number
        if (pattern.average_amount != 0 && Math.abs(pattern.average_amount - amount) / Math.abs(pattern.average_amount) > ACCEPTABLE_AMOUNT_DIFFERENCE) return;

        let interval = Math.abs(date - pattern.last_transaction_time);
        if (interval < pattern.average_interval + INTERVAL_ACCEPTABLE_ERROR 
            && interval > pattern.average_interval - INTERVAL_ACCEPTABLE_ERROR) {
            foundPatternFlag = true;
            return updatePattern(transId, amount, date, pattern);
        }

        // it's okay to miss one time
        // divide the interval in half and look for a pattern again
        interval = interval / 2;
        if (interval < pattern.average_interval + INTERVAL_ACCEPTABLE_ERROR 
            && interval > pattern.average_interval - INTERVAL_ACCEPTABLE_ERROR) {
            foundPatternFlag = true;
            return updatePattern(transId, amount, date, pattern, false, true);
        }

    });

    if (foundPatternFlag) return;

    // iterate thru all non-recurring patterns (individual transactions)
    await Promise.each(patterns, pattern => {
        if (foundPatternFlag) return;
        if (pattern.average_amount == 0 && Math.abs(amount) > 30) return; // uh a magic number
        if (pattern.average_amount != 0 && Math.abs(pattern.average_amount - amount) / Math.abs(pattern.average_amount) > ACCEPTABLE_AMOUNT_DIFFERENCE) return;

        if (!pattern.recurring && pattern.transactions.length === 1) {
            // check if possible to detect an acceptable pattern
            const dayInterval = Math.round(Math.abs(date - pattern.last_transaction_time) / ONE_DAY);
            if (INTERVAL_ACCEPTABLE_VALUES_IN_DAYS.includes(dayInterval)) {
                foundPatternFlag = true;
                return updatePattern(transId, amount, date, pattern);
            }
        }
    });

    if (foundPatternFlag) return;

    // no pattern found; add a new pattern for it instead
    await addNewPattern();
}
