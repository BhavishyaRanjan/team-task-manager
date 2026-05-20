const router = require('express').Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// GET /api/dashboard — summary for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id }).select('_id name');
    const projectIds = projects.map(p => p._id);

    const now = new Date();

    const [total, byStatus, overdue, myTasks] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds } }),
      Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.countDocuments({
        project: { $in: projectIds },
        dueDate: { $lt: now },
        status: { $ne: 'done' },
      }),
      Task.find({ assignedTo: req.user._id, status: { $ne: 'done' } })
        .populate('project', 'name')
        .sort('dueDate')
        .limit(5),
    ]);

    const statusMap = { todo: 0, 'in-progress': 0, done: 0 };
    byStatus.forEach(s => { statusMap[s._id] = s.count; });

    res.json({
      projects: projects.length,
      tasks: { total, ...statusMap, overdue },
      myTasks,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
