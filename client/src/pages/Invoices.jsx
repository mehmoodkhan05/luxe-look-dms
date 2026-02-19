import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import api from '../services/api';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Invoices() {
  const location = useLocation();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [detail, setDetail] = useState(null);
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [detailPage, setDetailPage] = useState(1);
  const { totalPages } = useTablePagination(list.length);
  const detailItems = detail?.items || [];
  const { totalPages: detailTotalPages } = useTablePagination(detailItems.length);
  const [form, setForm] = useState({
    customerId: '', staffId: '', items: [{ categoryId: '', serviceId: '', serviceName: '', unit_price: '', quantity: 1, discount_percentage: 0 }],
    taxAmount: 0, discount: 0, paymentMethod: 'cash', paymentStatus: 'paid',
  });
  const [categoryServicesMap, setCategoryServicesMap] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/invoices', { params: { from, to } }).then((r) => setList(r.data));
  };

  useEffect(() => {
    Promise.all([
      api.get('/customers').then((r) => setCustomers(r.data)),
      api.get('/services').then((r) => setServices(r.data)),
      api.get('/services/categories').then((r) => setCategories(r.data)),
      api.get('/staff').then((r) => setStaff(r.data)),
    ]).then(() => load()).finally(() => setLoading(false));
  }, []);

  const fetchCategoryServices = async (categoryId, itemIndex) => {
    if (!categoryId) {
      setCategoryServicesMap((prev) => {
        const newMap = { ...prev };
        delete newMap[itemIndex];
        return newMap;
      });
      return;
    }
    try {
      const response = await api.get('/services', { params: { categoryId } });
      setCategoryServicesMap((prev) => ({ ...prev, [itemIndex]: response.data }));
    } catch (e) {
      console.error('Failed to fetch category services:', e);
      setCategoryServicesMap((prev) => {
        const newMap = { ...prev };
        delete newMap[itemIndex];
        return newMap;
      });
    }
  };

  useEffect(() => {
    setPage(1);
    if (customers.length) load();
  }, [from, to]);

  useEffect(() => {
    const id = location.state?.viewInvoiceId;
    if (id) {
      setDetailPage(1);
      api.get(`/invoices/${id}`).then((r) => setDetail(r.data));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.viewInvoiceId]);

  const openNew = () => {
    setForm({
      customerId: '',
      staffId: '',
      items: [{ categoryId: '', serviceId: '', serviceName: '', unit_price: '', quantity: 1, discount_percentage: 0 }],
      taxAmount: 0,
      discount: 0,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
    });
    setCategoryServicesMap({});
    setShow(true);
  };

  const addLine = () => {
    setForm((f) => ({ ...f, items: [...f.items, { categoryId: '', serviceId: '', serviceName: '', unit_price: '', quantity: 1, discount_percentage: 0 }] }));
  };

  const calculateAutoDiscount = (items) => {
    const totalDiscount = items.reduce((sum, item) => {
      if (item.serviceId && item.unit_price && item.quantity && item.discount_percentage) {
        const itemTotal = Number(item.unit_price) * Number(item.quantity);
        const itemDiscount = itemTotal * (Number(item.discount_percentage) / 100);
        return sum + itemDiscount;
      }
      return sum;
    }, 0);
    return totalDiscount;
  };

  const updateLine = (i, field, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[i] = { ...items[i], [field]: value };
      if (field === 'categoryId') {
        // Reset service when category changes
        items[i].serviceId = '';
        items[i].serviceName = '';
        items[i].unit_price = '';
        items[i].discount_percentage = 0;
        fetchCategoryServices(value, i);
      } else if (field === 'serviceId') {
        const categoryServices = categoryServicesMap[i] || [];
        const svc = categoryServices.find((s) => s.id === Number(value));
        if (svc) {
          items[i].serviceName = svc.name;
          items[i].unit_price = svc.price;
          items[i].discount_percentage = svc.discount_percentage || 0;
        }
      }
      // Calculate auto discount when price, quantity, service, or category changes
      if (field === 'unit_price' || field === 'quantity' || field === 'serviceId' || field === 'categoryId') {
        const autoDiscount = calculateAutoDiscount(items);
        return { ...f, items, discount: autoDiscount.toFixed(2) };
      }
      return { ...f, items };
    });
  };

  const removeLine = (i) => {
    setForm((f) => {
      const newItems = f.items.filter((_, idx) => idx !== i);
      const autoDiscount = calculateAutoDiscount(newItems);
      return { ...f, items: newItems, discount: autoDiscount.toFixed(2) };
    });
  };

  const save = async () => {
    if (!form.customerId || !form.items.length || form.items.every((it) => !it.serviceId)) {
      toast.error('Select customer and at least one service');
      return;
    }
    const items = form.items.filter((it) => it.serviceId && it.unit_price).map((it) => ({
      serviceId: it.serviceId,
      serviceName: it.serviceName,
      unit_price: Number(it.unit_price),
      quantity: Number(it.quantity) || 1,
    }));
    if (!items.length) {
      toast.error('Add at least one service with price');
      return;
    }
    setSaving(true);
    try {
      await api.post('/invoices', {
        customerId: form.customerId,
        staffId: form.staffId || null,
        items,
        taxAmount: Number(form.taxAmount) || 0,
        discount: Number(form.discount) || 0,
        paymentMethod: form.paymentMethod,
        paymentStatus: form.paymentStatus,
      });
      toast.success('Invoice created');
      setShow(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const viewDetail = (id) => {
    setDetailPage(1);
    api.get(`/invoices/${id}`).then((r) => setDetail(r.data));
  };

  const handlePrint = () => {
    if (!detail) return;
    const allItems = detail.items || [];
    const invoiceDate = detail.created_at ? new Date(detail.created_at) : new Date();
    const dateStr = format(invoiceDate, 'dd/MM/yyyy');
    const timeStr = format(invoiceDate, 'HH:mm:ss');
    
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${detail.invoice_number}</title>
          <style>
            @media print {
              @page {
                size: 57mm auto;
                margin: 2mm;
              }
              body {
                margin: 0;
                padding: 2mm;
                max-width: 57mm;
                width: 57mm;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              font-weight: bold;
              line-height: 1.3;
              padding: 5px;
              max-width: 57mm;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1px solid #000;
            }
            .header h1 {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 2px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header .subtitle {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .header .address {
              font-size: 9px;
              margin-bottom: 2px;
            }
            .header .phone {
              font-size: 9px;
              margin-bottom: 4px;
            }
            .invoice-info {
              margin-bottom: 8px;
              font-size: 10px;
            }
            .invoice-info .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .invoice-info .label {
              font-weight: bold;
            }
            .customer-info {
              margin-bottom: 8px;
              font-size: 10px;
              padding-bottom: 6px;
              border-bottom: 1px solid #000;
            }
            .customer-info .label {
              font-weight: bold;
              margin-bottom: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
              font-size: 10px;
            }
            table th {
              text-align: left;
              padding: 3px 2px;
              border-bottom: 1px solid #000;
              font-weight: bold;
            }
            table td {
              padding: 2px;
            }
            table .col-item {
              width: 45%;
            }
            table .col-qty {
              width: 10%;
              text-align: center;
            }
            table .col-price {
              width: 20%;
              text-align: right;
            }
            table .col-total {
              width: 25%;
              text-align: right;
            }
            .totals {
              margin-top: 8px;
              padding-top: 6px;
              border-top: 1px solid #000;
              font-size: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            .total-row.total-final {
              border-top: 1px solid #000;
              padding-top: 4px;
              margin-top: 4px;
              font-weight: bold;
              font-size: 11px;
            }
            .footer {
              margin-top: 12px;
              text-align: center;
              font-size: 8px;
              border-top: 1px solid #000;
              padding-top: 6px;
            }
            .footer p {
              margin-bottom: 3px;
            }
            .divider {
              border-top: 1px solid #000;
              margin: 6px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LUXE LOOK</h1>
            <div class="subtitle">PARLOUR</div>
            <div class="address">Allah Chowk Near Comissioner House Saidu Sharif</div>
            <div class="phone">+92 345 4545011</div>
          </div>
          
          <div class="invoice-info">
            <div class="row">
              <span class="label">No.</span>
              <span>${detail.invoice_number}</span>
            </div>
            <div class="row">
              <span class="label">Date:</span>
              <span>${dateStr} ${timeStr}</span>
            </div>
            <div class="row">
              <span class="label">M/s:</span>
              <span>${detail.customer_name || 'CASH SALES'}</span>
            </div>
            <div class="row">
              <span class="label">Payment:</span>
              <span>${(detail.payment_method || 'cash').toUpperCase()}</span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr>
                <th class="col-item">Item Name</th>
                <th class="col-qty">Qty</th>
                <th class="col-price">Price</th>
                <th class="col-total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${allItems.map(item => {
                const itemName = (item.service_name || item.product_name || 'N/A').substring(0, 25);
                const qty = item.quantity || 1;
                const price = Number(item.unit_price || 0).toFixed(2);
                const total = Number(item.total || 0).toFixed(2);
                return `
                  <tr>
                    <td class="col-item">${itemName}</td>
                    <td class="col-qty">${qty}</td>
                    <td class="col-price">${price}</td>
                    <td class="col-total">${total}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span>Total items: ${allItems.length}</span>
            </div>
            <div class="total-row">
              <span>Gross Total:</span>
              <span>${Number(detail.subtotal || 0).toFixed(2)}</span>
            </div>
            ${(detail.tax_amount || 0) > 0 ? `
              <div class="total-row">
                <span>Tax:</span>
                <span>${Number(detail.tax_amount).toFixed(2)}</span>
              </div>
            ` : ''}
            ${(detail.discount || 0) > 0 ? `
              <div class="total-row">
                <span>Discount:</span>
                <span>${Number(detail.discount).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row total-final">
              <span>Net Total:</span>
              <span>${Number(detail.total_amount || 0).toFixed(2)}</span>
            </div>
            <div class="total-row" style="margin-top: 4px;">
              <span>Status:</span>
              <span>${(detail.payment_status || 'paid').toUpperCase()}</span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="footer">
            <p>THANK YOU FOR YOUR BUSINESS!</p>
            <p>Please visit us again</p>
            <p style="margin-top: 6px; font-size: 7px;">Generated by Luxe Look</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const subtotal = form.items.reduce((s, it) => s + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1), 0);
  const total = subtotal + (Number(form.taxAmount) || 0) - (Number(form.discount) || 0);

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 page-header-flex">
        <h1 className="h4 text-luxe-gold mb-0">Invoices</h1>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <Form.Control type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto flex-grow-1 flex-md-grow-0" />
          <Form.Control type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto flex-grow-1 flex-md-grow-0" />
          <Button className="btn-luxe" onClick={openNew} title="New invoice"><i className="fas fa-receipt me-1" /><span className="d-none d-sm-inline">New Invoice</span></Button>
        </div>
      </div>

      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4"><Spinner className="text-warning" /></div>
          ) : (
            <>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginate(list, page).map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoice_number}</td>
                    <td>{inv.created_at && format(new Date(inv.created_at), 'dd MMM yyyy')}</td>
                    <td>{inv.customer_name}</td>
                    <td className="text-break" style={{ maxWidth: '200px' }} title={inv.items_summary || ''}>{inv.items_summary || '—'}</td>
                    <td>PKR {Number(inv.total_amount).toLocaleString()}</td>
                    <td><Badge bg={inv.payment_status === 'paid' ? 'success' : 'warning'}>{inv.payment_status}</Badge></td>
                    <td><Button variant="outline-primary" size="sm" onClick={() => viewDetail(inv.id)} title="View"><i className="fas fa-eye" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
          {!loading && list.length === 0 && <p className="text-muted text-center py-4 mb-0">No invoices in range</p>}
        </Card.Body>
      </Card>

      <Modal show={show} onHide={() => { 
        setShow(false); 
        setCategoryServicesMap({}); 
      }} centered size="lg" backdrop="static" fullscreen="sm-down">
        <Modal.Header closeButton><Modal.Title>New Invoice</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Customer</Form.Label>
            <Form.Select value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}>
              <option value="">Select</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Staff (optional)</Form.Label>
            <Form.Select value={form.staffId} onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}>
              <option value="">—</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </Form.Select>
          </Form.Group>
          <div className="mb-2 d-flex justify-content-between align-items-center">
            <Form.Label className="mb-0">Items</Form.Label>
            <Button variant="outline-luxe" size="sm" onClick={addLine} title="Add line"><i className="fas fa-plus" /></Button>
          </div>
          {form.items.map((it, i) => (
            <div key={i} className="mb-3">
              <Form.Group className="mb-2">
                <Form.Label className="small">Category</Form.Label>
                <Form.Select value={it.categoryId} onChange={(e) => updateLine(i, 'categoryId', e.target.value)}>
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Form.Select>
              </Form.Group>
              <div className="d-flex flex-wrap gap-2 align-items-end">
                <Form.Group className="mb-0 flex-grow-1" style={{ minWidth: '140px' }}>
                  <Form.Label className="small">Service</Form.Label>
                  <Form.Select value={it.serviceId} onChange={(e) => updateLine(i, 'serviceId', e.target.value)} disabled={!it.categoryId}>
                    <option value="">Select Service</option>
                    {(categoryServicesMap[i] || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.variant ? ` (${s.variant})` : ''} – PKR {s.price}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-0" style={{ maxWidth: '120px' }}>
                  <Form.Label className="small">Price</Form.Label>
                  <Form.Control type="number" min={0} step={0.01} placeholder="Price" value={it.unit_price} onChange={(e) => updateLine(i, 'unit_price', e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-0" style={{ maxWidth: '100px' }}>
                  <Form.Label className="small">Quantity</Form.Label>
                  <Form.Control type="number" min={1} value={it.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} />
                </Form.Group>
                <div className="d-flex align-items-end">
                  <Button variant="outline-danger" size="sm" onClick={() => {
                    removeLine(i);
                    setCategoryServicesMap((prev) => {
                      const newMap = { ...prev };
                      delete newMap[i];
                      // Reindex remaining items
                      const reindexed = {};
                      Object.keys(newMap).forEach((key) => {
                        const keyNum = Number(key);
                        if (keyNum > i) {
                          reindexed[keyNum - 1] = newMap[key];
                        } else if (keyNum < i) {
                          reindexed[keyNum] = newMap[key];
                        }
                      });
                      return reindexed;
                    });
                  }} title="Remove line"><i className="fas fa-trash" /></Button>
                </div>
              </div>
            </div>
          ))}
          <div className="d-flex flex-wrap gap-2 mt-2">
            <Form.Group className="mb-0 flex-grow-1" style={{ minWidth: '100px' }}>
              <Form.Label className="small">Tax</Form.Label>
              <Form.Control type="number" min={0} step={0.01} value={form.taxAmount} onChange={(e) => setForm((f) => ({ ...f, taxAmount: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-0 flex-grow-1" style={{ minWidth: '100px' }}>
              <Form.Label className="small">Discount</Form.Label>
              <Form.Control type="number" min={0} step={0.01} value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} />
              <Form.Text className="text-muted small">Auto-calculated from service discounts</Form.Text>
            </Form.Group>
            <Form.Group className="mb-0 flex-grow-1" style={{ minWidth: '120px' }}>
              <Form.Label className="small">Payment</Form.Label>
              <Form.Select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_payment">Mobile</option>
              </Form.Select>
            </Form.Group>
          </div>
          <p className="mt-2 mb-0 fw-bold">Total: PKR {total.toLocaleString()}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
          <Button className="btn-luxe" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create Invoice'}</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!detail} onHide={() => { setDetail(null); setDetailPage(1); }} centered backdrop="static" size="lg" fullscreen="sm-down">
        <Modal.Header closeButton>
          <Modal.Title>Invoice {detail?.invoice_number}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detail && (
            <>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <p className="mb-1"><strong>{detail.customer_name}</strong></p>
                  <p className="text-muted small mb-0">{detail.phone} {detail.email}</p>
                </div>
                <div className="text-end">
                  <p className="text-muted small mb-0">Date: {detail.created_at && format(new Date(detail.created_at), 'dd MMM yyyy')}</p>
                  <p className="text-muted small mb-0">Payment: {detail.payment_method || 'N/A'}</p>
                </div>
              </div>
              <Table size="sm">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paginate(detailItems, detailPage).map((it) => (
                    <tr key={it.id}>
                      <td>{it.service_name || it.product_name}</td>
                      <td>{it.quantity}</td>
                      <td className="text-end">PKR {Number(it.unit_price).toLocaleString()}</td>
                      <td className="text-end">PKR {Number(it.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <TablePagination currentPage={detailPage} totalPages={detailTotalPages} onPageChange={setDetailPage} />
              <div className="d-flex justify-content-end gap-3 mt-3 pt-3 border-top">
                <div className="text-end">
                  {detail.subtotal && (
                    <p className="mb-1 small text-muted">Subtotal: PKR {Number(detail.subtotal).toLocaleString()}</p>
                  )}
                  {detail.tax_amount > 0 && (
                    <p className="mb-1 small text-muted">Tax: PKR {Number(detail.tax_amount).toLocaleString()}</p>
                  )}
                  {detail.discount > 0 && (
                    <p className="mb-1 small text-muted">Discount: PKR {Number(detail.discount).toLocaleString()}</p>
                  )}
                  <p className="mb-0 fw-bold fs-5">Total: PKR {Number(detail.total_amount).toLocaleString()}</p>
                  <p className="mb-0 small text-muted">Status: {detail.payment_status}</p>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setDetail(null); setDetailPage(1); }}>Close</Button>
          <Button className="btn-luxe" onClick={handlePrint} disabled={!detail}>
            <i className="fas fa-print me-1" />Print Invoice
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
