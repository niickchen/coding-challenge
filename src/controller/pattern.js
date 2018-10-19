import Pattern from '../model/pattern';
import {ONE_DAY, INTERVAL_ACCEPTABLE_ERROR, INTERVAL_ACCEPTABLE_VALUES_IN_DAYS} from './constants';

function updatePattern(transId, amount, date, pattern, updateIntervalValue = true) {
    let newAvgInterval = 0;
    if (updateIntervalValue) {
        const interval = Math.abs(date - pattern.last_transaction_time);
        newAvgInterval = (pattern.average_interval * (pattern.transactions.length - 1) + interval) / pattern.transactions.length;
    } else {
        newAvgInterval = pattern.average_interval;
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
            amount_pattern: [], // TODO
            recurring: true,
        },
    );
}

// TODO remove skipped field?
// skip this pattern
export function skip(pattern) {
    return Pattern.update({_id: pattern._id}, {recurring: false, skipped: true, updated_at: Date.now()});
}

export async function detectPattern(company, userId, transId, amount, date) {
    const addNewPattern = () =>
        Pattern.add({
            company,
            user_id: userId,
            last_transaction_id: transId,
            last_transaction_time: date,
            transactions: [transId],
            amount_pattern: [amount],
            average_interval: 0,
        }).catch(e => console.log(e));

    const patterns = await Pattern.findByQuery({company, user_id: userId});

    if (!patterns || patterns.length == 0) {
        await addNewPattern();
        return;
    }

    // sort by transactions list length (descending), by last_transaction_time (ascending)
    patterns.sort((a, b) => b.transactions.length - a.transactions.length || a.last_transaction_time - b.last_transaction_time);

    // TODO compare amount
    let foundPatternFlag = false;

    // iterate thru all recurring patterns and look for a suitable pattern
    // return if find one
    await Promise.each(patterns, pattern => {
        
        if (foundPatternFlag) return;
        if (!pattern.recurring) return;
        

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
            return updatePattern(transId, amount, date, pattern, false);
        }

        // if past expected date already, skip this pattern forever
        if (Math.abs(date - pattern.last_transaction_time) >= pattern.average_interval + INTERVAL_ACCEPTABLE_ERROR) {
            return skip(pattern);
        }
    });

    if (foundPatternFlag) return;

    // iterate thru all non-recurring patterns (individual transactions)
    await Promise.each(patterns, pattern => {
        if (foundPatternFlag) return;
        if (!pattern.recurring && pattern.transactions.length === 1) {
            // check if possible to match an individual transaction
            const dayInterval = Math.round(Math.abs(date - pattern.last_transaction_time) / ONE_DAY);
            // TODO add number range
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
