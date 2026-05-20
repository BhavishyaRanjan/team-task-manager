const Project = require('../models/Project');

// Attach project to req and check membership
const projectAccess = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('members.user', 'name email');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const member = project.members.find(
      m => m.user._id.toString() === req.user._id.toString()
    );
    if (!member) return res.status(403).json({ message: 'Access denied' });

    req.project = project;
    req.projectRole = member.role; // 'admin' | 'member'
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Use after projectAccess — only lets admins through
const adminOnly = (req, res, next) => {
  if (req.projectRole !== 'admin')
    return res.status(403).json({ message: 'Admin access required' });
  next();
};

module.exports = { projectAccess, adminOnly };
