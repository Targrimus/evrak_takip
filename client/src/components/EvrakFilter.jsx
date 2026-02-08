import React from 'react';
import { Form, Row, Col, Button, InputGroup, Dropdown } from 'react-bootstrap';
import { Search, XCircle, Funnel } from 'react-bootstrap-icons';

const EvrakFilter = ({
  filterText,
  setFilterText,
  filterStatuses,
  setFilterStatuses,
  filterUnits,
  setFilterUnits,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onClear,
  isMyTasks,
  onMyTasks
}) => {
  const statuses = [
    { value: 'FORWARDED', label: 'Yönlendirildi' },
    { value: 'ANSWERED', label: 'Cevaplandı' },
    { value: 'APPROVED', label: 'Onaylandı' },
    { value: 'REJECTED', label: 'Reddedildi' },
    { value: 'PENDING', label: 'Beklemede' },
    { value: 'ARCHIVE_REQUESTED', label: 'Arşiv Onayı Bekliyor' },
    { value: 'ARCHIVED', label: 'Arşiv' },
    { value: 'COMPLETED', label: 'Tamamlandı' },
  ];

  const units = [
    'Müşteri Hizmetleri',
    'Ölçüm ve Tahakkuk Birimi',
    'İşletme Birimi',
    'Bakım Onarım Birimi',
    'Harita ve Proje Birimi',
    'Teknik Ofis Birimi',
    'Kalite ve İş Süreçleri Birimi',
    'Şirket Müdürlüğü'
  ];

  const handleStatusChange = (status) => {
    if (filterStatuses.includes(status)) {
      setFilterStatuses(filterStatuses.filter(s => s !== status));
    } else {
      setFilterStatuses([...filterStatuses, status]);
    }
  };

  const handleUnitChange = (unit) => {
    if (filterUnits.includes(unit)) {
      setFilterUnits(filterUnits.filter(u => u !== unit));
    } else {
      setFilterUnits([...filterUnits, unit]);
    }
  };

  return (
    <div className="bg-light p-3 rounded-4 shadow-sm mb-4 border border-light">
      <div className="d-flex align-items-center mb-3 text-primary justify-content-between">
          <div className="d-flex align-items-center">
            <Funnel className="me-2" />
            <h6 className="mb-0 fw-bold">Filtreleme Seçenekleri</h6>
          </div>
          <Button 
            variant={isMyTasks ? "primary" : "outline-primary"} 
            size="sm" 
            onClick={onMyTasks}
            className="rounded-pill px-3"
          >
            {isMyTasks ? "İşlerimi Filtrele (Aktif)" : "İşlerimi Filtrele"}
          </Button>
      </div>
      <Form>
        <Row className="g-3">
          {/* Search Input */}
          <Col md={12} lg={3}>
            <InputGroup>
              <InputGroup.Text className="bg-white border-end-0 text-muted">
                <Search />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Evrak No, Konu veya Gönderen ara..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="border-start-0 ps-0 shadow-none"
              />
            </InputGroup>
          </Col>

          {/* Status Multi-Select */}
          <Col md={6} lg={2}>
            <Dropdown autoClose="outside" className="w-100">
              <Dropdown.Toggle 
                variant="white" 
                className="w-100 border text-start d-flex justify-content-between align-items-center shadow-none"
                disabled={isMyTasks}
              >
                <span className="text-truncate">
                    {filterStatuses.length === 0 ? "Tüm Durumlar" : `${filterStatuses.length} Durum Seçili`}
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100 py-2 shadow-sm border-0">
                {statuses.map((s) => (
                  <Dropdown.Item key={s.value} as="div" className="px-3" onClick={() => handleStatusChange(s.value)}>
                    <Form.Check 
                      type="checkbox"
                      id={`status-${s.value}`}
                      label={s.label}
                      checked={filterStatuses.includes(s.value)}
                      onChange={() => {}} // Controlled by Dropdown.Item click
                      className="cursor-pointer"
                    />
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </Col>

          {/* Unit Multi-Select */}
          <Col md={6} lg={2}>
            <Dropdown autoClose="outside" className="w-100">
              <Dropdown.Toggle 
                variant="white" 
                className="w-100 border text-start d-flex justify-content-between align-items-center shadow-none"
              >
                <span className="text-truncate">
                    {filterUnits.length === 0 ? "Tüm Birimler" : `${filterUnits.length} Birim Seçili`}
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100 py-2 shadow-sm border-0" style={{maxHeight: '300px', overflowY: 'auto'}}>
                {units.map((u) => (
                  <Dropdown.Item key={u} as="div" className="px-3" onClick={() => handleUnitChange(u)}>
                    <Form.Check 
                      type="checkbox"
                      id={`unit-${u}`}
                      label={u}
                      checked={filterUnits.includes(u)}
                      onChange={() => {}}
                      className="cursor-pointer"
                    />
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </Col>

          {/* Date Range */}
          <Col md={8} lg={3}>
              <InputGroup>
                  <InputGroup.Text className="bg-white text-muted small px-2">Tarih</InputGroup.Text>
                  <Form.Control
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="shadow-none px-2"
                  />
                  <InputGroup.Text className="bg-light text-muted border-start-0 border-end-0 px-1">-</InputGroup.Text>
                  <Form.Control
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="shadow-none px-2"
                  />
              </InputGroup>
          </Col>

          {/* Clear Button */}
          <Col md={4} lg={2}>
            <Button 
                variant="outline-secondary" 
                onClick={onClear} 
                className="w-100 d-flex align-items-center justify-content-center"
                disabled={!filterText && filterStatuses.length === 0 && filterUnits.length === 0 && !startDate && !endDate && !isMyTasks}
            >
              <XCircle className="me-2" /> Temizle
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default EvrakFilter;
