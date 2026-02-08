import { Modal, Form, Button, ListGroup } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import { FileEarmark, Trash } from 'react-bootstrap-icons';

const GidenEvrakModal = ({ show, handleClose, onSubmit, formData, onChange, isEditMode, onFileChange, existingFiles, onDeleteFile }) => {
  const { title, recipient, documentNumber, documentDate, targetUnit, status, description, dispatchDate, dispatchMethod } = formData;
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  useEffect(() => {
    if (!show) setSelectedFiles([]);
  }, [show]);

  const handleFileChange = (e) => {
      if (e.target.files) {
          const files = Array.from(e.target.files);
          setSelectedFiles(files);
          onFileChange(e.target.files);
      }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="border-0">
        <Modal.Title className="fw-bold text-primary">
          {isEditMode ? 'Giden Evrak Düzenle' : 'Yeni Giden Evrak Kaydı'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={onSubmit}>
          <div className="row">
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Evrak Sayısı (No)</Form.Label>
                <Form.Control type="text" name="documentNumber" value={documentNumber} onChange={onChange} required placeholder="Örn: 2024/123" />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Evrak Tarihi</Form.Label>
                <Form.Control type="date" name="documentDate" value={documentDate} onChange={onChange} required />
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Alıcı Kurum / Kişi</Form.Label>
            <Form.Control type="text" name="recipient" value={recipient} onChange={onChange} required placeholder="Örn: X Belediyesi, Mehmet Öz vb." />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Konu (Başlık)</Form.Label>
            <Form.Control type="text" name="title" value={title} onChange={onChange} required placeholder="Evrak konusunu giriniz" />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>İlgili Birim (Çıkış Yapan)</Form.Label>
            <Form.Select name="targetUnit" value={targetUnit} onChange={onChange} required>
              <option value="">Birim Seçiniz</option>
              <option value="Müşteri Hizmetleri">Müşteri Hizmetleri</option>
              <option value="Ölçüm ve Tahakkuk Birimi">Ölçüm ve Tahakkuk Birimi</option>
              <option value="İşletme Birimi">İşletme Birimi</option>
              <option value="Bakım Onarım Birimi">Bakım Onarım Birimi</option>
              <option value="Harita ve Proje Birimi">Harita ve Proje Birimi</option>
              <option value="Teknik Ofis Birimi">Teknik Ofis Birimi</option>
              <option value="Kalite ve İş Süreçleri Birimi">Kalite ve İş Süreçleri Birimi</option>
              <option value="Şirket Müdürlüğü">Şirket Müdürlüğü</option>
            </Form.Select>
          </Form.Group>

          <div className="row">
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Gönderim Tarihi</Form.Label>
                <Form.Control type="date" name="dispatchDate" value={dispatchDate} onChange={onChange} />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Gönderim Şekli</Form.Label>
                <Form.Select name="dispatchMethod" value={dispatchMethod} onChange={onChange}>
                  <option value="">Seçiniz</option>
                  <option value="E-posta">E-posta</option>
                  <option value="KEP">KEP</option>
                  <option value="Posta">Posta</option>
                  <option value="Kargo">Kargo</option>
                  <option value="Kurye">Kurye</option>
                  <option value="Elden">Elden</option>
                  <option value="Diğer">Diğer</option>
                </Form.Select>
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Dosya Ekle</Form.Label>
            <Form.Control type="file" multiple onChange={handleFileChange} />
          </Form.Group>

          {isEditMode && existingFiles && existingFiles.length > 0 && (
            <div className="mb-3">
              <Form.Label>Mevcut Dosyalar:</Form.Label>
              <ListGroup>
                {existingFiles.map((file, index) => (
                   <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                    <a href={file.path} target="_blank" rel="noopener noreferrer" className="text-decoration-none text-dark">
                      <FileEarmark className="me-2" />
                      {file.originalName}
                    </a>
                    <Button variant="outline-danger" size="sm" onClick={() => onDeleteFile(file._id)}>
                      <Trash />
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="mb-3">
              <span className="text-muted small">Seçilen Dosyalar: {selectedFiles.map(f => f.name).join(', ')}</span>
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Açıklama / Notlar</Form.Label>
            <Form.Control as="textarea" rows={3} name="description" value={description} onChange={onChange} />
          </Form.Group>

          <div className="d-grid gap-2 mt-4">
            <Button variant="primary" type="submit" className="custom-btn text-white">
              {isEditMode ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default GidenEvrakModal;
