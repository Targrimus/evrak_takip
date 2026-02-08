import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Badge, Button, Spinner, Alert, ListGroup, Form, Modal, InputGroup } from 'react-bootstrap';
import { FileEarmark, ArrowLeft, CheckCircle, XCircle, Send, Plus, Search, Trash, Link } from 'react-bootstrap-icons';
import gelenEvrakService from '../features/gelenEvrak/gelenEvrakService';
import gidenEvrakService from '../features/gidenEvrak/gidenEvrakService';
import AuthContext from '../context/AuthContext';
import FileViewerModal from '../components/FileViewerModal';

const GelenEvrakDetay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [evrak, setEvrak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for Workflows
  const [responseFiles, setResponseFiles] = useState([]);
  const [note, setNote] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // File Viewer State
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Dispatch State
  const [dispatchData, setDispatchData] = useState({
      dispatchDate: new Date().toISOString().split('T')[0],
      dispatchMethod: 'KEP',
      dispatchNumber: ''
  });
  const [dispatchFiles, setDispatchFiles] = useState([]);
  const [dispatchMode, setDispatchMode] = useState('manual'); // 'manual' or 'link'
  
  // Association State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [gidenSearch, setGidenSearch] = useState('');
  const [allGidenEvrak, setAllGidenEvrak] = useState([]);
  const [loadingGiden, setLoadingGiden] = useState(false);

  useEffect(() => {
    fetchEvrak();
  }, [id]);

  const fetchEvrak = async () => {
    try {
      setLoading(true);
      const res = await gelenEvrakService.getGelenEvrak(id);
      setEvrak(res.data);
    } catch (err) {
      setError('Evrak detayları alınamadı. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (e, file) => {
      e.preventDefault();
      setSelectedFile(file);
      setShowFileModal(true);
  };

  const handleCloseFileModal = () => {
      setShowFileModal(false);
      setSelectedFile(null);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'APPROVED': return <Badge bg="success" className="fs-6">Onaylandı (Yönetici Asistanında)</Badge>;
      case 'REJECTED': return <Badge bg="danger" className="fs-6">Reddedildi</Badge>;
      case 'ANSWERED': return <Badge bg="primary" className="fs-6">Cevaplandı (Yönetici Onayında)</Badge>;
      case 'ARCHIVE_REQUESTED': return <Badge bg="warning" className="fs-6">Arşiv Onayı Bekliyor</Badge>;
      case 'ARCHIVED': return <Badge bg="secondary" className="fs-6">Arşive Alındı</Badge>;
      case 'PENDING': return <Badge bg="warning" text="dark" className="fs-6">Beklemede</Badge>;
      case 'FORWARDED': return <Badge bg="info" className="fs-6">Sorumlu Birime Yönlendirildi</Badge>;
      case 'COMPLETED': return <Badge bg="dark" className="fs-6">Tamamlandı / Gönderildi</Badge>;
      default: return <Badge bg="secondary" className="fs-6">{status}</Badge>;
    }
  };

  const handleResponseFileChange = (e) => {
      if (e.target.files) {
          setResponseFiles(Array.from(e.target.files));
      }
  };

  const submitResponseFiles = async (e) => {
      e.preventDefault();
      if (responseFiles.length === 0) return;
      
      try {
          setActionLoading(true);
          const formData = new FormData();
          responseFiles.forEach(file => formData.append('files', file));
          
          const res = await gelenEvrakService.addResponseFile(id, formData);
          setEvrak(res.data);
          setResponseFiles([]);
          alert('Cevap dosyası eklendi ve durum güncellendi.');
      } catch (err) {
          alert('Dosya yüklenirken hata oluştu: ' + err.message);
      } finally {
          setActionLoading(false);
      }
  };

  const submitNote = async (e) => {
      e.preventDefault();
      if (!note.trim()) return;

      try {
           setActionLoading(true);
           const res = await gelenEvrakService.addNote(id, { text: note });
           setEvrak(res.data);
           setNote('');
      } catch (err) {
          alert('Not eklenirken hata oluştu: ' + err.message);
      } finally {
           setActionLoading(false);
      }
  };

  const handleWorkflow = async (action, noteData = null) => {
      if (action === 'reject' && !rejectNote.trim()) {
          alert('Lütfen red gerekçesini giriniz.');
          return;
      }
      if (action === 'approve' && !window.confirm('Evrakı onaylamak istediğinize emin misiniz?')) {
          return;
      }
      if (action === 'archive' && !window.confirm('Bu evrakı arşive almak istediğinize emin misiniz?')) {
          return;
      }

      try {
          setActionLoading(true);
          const payload = { action };
          if (action === 'reject' || action === 'reject_archive') payload.note = rejectNote;
          if (action === 'archive' || action === 'request_archive') payload.note = noteData;

          const res = await gelenEvrakService.manageWorkflow(id, payload);
          setEvrak(res.data);
          setRejectNote('');
          
          let msg = '';
          if (action === 'approve') msg = 'Evrak onaylandı.';
          else if (action === 'reject') msg = 'Evrak reddedildi ve birime geri gönderildi.';
          else if (action === 'archive') msg = 'Evrak başarıyla arşive alındı.';
          else if (action === 'request_archive') msg = 'Arşivleme talebi yönetici onayına gönderildi.';
          else if (action === 'approve_archive') msg = 'Arşivleme talebi onaylandı ve evrak arşive alındı.';
          else if (action === 'reject_archive') msg = 'Arşivleme talebi reddedildi.';
          
          alert(msg);
      } catch (err) {
        alert('İşlem başarısız: ' + err.message);
      } finally {
        setActionLoading(false);
      }
  };

  const handleDispatchChange = (e) => {
      setDispatchData({
          ...dispatchData,
          [e.target.name]: e.target.value
      });
  };

  const handleDispatchFileChange = (e) => {
      if (e.target.files) {
          setDispatchFiles(Array.from(e.target.files));
      }
  };

  const submitDispatch = async (e) => {
      e.preventDefault();
      if (!dispatchData.dispatchDate || !dispatchData.dispatchMethod || !dispatchData.dispatchNumber) {
          alert('Lütfen tüm alanları doldurunuz.');
          return;
      }

      try {
          setActionLoading(true);
          const formData = new FormData();
          formData.append('dispatchDate', dispatchData.dispatchDate);
          formData.append('dispatchMethod', dispatchData.dispatchMethod);
          formData.append('dispatchNumber', dispatchData.dispatchNumber);
          
          if (dispatchFiles) {
              dispatchFiles.forEach(file => formData.append('files', file));
          }

          const res = await gelenEvrakService.dispatchResponse(id, formData);
          setEvrak(res.data);
          alert('Evrak başarıyla sonuçlandırıldı ve gönderildi.');
      } catch (err) {
          alert('İşlem başarısız: ' + err.message);
      } finally {
          setActionLoading(false);
      }
  };

  const handleFinalizeByLink = async (gidenId) => {
      try {
          setActionLoading(true);
          const res = await gelenEvrakService.dispatchResponse(id, { gidenEvrakId: gidenId });
          setEvrak(res.data);
          setShowLinkModal(false);
          alert('Evrak giden evrak ilişkisi ile başarıyla sonuçlandırıldı.');
      } catch (err) {
          alert('İşlem başarısız: ' + (err.response?.data?.message || err.message));
      } finally {
          setActionLoading(false);
      }
  };

  const handleLinkGiden = async (gidenId) => {
      try {
          setActionLoading(true);
          const res = await gelenEvrakService.linkGidenEvrak(id, gidenId);
          setEvrak(res.data);
          setShowLinkModal(false);
      } catch (err) {
          alert('İlişki kurulurken hata oluştu: ' + (err.response?.data?.message || err.message));
      } finally {
          setActionLoading(false);
      }
  };

  const handleUnlinkGiden = async (gidenId) => {
      if (!window.confirm('Bu evrakın ilişkisini kaldırmak istediğinize emin misiniz?')) return;
      try {
          setActionLoading(true);
          const res = await gelenEvrakService.unlinkGidenEvrak(id, gidenId);
          setEvrak(res.data);
      } catch (err) {
          alert('İlişki kaldırılırken hata oluştu: ' + (err.response?.data?.message || err.message));
      } finally {
          setActionLoading(false);
      }
  };

  const openLinkModal = async () => {
       setShowLinkModal(true);
       if (allGidenEvrak.length === 0) {
           try {
               setLoadingGiden(true);
               const res = await gidenEvrakService.getGidenEvraklar();
               setAllGidenEvrak(res.data);
           } catch (err) {
               console.error('Giden evraklar yüklenemedi');
           } finally {
               setLoadingGiden(false);
           }
       }
  };

  const filteredGiden = allGidenEvrak.filter(g => 
      g.title.toLowerCase().includes(gidenSearch.toLowerCase()) || 
      g.documentNumber.toLowerCase().includes(gidenSearch.toLowerCase()) ||
      g.recipient.toLowerCase().includes(gidenSearch.toLowerCase())
  );

  if (loading) return <Container className="mt-5 text-center"><Spinner animation="border" variant="primary" /></Container>;
  if (error) return <Container className="mt-5"><Alert variant="danger">{error}</Alert></Container>;
  if (!evrak) return null;

  return (
    <Container className="mt-5 mb-5 space-y-4">
      <Button variant="outline-secondary" className="mb-4" onClick={() => navigate('/')}>
        <ArrowLeft className="me-2" />
        Listeye Dön
      </Button>

      <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
        <Card.Header className="bg-secondary bg-opacity-10 py-4 px-4 border-bottom border-light">
            <div className="d-flex justify-content-between align-items-center">
                <div>
                    <h5 className="mb-1 text-muted small fw-bold text-uppercase ls-1">Gelen Evrak Detayı</h5>
                    <h3 className="mb-0 fw-bold text-dark">{evrak.title}</h3>
                </div>
                <div className="text-end">
                  <small className="d-block text-muted mb-1" style={{fontSize: '0.75rem'}}>Evrak No</small>
                  <span className="fw-bold fs-5 text-dark">{evrak.documentNumber}</span>
                </div>
            </div>
        </Card.Header>
        <Card.Body className="p-4 bg-light bg-opacity-25">
            <Row className="g-4">
                <Col lg={8}>
                    {/* INFO SECTION */}
                    <Card className="border-0 shadow-sm mb-4 rounded-4">
                        <Card.Body className="p-4">
                            <h5 className="text-primary fw-bold mb-4 d-flex align-items-center">
                                <span className="bg-primary bg-opacity-10 p-2 rounded-circle me-3"><FileEarmark /></span>
                                Evrak Bilgileri
                            </h5>
                            
                            <Row className="gy-3">
                                <Col md={6}>
                                    <div className="p-3 bg-light rounded-3 h-100">
                                        <small className="text-muted d-block mb-1">Gönderen Kurum/Kişi</small>
                                        <div className="fw-bold text-dark">{evrak.sender}</div>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="p-3 bg-light rounded-3 h-100">
                                        <small className="text-muted d-block mb-1">İlgili Birim</small>
                                        <div><Badge bg="info" text="dark" className="px-3 py-2 rounded-pill">{evrak.targetUnit}</Badge></div>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="p-3 bg-light rounded-3 h-100">
                                        <small className="text-muted d-block mb-1">Evrak Tarihi</small>
                                        <div className="fw-bold text-dark">{new Date(evrak.documentDate).toLocaleDateString()}</div>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="p-3 bg-light rounded-3 h-100">
                                        <small className="text-muted d-block mb-1">Sisteme Kayıt Tarihi</small>
                                        <div className="fw-bold text-dark">{new Date(evrak.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </Col>
                            </Row>
                            
                            <div className="mt-4">
                                <h6 className="text-muted mb-2 fw-bold">Açıklama</h6>
                                <div className="p-3 bg-light rounded-3 text-secondary" style={{minHeight: '100px', whiteSpace: 'pre-wrap'}}>
                                    {evrak.description || 'Açıklama bulunmamaktadır.'}
                                </div>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* NOTES SECTION */}
                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                        <Card.Header className="bg-white py-3 px-4 border-bottom border-light d-flex align-items-center justify-content-between">
                            <h6 className="mb-0 fw-bold text-primary">Notlar & Tarihçe</h6>
                            <Badge bg="light" text="dark" pill>{evrak.notes?.length || 0} kayıt</Badge>
                        </Card.Header>
                        <Card.Body className="p-4 bg-light bg-opacity-10">
                             <div className="mb-4" style={{maxHeight: '400px', overflowY: 'auto'}}>
                                 {evrak.notes && evrak.notes.length > 0 ? (
                                     <div className="timeline">
                                         {evrak.notes.slice().reverse().map((n, idx) => (
                                             <div key={idx} className="d-flex mb-3">
                                                 <div className="flex-shrink-0 me-3">
                                                     <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px', fontSize: '0.8rem'}}>
                                                         {n.author?.name?.charAt(0) || 'U'}
                                                     </div>
                                                 </div>
                                                 <div className="flex-grow-1 bg-white p-3 rounded-3 shadow-sm border border-light">
                                                     <div className="d-flex justify-content-between mb-1">
                                                         <small className="fw-bold text-dark">{n.author?.name || 'Kullanıcı'}</small>
                                                         <small className="text-muted" style={{fontSize: '0.75rem'}}>{new Date(n.date).toLocaleString()}</small>
                                                     </div>
                                                     <p className="mb-1 text-secondary small">{n.text}</p>
                                                     {n.relatedFiles && n.relatedFiles.length > 0 && (
                                                         <div className="mt-2 pt-2 border-top">
                                                             <small className="d-block text-muted mb-1 fw-bold" style={{fontSize: '0.75rem'}}>Eklenen Dosyalar:</small>
                                                             {n.relatedFiles.map((f, fIdx) => (
                                                                 <div key={fIdx} className="d-flex align-items-center mb-1">
                                                                     <FileEarmark className="text-primary me-2" size={12}/>
                                                                     <Button 
                                                                        variant="link" 
                                                                        className="text-decoration-none small text-primary fw-bold p-0 border-0"
                                                                        onClick={(e) => handleFileClick(e, f)}
                                                                     >
                                                                         {f.originalName}
                                                                     </Button>
                                                                 </div>
                                                             ))}
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 ) : (
                                     <div className="text-center py-4 text-muted bg-white rounded-3 border border-dashed">
                                         Henüz not eklenmemiş.
                                     </div>
                                 )}
                             </div>
                             
                             <Form onSubmit={submitNote} className="bg-white p-3 rounded-3 shadow-sm border border-light">
                                 <Form.Group className="mb-2">
                                     <Form.Label className="small text-muted fw-bold">Yeni Not Ekle</Form.Label>
                                     <Form.Control 
                                         as="textarea" 
                                         rows={2} 
                                         placeholder="Buraya bir not yazın..." 
                                         value={note} 
                                         onChange={(e) => setNote(e.target.value)} 
                                         className="border-0 bg-light"
                                         style={{resize: 'none'}}
                                     />
                                 </Form.Group>
                                 <div className="d-flex justify-content-end">
                                    <Button size="sm" variant="primary" type="submit" disabled={!note.trim() || actionLoading} className="px-4 rounded-pill">
                                        Notu Kaydet
                                    </Button>
                                 </div>
                             </Form>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4}>
                    {/* STATUS CARD */}
                    <Card className="mb-4 border-0 shadow-sm rounded-4 text-center overflow-hidden">
                        <Card.Body className="p-4 bg-white">
                             <small className="text-uppercase text-muted fw-bold d-block mb-2" style={{letterSpacing: '1px'}}>Güncel Durum</small>
                             <div className="mb-2">{getStatusBadge(evrak.status)}</div>
                        </Card.Body>
                    </Card>

                    {/* FILES CARD */}
                    <Card className="border-0 shadow-sm rounded-4 mb-4">
                        <Card.Header className="bg-white py-3 px-4 border-bottom border-light">
                            <h6 className="mb-0 fw-bold text-dark">Gelen Dosyalar</h6>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {evrak.files?.length > 0 ? (
                                <ListGroup variant="flush">
                                    {evrak.files.map((file, idx) => (
                                        <ListGroup.Item 
                                            key={idx} 
                                            action 
                                            onClick={(e) => handleFileClick(e, file)}
                                            className="px-4 py-3 border-bottom d-flex align-items-center"
                                            style={{cursor: 'pointer'}}
                                        >
                                            <div className="bg-light p-2 rounded me-3 text-primary">
                                                <FileEarmark size={20}/>
                                            </div>
                                            <span className="text-truncate fw-bold text-dark">{file.originalName}</span>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            ) : (
                                <div className="p-4 text-center text-muted small">Dosya bulunmamaktadır.</div>
                            )}
                        </Card.Body>
                    </Card>

                    {/* RESPONSE FILES CARD */}
                     <Card className="border-0 shadow-sm rounded-4 mb-4">
                        <Card.Header className="bg-white py-3 px-4 border-bottom border-light d-flex justify-content-between align-items-center">
                            <h6 className="mb-0 fw-bold text-dark">Cevap Dosyaları</h6>
                            <Badge bg="success" pill>{evrak.responseFiles?.length || 0}</Badge>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {evrak.responseFiles?.length > 0 ? (
                                <ListGroup variant="flush">
                                    {evrak.responseFiles.map((file, idx) => (
                                        <ListGroup.Item key={idx} className="px-3 py-3 border-bottom">
                                            <div className="d-flex align-items-center mb-2">
                                                <div className="bg-success bg-opacity-10 p-2 rounded me-2 text-success">
                                                    <FileEarmark size={18}/>
                                                </div>
                                                <Button 
                                                    variant="link" 
                                                    className="text-dark fw-bold text-decoration-none text-truncate d-block flex-grow-1 text-start p-0 border-0" 
                                                    title={file.originalName}
                                                    onClick={(e) => handleFileClick(e, file)}
                                                >
                                                    {file.originalName}
                                                </Button>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center ps-1">
                                                <small className="text-muted" style={{fontSize: '0.7rem'}}>
                                                    {file.addedBy?.name} • {new Date(file.addedAt).toLocaleDateString()}
                                                </small>
                                                <div>
                                                    {file.status === 'APPROVED' && <Badge bg="success" pill className="fw-normal" style={{fontSize: '0.65rem'}}>Onaylandı</Badge>}
                                                    {file.status === 'REJECTED' && <Badge bg="danger" pill className="fw-normal" style={{fontSize: '0.65rem'}}>Reddedildi</Badge>}
                                                    {file.status === 'PENDING' && <Badge bg="warning" text="dark" pill className="fw-normal" style={{fontSize: '0.65rem'}}>Beklemede</Badge>}
                                                </div>
                                            </div>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            ) : (
                                <div className="p-4 text-center text-muted small">Henüz cevap dosyası yok.</div>
                            )}
                        </Card.Body>
                    </Card>

                    {/* WORKFLOW ACTIONS */}
                    {evrak.status === 'FORWARDED' && (
                        <Card className="border-0 shadow-sm rounded-4 bg-primary bg-opacity-10 mb-4">
                            <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="fw-bold text-primary mb-0">İşlemler</h6>
                                    {/* Archive Button for Authorized Unit Users */}
                                    {(() => {
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
                                        const userUnit = user ? unitMap[user.role] : null;
                                        const canArchive = user?.role === 'admin' || user?.role === 'yonetici' || (userUnit && evrak.targetUnit === userUnit);

                                        if (canArchive) {
                                            return (
                                                <Button 
                                                    variant="outline-danger" 
                                                    size="sm"
                                                    onClick={() => {
                                                        const note = prompt('Arşiv talep gerekçesi (Opsiyonel):');
                                                        if (note !== null) {
                                                            handleWorkflow('request_archive', note);
                                                        }
                                                    }}
                                                >
                                                    <XCircle className="me-1"/> Arşiv Talep Et
                                                </Button>
                                            );
                                        }
                                    })()}
                                </div>
                                
                                {/* Response Form - Only for Admin, Manager, Assistant, or Target Unit */}
                                {(() => {
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
                                    const userUnit = user ? unitMap[user.role] : null;
                                    const canAnswer = 
                                        user?.role === 'admin' || 
                                        user?.role === 'yonetici' || 
                                        user?.role === 'asistan' || 
                                        (userUnit && evrak.targetUnit === userUnit);

                                    if (canAnswer) {
                                        return (
                                            <>
                                                <h6 className="fw-bold text-primary mb-2">Cevap Yazısı Ekle</h6>
                                                <p className="small text-muted mb-3">Dosya eklediğinizde durum "Cevaplandı" olarak güncellenecektir.</p>
                                                <Form onSubmit={submitResponseFiles}>
                                                    <Form.Control type="file" multiple onChange={handleResponseFileChange} className="mb-3 bg-white" />
                                                    <div className="d-grid">
                                                        <Button variant="primary" type="submit" disabled={responseFiles.length === 0 || actionLoading} className="rounded-pill shadow-sm">
                                                            <Send className="me-2" /> Gönder ve Cevapla
                                                        </Button>
                                                    </div>
                                                </Form>
                                            </>
                                        );
                                    } else {
                                        return <div className="text-muted small text-center fst-italic">Bu evraka cevap verme yetkiniz bulunmamaktadır.</div>;
                                    }
                                })()}
                            </Card.Body>
                        </Card>
                    )}

                    {/* ARCHIVE APPROVAL (For Admin/Manager when ARCHIVE_REQUESTED) */}
                    {evrak.status === 'ARCHIVE_REQUESTED' && (user?.role === 'yonetici' || user?.role === 'admin') && (
                        <Card className="border-0 shadow-lg rounded-4 bg-secondary bg-opacity-10 mb-4">
                            <Card.Body className="p-4">
                                <h6 className="fw-bold text-dark mb-2">Arşivleme Talebi Onayı</h6>
                                <p className="small text-muted mb-3">Birim tarafından arşivleme talep edilmiştir.</p>
                                <div className="d-grid gap-2">
                                    <Button variant="success" onClick={() => handleWorkflow('approve_archive')} disabled={actionLoading} className="rounded-pill shadow-sm py-2">
                                        <CheckCircle className="me-2"/> Arşivlemeyi Onayla
                                    </Button>
                                    <div className="text-center text-muted my-1 small">- VEYA -</div>
                                    <Form.Control 
                                        as="textarea" 
                                        rows={2} 
                                        placeholder="Red gerekçesi yazınız..." 
                                        value={rejectNote} 
                                        onChange={(e) => setRejectNote(e.target.value)} 
                                        className="mb-2 bg-white"
                                    />
                                    <Button variant="danger" onClick={() => handleWorkflow('reject_archive')} disabled={actionLoading || !rejectNote.trim()} className="rounded-pill shadow-sm py-2">
                                        <XCircle className="me-2"/> Reddet (Birime İade)
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    )}

                    {evrak.status === 'ANSWERED' && (user?.role === 'yonetici' || user?.role === 'admin') && (
                        <Card className="border-0 shadow-lg rounded-4 bg-warning bg-opacity-10 mb-4">
                            <Card.Body className="p-4">
                                <h6 className="fw-bold text-dark mb-2">Yönetici Onayı Bekleniyor</h6>
                                <p className="small text-muted mb-3">Lütfen evrakı inceleyip karar veriniz.</p>
                                <div className="d-grid gap-2">
                                    <Button variant="success" onClick={() => handleWorkflow('approve')} disabled={actionLoading} className="rounded-pill shadow-sm py-2">
                                        <CheckCircle className="me-2"/> Onayla (Asistana İlet)
                                    </Button>
                                    <div className="text-center text-muted my-1 small">- VEYA -</div>
                                    <Form.Control 
                                        as="textarea" 
                                        rows={2} 
                                        placeholder="Red gerekçesi yazınız..." 
                                        value={rejectNote} 
                                        onChange={(e) => setRejectNote(e.target.value)} 
                                        className="mb-2 bg-white"
                                    />
                                    <Button variant="danger" onClick={() => handleWorkflow('reject')} disabled={actionLoading || !rejectNote.trim()} className="rounded-pill shadow-sm py-2">
                                        <XCircle className="me-2"/> Reddet (Birime İade)
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    )}

                    {/* DISPATCH FORM (For Assistant/Admin when APPROVED) */}
                    {evrak.status === 'APPROVED' && (user?.role === 'asistan' || user?.role === 'admin') && (
                        <Card className="border-0 shadow-lg rounded-4 bg-primary bg-opacity-10 mb-4">
                            <Card.Body className="p-4">
                                <h6 className="fw-bold text-primary mb-3">Evrakı Sonuçlandır / Gönder</h6>
                                
                                <div className="d-flex gap-2 mb-4">
                                    <Button 
                                        variant={dispatchMode === 'manual' ? 'primary' : 'outline-primary'} 
                                        size="sm" 
                                        className="rounded-pill"
                                        onClick={() => setDispatchMode('manual')}
                                    >
                                        Manuel Bilgi Girişi
                                    </Button>
                                    <Button 
                                        variant={dispatchMode === 'link' ? 'primary' : 'outline-primary'} 
                                        size="sm" 
                                        className="rounded-pill"
                                        onClick={() => setDispatchMode('link')}
                                    >
                                        Giden Evrak Bağla
                                    </Button>
                                </div>

                                {dispatchMode === 'manual' ? (
                                    <Form onSubmit={submitDispatch}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Gönderim Tarihi</Form.Label>
                                            <Form.Control 
                                                type="date" 
                                                name="dispatchDate" 
                                                value={dispatchData.dispatchDate} 
                                                onChange={handleDispatchChange} 
                                                required 
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Gönderim Yöntemi</Form.Label>
                                            <Form.Select 
                                                name="dispatchMethod" 
                                                value={dispatchData.dispatchMethod} 
                                                onChange={handleDispatchChange}
                                            >
                                                <option value="KEP">KEP</option>
                                                <option value="E-Posta">E-Posta</option>
                                                <option value="Posta">Posta</option>
                                                <option value="Kargo">Kargo</option>
                                                <option value="Elden">Elden</option>
                                                <option value="Faks">Faks</option>
                                            </Form.Select>
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Gönderim Numarası</Form.Label>
                                            <Form.Control 
                                                type="text" 
                                                name="dispatchNumber" 
                                                placeholder="Örn: 2024/123-ABC"
                                                value={dispatchData.dispatchNumber} 
                                                onChange={handleDispatchChange} 
                                                required 
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Sonuç Dosyası (Opsiyonel)</Form.Label>
                                            <Form.Control 
                                                type="file" 
                                                multiple 
                                                onChange={handleDispatchFileChange} 
                                                className="bg-white" 
                                            />
                                        </Form.Group>
                                        <div className="d-grid">
                                            <Button variant="primary" type="submit" disabled={actionLoading} className="rounded-pill shadow-sm py-2">
                                                <Send className="me-2" /> Kaydet ve Gönder
                                            </Button>
                                        </div>
                                    </Form>
                                ) : (
                                    <div className="bg-white p-3 rounded-4 shadow-sm border border-primary border-opacity-25">
                                        <p className="small text-muted mb-3">Sistemde kayıtlı bir giden evrakı seçerek bu süreci sonlandırabilirsiniz.</p>
                                        <Button variant="primary" className="w-100 rounded-pill" onClick={openLinkModal}>
                                            <Search className="me-2" /> Giden Evrak Ara ve Bağla
                                        </Button>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    )}

                    {/* DISPATCH DETAILS (When COMPLETED) */}
                    {evrak.status === 'COMPLETED' && evrak.dispatch && (
                         <Card className="border-0 shadow-sm rounded-4 mb-4 bg-success bg-opacity-10">
                            <Card.Header className="bg-transparent border-bottom border-success border-opacity-25 py-3 px-4">
                                <h6 className="mb-0 fw-bold text-success"><CheckCircle className="me-2"/> Sonuç / Gönderim Bilgileri</h6>
                            </Card.Header>
                            <Card.Body className="p-4">
                                <div className="mb-2">
                                    <small className="text-muted d-block">Gönderim Tarihi</small>
                                    <span className="fw-bold text-dark">{new Date(evrak.dispatch.dispatchDate).toLocaleDateString()}</span>
                                </div>
                                <div className="mb-2">
                                    <small className="text-muted d-block">Gönderim Yöntemi</small>
                                    <span className="fw-bold text-dark">{evrak.dispatch.dispatchMethod}</span>
                                </div>
                                <div className="mb-2">
                                    <small className="text-muted d-block">Gönderim Numarası</small>
                                    <span className="fw-bold text-dark">{evrak.dispatch.dispatchNumber}</span>
                                </div>
                                <div className="mb-3">
                                    <small className="text-muted d-block">İşlemi Yapan</small>
                                    <span className="fw-bold text-dark">{evrak.dispatch.dispatchedBy?.name}</span>
                                </div>

                                {evrak.relatedGidenEvrak && evrak.relatedGidenEvrak.length > 0 && (
                                     <div className="mb-3 p-2 bg-white rounded border border-success border-opacity-25">
                                         <small className="text-success d-block fw-bold mb-1"><Link className="me-1"/>İlişkili Giden Evrak</small>
                                         {evrak.relatedGidenEvrak.map((giden, idx) => (
                                             <div key={idx} className="small">
                                                 <strong>{giden.title}</strong> (No: {giden.documentNumber})
                                             </div>
                                         ))}
                                     </div>
                                )}

                                {evrak.dispatch.dispatchFiles && evrak.dispatch.dispatchFiles.length > 0 && (
                                    <div className="mt-3 pt-3 border-top border-success border-opacity-25">
                                        <small className="d-block text-success fw-bold mb-2">Sonuç Dosyaları:</small>
                                        {evrak.dispatch.dispatchFiles.map((file, idx) => (
                                            <Button 
                                                key={idx}
                                                variant="link"
                                                className="text-decoration-none d-flex align-items-center small text-dark p-0 mb-1"
                                                onClick={(e) => handleFileClick(e, file)}
                                            >
                                                <FileEarmark className="me-2 text-success"/> {file.originalName}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    )}
                </Col>
            </Row>
        </Card.Body>
      </Card>

      {/* PROCESS REPORT CARD */}
      <Card className="border-0 shadow-sm rounded-4 mb-5 overflow-hidden mt-2">
        <Card.Header className="bg-white py-3 px-4 border-bottom border-light">
          <h6 className="mb-0 fw-bold text-dark d-flex align-items-center">
            <span className="bg-primary bg-opacity-10 p-2 rounded-circle me-2 text-primary">
              <CheckCircle size={16} />
            </span>
            Süreç ve Performans Raporu
          </h6>
        </Card.Header>
        <Card.Body className="p-4 ">
          <Row className="g-3">
             {(() => {
                const metrics = {
                    totalDuration: null,
                    prepDuration: null,
                    approvalDuration: null,
                    dispatchDuration: null
                };

                const calculateDuration = (start, end) => {
                    if (!start || !end) return '-';
                    const diff = new Date(end) - new Date(start);
                    
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                    let result = '';
                    if (days > 0) result += `${days}g `;
                    if (hours > 0) result += `${hours}s `;
                    if (minutes > 0 || result === '') result += `${minutes}dk`;
                    
                    return result.trim();
                };

                // 1. Preparation Time: CreatedAt -> First Response File or Answered Status
                let firstResponseDate = null;
                if (evrak.responseFiles && evrak.responseFiles.length > 0) {
                    // Sort by addedAt
                    const sortedFiles = [...evrak.responseFiles].sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
                    firstResponseDate = sortedFiles[0].addedAt;
                }
                metrics.prepDuration = calculateDuration(evrak.createdAt, firstResponseDate);

                // 2. Approval Time: First Response -> Manager Approval (Find 'ONAYLI' in notes/status)
                let approvalDate = null;
                // Try to find approval note
                const approvalNote = evrak.notes?.find(n => n.text.includes('onaylandı') || n.text.includes('Onay'));
                if (approvalNote) {
                    approvalDate = approvalNote.date;
                } else if (evrak.status === 'APPROVED' || evrak.status === 'COMPLETED') {
                     // Fallback if no specific note found but status changed
                     // This is rough, ideally we track status change dates. 
                     // For now, let's use the last note if status is approved.
                }

                if (firstResponseDate && approvalDate) {
                     metrics.approvalDuration = calculateDuration(firstResponseDate, approvalDate);
                }

                // 3. Dispatch Time: Approval -> Dispatch Date
                if (approvalDate && evrak.dispatch?.dispatchDate) {
                    metrics.dispatchDuration = calculateDuration(approvalDate, evrak.dispatch.dispatchedAt || evrak.dispatch.dispatchDate);
                }

                // 4. Total Duration: CreatedAt -> Dispatch Date (or Now if not dispatched)
                const endDate = evrak.dispatch?.dispatchedAt || (evrak.status === 'COMPLETED' ? evrak.dispatch?.dispatchDate : null);
                if (endDate) {
                    metrics.totalDuration = calculateDuration(evrak.createdAt, endDate);
                } else {
                     // If still pending, show time passed since creation
                     metrics.totalDuration = calculateDuration(evrak.createdAt, new Date()) + ' (Devam Ediyor)';
                }

                return (
                    <>
                        <Col md={3}>
                            <div className="p-3 bg-light rounded-3 h-100 border border-light">
                                <small className="text-muted d-block mb-1 fw-bold">Toplam Süre</small>
                                <div className="fw-bold text-primary fs-5">{metrics.totalDuration || '-'}</div>
                                <small className="text-secondary" style={{fontSize: '0.7em'}}>Kayıt - Sonuçlandırma</small>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div className="p-3 bg-white rounded-3 h-100 border border-dashed">
                                <small className="text-muted d-block mb-1 fw-bold">Hazırlık Süresi</small>
                                <div className="fw-bold text-dark">{metrics.prepDuration}</div>
                                <small className="text-secondary" style={{fontSize: '0.7em'}}>Kayıt - İlk Cevap</small>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div className="p-3 bg-white rounded-3 h-100 border border-dashed">
                                <small className="text-muted d-block mb-1 fw-bold">Onay Süresi</small>
                                <div className="fw-bold text-dark">{metrics.approvalDuration || '-'}</div>
                                <small className="text-secondary" style={{fontSize: '0.7em'}}>Cevap - Onay</small>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div className="p-3 bg-white rounded-3 h-100 border border-dashed">
                                <small className="text-muted d-block mb-1 fw-bold">Gönderim Süresi</small>
                                <div className="fw-bold text-dark">{metrics.dispatchDuration || '-'}</div>
                                <small className="text-secondary" style={{fontSize: '0.7em'}}>Onay - Gönderim</small>
                            </div>
                        </Col>
                    </>
                );
             })()}
          </Row>
        </Card.Body>
      </Card>
      
      <FileViewerModal
        show={showFileModal}
        handleClose={handleCloseFileModal}
        file={selectedFile}
      />

      {/* Association Modal */}
      <Modal show={showLinkModal} onHide={() => setShowLinkModal(false)} size="lg" centered>
          <Modal.Header closeButton>
              <Modal.Title>Giden Evrak İlişkilendir</Modal.Title>
          </Modal.Header>
          <Modal.Body>
              <InputGroup className="mb-3">
                  <InputGroup.Text><Search /></InputGroup.Text>
                  <Form.Control 
                      placeholder="Evrak adı, numarası veya alıcı ara..." 
                      value={gidenSearch}
                      onChange={(e) => setGidenSearch(e.target.value)}
                  />
              </InputGroup>

              {loadingGiden ? (
                  <div className="text-center py-4"><Spinner animation="border" /></div>
              ) : (
                  <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                      <ListGroup variant="flush">
                          {filteredGiden.length > 0 ? filteredGiden.map(g => (
                              <ListGroup.Item key={g._id} className="d-flex justify-content-between align-items-center py-3">
                                  <div>
                                      <div className="fw-bold">{g.title}</div>
                                      <small className="text-muted">No: {g.documentNumber} • Alıcı: {g.recipient}</small>
                                  </div>
                                  <Button 
                                    variant="outline-primary" 
                                    size="sm" 
                                    disabled={evrak.relatedGidenEvrak?.some(rg => rg._id === g._id)}
                                    onClick={() => {
                                        if (dispatchMode === 'link' && evrak.status === 'APPROVED') {
                                            handleFinalizeByLink(g._id);
                                        } else {
                                            handleLinkGiden(g._id);
                                        }
                                    }}
                                  >
                                      {evrak.relatedGidenEvrak?.some(rg => rg._id === g._id) ? 'İlişkilendirildi' : (dispatchMode === 'link' && evrak.status === 'APPROVED' ? <><CheckCircle /> Bağla ve Bitir</> : <><Link /> İlişkilendir</>)}
                                  </Button>
                              </ListGroup.Item>
                          )) : (
                              <div className="text-center py-4 text-muted">Evrak bulunamadı.</div>
                          )}
                      </ListGroup>
                  </div>
              )}
          </Modal.Body>
      </Modal>
    </Container>
  );
};

export default GelenEvrakDetay;
