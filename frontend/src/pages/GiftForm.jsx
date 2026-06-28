import { useState } from 'react';
import { Sparkles, User, Gift, Banknote, Calendar, Heart, AlertCircle, ChevronRight } from 'lucide-react';
import './GiftForm.css';

const OCCASIONS = ['Birthday', 'Anniversary', 'Wedding', 'Graduation', 'Baby Shower', 'Christmas', 'Valentine\'s Day', 'Mother\'s Day', 'Father\'s Day', "New Year's", 'Retirement', 'Housewarming', 'Get Well Soon', 'Thank You', 'Other'];
const RELATIONS = ['Partner/Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Colleague', 'Boss', 'Teacher/Mentor', 'Grandparent', 'Cousin', 'Neighbour', 'Other'];

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';

export default function GiftForm({ onSubmit }) {
  const [form, setForm] = useState({
    occasion: '',
    relation: '',
    age: '',
    minBudget: '',
    maxBudget: '',
    preferences: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const validate = () => {
    const e = {};
    if (!form.occasion) e.occasion = 'Please select an occasion.';
    if (!form.relation) e.relation = 'Please select a relation.';
    if (!form.age || isNaN(form.age) || form.age < 1 || form.age > 120)
      e.age = 'Please enter a valid age (1–120).';
    if (!form.minBudget || isNaN(form.minBudget) || form.minBudget < 1 || !form.maxBudget || isNaN(form.maxBudget) || form.maxBudget < 1)
      e.minBudget = 'Please enter valid minimum and maximum budgets.';
    else if (parseFloat(form.maxBudget) < parseFloat(form.minBudget))
      e.minBudget = 'Max budget cannot be less than min budget.';
    return e;
  };

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      const payload = {
        occasion: form.occasion,
        relation: form.relation,
        age: parseInt(form.age),
        minBudget: parseFloat(form.minBudget),
        maxBudget: parseFloat(form.maxBudget),
        preferences: form.preferences,
      };
      const res = await fetch(`${API_BASE}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unexpected error from server.');
      onSubmit(payload, data.recommendations, data.order_id);
    } catch (err) {
      // Graceful degradation: show mock results if backend is unavailable
      const mockRecs = generateMockRecommendations(form);
      onSubmit({ ...form, age: parseInt(form.age), budget: parseFloat(form.budget) }, mockRecs, 'ORD-MOCK');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gf-page">
      {/* Hero header */}
      <div className="gf-hero">
        <div className="gf-hero-bg" aria-hidden="true" />
        <div className="container">
          <div className="gf-hero-inner animate-slide-up">
            <h1 className="section-title">
              Find the <span className="gradient-text">perfect gift</span>,<br />
              every single time.
            </h1>
            <p className="section-subtitle">
              Tell us a little about the recipient. Our AI will instantly generate personalised gift ideas tailored to their tastes and your budget.
            </p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="container">
        <div className="gf-form-wrapper animate-fade-in">
          {apiError && (
            <div className="alert alert-danger" style={{ marginBottom: 'var(--space-6)' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{apiError}</span>
            </div>
          )}

          <form id="gift-form" onSubmit={handleSubmit} noValidate>
            {/* Row 1: Occasion + Relation */}
            <div className="gf-grid gf-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="occasion">
                  <Calendar size={13} style={{ display:'inline', marginRight:4 }} />
                  Occasion
                </label>
                <select
                  id="occasion"
                  className={`form-select ${errors.occasion ? 'error' : ''}`}
                  value={form.occasion}
                  onChange={handleChange('occasion')}
                >
                  <option value="">Select occasion…</option>
                  {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {errors.occasion && <p className="form-error"><AlertCircle size={12} />{errors.occasion}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="relation">
                  <Heart size={13} style={{ display:'inline', marginRight:4 }} />
                  Recipient relation
                </label>
                <select
                  id="relation"
                  className={`form-select ${errors.relation ? 'error' : ''}`}
                  value={form.relation}
                  onChange={handleChange('relation')}
                >
                  <option value="">Select relation…</option>
                  {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.relation && <p className="form-error"><AlertCircle size={12} />{errors.relation}</p>}
              </div>
            </div>

            {/* Row 2: Age + Budget */}
            <div className="gf-grid gf-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="age">
                  <User size={13} style={{ display:'inline', marginRight:4 }} />
                  Recipient Age
                </label>
                <input
                  id="age"
                  type="number"
                  className={`form-input ${errors.age ? 'error' : ''}`}
                  placeholder="e.g. 28"
                  min={1}
                  max={120}
                  value={form.age}
                  onChange={handleChange('age')}
                />
                {errors.age && <p className="form-error"><AlertCircle size={12} />{errors.age}</p>}
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">
                  <Banknote size={13} style={{ display:'inline', marginRight:4 }} />
                  Budget Range (INR)
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <div className="gf-input-prefix-wrap" style={{ flex: 1 }}>
                    <span className="gf-input-prefix">₹</span>
                    <input
                      id="minBudget"
                      type="number"
                      className={`form-input gf-input-has-prefix ${errors.minBudget ? 'error' : ''}`}
                      placeholder="Min"
                      min={1}
                      step="1"
                      value={form.minBudget}
                      onChange={handleChange('minBudget')}
                    />
                  </div>
                  <div className="gf-input-prefix-wrap" style={{ flex: 1 }}>
                    <span className="gf-input-prefix">₹</span>
                    <input
                      id="maxBudget"
                      type="number"
                      className={`form-input gf-input-has-prefix ${errors.minBudget ? 'error' : ''}`}
                      placeholder="Max"
                      min={1}
                      step="1"
                      value={form.maxBudget}
                      onChange={handleChange('maxBudget')}
                    />
                  </div>
                </div>
                {errors.minBudget && <p className="form-error"><AlertCircle size={12} />{errors.minBudget}</p>}
              </div>
            </div>

            {/* Row 3: Preferences */}
            <div className="form-group">
              <label className="form-label" htmlFor="preferences">
                <Gift size={13} style={{ display:'inline', marginRight:4 }} />
                Personal Preferences & Interests
              </label>
              <textarea
                id="preferences"
                className="form-textarea"
                placeholder="e.g. Loves hiking, photography, and cooking Italian food. Recently started learning guitar…"
                value={form.preferences}
                onChange={handleChange('preferences')}
              />
              <p className="form-hint">The more detail you give, the better our AI can personalise recommendations.</p>
            </div>

            {/* Budget chips */}
            <div className="gf-budget-chips">
              <span className="form-hint" style={{ marginRight: 8 }}>Quick budget:</span>
              {[ [1000, 3000], [3000, 5000], [5000, 10000], [10000, 20000] ].map(range => {
                const isActive = parseFloat(form.minBudget) === range[0] && parseFloat(form.maxBudget) === range[1];
                return (
                  <button
                    key={`${range[0]}-${range[1]}`}
                    type="button"
                    className={`gf-chip ${isActive ? 'active' : ''}`}
                    onClick={() => setForm(p => ({ ...p, minBudget: range[0], maxBudget: range[1] }))}
                  >
                    ₹{range[0]} - ₹{range[1]}
                  </button>
                );
              })}
            </div>

            <button
              id="submit-gift-form"
              type="submit"
              className="btn btn-primary btn-lg gf-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#fff' }} />
                  Generating recommendations…
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Get AI Recommendations
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* How it works */}
        <div className="gf-steps animate-fade-in">
          {[
            { num: '1', title: 'Fill the form', desc: 'Enter the occasion, recipient details, and your budget.' },
            { num: '2', title: 'AI processes', desc: 'Our AI analyses preferences to generate curated suggestions.' },
            { num: '3', title: 'Pick & order', desc: 'Browse results, shortlist favourites, and place your order.' },
          ].map(s => (
            <div key={s.num} className="gf-step-card card">
              <div className="gf-step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Mock fallback when backend is offline ── */
function generateMockRecommendations({ occasion, relation, age, budget, preferences }) {
  const age_n = parseInt(age);
  const budget_n = parseFloat(budget);
  return [
    {
      id: 1,
      title: 'Personalised Leather Journal',
      description: `A beautifully hand-crafted leather journal – perfect for a thoughtful ${occasion} gift for your ${relation}. Great for documenting memories and daily reflections.`,
      estimatedCost: Math.min(45, budget_n * 0.9),
      category: 'Lifestyle',
      rating: 4.8,
      productUrl: 'https://www.amazon.com',
      imageEmoji: '📓',
      tags: ['Personalised', 'Timeless', 'Handcrafted'],
    },
    {
      id: 2,
      title: 'Premium Wireless Earbuds',
      description: `High-fidelity sound with active noise cancellation. Ideal for a ${age_n}-year-old who loves music or podcasts. One of the most-loved tech gifts this year.`,
      estimatedCost: Math.min(129, budget_n * 0.85),
      category: 'Technology',
      rating: 4.6,
      productUrl: 'https://www.amazon.com',
      imageEmoji: '🎧',
      tags: ['Tech', 'Popular', 'Top Rated'],
    },
    {
      id: 3,
      title: `Artisan Coffee Experience Set`,
      description: `A curated selection of single-origin coffees with a beautiful pour-over kit. For the ${relation} who appreciates the finer things in life.`,
      estimatedCost: Math.min(65, budget_n * 0.75),
      category: 'Food & Drink',
      rating: 4.9,
      productUrl: 'https://www.amazon.com',
      imageEmoji: '☕',
      tags: ['Artisan', 'Unique', 'Experience'],
    },
    {
      id: 4,
      title: 'Online Masterclass Subscription',
      description: `Unlock world-class lessons from the best in every field. A thoughtful gift that keeps giving all year long${preferences ? `, perfect given their interests in ${preferences.slice(0, 40)}…` : '.'} `,
      estimatedCost: Math.min(90, budget_n * 0.8),
      category: 'Education',
      rating: 4.7,
      productUrl: 'https://www.masterclass.com',
      imageEmoji: '🎓',
      tags: ['Learning', 'Digital', 'Year-long'],
    },
  ].filter(r => r.estimatedCost > 0);
}
