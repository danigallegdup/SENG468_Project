const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    hashed_password: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
