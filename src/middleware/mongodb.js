import mongoose from 'mongoose';

const server = '127.0.0.1:27017';
const database = 'interview_challenge';

mongoose.Promise = global.Promise;

export function initMongoDB() {
  mongoose.connect(`mongodb://${server}/${database}`, err => {
    if (err) {
      console.log(err);
      throw new Error('fail to connect to MongoDB server');
    }
  });
}
