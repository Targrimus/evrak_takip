const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getGidenEvraklar,
  getGelenEvrak, // Wait, I meant getGidenEvrak. Let me fix that.
  getGidenEvrak,
  createGidenEvrak,
  updateGidenEvrak,
  deleteGidenEvrak,
  addNote
} = require('../controllers/gidenEvrak');

const { protect } = require('../middleware/auth');

// Multer Config (Memory Storage since we handle saving in controller for custom path)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB limit
});

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getGidenEvraklar)
  .post(upload.array('files', 10), createGidenEvrak);

router
  .route('/:id')
  .get(getGidenEvrak)
  .put(upload.array('files', 10), updateGidenEvrak)
  .delete(deleteGidenEvrak);

router.post('/:id/note', addNote);

module.exports = router;
