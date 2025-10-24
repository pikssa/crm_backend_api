const express = require('express');
const { body, validationResult, param } = require('express-validator');
const mongoose = require('mongoose');

const router = express.Router();
const Enquiry = require('../models/Enquiry');
const auth = require('../middleware/auth');

router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('courseInterest').optional().isString()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, courseInterest, message } = req.body;
    const e = new Enquiry({ name, email, phone, courseInterest, message });
    await e.save();
    res.status(201).json({ message: 'Enquiry created', enquiry: e });
  } catch (err) {
    next(err);
  }
});

router.get('/unclaimed', auth, async (req, res, next) => {
  try {
    const unclaimed = await Enquiry.find({ claimedBy: null }).sort({ createdAt: -1 });
    res.json({ count: unclaimed.length, enquiries: unclaimed });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/claim', auth, [
  param('id').custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid enquiry id')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const enquiryId = req.params.id;
    const userId = req.user.userId;

    const updated = await Enquiry.findOneAndUpdate(
      { _id: enquiryId, claimedBy: null },
      { $set: { claimedBy: userId } },
      { new: true }
    );

    if (!updated) {
      const existing = await Enquiry.findById(enquiryId);
      if (!existing) return res.status(404).json({ error: 'Enquiry not found' });
      if (existing.claimedBy) return res.status(409).json({ error: 'Enquiry already claimed' });
      return res.status(400).json({ error: 'Unable to claim enquiry' });
    }

    res.json({ message: 'Enquiry claimed successfully', enquiry: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/my', auth, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const mine = await Enquiry.find({ claimedBy: userId }).sort({ createdAt: -1 });
    res.json({ count: mine.length, enquiries: mine });
  } catch (err) {
    next(err);
  }
});

module.exports = router;