import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, Loader2,
  User, Calendar, Banknote, Tag, MessageSquare,
  Sparkles, Activity, AlertTriangle, Edit3, Save
} from 'lucide-react';
import './DetailPage.css';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';

const STATUS_CONFIG = {
  Delivered:  { badge: 'badge-success', icon: <CheckCircle2 size={14} />, color: 'var(--color-success)' },
  Processing: { badge: 'badge-info',    icon: <Loader2 size={14} />,       color: 'var(--color-info)' },
  Pending:    { badge: 'badge-warning', icon: <Clock size={14} />,         color: 'var(--color-warning)' },
  Cancelled:  { badge: 'badge-danger',  icon: <XCircle size={14} />,       color: 'var(--color-danger)' },
};

const MOCK_DETAIL = {
  'ORD-001': {
    id: 'ORD-001', title: 'Personalised Leather Journal', recipient: 'Emma Clarke',
    relation: 'Friend', occasion: 'Birthday', age: 28, budget: 50,
    status: 'Delivered', date: '2026-06-10', owner: 'John Smith', amount: 45, priority: false,
    notes: 'Emma loves vintage aesthetics. Monogram her initials on the cover.',
    aiOutput: [
      { title: 'Personalised Leather Journal', desc: 'Hand-crafted with full-grain leather. Perfect for a creative friend.', cost: 45 },
      { title: 'Illustrated City Map Print', desc: 'Custom map of her hometown. Sentimental and stylish.', cost: 35 },
    ],
    history: [
      { timestamp: '2026-06-10 09:12', actor: 'System', action: 'Order created via AI recommendation.' },
      { timestamp: '2026-06-10 09:45', actor: 'John Smith', action: 'Status updated: Pending to Processing.' },
      { timestamp: '2026-06-11 14:30', actor: 'John Smith', action: 'Status updated: Processing to Delivered.' },
    ],
  },
  'ORD-002': {
    id: 'ORD-002', title: 'Premium Wireless Earbuds', recipient: 'Liam Johnson',
    relation: 'Partner/Spouse', occasion: 'Anniversary', age: 35, budget: 150,
    status: 'Processing', date: '2026-06-13', owner: 'Sarah Lee', amount: 129, priority: true,
    notes: 'He commutes daily and listens to jazz. ANC is a must.',
    aiOutput: [
      { title: 'Sony WH-1000XM5 Earbuds', desc: 'Industry-leading noise cancellation with stellar sound quality.', cost: 129 },
      { title: 'Bose QuietComfort Earbuds', desc: 'Exceptional comfort and a warm, balanced audio signature.', cost: 139 },
    ],
    history: [
      { timestamp: '2026-06-13 11:00', actor: 'System', action: 'Order created via AI recommendation.' },
      { timestamp: '2026-06-13 12:20', actor: 'Sarah Lee', action: 'Status updated: Pending to Processing.' },
    ],
  },
  'ORD-003': {
    id: 'ORD-003', title: 'Artisan Coffee Set', recipient: 'Priya Mehta',
    relation: 'Colleague', occasion: 'Thank You', age: 32, budget: 80,
    status: 'Pending', date: '2026-06-14', owner: 'Raj Patel', amount: 65, priority: false,
    notes: 'She prefers light roasts. Add a handwritten thank-you card.',
    aiOutput: [
      { title: 'Artisan Coffee Experience Set', desc: 'Single-origin coffees with pour-over kit. For the colleague who appreciates quality.', cost: 65 },
      { title: 'Coffee Grinder + Beans Bundle', desc: 'Freshly-ground coffee from Ethiopian highlands. A real treat.', cost: 72 },
    ],
    history: [
      { timestamp: '2026-06-14 10:00', actor: 'System', action: 'Order created via AI recommendation.' },
    ],
  },
  'ORD-004': {
    id: 'ORD-004', title: 'Online Masterclass Subscription', recipient: 'Tom Baker',
    relation: 'Child', occasion: 'Graduation', age: 22, budget: 100,
    status: 'Cancelled', date: '2026-06-08', owner: 'Maria Garcia', amount: 90, priority: false,
    notes: 'Tom decided he wanted a physical gift instead. Order cancelled on request.',
    aiOutput: [
      { title: 'Masterclass Annual Subscription', desc: 'World-class instructors across film, music, writing, and more.', cost: 90 },
    ],
    history: [
      { timestamp: '2026-06-08 09:00', actor: 'System', action: 'Order created via AI recommendation.' },
      { timestamp: '2026-06-08 14:00', actor: 'Maria Garcia', action: 'Status updated: Pending to Cancelled. Customer preference.' },
    ],
  },
  'ORD-005': {
    id: 'ORD-005', title: 'Luxury Spa Voucher', recipient: 'Olivia White',
    relation: 'Parent', occasion: "Mother's Day", age: 58, budget: 200,
    status: 'Pending', date: '2026-06-14', owner: 'Chris Brown', amount: 150, priority: true,
    notes: "HIGH PRIORITY - Same-day delivery required for the physical voucher.",
    aiOutput: [
      { title: 'Luxury Spa Day Voucher', desc: 'Full-day spa experience including massage, facial, and lunch.', cost: 150 },
      { title: 'Aromatherapy Home Spa Kit', desc: 'Premium oils, salts, and candles for a relaxing home spa evening.', cost: 85 },
    ],
    history: [
      { timestamp: '2026-06-14 08:30', actor: 'System', action: 'Order created via AI recommendation.' },
      { timestamp: '2026-06-14 08:45', actor: 'Chris Brown', action: 'Flagged as High Priority for same-day delivery.' },
    ],
  },
  'ORD-006': {
    id: 'ORD-006', title: 'Smart Watch Series 9', recipient: 'Noah Davis',
    relation: 'Sibling', occasion: 'Birthday', age: 26, budget: 400,
    status: 'Processing', date: '2026-06-12', owner: 'John Smith', amount: 320, priority: false,
    notes: 'Noah is into fitness tracking. Ensure the watch supports third-party apps.',
    aiOutput: [
      { title: 'Apple Watch Series 9', desc: 'Best-in-class fitness and health tracking with seamless iOS integration.', cost: 320 },
      { title: 'Samsung Galaxy Watch 6', desc: 'Sleek design with top-tier fitness features and cross-platform compatibility.', cost: 280 },
    ],
    history: [
      { timestamp: '2026-06-12 13:00', actor: 'System', action: 'Order created via AI recommendation.' },
      { timestamp: '2026-06-12 15:30', actor: 'John Smith', action: 'Status updated: Pending to Processing. Dispatched to warehouse.' },
    ],
  },
  'ORD-007': {
    id: 'ORD-007', title: 'Gourmet Chocolate Box', recipient: 'Amelia Wilson',
    relation: 'Boss', occasion: 'Christmas', age: 45, budget: 50,
    status: 'Delivered', date: '2026-05-28', owner: 'Sarah Lee', amount: 38, priority: false,
    notes: 'She is vegetarian. Confirmed the chocolates contain no gelatin.',
    aiOutput: [
      { title: 'Gourmet Belgian Chocolate Box', desc: 'Assorted handcrafted Belgian chocolates in a premium gift box. Vegetarian-friendly.', cost: 38 },
    ],
    history: [
      { timestamp: '2026-05-28 09:00', actor: 'System', action: 'Order created via AI recommendation.' },
      { timestamp: '2026-05-28 10:00', actor: 'Sarah Lee', action: 'Status updated: Pending to Processing.' },
      { timestamp: '2026-05-29 12:00', actor: 'Sarah Lee', action: 'Status updated: Processing to Delivered.' },
    ],
  },
};

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeliveredModal, setShowDeliveredModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/orders/${id}`);
        const data = await res.json();
        if (data.success) { setOrder(data.order); setNoteText(data.order.notes || ''); }
        else throw new Error();
      } catch (_) {
        const fallback = MOCK_DETAIL[id] || {
          id, title: 'Unknown Order', recipient: 'N/A', relation: 'N/A',
          status: 'Pending', date: new Date().toISOString().split('T')[0],
          owner: 'N/A', amount: 0, priority: false, notes: '', aiOutput: [], history: [],
        };
        setOrder(fallback);
        setNoteText(fallback.notes || '');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const saveNote = async () => {
    setSavingNote(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteText })
      });
      if (res.ok) {
        setOrder(o => ({
          ...o,
          notes: noteText,
          history: [
            { timestamp: new Date().toISOString(), actor: 'You', action: 'Notes updated.' },
            ...(o.history || []),
          ],
        }));
      }
    } catch (err) {
      console.error('Failed to save note', err);
    }
    setEditingNote(false);
    setSavingNote(false);
  };

  const updateStatus = async (newStatus, reason = null) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason })
      });
      if (res.ok) {
        let actionText = `Status updated: ${order.status} to ${newStatus}.`;
        if (reason) actionText += ` Reason: ${reason}`;
        
        setOrder(o => ({
          ...o,
          status: newStatus,
          history: [
            { timestamp: new Date().toISOString(), actor: 'You', action: actionText },
            ...(o.history || []),
          ],
        }));
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
    setUpdatingStatus(false);
  };


  const cancelOrder = () => {
    if (order.status === 'Cancelled') return;
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    setUpdatingStatus(true);
    try {
      await fetch(`${API_BASE}/api/orders/${id}`, { method: 'DELETE' });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setUpdatingStatus(false);
    }
    setShowCancelModal(false);
    setCancelReason('');
  };

  const confirmDelivered = async () => {
    setUpdatingStatus(true);
    try {
      await fetch(`${API_BASE}/api/orders/${id}`, { method: 'DELETE' });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setUpdatingStatus(false);
    }
    setShowDeliveredModal(false);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--space-16) var(--space-6)' }}>
        <div className="detail-skeleton animate-fade-in">
          <div className="skeleton" style={{ height: 24, width: 80, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 40, width: '50%', marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 20, width: '30%', marginBottom: 32 }} />
          {[120, 200, 160].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: h, marginBottom: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;

  return (
    <div className="detail-page">
      <div className="container">
        {/* Back nav */}
        <button
          id="back-to-dashboard"
          className="btn btn-ghost btn-sm detail-back"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        {/* Title row */}
        <div className="detail-header animate-slide-up">
          <div className="detail-header-left">
            <div className="detail-order-id">{order.id}</div>
            <h1 className="detail-title">{order.title}</h1>
            <div className="detail-badges">
              <span className={`badge ${cfg.badge}`}>
                {cfg.icon} {order.status}
              </span>
              {order.priority && (
                <span className="badge badge-danger">
                  <AlertTriangle size={10} /> High Priority
                </span>
              )}
            </div>
          </div>
          <div className="detail-actions-top">
            {/* Status buttons grouped together */}
            <div className="detail-status-btns">
              {['Pending', 'Processing', 'Delivered'].map(s => (
                <button
                  key={s}
                  className={`btn btn-sm ${order.status === s ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => s === 'Delivered' ? setShowDeliveredModal(true) : updateStatus(s)}
                  disabled={updatingStatus || order.status === s}
                >
                  {updatingStatus && order.status !== s
                    ? <span className="spinner" style={{ width: 12, height: 12 }} />
                    : s
                  }
                </button>
              ))}
            </div>
            {/* Cancel — visually separated, not competing for attention */}
            {order.status !== 'Cancelled' && (
              <button
                className="btn btn-ghost btn-sm detail-cancel-btn"
                onClick={cancelOrder}
                disabled={updatingStatus}
              >
                Cancel order
              </button>
            )}
          </div>
        </div>

        <div className="detail-grid animate-fade-in">
          {/* Left column */}
          <div className="detail-col-main">
            {/* Key details */}
            <div className="card detail-card">
              <h2 className="detail-section-title">
                <User size={16} /> Order Details
              </h2>
              <div className="detail-facts">
                {[
                  { icon: <User size={14} />,      label: 'Recipient',  value: `${order.recipient} (${order.relation})` },
                  { icon: <Calendar size={14} />,  label: 'Occasion',   value: order.occasion || 'N/A' },
                  { icon: <Tag size={14} />,       label: 'Age',        value: order.age ? `${order.age} years old` : 'N/A' },
                  { icon: <Banknote size={14} />,  label: 'Budget',     value: order.minBudget ? `₹${order.minBudget} - ₹${order.maxBudget}` : 'N/A' },
                  { icon: <Banknote size={14} />,  label: 'Final Cost', value: `₹${order.amount}` },
                  { icon: <Calendar size={14} />,  label: 'Order Date', value: order.date },
                  { icon: <User size={14} />,      label: 'Owner',      value: order.owner },
                ].map(f => (
                  <div key={f.label} className="detail-fact-row">
                    <span className="detail-fact-icon">{f.icon}</span>
                    <span className="detail-fact-label">{f.label}</span>
                    <span className="detail-fact-value">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Output */}
            {order.aiOutput && order.aiOutput.length > 0 && (
              <div className="card detail-card">
                <h2 className="detail-section-title">
                  <Sparkles size={16} /> AI-Generated Recommendations
                </h2>
                <div className="detail-ai-list">
                  {order.aiOutput.map((item, i) => (
                    <div key={i} className="detail-ai-item">
                      <div className="detail-ai-rank">#{i + 1}</div>
                      <div className="detail-ai-body">
                        <div className="detail-ai-title">{item.title}</div>
                        <div className="detail-ai-desc">{item.desc}</div>
                      </div>
                      <div className="detail-ai-cost">₹{item.cost}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="detail-col-side">
            {/* Notes */}
            <div className="card detail-card">
              <div className="detail-card-header">
                <h2 className="detail-section-title">
                  <MessageSquare size={16} /> Notes
                </h2>
                {!editingNote && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingNote(true)}>
                    <Edit3 size={13} /> Edit
                  </button>
                )}
              </div>
              {editingNote ? (
                <div style={{ display:'flex', flexDirection:'column', gap: 'var(--space-3)' }}>
                  <textarea
                    id="order-notes"
                    className="form-textarea"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    style={{ minHeight: 100 }}
                  />
                  <div style={{ display:'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn-primary btn-sm" onClick={saveNote} disabled={savingNote}>
                      {savingNote ? <><span className="spinner" style={{ width:14,height:14 }} /> Saving&hellip;</> : <><Save size={13} /> Save</>}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingNote(false); setNoteText(order.notes || ''); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="detail-notes-text">
                  {order.notes || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes yet.</span>}
                </p>
              )}
            </div>

            {/* Action History */}
            <div className="card detail-card">
              <h2 className="detail-section-title">
                <Activity size={16} /> Action History
              </h2>
              {order.history && order.history.length > 0 ? (
                <div className="detail-timeline">
                  {order.history.map((h, i) => (
                    <div key={i} className="detail-timeline-item">
                      <div className="detail-timeline-dot" />
                      <div className="detail-timeline-body">
                        <div className="detail-timeline-action">{h.action}</div>
                        <div className="detail-timeline-meta">
                          <span>{h.actor}</span>
                          <span>&middot;</span>
                          <span>{h.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>No history recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{ width: '90%', maxWidth: 400, padding: 'var(--space-6)', animation: 'slideUp var(--duration) var(--ease)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>Cancel Order</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: '0.875rem' }}>
              Are you sure you want to cancel this order? It will be deleted from the dashboard.
            </p>
            <input
              type="text"
              className="form-input"
              placeholder="Reason (e.g., Customer requested change)"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              style={{ marginBottom: 'var(--space-5)' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
              >
                Back
              </button>
              <button 
                className="btn btn-primary" 
                style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                onClick={confirmCancel}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivered Modal */}
      {showDeliveredModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{ width: '90%', maxWidth: 400, padding: 'var(--space-6)', animation: 'slideUp var(--duration) var(--ease)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>Mark as Delivered</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Are you sure you want to mark this order as Delivered? This will complete the order and remove it from the dashboard.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowDeliveredModal(false)}
              >
                Back
              </button>
              <button 
                className="btn btn-primary" 
                style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                onClick={confirmDelivered}
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
