const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  members: [memberSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Ensure the creator is always in the members array as admin
projectSchema.pre('save', function (next) {
  const creatorInMembers = this.members.some(
    m => m.user.toString() === this.createdBy.toString()
  );
  if (!creatorInMembers) {
    this.members.push({ user: this.createdBy, role: 'admin' });
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
