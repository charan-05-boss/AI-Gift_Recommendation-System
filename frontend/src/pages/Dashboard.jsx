import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, RefreshCw, AlertTriangle,
  ChevronUp, ChevronDown, ChevronsUpDown, Filter,
  Clock, CheckCircle2, XCircle, Loader2, ArrowUpRight
} from 'lucide-react';
import './Dashboard.css';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';

/* ── Mock data for demo when backend is offline ── */
const MOCK_ORDERS = [
  { id: 'ORD-001', title: 'Personalised Leather Journal', recipient: 'Emma Clarke', relation: 'Friend', occasion: 'Birthday', status: 'Delivered', date: '2026-06-10', owner: 'John Smith', amount: 45, priority: false },
  { id: 'ORD-002', title: 'Premium Wireless Earbuds', recipient: 'Liam Johnson', relation: 'Partner/Spouse', occasion: 'Anniversary', status: 'Processing', date: '2026-06-13', owner: 'Sarah Lee', amount: 129, priority: true },
  { id: 'ORD-003', title: 'Artisan Coffee Set', recipient: 'Priya Mehta', relation: 'Colleague', occasion: 'Thank You', status: 'Pending', date: '2026-06-14', owner: 'Raj Patel', amount: 65, priority: false },
  { id: 'ORD-004', title: 'Online Masterclass Subscription', recipient: 'Tom Baker', relation: 'Child', occasion: 'Graduation', status: 'Cancelled', date: '2026-06-08', owner: 'Maria Garcia', amount: 90, priority: false },
  { id: 'ORD-005', title: 'Luxury Spa Voucher', recipient: 'Olivia White', relation: 'Parent', occasion: "Mother's Day", status: 'Pending', date: '2026-06-14', owner: 'Chris Brown', amount: 150, priority: true },
  { id: 'ORD-006', title: 'Smart Watch Series 9', recipient: 'Noah Davis', relation: 'Sibling', occasion: 'Birthday', status: 'Processing', date: '2026-06-12', owner: 'John Smith', amount: 320, priority: false },
  { id: 'ORD-007', title: 'Gourmet Chocolate Box', recipient: 'Amelia Wilson', relation: 'Boss', occasion: 'Christmas', status: 'Delivered', date: '2026-05-28', owner: 'Sarah Lee', amount: 38, priority: false },
];

