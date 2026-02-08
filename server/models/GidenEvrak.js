const mongoose = require('mongoose');

const GidenEvrakSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lütfen evrak konusunu giriniz'],
    trim: true,
  },
  recipient: {
    type: String,
    required: [true, 'Lütfen alıcı kurum/kişi bilgisini giriniz'],
  },
  documentNumber: {
    type: String,
    required: [true, 'Lütfen evrak sayısını giriniz'],
  },
  documentDate: {
    type: Date,
    required: [true, 'Lütfen evrak tarihini giriniz'],
  },
  dispatchDate: {
    type: Date,
  },
  dispatchMethod: {
    type: String,
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
    enum: ['DRAFT', 'SENT', 'ARCHIVED'],
    default: 'SENT',
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
  notes: [
    {
      text: String,
      author: { type: mongoose.Schema.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now }
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
});

module.exports = mongoose.model('GidenEvrak', GidenEvrakSchema);
