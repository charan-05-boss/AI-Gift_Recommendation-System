/**
 * Server-side Validation Service.
 *
 * Validates incoming request payloads for required fields,
 * types, and business rules. Returns an array of error strings.
 */

const VALID_OCCASIONS = [
  'Birthday', 'Anniversary', 'Wedding', 'Graduation', 'Baby Shower',
  'Christmas', "Valentine's Day", "Mother's Day", "Father's Day",
  "New Year's", 'Retirement', 'Housewarming', 'Get Well Soon',
  'Thank You', 'Other'
];

const VALID_RELATIONS = [
  'Partner/Spouse', 'Parent', 'Sibling', 'Child', 'Friend',
  'Colleague', 'Boss', 'Teacher/Mentor', 'Grandparent',
  'Cousin', 'Neighbour', 'Other'
];

const VALID_STATUSES = ['Pending', 'Processing', 'Delivered', 'Cancelled'];

/**
 * Validate the payload for POST /api/create.
 * @param {Object} body - Request body.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCreateInput(body) {
  const errors = [];

  // Occasion
  if (!body.occasion || typeof body.occasion !== 'string' || body.occasion.trim() === '') {
    errors.push('Occasion is required.');
  } else if (!VALID_OCCASIONS.includes(body.occasion.trim())) {
    errors.push(`Invalid occasion. Must be one of: ${VALID_OCCASIONS.join(', ')}.`);
  }

  // Relation
  if (!body.relation || typeof body.relation !== 'string' || body.relation.trim() === '') {
    errors.push('Recipient relation is required.');
  } else if (!VALID_RELATIONS.includes(body.relation.trim())) {
    errors.push(`Invalid relation. Must be one of: ${VALID_RELATIONS.join(', ')}.`);
  }

  // Age
  const age = Number(body.age);
  if (body.age === undefined || body.age === null || body.age === '') {
    errors.push('Recipient age is required.');
  } else if (isNaN(age) || !Number.isInteger(age) || age < 1 || age > 120) {
    errors.push('Age must be an integer between 1 and 120.');
  }

  // Budget Range
  const minBudget = Number(body.minBudget);
  const maxBudget = Number(body.maxBudget);
  if (body.minBudget === undefined || body.minBudget === null || body.minBudget === '' ||
      body.maxBudget === undefined || body.maxBudget === null || body.maxBudget === '') {
    errors.push('Minimum and Maximum budget are required.');
  } else if (isNaN(minBudget) || isNaN(maxBudget) || minBudget <= 0) {
    errors.push('Budgets must be positive numbers greater than 0.');
  } else if (maxBudget < minBudget) {
    errors.push('Maximum budget cannot be less than Minimum budget.');
  } else if (maxBudget > 10000000) {
    errors.push('Budget cannot exceed ₹10,000,000.');
  }

  // Preferences (optional, but if provided must be a string)
  if (body.preferences !== undefined && body.preferences !== null && typeof body.preferences !== 'string') {
    errors.push('Preferences must be a text string.');
  }

  // Customer name (optional)
  if (body.customerName !== undefined && typeof body.customerName !== 'string') {
    errors.push('Customer name must be a text string.');
  }

  // Recipient name (optional)
  if (body.recipientName !== undefined && typeof body.recipientName !== 'string') {
    errors.push('Recipient name must be a text string.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate status transition.
 * @param {string} status - Target status.
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateStatus(status) {
  if (!status || !VALID_STATUSES.includes(status)) {
    return { valid: false, error: `Status must be one of: ${VALID_STATUSES.join(', ')}.` };
  }
  return { valid: true, error: null };
}

module.exports = {
  validateCreateInput,
  validateStatus,
  VALID_OCCASIONS,
  VALID_RELATIONS,
  VALID_STATUSES,
};
