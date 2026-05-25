const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017/mindbuddy';

console.log('Connecting to:', uri);

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Define a simple schema & model
    const TestSchema = new mongoose.Schema({ name: String });
    const TestModel = mongoose.model('TestConnection', TestSchema);
    
    console.log('Inserting document...');
    const doc = await TestModel.create({ name: 'Testing ' + Date.now() });
    console.log('✅ Inserted document:', doc);
    
    console.log('Finding document...');
    const found = await TestModel.findById(doc._id);
    console.log('✅ Found document:', found);
    
    console.log('Cleaning up...');
    await TestModel.deleteMany({});
    
    console.log('Closing connection...');
    await mongoose.disconnect();
    console.log('🎉 DB TEST PASSED!');
  })
  .catch(err => {
    console.error('❌ Connection error:', err);
    process.exit(1);
  });
