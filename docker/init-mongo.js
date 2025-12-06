// MongoDB initialization script
db = db.getSiblingDB('recount');

// Create application user
db.createUser({
  user: 'recount_user',
  pwd: 'recount_password',
  roles: [
    {
      role: 'readWrite',
      db: 'recount'
    }
  ]
});

// Create collections
db.createCollection('users');
db.createCollection('accounts');
db.createCollection('transactions');

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.accounts.createIndex({ "name": 1 }, { unique: true });
db.transactions.createIndex({ "accountId": 1 });
db.transactions.createIndex({ "createdAt": -1 });

// Insert default super admin user
db.users.insertOne({
  email: 'admin@recount.com',
  password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: admin123
  role: 'super_admin',
  name: 'Super Admin',
  createdAt: new Date(),
  updatedAt: new Date()
});
