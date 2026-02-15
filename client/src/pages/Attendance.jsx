import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Spinner } from 'react-bootstrap';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'Leave' },
  { value: 'half_day', label: 'Half day' },
];

export default function Attendance() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const load = async () => {
    setLoadError(null);
    const res = await api.get('/attendance', { params: { date } });
    const data = res.data.map((r) => ({
      staff_id: r.staff_id,
      full_name: r.full_name,
      status: r.status ?? '',
      notes: r.notes || '',
      half_day_from: r.half_day_from ? String(r.half_day_from).slice(0, 5) : '', // HH:mm for input
      half_day_to: r.half_day_to ? String(r.half_day_to).slice(0, 5) : '',
    }));
    setRows(data);
    setLocal(data.map((d) => ({ ...d })));
  };

  const loadWithHandling = () => {
    setLoading(true);
    load()
      .catch((e) => {
        const msg = e.response?.data?.error || e.message || 'Failed to load attendance';
        setLoadError(msg);
        toast.error(msg);
        setRows([]);
        setLocal([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWithHandling();
  }, [date]);

  const updateLocal = (staffId, field, value) => {
    setLocal((prev) =>
      prev.map((r) => (r.staff_id === staffId ? { ...r, [field]: value } : r))
    );
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const r of local) {
        if (!r.status) continue;
        await api.put('/attendance', {
          staff_id: r.staff_id,
          date,
          status: r.status,
          notes: r.notes || null,
          half_day_from: r.status === 'half_day' && r.half_day_from ? r.half_day_from : null,
          half_day_to: r.status === 'half_day' && r.half_day_to ? r.half_day_to : null,
        });
      }
      toast.success('Attendance saved');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h4 text-luxe-gold mb-0">Attendance</h1>
        <div className="d-flex gap-2 align-items-center">
          <Form.Control
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
          <Button className="btn-luxe" onClick={saveAll} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <Card.Body>
          <p className="text-luxe-muted small mb-3">Mark attendance for the selected date. Only admins can update.</p>
          {loading ? (
            <div className="text-center py-4"><Spinner className="text-warning" /></div>
          ) : loadError ? (
            <div className="text-center py-4">
              <p className="text-danger mb-2">Could not load attendance.</p>
              <p className="text-muted small mb-3">{loadError}</p>
              <p className="text-luxe-muted small mb-3">On cPanel, ensure the full server (including <code>routes/attendance.js</code>) is deployed, the <code>attendance</code> table exists (run <code>database.sql</code> in MySQL), and the API URL is correct.</p>
              <Button variant="outline-warning" onClick={loadWithHandling}>Retry</Button>
            </div>
          ) : (
            <>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Staff</th>
                    <th>Status</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {local.map((r, index) => (
                    <tr key={r.staff_id}>
                      <td className="text-luxe-muted">{index + 1}</td>
                      <td>{r.full_name}</td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={r.status}
                          onChange={(e) => updateLocal(r.staff_id, 'status', e.target.value)}
                          className="w-auto"
                        >
                          <option value="">Select</option>
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </Form.Select>
                      </td>
                      <td>
                        {r.status === 'half_day' ? (
                          <Form.Control
                            size="sm"
                            type="time"
                            value={r.half_day_from || ''}
                            onChange={(e) => updateLocal(r.staff_id, 'half_day_from', e.target.value)}
                            className="w-auto"
                          />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {r.status === 'half_day' ? (
                          <Form.Control
                            size="sm"
                            type="time"
                            value={r.half_day_to || ''}
                            onChange={(e) => updateLocal(r.staff_id, 'half_day_to', e.target.value)}
                            className="w-auto"
                          />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Optional notes"
                          value={r.notes}
                          onChange={(e) => updateLocal(r.staff_id, 'notes', e.target.value)}
                          className="max-w-200"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {!loading && !loadError && local.length === 0 && (
                <p className="text-muted text-center py-4 mb-0">
                  No staff found. Only users added from the <strong>Staff</strong> page with role <strong>Staff</strong> (not Admin or Receptionist) appear here. Add a team member with role &quot;Staff&quot; to see them in this list.
                </p>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </>
  );
}
