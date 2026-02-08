import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Table, Button, Badge, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Pencil, Trash, Paperclip, Eye, CaretUpFill, CaretDownFill, ArrowDownUp } from 'react-bootstrap-icons';
import AuthContext from '../context/AuthContext';
import gidenEvrakService from '../features/gidenEvrak/gidenEvrakService';
import GidenEvrakModal from '../components/GidenEvrakModal';
import EvrakFilter from '../components/EvrakFilter';
import FileViewerModal from '../components/FileViewerModal';

const GidenEvrakList = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [evraklar, setEvraklar] = useState([]);
  const [filteredEvraklar, setFilteredEvraklar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter State
  const [filterText, setFilterText] = useState('');
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [filterUnits, setFilterUnits] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // File Viewer State
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    recipient: '',
    documentNumber: '',
    documentDate: '',
    targetUnit: '',
    status: 'SENT',
    description: '',
    dispatchDate: '',
    dispatchMethod: ''
  });

  const [files, setFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]);

  const fetchEvraklar = async () => {
    try {
      setLoading(true);
      const res = await gidenEvrakService.getGidenEvraklar();
      setEvraklar(res.data);
      setFilteredEvraklar(res.data);
    } catch (err) {
      setError('Evraklar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvraklar();
  }, []);

  // Filtering & Sorting Logic
  useEffect(() => {
      let result = [...evraklar];

      // Text Filter
      if (filterText) {
          const lowerText = filterText.toLowerCase();
          result = result.filter(evrak => 
              (evrak.title && evrak.title.toLowerCase().includes(lowerText)) ||
              (evrak.documentNumber && evrak.documentNumber.toLowerCase().includes(lowerText)) ||
              (evrak.recipient && evrak.recipient.toLowerCase().includes(lowerText))
          );
      }

      // Status Multi-Filter
      if (filterStatuses.length > 0) {
          result = result.filter(evrak => filterStatuses.includes(evrak.status));
      }

      // Unit Multi-Filter
      if (filterUnits.length > 0) {
          result = result.filter(evrak => filterUnits.includes(evrak.targetUnit));
      }

      // Date Range Filter
      if (startDate) {
          result = result.filter(evrak => new Date(evrak.documentDate) >= new Date(startDate));
      }
      if (endDate) {
          result = result.filter(evrak => new Date(evrak.documentDate) <= new Date(endDate));
      }

      // Sorting Logic
      if (sortConfig.key) {
          result.sort((a, b) => {
              let aVal = a[sortConfig.key];
              let bVal = b[sortConfig.key];
              if (sortConfig.key === 'documentDate' || sortConfig.key === 'createdAt') {
                  aVal = new Date(aVal);
                  bVal = new Date(bVal);
              }
              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }

      setFilteredEvraklar(result);
  }, [evraklar, filterText, filterStatuses, filterUnits, startDate, endDate, sortConfig]);

  const handleClearFilters = () => {
      setFilterText('');
      setFilterStatuses([]);
      setFilterUnits([]);
      setStartDate('');
      setEndDate('');
  };

  const handleClose = () => {
    setShowModal(false);
    resetForm();
  };
  
  const handleShow = () => {
    setIsEditMode(false);
    resetForm();
    setShowModal(true);
  };
  
  const handleFileClick = (e, file) => {
      e.preventDefault();
      setSelectedFile(file);
      setShowFileModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      recipient: '',
      documentNumber: '',
      documentDate: '',
      targetUnit: '',
      status: 'SENT',
      description: ''
    });
    setFiles([]);
    setExistingFiles([]);
    setFilesToDelete([]);
    setCurrentId(null);
    setError('');
  };

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFileChange = (fileList) => {
      setFiles(fileList);
  };

  const handleDeleteFile = (fileId) => {
      setFilesToDelete([...filesToDelete, fileId]);
      setExistingFiles(existingFiles.filter(f => f._id !== fileId));
  };

  const handleEdit = (evrak) => {
    setFormData({
      title: evrak.title,
      recipient: evrak.recipient,
      documentNumber: evrak.documentNumber,
      documentDate: evrak.documentDate ? evrak.documentDate.split('T')[0] : '',
      targetUnit: evrak.targetUnit,
      status: evrak.status,
      description: evrak.description || '',
      dispatchDate: evrak.dispatchDate ? evrak.dispatchDate.split('T')[0] : '',
      dispatchMethod: evrak.dispatchMethod || ''
    });
    setExistingFiles(evrak.files || []);
    setFilesToDelete([]);
    setFiles([]);
    setCurrentId(evrak._id);
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu giden evrakı silmek istediğinize emin misiniz?')) {
      try {
        await gidenEvrakService.deleteGidenEvrak(id);
        setEvraklar(evraklar.filter((evrak) => evrak._id !== id));
      } catch (err) {
        alert('Silme işlemi başarısız');
      }
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (files) {
          for (let i = 0; i < files.length; i++) {
              data.append('files', files[i]);
          }
      }
      if (filesToDelete.length > 0) {
          data.append('filesToDelete', JSON.stringify(filesToDelete));
      }

      if (isEditMode) {
        const res = await gidenEvrakService.updateGidenEvrak(currentId, data);
        setEvraklar(evraklar.map((evrak) => (evrak._id === currentId ? res.data : evrak)));
      } else {
        const res = await gidenEvrakService.createGidenEvrak(data);
        setEvraklar([res.data, ...evraklar]);
      }
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'İşlem başarısız');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'SENT': return <Badge bg="success">Gönderildi</Badge>;
      case 'DRAFT': return <Badge bg="warning" text="dark">Taslak</Badge>;
      case 'ARCHIVED': return <Badge bg="secondary">Arşivlendi</Badge>;
      default: return <Badge bg="info">{status}</Badge>;
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ field }) => {
    if (sortConfig.key !== field) return <ArrowDownUp className="ms-1 text-muted" size={12} />;
    return sortConfig.direction === 'asc' 
      ? <CaretUpFill className="ms-1 text-primary" size={12} /> 
      : <CaretDownFill className="ms-1 text-primary" size={12} />;
  };

  return (
    <Container className="mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="giden-text fw-bold">Giden Evrak Listesi</h2>
        {user && ['admin', 'yonetici', 'asistan'].includes(user.role) && (
          <Button variant="primary" onClick={handleShow} className="giden-btn text-white">
            + Yeni Giden Evrak
          </Button>
        )}
      </div>

      <EvrakFilter 
        filterText={filterText}
        setFilterText={setFilterText}
        filterStatuses={filterStatuses}
        setFilterStatuses={setFilterStatuses}
        filterUnits={filterUnits}
        setFilterUnits={setFilterUnits}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onClear={handleClearFilters}
        isMyTasks={false}
        onMyTasks={() => {}}
      />

      {loading ? (
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <div className="table-responsive bg-white rounded shadow-sm p-3 d-none d-md-block">
            <Table hover className="align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th onClick={() => requestSort('sequenceNumber')} style={{ cursor: 'pointer', width: '100px' }}>
                    Arşiv No <SortIcon field="sequenceNumber" />
                  </th>
                  <th onClick={() => requestSort('documentNumber')} style={{ cursor: 'pointer' }}>
                    Evrak No <SortIcon field="documentNumber" />
                  </th>
                  <th onClick={() => requestSort('title')} style={{ cursor: 'pointer' }}>
                    Konu <SortIcon field="title" />
                  </th>
                  <th onClick={() => requestSort('recipient')} style={{ cursor: 'pointer' }}>
                    Alıcı <SortIcon field="recipient" />
                  </th>
                  <th onClick={() => requestSort('targetUnit')} style={{ cursor: 'pointer' }}>
                    Birim <SortIcon field="targetUnit" />
                  </th>
                  <th onClick={() => requestSort('documentDate')} style={{ cursor: 'pointer' }}>
                    Tarih <SortIcon field="documentDate" />
                  </th>
                  <th>Gönderim Bilgisi</th>
                  <th>Dosyalar</th>
                  <th onClick={() => requestSort('status')} style={{ cursor: 'pointer' }}>
                    Durum <SortIcon field="status" />
                  </th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvraklar.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                        Henüz kayıtlı giden evrak bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  filteredEvraklar.map((evrak) => (
                    <tr key={evrak._id}>
                      <td className="fw-bold text-dark">{evrak.applicationYear}/{evrak.sequenceNumber}</td>
                      <td className="fw-bold giden-text">{evrak.documentNumber}</td>
                      <td>{evrak.title}</td>
                      <td>{evrak.recipient}</td>
                      <td><Badge bg="light" text="dark" className="border">{evrak.targetUnit}</Badge></td>
                      <td>{new Date(evrak.documentDate).toLocaleDateString()}</td>
                      <td className="small">
                          {evrak.dispatchDate && (
                              <div><strong>Tarih:</strong> {new Date(evrak.dispatchDate).toLocaleDateString()}</div>
                          )}
                          {evrak.dispatchMethod && (
                              <div><strong>Şekil:</strong> {evrak.dispatchMethod}</div>
                          )}
                          {!evrak.dispatchDate && !evrak.dispatchMethod && '-'}
                      </td>
                      <td>
                          {evrak.files && evrak.files.length > 0 ? (
                                <Button 
                                    variant="outline-secondary" 
                                    size="sm" 
                                    onClick={(e) => handleFileClick(e, evrak.files[0])}
                                >
                                    <Paperclip /> ({evrak.files.length})
                                </Button>
                          ) : '-'}
                      </td>
                      <td>{getStatusBadge(evrak.status)}</td>
                      <td>
                        <div className="d-flex">
                            {user && (['admin', 'yonetici', 'asistan'].includes(user.role) || user._id === evrak.createdBy?._id) && (
                                <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleEdit(evrak)}>
                                    <Pencil />
                                </Button>
                            )}
                            {user && user.role === 'admin' && (
                                <Button variant="danger" size="sm" onClick={() => handleDelete(evrak._id)}>
                                    <Trash />
                                </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* Mobile View - Cards */}
          <div className="d-block d-md-none">
            {filteredEvraklar.length === 0 ? (
                 <div className="text-center py-4 text-muted bg-white rounded shadow-sm">
                    Henüz kayıtlı giden evrak bulunmamaktadır.
                 </div>
            ) : (
                filteredEvraklar.map((evrak) => (
                    <div key={evrak._id} className="bg-white rounded shadow-sm p-3 mb-3 border border-light">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <small className="text-dark fw-bold d-block mb-1">Arşiv No: {evrak.applicationYear}/{evrak.sequenceNumber}</small>
                                <span className="fw-bold giden-text d-block">{evrak.documentNumber}</span>
                                <small className="text-muted">{new Date(evrak.documentDate).toLocaleDateString()}</small>
                            </div>
                            <div>
                                <div className="text-end">
                                    {getStatusBadge(evrak.status)}
                                </div>
                            </div>
                        </div>
                        
                        <h6 className="fw-bold mb-1">{evrak.title}</h6>
                        <div className="text-muted small mb-1">
                            <span className="fw-bold">Alıcı:</span> {evrak.recipient}
                        </div>
                         <div className="text-muted small mb-2">
                            <span className="fw-bold">Birim:</span> {evrak.targetUnit}
                        </div>

                        {evrak.dispatchDate && (
                            <div className="small bg-light p-2 rounded mb-2">
                                <div><strong>Gönderim Tarihi:</strong> {new Date(evrak.dispatchDate).toLocaleDateString()}</div>
                                {evrak.dispatchMethod && <div><strong>Gönderim Şekli:</strong> {evrak.dispatchMethod}</div>}
                            </div>
                        )}

                        {evrak.files && evrak.files.length > 0 && (
                            <div className="mb-3 p-2 bg-light rounded d-flex flex-wrap gap-2">
                                {evrak.files.map((file, idx) => (
                                     <Button 
                                        key={idx}
                                        variant="link"
                                        className="text-decoration-none d-flex align-items-center small text-secondary border bg-white px-2 py-1 rounded"
                                        onClick={(e) => handleFileClick(e, file)}
                                     >
                                        <Paperclip className="me-1"/> {file.originalName.substring(0, 15)}...
                                     </Button>
                                ))}
                            </div>
                        )}

                        <div className="d-flex justify-content-end gap-2 border-top pt-2">
                            {user && (['admin', 'yonetici', 'asistan'].includes(user.role) || user._id === evrak.createdBy?._id) && (
                            <Button variant="outline-primary" size="sm" className="flex-grow-1" onClick={() => handleEdit(evrak)}>
                                <Pencil className="me-1"/> Düzenle
                            </Button>
                            )}
                            {user && user.role === 'admin' && (
                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(evrak._id)} title="Sil">
                                <Trash />
                            </Button>
                            )}
                        </div>
                    </div>
                ))
            )}
          </div>
        </>
      )}

      <GidenEvrakModal 
        show={showModal} 
        handleClose={handleClose} 
        onSubmit={onSubmit} 
        formData={formData} 
        onChange={onChange} 
        isEditMode={isEditMode}
        onFileChange={handleFileChange}
        existingFiles={existingFiles}
        onDeleteFile={handleDeleteFile}
      />

      <FileViewerModal
        show={showFileModal}
        handleClose={() => setShowFileModal(false)}
        file={selectedFile}
      />
    </Container>
  );
};

export default GidenEvrakList;
