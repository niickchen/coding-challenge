export const ONE_DAY = 24 * 60 * 60 * 1000;

export const ONE_HOUR = 60 * 60 * 1000;

export const INTERVAL_ACCEPTABLE_ERROR = 6 * ONE_DAY;

export const TRANSACTION_FIELDS = ['trans_id', 'user_id', 'name', 'amount', 'date'];

export const INTERVAL_ACCEPTABLE_VALUES_IN_DAYS = [5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17, 18, 28, 29, 30, 31, 32, 33, 34, 85, 86, 87, 
    88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 359, 360, 361, 
    362, 363, 364, 365, 366, 367, 368, 369, 370, 371];

export const ACCEPTABLE_AMOUNT_DIFFERENCE = 1.5; // Acceptable: abs(average - amount) / average <= 1.5
