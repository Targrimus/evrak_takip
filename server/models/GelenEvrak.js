const mongoose = require('mongoose');

const GelenEvrakSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lütfen evrak konusunu giriniz'],
    trim: true,
  },
  sender: {
    type: String,
    required: [true, 'Lütfen gönderen kurum/kişi bilgisini giriniz'],
  },
  documentNumber: {
    type: String,
    required: [true, 'Lütfen evrak sayısını giriniz'],
  },
  documentDate: {
    type: Date,
    required: [true, 'Lütfen evrak tarihini giriniz'],
  },
  arrivalDate: {
    type: Date,
    default: Date.now,
  },
  applicationYear: {
      type: Number,
      default: () => new Date().getFullYear()
  },
  sequenceNumber: {
      type: Number
  },
  targetUnit: {
    type: String,
    required: [true, 'Lütfen ilgili birimi seçiniz'],
    enum: [
      'Müşteri Hizmetleri',
      'Ölçüm ve Tahakkuk Birimi',
      'İşletme Birimi',
      'Bakım Onarım Birimi',
      'Harita ve Proje Birimi',
      'Teknik Ofis Birimi',
      'Kalite ve İş Süreçleri Birimi',
      'Şirket Müdürlüğü',
      'Muhasebe Birimi'
    ],
  },
  status: {
    type: String,
    enum: ['PENDING', 'FORWARDED', 'ANSWERED', 'APPROVED', 'REJECTED', 'ARCHIVED', 'ARCHIVE_REQUESTED', 'COMPLETED'],
    default: 'FORWARDED', // Default is now FORWARDED as per request
  },
  description: {
    type: String,
  },
  files: [
    {
      fileName: String,
      originalName: String,
      path: String,
      mimeType: String
    }
  ],
  responseFiles: [
    {
      fileName: String,
      originalName: String,
      path: String,
      mimeType: String,
      addedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
      addedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' }
    }
  ],
  dispatch: {
      dispatchDate: Date,
      dispatchMethod: String,
      dispatchNumber: String,
      dispatchFiles: [{
          fileName: String,
          originalName: String,
          path: String,
          mimeType: String
      }],
      dispatchedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
      dispatchedAt: { type: Date, default: Date.now }
  },
  approvedAt: {
    type: Date
  },
  notes: [
    {
      text: String,
      author: { type: mongoose.Schema.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now },
      relatedFiles: [{
        fileName: String,
        originalName: String,
        path: String
      }]
    }
  ],
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  relatedGidenEvrak: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'GidenEvrak'
    }
  ],
});

module.exports = mongoose.model('GelenEvrak', GelenEvrakSchema);
