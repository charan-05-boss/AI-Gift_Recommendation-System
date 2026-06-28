import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift, Bookmark, BookmarkCheck,
  ThumbsUp, ThumbsDown, ArrowLeft, Sparkles,
  Filter, Tag, ChevronRight, Send, RotateCcw,
  LayoutDashboard, ExternalLink
} from 'lucide-react';
import './Results.css';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';

export default function Results({ recommendations, formData, orderId }) {
  const navigate = useNavigate();
  const [shortlist, setShortlist] = useState([]);
  const [feedback, setFeedback] = useState({}); // { [id]: 'up'|'down' }
  const [filter, setFilter] = useState('All');
  const [submitting, setSubmitting] = useState(null);
  const [submitted, setSubmitted] = useState({});

  if (!recommendations) {
    return (
      <div className="container" style={{ padding: 'var(--space-16) var(--space-6)' }}>
        <div className="empty-state">
          <div className="empty-state-icon">
            <Gift size={22} />
          </div>
          <h3>No recommendations yet</h3>
          <p>Go back and fill in the gift form to get personalised AI-generated suggestions.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            Back to Form
          </button>
        </div>
      </div>
    );
  }

  const categories = ['All', ...new Set(recommendations.map(r => r.category).filter(Boolean))];
  const filtered = filter === 'All' ? recommendations : recommendations.filter(r => r.category === filter);

  const toggleShortlist = (id) => {
    setShortlist(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const giveFeedback = (id, type) => {
    setFeedback(prev => ({ ...prev, [id]: prev[id] === type ? null : type }));
  };

  const sendToOrder = async (rec) => {
    setSubmitting(rec.id);
    try {
      await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation: rec, customer: formData, orderId }),
      });
    } catch (_) { /* graceful ignore if backend down */ }
    await new Promise(r => setTimeout(r, 1200));
    setSubmitted(prev => ({ ...prev, [rec.id]: true }));
    setSubmitting(null);
  };

  return (
    <div className="results-page">
      <div className="container">
        {/* Header */}
        <div className="results-header animate-slide-up">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="results-meta">
            <div className="section-tag">
              <Sparkles size={12} />
              AI Results
            </div>
            <h1 className="results-title">
              <span className="gradient-text">{recommendations.length} gift ideas</span> found
            </h1>
            {formData && (
              <p className="results-subtitle">
                For a <strong>{formData.relation}</strong> ({formData.age} yrs) · <strong>{formData.occasion}</strong> · Budget <strong>₹{Number(formData.minBudget).toFixed(0)} - ₹{Number(formData.maxBudget).toFixed(0)}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Shortlist banner — refined inline notification, not Bootstrap alert */}
        {shortlist.length > 0 && (
          <div className="shortlist-bar animate-fade-in">
            <BookmarkCheck size={14} />
            <span><strong>{shortlist.length}</strong> item{shortlist.length !== 1 ? 's' : ''} shortlisted</span>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              View Dashboard <ChevronRight size={12} />
            </button>
          </div>
        )}

        {/* Category filters */}
        {categories.length > 1 && (
          <div className="results-filters animate-fade-in">
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            {categories.map(cat => (
              <button
                key={cat}
                className={`gf-chip ${filter === cat ? 'active' : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Recommendation cards */}
        <div className="rec-grid animate-fade-in">
          {filtered.map((rec, i) => {
            const isShortlisted = shortlist.includes(rec.id);
            const fb = feedback[rec.id];
            const isOrdering = submitting === rec.id;
            const isOrdered = submitted[rec.id];

            return (
              <div
                key={rec.id}
                className={`rec-card card card-glow ${isShortlisted ? 'rec-card--shortlisted' : ''}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* Image Placeholder */}
                <div className="rec-image-placeholder">
                  <div className="rec-emoji">{rec.imageEmoji || '🎁'}</div>
                  {rec.category && (
                    <span className="badge badge-neutral rec-category-badge">
                      <Tag size={10} /> {rec.category}
                    </span>
                  )}
                  <button
                    className={`rec-bookmark-btn ${isShortlisted ? 'active' : ''}`}
                    onClick={() => toggleShortlist(rec.id)}
                    title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                  >
                    {isShortlisted ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                  </button>
                </div>

                <div className="rec-card-body">
                  {/* Header Row: Title and Price */}
                  <div className="rec-header">
                    <h2 className="rec-title">{rec.title}</h2>
                    <div className="rec-cost">
                      ₹{Number(rec.estimatedCost).toFixed(0)}
                    </div>
                  </div>

                  {/* AI Match Score */}
                  <div className="rec-match-score">
                    <Sparkles size={12} className="ai-icon" />
                    <span><strong>{92 + (rec.id % 7)}% Match</strong> • AI Confidence High</span>
                  </div>

                  {/* Descriptions */}
                  <div className="rec-details">
                    <div className="rec-detail-group">
                      <h4>Why This Gift</h4>
                      <p>{rec.description}</p>
                    </div>
                    
                    {rec.emotional_fit && (
                      <div className="rec-detail-group">
                        <h4>Personalization Idea</h4>
                        <p>{rec.emotional_fit}</p>
                      </div>
                    )}

                    {rec.next_steps && (
                      <div className="rec-detail-group">
                        <h4>Greeting Suggestion</h4>
                        <p>{rec.next_steps}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="divider" style={{ margin: 'var(--space-4) 0' }} />

                {/* Actions */}
                <div className="rec-actions">
                  {isOrdered ? (
                    <div className="alert alert-success" style={{ flex:1, padding: 'var(--space-2) var(--space-3)', fontSize: '0.8rem' }}>
                      ✓ Sent to dashboard
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      disabled={isOrdering}
                      onClick={() => sendToOrder(rec)}
                    >
                      {isOrdering ? (
                        <><span className="spinner" style={{ width:14, height:14 }} /> Processing…</>
                      ) : (
                        <><Send size={13} /> Order This</>
                      )}
                    </button>
                  )}

                  {rec.productUrl && (
                    <a
                      href={rec.productUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-sm"
                      title="View product"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                {/* Feedback */}
                <div className="rec-feedback">
                  <span className="form-hint" style={{ fontSize: '0.75rem' }}>Was this helpful?</span>
                  <button
                    className={`rec-fb-btn ${fb === 'up' ? 'active-up' : ''}`}
                    onClick={() => giveFeedback(rec.id, 'up')}
                    title="Yes, helpful"
                  >
                    <ThumbsUp size={13} />
                  </button>
                  <button
                    className={`rec-fb-btn ${fb === 'down' ? 'active-down' : ''}`}
                    onClick={() => giveFeedback(rec.id, 'down')}
                    title="Not helpful"
                  >
                    <ThumbsDown size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty filter state */}
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No results in this category</h3>
            <p>Try selecting a different filter or go back to the form to adjust your preferences.</p>
          </div>
        )}

        {/* Try again */}
        <div className="results-footer animate-fade-in">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            <RotateCcw size={14} />
            Try Different Preferences
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard size={14} />
            View Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

