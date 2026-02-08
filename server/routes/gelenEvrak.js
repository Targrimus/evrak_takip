const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getGelenEvraklar,
  getGelenEvrak,
  createGelenEvrak,
  updateGelenEvrak,
  deleteGelenEvrak,
  addNote,
  addResponseFile,
  manageWorkflow,
  dispatchResponse,
  linkGidenEvrak,
  unlinkGidenEvrak
} = require('../controllers/gelenEvrak');

const { protect } = require('../middleware/auth');

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, 'evrak-' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB limit
});

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getGelenEvraklar)
  .post(upload.array('files', 10), createGelenEvrak); // Allow up to 10 files

router
  .route('/:id')
  .get(getGelenEvrak)
  .put(upload.array('files', 10), updateGelenEvrak)
  .delete(deleteGelenEvrak);

router.post('/:id/note', addNote);
router.post('/:id/response-file', upload.array('files', 5), addResponseFile);
router.put('/:id/workflow', manageWorkflow);
router.post('/:id/dispatch', upload.array('files', 5), dispatchResponse);
router.post('/:id/link-giden', linkGidenEvrak);
router.delete('/:id/link-giden/:gidenId', unlinkGidenEvrak);

module.exports = router;

