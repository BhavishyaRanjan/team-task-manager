const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const { projectAccess, adminOnly } = require('../middleware/rbac');

// GET /api/projects — list projects the user is a member of
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects — create project (creator becomes admin)
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Project name is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const project = await Project.create({
      name: req.body.name,
      description: req.body.description || '',
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
    });
    await project.populate('members.user', 'name email');
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/projects/:projectId
router.get('/:projectId', auth, projectAccess, (req, res) => res.json(req.project));

// PUT /api/projects/:projectId — admin only
router.put('/:projectId', auth, projectAccess, adminOnly, [
  body('name').optional().trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description } = req.body;
    if (name) req.project.name = name;
    if (description !== undefined) req.project.description = description;
    await req.project.save();
    res.json(req.project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:projectId — admin only
router.delete('/:projectId', auth, projectAccess, adminOnly, async (req, res) => {
  try {
    await Task.deleteMany({ project: req.project._id });
    await req.project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:projectId/members — add member (admin only)
router.post('/:projectId/members', auth, projectAccess, adminOnly, [
  body('email').isEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['admin', 'member']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const userToAdd = await User.findOne({ email: req.body.email });
    if (!userToAdd) return res.status(404).json({ message: 'User not found' });

    const alreadyMember = req.project.members.some(
      m => m.user._id.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) return res.status(400).json({ message: 'Already a member' });

    req.project.members.push({ user: userToAdd._id, role: req.body.role || 'member' });
    await req.project.save();
    await req.project.populate('members.user', 'name email');
    res.json(req.project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:projectId/members/:userId — remove member (admin only)
router.delete('/:projectId/members/:userId', auth, projectAccess, adminOnly, async (req, res) => {
  try {
    if (req.params.userId === req.project.createdBy.toString())
      return res.status(400).json({ message: 'Cannot remove project creator' });

    req.project.members = req.project.members.filter(
      m => m.user._id.toString() !== req.params.userId
    );
    await req.project.save();
    res.json(req.project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
