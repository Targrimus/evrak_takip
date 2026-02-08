const GidenEvrak = require('../models/GidenEvrak');
const path = require('path');
const fs = require('fs');

// @desc      Get all outgoing documents
// @route     GET /api/giden-evrak
// @access    Private
exports.getGidenEvraklar = async (req, res, next) => {
    try {
        const evraklar = await GidenEvrak.find()
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: evraklar.length,
            data: evraklar
        });
    } catch (err) {
        next(err);
    }
};

// @desc      Get single outgoing document
// @route     GET /api/giden-evrak/:id
// @access    Private
exports.getGidenEvrak = async (req, res, next) => {
    try {
        const evrak = await GidenEvrak.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('notes.author', 'name');

        if (!evrak) {
            return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });
        }

        res.status(200).json({
            success: true,
            data: evrak
        });
    } catch (err) {
        next(err);
    }
};

// @desc      Create outgoing document
// @route     POST /api/giden-evrak
// @access    Private
exports.createGidenEvrak = async (req, res, next) => {
    try {
        req.body.createdBy = req.user.id;

        // Sequence Number Logic
        const currentYear = new Date().getFullYear();
        const lastEvrak = await GidenEvrak.findOne({ applicationYear: currentYear }).sort({ sequenceNumber: -1 });
        const sequenceNumber = lastEvrak ? lastEvrak.sequenceNumber + 1 : 1;
        req.body.sequenceNumber = sequenceNumber;
        req.body.applicationYear = currentYear;

        // Handle Files
        if (req.files && req.files.length > 0) {
            const uploadDir = path.join(__dirname, '../public/uploads', currentYear.toString(), `G_${sequenceNumber}`);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const fileData = req.files.map(file => {
                const cleanDocNo = req.body.documentNumber.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `GIDEN-${cleanDocNo}_${Date.now()}_${file.originalname}`;
                const filePath = path.join(uploadDir, fileName);
                fs.writeFileSync(filePath, file.buffer);
                return {
                    fileName,
                    originalName: file.originalname,
                    path: `/uploads/${currentYear}/G_${sequenceNumber}/${fileName}`,
                    mimeType: file.mimetype
                };
            });
            req.body.files = fileData;
        }

        const evrak = await GidenEvrak.create(req.body);

        res.status(201).json({
            success: true,
            data: evrak
        });
    } catch (err) {
        next(err);
    }
};

// @desc      Update outgoing document
// @route     PUT /api/giden-evrak/:id
// @access    Private
exports.updateGidenEvrak = async (req, res, next) => {
    try {
        let evrak = await GidenEvrak.findById(req.params.id);

        if (!evrak) {
            return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });
        }

        // Check ownership/role
        if (evrak.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Bu işlemi yapmak için yetkiniz yok' });
        }

        // Handle files to delete
        if (req.body.filesToDelete) {
            const deleteIds = JSON.parse(req.body.filesToDelete);
            evrak.files = evrak.files.filter(f => {
                if (deleteIds.includes(f._id.toString())) {
                    const fullPath = path.join(__dirname, '../public', f.path);
                    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                    return false;
                }
                return true;
            });
        }

        // Handle new files
        if (req.files && req.files.length > 0) {
            const uploadDir = path.join(__dirname, '../public/uploads', evrak.applicationYear.toString(), `G_${evrak.sequenceNumber}`);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const fileData = req.files.map(file => {
                const cleanDocNo = (req.body.documentNumber || evrak.documentNumber).replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `GIDEN-${cleanDocNo}_${Date.now()}_${file.originalname}`;
                const filePath = path.join(uploadDir, fileName);
                fs.writeFileSync(filePath, file.buffer);
                return {
                    fileName,
                    originalName: file.originalname,
                    path: `/uploads/${evrak.applicationYear}/G_${evrak.sequenceNumber}/${fileName}`,
                    mimeType: file.mimetype
                };
            });
            evrak.files = [...evrak.files, ...fileData];
        }

        // Update fields
        const fieldsToUpdate = ['title', 'recipient', 'documentNumber', 'documentDate', 'targetUnit', 'status', 'description', 'dispatchDate', 'dispatchMethod'];
        fieldsToUpdate.forEach(field => {
            if (req.body[field]) evrak[field] = req.body[field];
        });

        await evrak.save();

        res.status(200).json({
            success: true,
            data: evrak
        });
    } catch (err) {
        next(err);
    }
};

// @desc      Delete outgoing document
// @route     DELETE /api/giden-evrak/:id
// @access    Private (Admin only)
exports.deleteGidenEvrak = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok' });
        }

        const evrak = await GidenEvrak.findById(req.params.id);

        if (!evrak) {
            return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });
        }

        // Delete folders
        const uploadDir = path.join(__dirname, '../public/uploads', evrak.applicationYear.toString(), `G_${evrak.sequenceNumber}`);
        if (fs.existsSync(uploadDir)) {
             fs.rmSync(uploadDir, { recursive: true, force: true });
        }

        await evrak.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};

// @desc      Add note to outgoing document
// @route     POST /api/giden-evrak/:id/note
// @access    Private
exports.addNote = async (req, res, next) => {
    try {
        const evrak = await GidenEvrak.findById(req.params.id);
        if (!evrak) return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });

        evrak.notes.push({
            text: req.body.text,
            author: req.user.id
        });

        await evrak.save();
        const updatedEvrak = await GidenEvrak.findById(req.params.id).populate('notes.author', 'name');

        res.status(200).json({ success: true, data: updatedEvrak });
    } catch (err) {
        next(err);
    }
};
