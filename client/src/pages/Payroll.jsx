import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Spinner } from 'react-bootstrap';
import api from '../services/api';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';
import toast from 'react-hot-toast';

export default function Payroll() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [calculating, setCalculating] = useState(false);
  const [page, setPage] = useState(1);
  const { totalPages } = useTablePagination(list.length);

  const load = () => api.get('/payroll', { params: { monthYear } }).then((r) => setList(r.data));

  useEffect(() => {
    setPage(1);
    load().finally(() => setLoading(false));
  }, [monthYear]);

  const calculate = async () => {
    setCalculating(true);
    try {
      await api.post('/payroll/calculate', { monthYear });
      toast.success('Payroll calculated');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setCalculating(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/payroll/${id}/status`, { status });
      toast.success('Updated');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h4 text-luxe-gold mb-0">Payroll</h1>
        <div className="d-flex gap-2 align-items-center">
          <Form.Control
            type="month"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="w-auto"
          />
          <Button className="btn-luxe" onClick={calculate} disabled={calculating}>
            {calculating ? 'Calculating…' : 'Calculate Payroll'}
          </Button>
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
                  <th>Staff</th>
                  <th>Base Salary</th>
                  <th>Commission</th>
                  <th>Deductions</th>
                  <th>Net Payable</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginate(list, page).map((p) => (
                  <tr key={p.id}>
                    <td>{p.full_name}</td>
                    <td>PKR {Number(p.base_salary).toLocaleString()}</td>
                    <td>PKR {Number(p.commission_earned).toLocaleString()}</td>
                    <td>PKR {Number(p.deductions).toLocaleString()}</td>
                    <td className="fw-bold text-luxe-gold">PKR {Number(p.net_payable).toLocaleString()}</td>
                    <td><span className="badge bg-secondary">{p.status}</span></td>
                    <td>
                      {p.status === 'draft' && (
                        <>
                          <Button variant="outline-info" size="sm" className="me-1" onClick={() => setStatus(p.id, 'processed')} title="Mark processed"><i className="fas fa-square-check" /></Button>
                        </>
                      )}
                      {p.status === 'processed' && (
                        <Button variant="outline-success" size="sm" onClick={() => setStatus(p.id, 'paid')} title="Mark paid"><i className="fas fa-money-bill" /></Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
          {!loading && list.length === 0 && (
            <p className="text-muted text-center py-4 mb-0">No payroll for this month. Click &quot;Calculate Payroll&quot; to generate.</p>
          )}
        </Card.Body>
      </Card>
    </>
  );
}
