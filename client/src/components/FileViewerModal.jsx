import React, { useState, useEffect } from 'react';
import { Modal, Button, Image } from 'react-bootstrap';
import { Download, ZoomIn, ZoomOut, ArrowClockwise } from 'react-bootstrap-icons';

const FileViewerModal = ({ show, handleClose, file }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset zoom/rotation when file changes
  useEffect(() => {
    setScale(1);
    setRotation(0);
  }, [file]);

  if (!file) return null;

  const fileExt = file.originalName?.split('.').pop().toLowerCase();
  
  // Determine Type
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt);
  const isPdf = ['pdf'].includes(fileExt);
  const isText = ['txt'].includes(fileExt);
  // Browsers don't support tiff, doc, docx, xls, xlsx natively in img/iframe without plugins

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const renderContent = () => {
    if (isImage) {
      return (
        <div className="text-center overflow-auto bg-light p-3" style={{ maxHeight: '70vh' }}>
            <div style={{ transform: `scale(${scale}) rotate(${rotation}deg)`, transition: 'transform 0.2s' }}>
                <Image src={file.path} fluid style={{ maxHeight: '65vh' }} />
            </div>
        </div>
      );
    } else if (isPdf || isText) {
      return (
        <div style={{ height: '70vh' }}>
            <iframe 
                src={file.path} 
                title={file.originalName}
                width="100%" 
                height="100%" 
                style={{ border: 'none' }} 
            />
        </div>
      );
    } else {
      return (
        <div className="text-center p-5">
            <div className="mb-3 text-muted display-1">
                <FileIcon ext={fileExt} />
            </div>
            <h5 className="mb-3">Bu dosya formatı ({fileExt}) tarayıcıda önizlenemez.</h5>
            <p className="text-muted mb-4">Görüntülemek için dosyayı indirebilirsiniz.</p>
            <Button variant="primary" href={file.path} target="_blank" download>
                <Download className="me-2" /> İndir
            </Button>
        </div>
      );
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered fullscreen="lg-down">
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="fs-6 text-truncate" style={{ maxWidth: '80%' }}>
            {file.originalName}
        </Modal.Title>
        <div className="ms-auto me-2 d-flex gap-2">
            {isImage && (
                <>
                    <Button variant="outline-secondary" size="sm" onClick={handleZoomOut}><ZoomOut /></Button>
                    <Button variant="outline-secondary" size="sm" onClick={handleZoomIn}><ZoomIn /></Button>
                     <Button variant="outline-secondary" size="sm" onClick={handleRotate}><ArrowClockwise /></Button>
                </>
            )}
             <Button variant="primary" size="sm" href={file.path} target="_blank" download title="İndir">
                <Download />
            </Button>
        </div>
      </Modal.Header>
      <Modal.Body className="p-0 bg-secondary bg-opacity-10">
        {renderContent()}
      </Modal.Body>
    </Modal>
  );
};

const FileIcon = ({ ext }) => {
    // Simple placeholder icon logic
    return <i className="bi bi-file-earmark"></i>; 
};

export default FileViewerModal;