const STATUS_CONFIG = {
  Delivered:  { badge: 'badge-success', icon: <CheckCircle2 size={12} />, label: 'Delivered' },
  Processing: { badge: 'badge-info',    icon: <Loader2 size={12} className="spin-slow" />, label: 'Processing' },
  Pending:    { badge: 'badge-warning', icon: <Clock size={12} />, label: 'Pending' },
  Cancelled:  { badge: 'badge-danger',  icon: <XCircle size={12} />, label: 'Cancelled' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'date', dir: 'desc' });
  const [error, setError] = useState(null);

  /* Fetch orders from backend (or fall back to mock) */
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/orders`);
      const data = await res.json();
      if (data.success) setOrders(data.orders);
      else throw new Error(data.error);
    } catch (_) {
      setOrders(MOCK_ORDERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* Sort handler */
  const handleSort = (key) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  /* Derived data */
  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== 'All') list = list.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.title?.toLowerCase().includes(q) ||
        o.recipient?.toLowerCase().includes(q) ||
        o.owner?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let av = a[sortConfig.key] ?? '';
      let bv = b[sortConfig.key] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortConfig.dir === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [orders, statusFilter, search, sortConfig]);

  const priorityCount = orders.filter(o => o.priority).length;

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <ChevronsUpDown size={13} style={{ opacity: 0.4 }} />;
    return sortConfig.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  };

  return (
    <div className="db-page">
      <div className="container">
        {/* Header */}
        <div className="db-header animate-slide-up">
          <div>
            <div className="section-tag">
              <LayoutDashboard size={12} />
              Staff Dashboard
            </div>
            <h1 className="section-title">Fulfilment Centre</h1>
            <p className="section-subtitle">Track, manage, and action all gift orders.</p>
          </div>
          <button
            id="refresh-dashboard"
            className="btn btn-secondary btn-sm"
            onClick={fetchOrders}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Priority alert */}
        {priorityCount > 0 && !loading && (
          <div className="alert alert-warning animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>{priorityCount} high-priority order{priorityCount !== 1 ? 's' : ''}</strong> require immediate attention.
            </span>
          </div>
        )}

        {/* Stats row */}
        {!loading && (
          <div className="db-stats animate-fade-in">
            {['All', 'Pending', 'Processing', 'Delivered', 'Cancelled'].map(s => {
              const count = s === 'All' ? orders.length : orders.filter(o => o.status === s).length;
              return (
                <button
                  key={s}
                  className={`db-stat-card ${statusFilter === s ? 'active' : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  <span className="db-stat-count">{count}</span>
                  <span className="db-stat-label">{s}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Controls */}
        <div className="db-controls animate-fade-in">
          <div className="db-search-wrap">
            <Search size={15} className="db-search-icon" />
            <input
              id="dashboard-search"
              type="search"
              className="form-input db-search"
              placeholder="Search orders, recipients, owners…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="db-filter-wrap">
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              id="status-filter"
              className="form-select db-filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              {['All', 'Pending', 'Processing', 'Delivered', 'Cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="db-skeleton-wrapper animate-fade-in">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No orders found</h3>
            <p>Try adjusting your search or filter. New orders appear here once submitted from the recommendation screen.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Create a Recommendation
            </button>
          </div>
        ) : (
          <div className="db-table-wrap animate-fade-in">
            <table className="db-table" role="table">
              <thead>
                <tr>
                  {[
                    { key: 'id',        label: 'Order ID' },
                    { key: 'title',     label: 'Gift / Title' },
                    { key: 'recipient', label: 'Recipient' },
                    { key: 'status',    label: 'Status' },
                    { key: 'date',      label: 'Date' },
                    { key: 'owner',     label: 'Owner' },
                    { key: 'amount',    label: 'Amount' },
                    { key: null,        label: '' },
                  ].map((col, i) => (
                    <th
                      key={i}
                      onClick={() => col.key && handleSort(col.key)}
                      className={col.key ? 'sortable' : ''}
                      style={{ width: col.key === null ? 60 : undefined }}
                    >
                      <span>{col.label}</span>
                      {col.key && <SortIcon col={col.key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;
                  return (
                    <tr
                      key={order.id}
                      className={`db-row ${order.priority ? 'priority-row' : ''}`}
                      onClick={() => navigate(`/dashboard/${order.id}`)}
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && navigate(`/dashboard/${order.id}`)}
                      role="link"
                      aria-label={`Open order ${order.id}`}
                    >
                      <td>
                        <span className="db-order-id">{order.id}</span>
                        {order.priority && (
                          <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: '0.65rem' }}>
                            ⚡ Priority
                          </span>
                        )}
                      </td>
                      <td className="db-title-cell">{order.title}</td>
                      <td>
                        <div className="db-recipient">
                          <div className="db-avatar">{order.recipient?.charAt(0)}</div>
                          <div>
                            <div className="db-name">{order.recipient}</div>
                            <div className="db-sub">{order.relation}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${cfg.badge}`}>
                          {cfg.icon} {order.status}
                        </span>
                      </td>
                      <td className="db-date">{order.date}</td>
                      <td className="db-owner">{order.owner}</td>
                      <td className="db-amount">₹{order.amount}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm db-view-btn"
                          onClick={e => { e.stopPropagation(); navigate(`/dashboard/${order.id}`); }}
                          aria-label={`View order ${order.id}`}
                        >
                          <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="db-count-label">
            Showing {filtered.length} of {orders.length} orders
          </p>
        )}
      </div>
    </div>
  );
}
