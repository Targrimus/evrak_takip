const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const GelenEvrak = require('./models/GelenEvrak');
const GidenEvrak = require('./models/GidenEvrak');

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    const user = await User.findOne();
    if (!user) {
      console.log('No user found. Please register at least one user first.');
      process.exit();
    }

    const units = [
      'Müşteri Hizmetleri',
      'Ölçüm ve Tahakkuk Birimi',
      'İşletme Birimi',
      'Bakım Onarım Birimi',
      'Harita ve Proje Birimi',
      'Teknik Ofis Birimi',
      'Kalite ve İş Süreçleri Birimi',
      'Şirket Müdürlüğü',
      'Muhasebe Birimi'
    ];

    console.log('Creating Gelen Evraklar...');
    const gelenEvraklar = [];
    for (let i = 1; i <= 50; i++) {
        gelenEvraklar.push({
            title: `Örnek Gelen Evrak ${i}`,
            sender: `Bilgi Teknolojileri A.Ş. ${i}`,
            documentNumber: `GE-2026-${1000 + i}`,
            documentDate: new Date(),
            arrivalDate: new Date(),
            targetUnit: units[Math.floor(Math.random() * units.length)],
            status: 'FORWARDED',
            description: `Test amaçlı otomatik oluşturulmuş gelen evrak kaydı ${i}`,
            createdBy: user._id,
            applicationYear: 2026,
            sequenceNumber: i
        });
    }

    console.log('Creating Giden Evraklar...');
    const gidenEvraklar = [];
    for (let i = 1; i <= 50; i++) {
        gidenEvraklar.push({
            title: `Örnek Giden Evrak ${i}`,
            recipient: `Enerji Bakanlığı ${i}`,
            documentNumber: `GN-2026-${2000 + i}`,
            documentDate: new Date(),
            targetUnit: units[Math.floor(Math.random() * units.length)],
            status: 'SENT',
            description: `Test amaçlı otomatik oluşturulmuş giden evrak kaydı ${i}`,
            createdBy: user._id,
            applicationYear: 2026,
            sequenceNumber: i
        });
    }

    await GelenEvrak.insertMany(gelenEvraklar);
    await GidenEvrak.insertMany(gidenEvraklar);

    console.log('Successfully seeded 50 Gelen and 50 Giden Evrak records!');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
