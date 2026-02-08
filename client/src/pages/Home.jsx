import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Table, Button, Badge, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Pencil, Trash, Paperclip, Eye, CaretUpFill, CaretDownFill, ArrowDownUp } from 'react-bootstrap-icons';
import AuthContext from '../context/AuthContext';
import gelenEvrakService from '../features/gelenEvrak/gelenEvrakService';
import EvrakModal from '../components/EvrakModal';
import EvrakFilter from '../components/EvrakFilter';
import FileViewerModal from '../components/FileViewerModal';

const Home = () => {
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
    sender: '',
    documentNumber: '',
    documentDate: '',
    targetUnit: '',
    status: 'PENDING',
    description: ''
  });

  const [files, setFiles] = useState([]); // New files to upload
  const [existingFiles, setExistingFiles] = useState([]); // Files currently on server
  const [filesToDelete, setFilesToDelete] = useState([]); // Files marked for deletion

  const { title, sender, documentNumber, documentDate, targetUnit, status, description } = formData;

  const fetchEvraklar = async () => {
    try {
      setLoading(true);
      const res = await gelenEvrakService.getGelenEvraklar();
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

  /* New State for My Tasks Filter */
  const [isMyTasks, setIsMyTasks] = useState(false);

  // Filtering & Sorting Logic
  useEffect(() => {
      let result = [...evraklar];

      // My Tasks Logic (User Role Based)
      if (isMyTasks && user) {
          const unitMap = {
              'musterihizmetleri': 'Müşteri Hizmetleri',
              'tahakkuk': 'Ölçüm ve Tahakkuk Birimi',
              'isletme': 'İşletme Birimi',
              'bakim': 'Bakım Onarım Birimi',
              'harita': 'Harita ve Proje Birimi',
              'teknikofis': 'Teknik Ofis Birimi',
              'kalite': 'Kalite ve İş Süreçleri Birimi',
              'muhasebe': 'Muhasebe Birimi',
              'kullanici': 'Diğer' 
          };

          if (user.role === 'yonetici') {
              result = result.filter(evrak => evrak.status === 'ANSWERED' || evrak.status === 'ARCHIVE_REQUESTED');
          } else if (user.role === 'asistan') {
              result = result.filter(evrak => evrak.status === 'APPROVED' || evrak.status === 'PENDING');
          } else if (['admin'].includes(user.role)) {
              // Admin sees everything
          } else {
               const userUnit = unitMap[user.role];
               if (userUnit) {
                   result = result.filter(evrak => evrak.targetUnit === userUnit && evrak.status === 'FORWARDED');
               }
          }
      }

      // Text Filter
      if (filterText) {
          const lowerText = filterText.toLowerCase();
          result = result.filter(evrak => 
              (evrak.title && evrak.title.toLowerCase().includes(lowerText)) ||
              (evrak.documentNumber && evrak.documentNumber.toLowerCase().includes(lowerText)) ||
              (evrak.sender && evrak.sender.toLowerCase().includes(lowerText)) ||
              (`${evrak.applicationYear}/${evrak.sequenceNumber}`.includes(lowerText))
          );
      }

      // Status Multi-Filter (Only if My Tasks is NOT active)
      if (filterStatuses.length > 0 && !isMyTasks) {
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

              // Handle nested fields or special formatting
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
  }, [evraklar, filterText, filterStatuses, filterUnits, startDate, endDate, isMyTasks, user, sortConfig]);

  const handleClearFilters = () => {
      setFilterText('');
      setFilterStatuses([]);
      setFilterUnits([]);
      setStartDate('');
      setEndDate('');
      setIsMyTasks(false);
  };

  const toggleMyTasks = () => {
      setIsMyTasks(!isMyTasks);
      if (!isMyTasks) {
          setFilterStatuses([]); // Clear manual status filter when activating My Tasks
      }
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

  const handleCloseFileModal = () => {
      setShowFileModal(false);
      setSelectedFile(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      sender: '',
      documentNumber: '',
      documentDate: '',
      targetUnit: '',
      status: 'PENDING',
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
      sender: evrak.sender,
      documentNumber: evrak.documentNumber,
      documentDate: evrak.documentDate ? evrak.documentDate.split('T')[0] : '',
      targetUnit: evrak.targetUnit,
      status: evrak.status,
      description: evrak.description || ''
    });
    setExistingFiles(evrak.files || []);
    setFilesToDelete([]);
    setFiles([]); // Reset new files
    setCurrentId(evrak._id);
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu evrakı silmek istediğinize emin misiniz?')) {
      try {
        await gelenEvrakService.deleteGelenEvrak(id);
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
      data.append('title', formData.title);
      data.append('sender', formData.sender);
      data.append('documentNumber', formData.documentNumber);
      data.append('documentDate', formData.documentDate);
      data.append('targetUnit', formData.targetUnit);
      data.append('status', formData.status);
      data.append('description', formData.description);

      if (files) {
          for (let i = 0; i < files.length; i++) {
              data.append('files', files[i]);
          }
      }

      if (filesToDelete.length > 0) {
          data.append('filesToDelete', JSON.stringify(filesToDelete));
      }

      if (isEditMode) {
        const res = await gelenEvrakService.updateGelenEvrak(currentId, data);
        setEvraklar(evraklar.map((evrak) => (evrak._id === currentId ? res.data : evrak)));
      } else {
        const res = await gelenEvrakService.createGelenEvrak(data);
        setEvraklar([res.data, ...evraklar]);
      }
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'İşlem başarısız');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'ANSWERED': return <Badge bg="success">Cevaplandı</Badge>;
      case 'ARCHIVE_REQUESTED': return <Badge bg="warning" text="dark">Arşiv Onayı Bekliyor</Badge>;
      case 'ARCHIVED': return <Badge bg="secondary">Arşive Alındı</Badge>;
      case 'PENDING': return <Badge bg="warning" text="dark">Beklemede</Badge>;
      case 'FORWARDED': return <Badge bg="info">Sorumlu Birime Yönlendirildi</Badge>;
      case 'COMPLETED': return <Badge bg="dark">Tamamlandı / Gönderildi</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
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
        <h2 className="text-secondary fw-bold">Gelen Evrak Listesi</h2>
        {user && ['admin', 'yonetici', 'asistan'].includes(user.role) && (
          <Button variant="primary" onClick={handleShow} className="custom-btn text-white">
            + Yeni Evrak Kaydı
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
        isMyTasks={isMyTasks}
        onMyTasks={toggleMyTasks}
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
                  <th>Gönderen</th>
                  <th onClick={() => requestSort('targetUnit')} style={{ cursor: 'pointer' }}>
                    İlgili Birim <SortIcon field="targetUnit" />
                  </th>
                  <th onClick={() => requestSort('documentDate')} style={{ cursor: 'pointer' }}>
                    Tarih <SortIcon field="documentDate" />
                  </th>
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
                    <td colSpan="9" className="text-center py-4 text-muted">
                        {evraklar.length === 0 ? 'Henüz kayıtlı evrak bulunmamaktadır.' : 'Filtreleme kriterlerine uygun evrak bulunamadı.'}
                    </td>
                  </tr>
                ) : (
                  filteredEvraklar.map((evrak) => (
                    <tr key={evrak._id}>
                      <td className="fw-bold text-dark">{evrak.applicationYear}/{evrak.sequenceNumber}</td>
                      <td className="fw-bold text-primary">{evrak.documentNumber}</td>
                      <td>{evrak.title}</td>
                      <td>{evrak.sender}</td>
                      <td><Badge bg="light" text="dark" className="border">{evrak.targetUnit}</Badge></td>
                      <td>{new Date(evrak.documentDate).toLocaleDateString()}</td>
                      <td>
                          {evrak.files && evrak.files.length > 0 ? (
                                <div className="d-flex gap-1">
                                    {evrak.files.map((file, idx) => (
                                        <OverlayTrigger
                                            key={idx}
                                            placement="top"
                                            overlay={<Tooltip>{file.originalName}</Tooltip>}
                                        >
                                            <Button 
                                                variant="outline-secondary" 
                                                size="sm" 
                                                className="py-0 px-1"
                                                onClick={(e) => handleFileClick(e, file)}
                                            >
                                                <Paperclip />
                                            </Button>
                                        </OverlayTrigger>
                                    ))}
                                </div>
                          ) : '-'}
                      </td>
                      <td>
                          {getStatusBadge(evrak.status)}
                      </td>
                      <td>
                        <div className="d-flex">
                            <Button variant="outline-info" size="sm" className="me-1 text-dark" onClick={() => navigate(`/gelen-evrak/${evrak._id}`)} title="Detay">
                            <Eye />
                            </Button>
                            {user && (['admin', 'yonetici', 'asistan'].includes(user.role) || user._id === evrak.createdBy?._id) && (
                            <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleEdit(evrak)} title="Düzenle">
                                <Pencil />
                            </Button>
                            )}
                            {user && user.role === 'admin' && (
                            <Button variant="danger" size="sm" onClick={() => handleDelete(evrak._id)} title="Sil">
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

          <div className="d-block d-md-none">
            {filteredEvraklar.length === 0 ? (
                 <div className="text-center py-4 text-muted bg-white rounded shadow-sm">
                    {evraklar.length === 0 ? 'Henüz kayıtlı evrak bulunmamaktadır.' : 'Filtreleme kriterlerine uygun evrak bulunamadı.'}
                 </div>
            ) : (
                filteredEvraklar.map((evrak) => (
                    <div key={evrak._id} className="bg-white rounded shadow-sm p-3 mb-3 border border-light">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <small className="text-dark fw-bold d-block mb-1">Arşiv No: {evrak.applicationYear}/{evrak.sequenceNumber}</small>
                                <span className="fw-bold text-primary d-block">{evrak.documentNumber}</span>
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
                            <span className="fw-bold">Gönderen:</span> {evrak.sender}
                        </div>
                         <div className="text-muted small mb-3">
                            <span className="fw-bold">Birim:</span> {evrak.targetUnit}
                        </div>

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
                             <Button variant="outline-info" size="sm" className="flex-grow-1 text-dark" onClick={() => navigate(`/gelen-evrak/${evrak._id}`)}>
                                <Eye className="me-1"/> Detay
                            </Button>
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

      <EvrakModal 
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
        handleClose={handleCloseFileModal}
        file={selectedFile}
      />
    </Container>
  );
};

export default Home;
