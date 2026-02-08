const GelenEvrak = require('../models/GelenEvrak');
const User = require('../models/User'); // Added User model
const sendEmail = require('../utils/sendEmail'); // Added sendEmail utility
const fs = require('fs');
const path = require('path');

// Target Unit Map to Role
const unitToRoleMap = {
    'Müşteri Hizmetleri': 'musterihizmetleri',
    'Ölçüm ve Tahakkuk Birimi': 'tahakkuk',
    'İşletme Birimi': 'isletme',
    'Bakım Onarım Birimi': 'bakim',
    'Harita ve Proje Birimi': 'harita',
    'Teknik Ofis Birimi': 'teknikofis',
    'Kalite ve İş Süreçleri Birimi': 'kalite',
    'Muhasebe Birimi': 'muhasebe',
    'Şirket Müdürlüğü': 'yonetici'
};


// @desc      Get all gelen evraklar
// @route     GET /api/gelen-evrak
// @access    Private
exports.getGelenEvraklar = async (req, res, next) => {
  try {
    const evraklar = await GelenEvrak.find().populate('createdBy', 'name email').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: evraklar.length,
      data: evraklar,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc      Get single gelen evrak
// @route     GET /api/gelen-evrak/:id
// @access    Private
exports.getGelenEvrak = async (req, res, next) => {
  try {
    const evrak = await GelenEvrak.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('responseFiles.addedBy', 'name')
      .populate('notes.author', 'name role')
      .populate('relatedGidenEvrak');

    if (!evrak) {
      return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });
    }

    res.status(200).json({
      success: true,
      data: evrak,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper to get formatted date string (YYYY-MM-DD)
const getFormattedDate = (date) => {
    return date.toISOString().split('T')[0];
};

// Helper to sanitize folder name
const sanitizeFolderName = (name) => {
    return name.replace(/[^a-z0-9à-üÇçĞğİıÖöŞşÜü\s-]/gi, '_').trim().substring(0, 50);
};

// Helper to sanitize file name
const sanitizeFileName = (name) => {
    return name.replace(/[^a-z0-9à-üÇçĞğİıÖöŞşÜü\s\.-]/gi, '_').trim().substring(0, 100);
};

// @desc      Create new gelen evrak
// @route     POST /api/gelen-evrak
// @access    Private (Admin, Yonetici, Asistan)
exports.createGelenEvrak = async (req, res, next) => {
  try {
    // Check if user has permission to create
    if (!['admin', 'yonetici', 'asistan'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok (Sadece Admin, Yönetici ve Asistan)' });
    }

    req.body.createdBy = req.user.id;
    req.body.status = 'FORWARDED'; // Default status for new records
    
    // Set Year
    const currentYear = new Date().getFullYear();
    req.body.applicationYear = currentYear;

    // Generate Sequence Number
    const lastEvrak = await GelenEvrak.findOne({ applicationYear: currentYear }).sort({ sequenceNumber: -1 });
    const sequenceNumber = lastEvrak && lastEvrak.sequenceNumber ? lastEvrak.sequenceNumber + 1 : 1;
    req.body.sequenceNumber = sequenceNumber;

    // Prepend user info to description
    if (req.body.description) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        req.body.description = `[${req.user.name} - ${formattedDate}]\n${req.body.description}`;
    }
    
    // Process files if any
    if (req.files && req.files.length > 0) {
        // Construct Folder Path: public/uploads/{Year}/{Sequence}
        const targetDir = path.join(__dirname, '../public/uploads', currentYear.toString(), sequenceNumber.toString());

        // Create Directory recursively
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        req.body.files = req.files.map(file => {
            // Filename Format: DocNo - ArrivalDate - Sender - Subject
            const safeDocNo = sanitizeFolderName(req.body.documentNumber || 'NoDocNo');
            const safeSender = sanitizeFolderName(req.body.sender || 'NoSender');
            const safeSubject = sanitizeFolderName(req.body.title || 'NoSubject');
            const fileExt = path.extname(file.originalname);
            
            const newFilename = `${safeDocNo}-${getFormattedDate(new Date(req.body.documentDate))}-${safeSender}-${safeSubject}${fileExt}`;
            
            const newPathRel = `/uploads/${currentYear}/${sequenceNumber}/${newFilename}`;
            const newPathAbs = path.join(targetDir, newFilename);

            // Move file
            const currentFullPath = path.join(__dirname, '../', file.path);
            
            if (fs.existsSync(currentFullPath)) {
                 fs.renameSync(currentFullPath, newPathAbs);
            }

            return {
                fileName: newFilename,
                originalName: file.originalname,
                path: newPathRel,
                mimeType: file.mimetype
            };
        });
    }

    const evrak = await GelenEvrak.create(req.body);
    const savedEvrak = await GelenEvrak.findById(evrak._id).populate('createdBy', 'name');

    // Notify Target Unit
    const targetRole = unitToRoleMap[req.body.targetUnit];
    if (targetRole) {
        try {
            const users = await User.find({ role: targetRole });
            const emails = users.map(u => u.email);
            if (emails.length > 0) {
                await sendEmail({
                    email: emails,
                    subject: `Yeni Evrak Kaydı: ${req.body.documentNumber}`,
                    message: `<h3>Yeni Evrak Kaydı</h3>
                             <p><strong>Arşiv No:</strong> ${evrak.applicationYear}/${evrak.sequenceNumber}</p>
                             <p><strong>Konu:</strong> ${evrak.title}</p>
                             <p><strong>Gönderen:</strong> ${evrak.sender}</p>
                             <p><strong>Kayıt Yapan:</strong> ${req.user.name}</p>
                             <p>Sisteme giriş yaparak detayları görebilirsiniz.</p>`
                });
            }
        } catch (mailErr) {
            console.error('Email sending failed:', mailErr.message);
        }
    }

    res.status(201).json({
      success: true,
      data: savedEvrak,
    });
  } catch (err) {
    // If error, cleanup uploaded files? (Optional but good practice)
    res.status(400).json({ success: false, message: err.message });
  }
};

// ... (updateGelenEvrak remains largely similar but we might need to adjust folder logic if we strictly enforce Year/Sequence. For now let's focus on Create and Response as requested)
// @desc      Update gelen evrak
// @route     PUT /api/gelen-evrak/:id
// @access    Private
exports.updateGelenEvrak = async (req, res, next) => {
  try {
    let evrak = await GelenEvrak.findById(req.params.id);

    if (!evrak) {
      return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });
    }

    // Check if user is creator OR has admin/yonetici/asistan role
    if (evrak.createdBy.toString() !== req.user.id && !['admin', 'yonetici', 'asistan'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok' });
    }
    
    // Determine Target Folder
    let targetDir;
    let targetDirRel;

    if (evrak.sequenceNumber && evrak.applicationYear) {
         // Use Year/Sequence
         targetDir = path.join(__dirname, '../public/uploads', evrak.applicationYear.toString(), evrak.sequenceNumber.toString());
         targetDirRel = `/uploads/${evrak.applicationYear}/${evrak.sequenceNumber}`;
    } else {
        // Fallback for old records
        targetDir = path.join(__dirname, '../public/uploads'); 
        targetDirRel = '/uploads';
    }

    let newFiles = [];
    if (req.files && req.files.length > 0) {
        if (!fs.existsSync(targetDir)) {
             if (evrak.sequenceNumber) fs.mkdirSync(targetDir, { recursive: true });
        }

      newFiles = req.files.map(file => {
        let finalPathRel = '/uploads/' + file.filename;
        let newFilename = file.filename;

        if (evrak.sequenceNumber && evrak.applicationYear) {
            // New standardized naming for consistency? 
            // The prompt asked for "incoming docs" to be standardized. 
            // For updates, we can apply the same logic if it's a "new file" being added to an existing "incoming doc".
            // Let's apply it.
            const safeDocNo = sanitizeFolderName(evrak.documentNumber || 'NoDocNo');
            const safeSender = sanitizeFolderName(evrak.sender || 'NoSender');
            const safeSubject = sanitizeFolderName(evrak.title || 'NoSubject');
            const fileExt = path.extname(file.originalname);
            
            // Generate unique name to avoid collision if multiple files added in update
            newFilename = `${safeDocNo}-${getFormattedDate(new Date(evrak.documentDate))}-${safeSender}-${safeSubject}_${Date.now()}${fileExt}`;
            
            const newPathAbs = path.join(targetDir, newFilename);
            const currentFullPath = path.join(__dirname, '../', file.path);
            
            if (fs.existsSync(currentFullPath)) {
                 fs.renameSync(currentFullPath, newPathAbs);
            }
            finalPathRel = `${targetDirRel}/${newFilename}`;
        }

        return {
          fileName: newFilename,
          originalName: file.originalname,
          path: finalPathRel,
          mimeType: file.mimetype
        };
      });
    }

    let updatedFiles = [...(evrak.files || [])];
    
    if (req.body.filesToDelete) {
        const filesToDelete = JSON.parse(req.body.filesToDelete); // Array of file _id's or paths
        updatedFiles = updatedFiles.filter(f => {
            if (filesToDelete.includes(f._id.toString())) {
                const filePath = path.join(__dirname, '../public', f.path);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                return false;
            }
            return true;
        });
    }

    updatedFiles = [...updatedFiles, ...newFiles];
    req.body.files = updatedFiles;

    evrak = await GelenEvrak.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: evrak,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc      Delete gelen evrak
// @route     DELETE /api/gelen-evrak/:id
// @access    Private
exports.deleteGelenEvrak = async (req, res, next) => {
  try {
    const evrak = await GelenEvrak.findById(req.params.id);

    if (!evrak) {
      return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });
    }

    // Make sure user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok. Sadece yöneticiler silebilir.' });
    }

    // Delete files from FS
    // If we have a dedicated folder for this evrak, maybe delete the folder too?
    // Let's just delete the files for now to be safe.
    if (evrak.files) {
        evrak.files.forEach(file => {
             const filePath = path.join(__dirname, '../public', file.path);
             if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
    }
    if (evrak.responseFiles) {
         evrak.responseFiles.forEach(file => {
             const filePath = path.join(__dirname, '../public', file.path);
             if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
    }
    
    // Attempt to remove empty folder if it exists
    if (evrak.sequenceNumber && evrak.applicationYear) {
         const targetDir = path.join(__dirname, '../public/uploads', evrak.applicationYear.toString(), evrak.sequenceNumber.toString());
         
         if (fs.existsSync(targetDir)) {
             try {
                fs.rmdirSync(targetDir); 
             } catch(e) {
                 // ignore
             }
         }
    }

    await evrak.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc      Add a note to evrak
// @route     POST /api/gelen-evrak/:id/note
// @access    Private
exports.addNote = async (req, res, next) => {
  try {
    const { text } = req.body;
    const evrak = await GelenEvrak.findById(req.params.id);

    if (!evrak) {
      return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });
    }

    const newNote = {
        text,
        author: req.user.id,
        date: Date.now()
    };

    evrak.notes.push(newNote);
    await evrak.save();

    const updatedEvrak = await GelenEvrak.findById(req.params.id)
        .populate('createdBy', 'name email')
        .populate('responseFiles.addedBy', 'name')
        .populate('notes.author', 'name role');

    res.status(200).json({
      success: true,
      data: updatedEvrak,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc      Add response file
// @route     POST /api/gelen-evrak/:id/response-file
// @access    Private
exports.addResponseFile = async (req, res, next) => {
    try {
        const evrak = await GelenEvrak.findById(req.params.id);

        if (!evrak) {
            return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Lütfen dosya yükleyiniz' });
        }

        // Check Permissions
        const unitMap = {
            'musterihizmetleri': 'Müşteri Hizmetleri',
            'tahakkuk': 'Ölçüm ve Tahakkuk Birimi',
            'isletme': 'İşletme Birimi',
            'bakim': 'Bakım Onarım Birimi',
            'harita': 'Harita ve Proje Birimi',
            'teknikofis': 'Teknik Ofis',
            'kalite': 'Kalite Yönetim Birimi',
            'muhasebe': 'Muhasebe ve Finans',
            'kullanici': 'Diğer'
        };

        const userUnit = unitMap[req.user.role];
        const isAuthorized = 
            req.user.role === 'admin' || 
            req.user.role === 'yonetici' || 
            req.user.role === 'asistan' ||
            (userUnit && evrak.targetUnit === userUnit);

        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok. Sadece ilgili birim veya yöneticiler cevap verebilir.' });
        }

        // Determine Target Folder
        let targetDir;
        let targetDirRel;
        
        if (evrak.sequenceNumber && evrak.applicationYear) {
             targetDir = path.join(__dirname, '../public/uploads', evrak.applicationYear.toString(), evrak.sequenceNumber.toString());
             targetDirRel = `/uploads/${evrak.applicationYear}/${evrak.sequenceNumber}`;
             
             if (!fs.existsSync(targetDir)) {
                 fs.mkdirSync(targetDir, { recursive: true });
             }
        } else {
             targetDir = path.join(__dirname, '../public/uploads');
             targetDirRel = '/uploads';
        }

        const responseFiles = req.files.map(file => {
            let finalPathRel = '/uploads/' + file.filename;
            let newFilename = file.filename;
            
            if (evrak.sequenceNumber && evrak.applicationYear) {
                // Rename with CVP_ prefix
                const safeOriginalName = sanitizeFileName(file.originalname);
                newFilename = `CVP_${safeOriginalName}`;
                
                const newPathAbs = path.join(targetDir, newFilename);
                const currentFullPath = path.join(__dirname, '../', file.path);
                
                if (fs.existsSync(currentFullPath)) {
                     // Check if file exists, if so append timestamp
                     if (fs.existsSync(newPathAbs)) {
                         newFilename = `CVP_${Date.now()}_${safeOriginalName}`;
                         fs.renameSync(currentFullPath, path.join(targetDir, newFilename));
                     } else {
                         fs.renameSync(currentFullPath, newPathAbs);
                     }
                }
                finalPathRel = `${targetDirRel}/${newFilename}`;
            }

            return {
                fileName: newFilename,
                originalName: file.originalname,
                path: finalPathRel,
                mimeType: file.mimetype,
                addedBy: req.user.id,
                addedAt: Date.now(),
                status: 'PENDING'
            };
        });

        evrak.responseFiles.push(...responseFiles);
        
        // Update status to ANSWERED if it was FORWARDED
        if (evrak.status === 'FORWARDED') {
            evrak.status = 'ANSWERED';
        }

        // Add note about added response files
        const simpleFileNames = responseFiles.map(f => f.originalName).join(', ');
        evrak.notes.push({
            text: `Cevap yazısı eklendi: ${simpleFileNames}`,
            author: req.user.id,
            date: Date.now(),
            relatedFiles: responseFiles.map(f => ({
                fileName: f.fileName,
                originalName: f.originalName,
                path: f.path
            }))
        });

        await evrak.save();

        // Notify Managers
        try {
            const managers = await User.find({ role: 'yonetici' });
            const managerEmails = managers.map(m => m.email);
            if (managerEmails.length > 0) {
                await sendEmail({
                    email: managerEmails,
                    subject: `Evrak Yanıtı Eklendi: ${evrak.documentNumber}`,
                    message: `<h3>Evrak Yanıtı</h3>
                             <p><strong>Arşiv No:</strong> ${evrak.applicationYear}/${evrak.sequenceNumber}</p>
                             <p><strong>Konu:</strong> ${evrak.title}</p>
                             <p><strong>Birim:</strong> ${evrak.targetUnit}</p>
                             <p><strong>Yanıtlayan:</strong> ${req.user.name}</p>
                             <p>Onayınız beklenmektedir.</p>`
                });
            }
        } catch (mailErr) {
            console.error('Email sending failed:', mailErr.message);
        }

        const updatedEvrak = await GelenEvrak.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('responseFiles.addedBy', 'name')
            .populate('notes.author', 'name role');

        res.status(200).json({
            success: true,
            data: updatedEvrak
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc      Manage workflow status (Approve/Reject)
// @route     PUT /api/gelen-evrak/:id/workflow
// @access    Private (Yonetici & Admin)
exports.manageWorkflow = async (req, res, next) => {
    try {
        const { action, note } = req.body; // action: 'approve' | 'reject'

        const evrak = await GelenEvrak.findById(req.params.id);

        if (!evrak) {
            return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });
        }

        if (action === 'request_archive') {
             // Unit Requesting Archive
             // Unit Map for permission check
             const unitMap = {
                'musterihizmetleri': 'Müşteri Hizmetleri',
                'tahakkuk': 'Ölçüm ve Tahakkuk Birimi',
                'isletme': 'İşletme Birimi',
                'bakim': 'Bakım Onarım Birimi',
                'harita': 'Harita ve Proje Birimi',
                'teknikofis': 'Teknik Ofis',
                'kalite': 'Kalite Yönetim Birimi',
                'muhasebe': 'Muhasebe ve Finans'
            };

            const userUnit = unitMap[req.user.role];
            const isAuthorized = 
                req.user.role === 'admin' || 
                req.user.role === 'yonetici' || 
                (userUnit && evrak.targetUnit === userUnit);

            if (!isAuthorized) {
                return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok. Sadece ilgili birim veya yönetici arşiv talep edebilir.' });
            }

            evrak.status = 'ARCHIVE_REQUESTED';
            evrak.notes.push({
                text: note ? `Arşivleme talep edildi. Gerekçe: ${note}` : 'Arşivleme talep edildi.',
                author: req.user.id,
                date: Date.now()
            });

            // Notify Managers for Archive Request
            try {
                const managers = await User.find({ role: 'yonetici' });
                const managerEmails = managers.map(m => m.email);
                if (managerEmails.length > 0) {
                    await sendEmail({
                        email: managerEmails,
                        subject: `Arşivleme Talebi: ${evrak.documentNumber}`,
                        message: `<h3>Arşivleme Talebi</h3>
                                 <p><strong>Arşiv No:</strong> ${evrak.applicationYear}/${evrak.sequenceNumber}</p>
                                 <p><strong>Konu:</strong> ${evrak.title}</p>
                                 <p><strong>Talep Eden Birim:</strong> ${evrak.targetUnit}</p>
                                 <p><strong>Gerekçe:</strong> ${note || 'Belirtilmedi'}</p>`
                    });
                }
            } catch (mailErr) {
                console.error('Email sending failed:', mailErr.message);
            }

        } else {
            // Check for Admin/Yonetici role for Approve/Reject/Archive actions
            if (req.user.role !== 'yonetici' && req.user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok (Yalnızca Yönetici/Admin)' });
            }

            if (action === 'approve_archive') {
                evrak.status = 'ARCHIVED';
                evrak.notes.push({
                    text: 'Arşivleme talebi onaylandı. Yazı arşive alındı.',
                    author: req.user.id,
                    date: Date.now()
                });

            } else if (action === 'reject_archive') {
                 if (!note) {
                    return res.status(400).json({ success: false, message: 'Reddederken açıklama notu girmelisiniz.' });
                }
                evrak.status = 'FORWARDED'; // Send back to unit
                evrak.notes.push({
                    text: 'Arşivleme talebi REDDEDİLDİ. Gerekçe: ' + note,
                    author: req.user.id,
                    date: Date.now()
                });

                // Notify Unit for Archive Reject
                const targetRole = unitToRoleMap[evrak.targetUnit];
                if (targetRole) {
                    try {
                        const users = await User.find({ role: targetRole });
                        const emails = users.map(u => u.email);
                        if (emails.length > 0) {
                            await sendEmail({
                                email: emails,
                                subject: `Arşivleme Talebi Reddedildi: ${evrak.documentNumber}`,
                                message: `<h3>Arşivleme Talebi Reddedildi</h3>
                                         <p><strong>Arşiv No:</strong> ${evrak.applicationYear}/${evrak.sequenceNumber}</p>
                                         <p><strong>Konu:</strong> ${evrak.title}</p>
                                         <p><strong>Reddeden:</strong> ${req.user.name}</p>
                                         <p><strong>Red Gerekçesi:</strong> ${note}</p>`
                            });
                        }
                    } catch (mailErr) {
                        console.error('Email sending failed:', mailErr.message);
                    }
                }

            } else if (action === 'approve') {
                evrak.status = 'APPROVED';
                
                // Mark pending response files as APPROVED and RENAME to CVP_ONAYLI_
                const approvedFiles = [];
                if (evrak.responseFiles) {
                    evrak.responseFiles.forEach(file => {
                        if (file.status === 'PENDING') {
                            file.status = 'APPROVED';
                            
                            // RENAME FILE
                            if (evrak.sequenceNumber && evrak.applicationYear) {
                                const oldFilename = file.fileName;
                                // Remove CVP_ or CVP_RED_ etc. prefixes to get base name, then add CVP_ONAYLI_
                                // Regex to remove starting CVP_ or CVP_RED_ or CVP_ONAYLI_
                                const baseName = oldFilename.replace(/^(CVP_RED_|CVP_ONAYLI_|CVP_)/, '');
                                const newFilename = `CVP_ONAYLI_${baseName}`;
                                
                                const targetDir = path.join(__dirname, '../public/uploads', evrak.applicationYear.toString(), evrak.sequenceNumber.toString());
                                const oldPathAbs = path.join(targetDir, oldFilename);
                                const newPathAbs = path.join(targetDir, newFilename);
                                
                                if (fs.existsSync(oldPathAbs)) {
                                    fs.renameSync(oldPathAbs, newPathAbs);
                                    file.fileName = newFilename;
                                    file.path = `/uploads/${evrak.applicationYear}/${evrak.sequenceNumber}/${newFilename}`;
                                }
                            }

                            approvedFiles.push({
                                fileName: file.fileName,
                                originalName: file.originalName,
                                path: file.path
                            });
                        }
                    });
                }

                // Add approval note with files
                evrak.notes.push({
                    text: 'Yazı onaylandı.',
                    author: req.user.id,
                    date: Date.now(),
                    relatedFiles: approvedFiles
                });

                evrak.approvedAt = Date.now(); // Track approval time

                // Notify Assistants
                try {
                    const assistants = await User.find({ role: 'asistan' });
                    const assistantEmails = assistants.map(a => a.email);
                    if (assistantEmails.length > 0) {
                        await sendEmail({
                            email: assistantEmails,
                            subject: `Evrak Onaylandı (Dosya Gönderimi Bekleniyor): ${evrak.documentNumber}`,
                            message: `<h3>Evrak Onaylandı</h3>
                                     <p><strong>Arşiv No:</strong> ${evrak.applicationYear}/${evrak.sequenceNumber}</p>
                                     <p><strong>Konu:</strong> ${evrak.title}</p>
                                     <p><strong>Onaylayan:</strong> ${req.user.name}</p>
                                     <p>Yazının dışarıya gönderilmesi için hazır beklemektedir.</p>`
                        });
                    }
                } catch (mailErr) {
                    console.error('Email sending failed:', mailErr.message);
                }

            } else if (action === 'reject') {
                if (!note) {
                    return res.status(400).json({ success: false, message: 'Reddederken açıklama notu girmelisiniz.' });
                }
                evrak.status = 'FORWARDED'; // Send back to unit
                
                // Mark pending response files as REJECTED and RENAME to CVP_RED_
                const rejectedFiles = [];
                if (evrak.responseFiles) {
                    evrak.responseFiles.forEach(file => {
                        if (file.status === 'PENDING') {
                            file.status = 'REJECTED';
                            
                            // RENAME FILE
                            if (evrak.sequenceNumber && evrak.applicationYear) {
                                const oldFilename = file.fileName;
                                const baseName = oldFilename.replace(/^(CVP_RED_|CVP_ONAYLI_|CVP_)/, '');
                                const newFilename = `CVP_RED_${baseName}`;
                                
                                const targetDir = path.join(__dirname, '../public/uploads', evrak.applicationYear.toString(), evrak.sequenceNumber.toString());
                                const oldPathAbs = path.join(targetDir, oldFilename);
                                const newPathAbs = path.join(targetDir, newFilename);
                                
                                if (fs.existsSync(oldPathAbs)) {
                                    fs.renameSync(oldPathAbs, newPathAbs);
                                    file.fileName = newFilename;
                                    file.path = `/uploads/${evrak.applicationYear}/${evrak.sequenceNumber}/${newFilename}`;
                                }
                            }

                            rejectedFiles.push({
                                fileName: file.fileName,
                                originalName: file.originalName,
                                path: file.path
                            });
                        }
                    });
                }

                evrak.notes.push({
                    text: 'RED GEREKÇESİ: ' + note,
                    author: req.user.id,
                    date: Date.now(),
                    relatedFiles: rejectedFiles
                });

                // Notify Unit for Response Reject
                const targetRole = unitToRoleMap[evrak.targetUnit];
                if (targetRole) {
                    try {
                        const users = await User.find({ role: targetRole });
                        const emails = users.map(u => u.email);
                        if (emails.length > 0) {
                            await sendEmail({
                                email: emails,
                                subject: `Evrak Yanıtı Reddedildi: ${evrak.documentNumber}`,
                                message: `<h3>Yazı Yanıtı Reddedildi</h3>
                                         <p><strong>Arşiv No:</strong> ${evrak.applicationYear}/${evrak.sequenceNumber}</p>
                                         <p><strong>Konu:</strong> ${evrak.title}</p>
                                         <p><strong>Reddeden:</strong> ${req.user.name}</p>
                                         <p><strong>Red Gerekçesi:</strong> ${note}</p>`
                            });
                        }
                    } catch (mailErr) {
                        console.error('Email sending failed:', mailErr.message);
                    }
                }
            } else {
                return res.status(400).json({ success: false, message: 'Geçersiz işlem' });
            }
        }

        await evrak.save();
        
        const updatedEvrak = await GelenEvrak.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('responseFiles.addedBy', 'name')
            .populate('notes.author', 'name role');

        res.status(200).json({
            success: true,
            data: updatedEvrak,
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Dispatch final response (Assistant)
// @route   POST /api/gelen-evrak/:id/dispatch
// @access  Private (Asistan/Admin)
exports.dispatchResponse = async (req, res, next) => {
    try {
        const evrak = await GelenEvrak.findById(req.params.id);

        if (!evrak) {
             return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });
        }

        if (req.user.role !== 'asistan' && req.user.role !== 'admin') {
             return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok (Yalnızca Asistan/Admin)' });
        }

        if (evrak.status !== 'APPROVED') {
             return res.status(400).json({ success: false, message: 'Yalnızca yönetici tarafından onaylanmış evraklar gönderilebilir.' });
        }
        
        const { dispatchDate, dispatchMethod, dispatchNumber, gidenEvrakId } = req.body;

        if (gidenEvrakId) {
            // Finalize via Linked Giden Evrak
            const GidenEvrak = require('../models/GidenEvrak');
            const giden = await GidenEvrak.findById(gidenEvrakId);
            if (!giden) {
                return res.status(404).json({ success: false, message: 'Seçilen giden evrak bulunamadı' });
            }

            evrak.dispatch = {
                dispatchDate: giden.dispatchDate || giden.documentDate,
                dispatchMethod: giden.dispatchMethod || 'Belirtilmedi',
                dispatchNumber: giden.documentNumber,
                dispatchFiles: giden.files,
                dispatchedBy: req.user.id,
                dispatchedAt: Date.now()
            };

            // Ensure it's in related array
            if (!evrak.relatedGidenEvrak.includes(gidenEvrakId)) {
                evrak.relatedGidenEvrak.push(gidenEvrakId);
            }
        } else {
            // Manual Dispatch Info
            if (!dispatchDate || !dispatchMethod || !dispatchNumber) {
                return res.status(400).json({ success: false, message: 'Lütfen gönderim tarihi, yöntemi ve numarasını giriniz.' });
            }

            const dispatchFiles = [];
            if (req.files && req.files.length > 0) {
                 const targetDir = path.join(__dirname, '../public/uploads', evrak.applicationYear.toString(), evrak.sequenceNumber.toString());
                  if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                 req.files.forEach(file => {
                    const fileExt = path.extname(file.originalname);
                    // Sanitize filename
                    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const cleanDispatchNo = dispatchNumber.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const newFilename = `GIDEN-${cleanDispatchNo}_${Date.now()}_${safeName}`;
                    
                    const newPathAbs = path.join(targetDir, newFilename);
                    const currentFullPath = path.join(__dirname, '../', file.path);

                    if (fs.existsSync(currentFullPath)) {
                         fs.renameSync(currentFullPath, newPathAbs);
                    }
                    
                    dispatchFiles.push({
                        fileName: newFilename,
                        originalName: file.originalname,
                        path: `/uploads/${evrak.applicationYear}/${evrak.sequenceNumber}/${newFilename}`,
                        mimeType: file.mimetype
                    });
                 });
            }

            evrak.dispatch = {
                dispatchDate: dispatchDate,
                dispatchMethod: dispatchMethod,
                dispatchNumber: dispatchNumber,
                dispatchFiles: dispatchFiles,
                dispatchedBy: req.user.id,
                dispatchedAt: Date.now()
            };
        }

        evrak.status = 'COMPLETED';

        evrak.notes.push({
            text: gidenEvrakId ? 'Giden evrak ilişkilendirilerek sonuçlandırıldı.' : `Evrak sonuçlandı ve gönderildi. (Yöntem: ${dispatchMethod}, No: ${dispatchNumber})`,
            author: req.user.id,
            date: Date.now(),
            relatedFiles: gidenEvrakId ? [] : evrak.dispatch.dispatchFiles
        });

        await evrak.save();

        // Notify Managers with Duration Report
        try {
            const managers = await User.find({ role: 'yonetici' });
            const managerEmails = managers.map(m => m.email);
            if (managerEmails.length > 0) {
                let durationText = 'Belirtilmedi';
                if (evrak.approvedAt) {
                    const now = new Date();
                    const approvedAt = new Date(evrak.approvedAt);
                    const diffMs = now - approvedAt;
                    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    durationText = `${diffHrs} saat ${diffMins} dakika`;
                }

                await sendEmail({
                    email: managerEmails,
                    subject: `Evrak Gönderimi Tamamlandı: ${evrak.documentNumber}`,
                    message: `<h3>Evrak Gönderimi Raporu</h3>
                             <p><strong>Arşiv No:</strong> ${evrak.applicationYear}/${evrak.sequenceNumber}</p>
                             <p><strong>Konu:</strong> ${evrak.title}</p>
                             <p><strong>Gönderen Asistan:</strong> ${req.user.name}</p>
                             <p><strong>Onay Zamanı:</strong> ${evrak.approvedAt ? new Date(evrak.approvedAt).toLocaleString('tr-TR') : 'Bilinmiyor'}</p>
                             <p><strong>Gönderim Zamanı:</strong> ${new Date().toLocaleString('tr-TR')}</p>
                             <p><strong>Onay-Gönderim Süresi:</strong> ${durationText}</p>`
                });
            }
        } catch (mailErr) {
            console.error('Email sending failed:', mailErr.message);
        }

        const updatedEvrak = await GelenEvrak.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('responseFiles.addedBy', 'name')
            .populate('notes.author', 'name role')
            .populate('dispatch.dispatchedBy', 'name');

        res.status(200).json({
            success: true,
            data: updatedEvrak
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};
// @desc    Link Giden Evrak to Gelen Evrak
// @route   POST /api/gelen-evrak/:id/link-giden
// @access  Private
exports.linkGidenEvrak = async (req, res, next) => {
    try {
        const { gidenEvrakId } = req.body;
        const evrak = await GelenEvrak.findById(req.params.id);

        if (!evrak) {
            return res.status(404).json({ success: false, message: 'Gelen evrak bulunamadı' });
        }

        // Check if already linked
        if (evrak.relatedGidenEvrak.includes(gidenEvrakId)) {
            return res.status(400).json({ success: false, message: 'Bu evrak zaten ilişkilendirilmiş' });
        }

        evrak.relatedGidenEvrak.push(gidenEvrakId);
        
        // Add a note about the link
        evrak.notes.push({
            text: 'Giden evrak ile ilişkilendirildi.',
            author: req.user.id,
            date: Date.now()
        });

        await evrak.save();

        const updatedEvrak = await GelenEvrak.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('responseFiles.addedBy', 'name')
            .populate('notes.author', 'name role')
            .populate('relatedGidenEvrak');

        res.status(200).json({
            success: true,
            data: updatedEvrak
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Unlink Giden Evrak from Gelen Evrak
// @route   DELETE /api/gelen-evrak/:id/link-giden/:gidenId
// @access  Private
exports.unlinkGidenEvrak = async (req, res, next) => {
    try {
        const evrak = await GelenEvrak.findById(req.params.id);

        if (!evrak) {
            return res.status(404).json({ success: false, message: 'Gelen evrak bulunamadı' });
        }

        evrak.relatedGidenEvrak = evrak.relatedGidenEvrak.filter(
            id => id.toString() !== req.params.gidenId
        );

        evrak.notes.push({
            text: 'Giden evrak ilişkisi kaldırıldı.',
            author: req.user.id,
            date: Date.now()
        });

        await evrak.save();

        const updatedEvrak = await GelenEvrak.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('responseFiles.addedBy', 'name')
            .populate('notes.author', 'name role')
            .populate('relatedGidenEvrak');

        res.status(200).json({
            success: true,
            data: updatedEvrak
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
