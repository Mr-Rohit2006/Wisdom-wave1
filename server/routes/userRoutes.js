const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

// Helper functions (same logic as before)
function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calcLevel(xp) {
  return Math.max(1, Math.floor(Math.sqrt(xp / 50)));
}

// @route   GET api/users/me
// @desc    Get current user data
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/users/streak
// @desc    Check and update login streak
// @access  Private
router.post('/streak', auth, async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const today = getTodayStr();
    const yesterday = getYesterdayStr();
    const lastLogin = user.lastLoginDate || "";

    if (lastLogin === today) {
      return res.json({
        streak: user.streak || 0,
        streakUpdated: false,
        isNewDay: false,
        bonusXP: 0,
        user
      });
    }

    let newStreak = user.streak || 0;
    let streakUpdated = false;
    let bonusXP = 0;

    if (lastLogin === yesterday) {
      newStreak += 1;
      streakUpdated = true;
      bonusXP = Math.min(newStreak * 10, 150);
    } else {
      newStreak = 1;
      streakUpdated = lastLogin !== "";
      bonusXP = 10;
    }

    const currentXP = user.xp || 0;
    const newXP = currentXP + bonusXP;
    const newLevel = calcLevel(newXP);

    user.streak = newStreak;
    user.lastLoginDate = today;
    user.xp = newXP;
    user.level = newLevel;

    if (bonusXP > 0) {
      user.activity.push({
        icon: "🔥",
        text: streakUpdated && newStreak > 1
          ? `Day ${newStreak} streak! Login bonus`
          : "Welcome back! Login bonus",
        xp: `+${bonusXP} XP`,
        time: new Date().toISOString(),
        color: "#fbbf24",
      });
    }

    await user.save();

    res.json({ streak: newStreak, streakUpdated, isNewDay: true, bonusXP, user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/users/progress
// @desc    Update topic progress
// @access  Private
router.post('/progress', auth, async (req, res) => {
  const { topicId, xpEarned, modeIcon, modeTitle, topicName, langName, langColor, moduleProgress } = req.body;

  try {
    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const currentXP = user.xp || 0;
    const currentTopicsDone = user.topicsDone || [];
    const currentPuzzlesSolved = user.puzzlesSolved || 0;

    const alreadyDone = currentTopicsDone.includes(topicId);
    const actualXP = alreadyDone ? 0 : xpEarned;

    if (!alreadyDone) {
      user.topicsDone.push(topicId);
      user.xp = currentXP + actualXP;
      user.level = calcLevel(user.xp);
      user.activity.push({
        icon: modeIcon,
        text: `${modeTitle}: ${topicName} (${langName})`,
        xp: `+${actualXP} XP`,
        time: new Date().toISOString(),
        color: langColor,
      });
    }

    user.moduleProgress = moduleProgress;
    user.puzzlesSolved = currentPuzzlesSolved + 1;

    await user.save();

    res.json({
      topicsDone: user.topicsDone,
      moduleProgress: user.moduleProgress,
      newXP: user.xp,
      newLevel: user.level,
      alreadyDone,
      actualXP,
      user
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/users/battle-win
// @desc    Update battle win
// @access  Private
router.post('/battle-win', auth, async (req, res) => {
    try {
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.battleWon = (user.battleWon || 0) + 1;
        user.xp = (user.xp || 0) + 50;
        user.level = calcLevel(user.xp);

        await user.save();
        res.json(user);
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/users/leaderboard
// @desc    Get leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const filter = req.query.filter || 'xp';
    const limitNum = parseInt(req.query.limit) || 50;
    
    let sortObj = {};
    sortObj[filter] = -1;

    const users = await User.find()
      .sort(sortObj)
      .limit(limitNum)
      .select('username xp level streak puzzlesSolved battleWon');
      
    const transformed = users.map(u => ({
      uid: u._id.toString(),
      username: u.username,
      xp: u.xp || 0,
      level: u.level || 1,
      streak: u.streak || 0,
      puzzlesSolved: u.puzzlesSolved || 0,
      battlesWon: u.battleWon || 0
    }));

    res.json(transformed);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/users/puzzle-win
// @desc    Update puzzle win
// @access  Private
router.post('/puzzle-win', auth, async (req, res) => {
  const { xp, title } = req.body;
  try {
    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.puzzlesSolved = (user.puzzlesSolved || 0) + 1;
    user.xp = (user.xp || 0) + xp;
    user.level = calcLevel(user.xp);
    
    user.activity.push({
      icon: "🧩",
      text: `Puzzle: ${title}`,
      xp: `+${xp} XP`,
      time: new Date().toISOString(),
      color: "#22d3ee"
    });

    await user.save();
    res.json({ newXP: user.xp, user });
  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
