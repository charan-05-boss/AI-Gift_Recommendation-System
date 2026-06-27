const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/GiftForm.jsx', 'utf8');

// 1. Initial State
content = content.replace(
  "budget: '',",
  "minBudget: '',\n    maxBudget: '',"
);

// 2. Validation
content = content.replace(
  "if (!form.budget || isNaN(form.budget) || form.budget < 1)\n      e.budget = 'Please enter a budget greater than $0.';",
  "if (!form.minBudget || isNaN(form.minBudget) || form.minBudget < 1 || !form.maxBudget || isNaN(form.maxBudget) || form.maxBudget < 1)\n      e.minBudget = 'Please enter valid minimum and maximum budgets.';\n    else if (parseFloat(form.maxBudget) < parseFloat(form.minBudget))\n      e.minBudget = 'Max budget cannot be less than min budget.';"
);

// 3. Payload
content = content.replace(
  "budget: parseFloat(form.budget),",
  "minBudget: parseFloat(form.minBudget),\n        maxBudget: parseFloat(form.maxBudget),"
);

// 4. Form inputs
const oldInput = `<div className="form-group">
                <label className="form-label" htmlFor="budget">
                  <Banknote size={13} style={{ display:'inline', marginRight:4 }} />
                  Budget (USD)
                </label>
                <div className="gf-input-prefix-wrap">
                  <span className="gf-input-prefix">$</span>
                  <input
                    id="budget"
                    type="number"
                    className={\`form-input gf-input-has-prefix \${errors.budget ? 'error' : ''}\`}
                    placeholder="0.00"
                    min={1}
                    step="0.01"
                    value={form.budget}
                    onChange={handleChange('budget')}
                  />
                </div>
                {errors.budget && <p className="form-error"><AlertCircle size={12} />{errors.budget}</p>}
              </div>`;

const newInput = `<div className="form-group" style={{ gridColumn: 'span 1' }}>
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
                      className={\`form-input gf-input-has-prefix \${errors.minBudget ? 'error' : ''}\`}
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
                      className={\`form-input gf-input-has-prefix \${errors.minBudget ? 'error' : ''}\`}
                      placeholder="Max"
                      min={1}
                      step="1"
                      value={form.maxBudget}
                      onChange={handleChange('maxBudget')}
                    />
                  </div>
                </div>
                {errors.minBudget && <p className="form-error"><AlertCircle size={12} />{errors.minBudget}</p>}
              </div>`;

content = content.replace(oldInput, newInput);

// 5. Chips
const oldChips = `<div className="gf-budget-chips">
              <span className="form-hint" style={{ marginRight: 8 }}>Quick budget:</span>
              {[25, 50, 100, 200, 500].map(b => (
                <button
                  key={b}
                  type="button"
                  className={\`gf-chip \${parseFloat(form.budget) === b ? 'active' : ''}\`}
                  onClick={() => setForm(p => ({ ...p, budget: b }))}
                >
                  \${b}
                </button>
              ))}
            </div>`;

const newChips = `<div className="gf-budget-chips">
              <span className="form-hint" style={{ marginRight: 8 }}>Quick budget:</span>
              {[ [1000, 3000], [3000, 5000], [5000, 10000], [10000, 20000] ].map(range => {
                const isActive = parseFloat(form.minBudget) === range[0] && parseFloat(form.maxBudget) === range[1];
                return (
                  <button
                    key={\`\${range[0]}-\${range[1]}\`}
                    type="button"
                    className={\`gf-chip \${isActive ? 'active' : ''}\`}
                    onClick={() => setForm(p => ({ ...p, minBudget: range[0], maxBudget: range[1] }))}
                  >
                    ₹{range[0]} - ₹{range[1]}
                  </button>
                );
              })}
            </div>`;

content = content.replace(oldChips, newChips);

// 6. Mock data destructure & cost
content = content.replace(
  "const { occasion, relation, age, preferences, budget } = form;",
  "const { occasion, relation, age, preferences, minBudget } = form;"
);
content = content.replace(/estimatedCost: parseFloat\(budget\)/g, "estimatedCost: parseFloat(minBudget)");

fs.writeFileSync('frontend/src/pages/GiftForm.jsx', content, 'utf8');
console.log('GiftForm.jsx updated!');
