# rtds

A recurring transaction detection service design using Express framework and MongoDB

## Getting Started
### Prerequisites
Please install Node.js, MongoDB on your computer and keep MongoDB running

### Installing project

```
git clone https://github.com/niickchen/rtds.git
cd rtds
npm install
```


## Running
```
npm start
```

It's running on localhost and port 1984

## API Design
Accept two requests:
  1. root POST request
    input format:  
      {  
        transactions: An array containing transactions  
          - trans_id (String)  
          - user_id (String)  
          - name (String)  
          - amount (Number)  
          - date (Date)  
      }  
      
      output is an array containning all recurring transactions
      
  2. root GET request
    no input required, output is the same as POST request
    
## Main Logic
Recurring detection is primaryly based on transaction date and also takes amount into account. Transactions by different users and different companies are grouped into separate patterns. When a new transaction is upserted into the database, the algorithm try to find a suitable pattern and adjust related info of this pattern accordingly, such as average amount and average interval value. Transactions will be sorted by dates in ascending order when grouping, and transactions with earlier dates will have priorities in forming patterns. For example, (Company A, user B, TX12, 10.00, 01/01/18) and (Company A, user B, TX30, 30.20, 03/01/18) are possible recurring charges and they will be grouped into one pattern with an interval of 2 months. When a new transaction record (Company A, user B, TX53, 20.00, 04/01/18) is inserted, the transaction will be categorize as a new pattern because it does not fit the existing pattern for (Company A, user B) which has an interval of 2 months, even though the last transaction may have a recurring relation with one former transaction.

## Authors

* **Xinyu Chen** - [niickchen](https://github.com/niickchen)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
