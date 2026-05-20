const router = require('express').Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const { projectAccess, adminOnly } = require('../middleware/rbac');

// GET /api/projects/:projectId/tasks
router.get('/', auth, projectAccess, async (req, res) => {
  try {
    const filter = { project: req.params.projectId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:projectId/tasks — admin only
router.post('/', auth, projectAccess, adminOnly, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('status').optional().isIn(['todo', 'in-progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional().isISO8601().withMessage('Invalid date'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    // Validate assignedTo is a project member
    if (req.body.assignedTo) {
      const isMember = req.project.members.some(
        m => m.user._id.toString() === req.body.assignedTo
      );
      if (!isMember) return res.status(400).json({ message: 'Assignee must be a project member' });
    }

    const task = await Task.create({
      ...req.body,
      project: req.params.projectId,
      createdBy: req.user._id,
    });
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/projects/:projectId/tasks/:taskId
// Members can only update status of tasks assigned to them; admins can update anything
router.put('/:taskId', auth, projectAccess, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, project: req.params.projectId });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isAdmin = req.projectRole === 'admin';
    const isAssignee = task.assignedTo?.toString() === req.user._id.toString();

    if (!isAdmin && !isAssignee)
      return res.status(403).json({ message: 'Not authorized to update this task' });

    // Members can only change status
    if (!isAdmin) {
      if (Object.keys(req.body).some(k => k !== 'status'))
        return res.status(403).json({ message: 'Members can only update task status' });
    }

    if (req.body.assignedTo && isAdmin) {
      const isMember = req.project.members.some(
        m => m.user._id.toString() === req.body.assignedTo
      );
      if (!isMember) return res.status(400).json({ message: 'Assignee must be a project member' });
    }

    Object.assign(task, req.body);
    await task.save();
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:projectId/tasks/:taskId — admin only
router.delete('/:taskId', auth, projectAccess, adminOnly, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.taskId, project: req.params.projectId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
