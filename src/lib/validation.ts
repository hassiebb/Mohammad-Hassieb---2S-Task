/**
 * Validation utilities for Odoo Sales forms
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateUsername(username: string): ValidationResult {
  const trimmed = username.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Username is required' };
  }
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }
  return { isValid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 4) {
    return { isValid: false, error: 'Password must be at least 4 characters' };
  }
  return { isValid: true };
}

export function validatePhoneNumber(phone: string): ValidationResult {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Phone number cannot be empty' };
  }
  
  // Standard international phone validation: supports +, digits, spaces, dashes, parentheses
  // Must contain at least 6 digits and no letters
  const digitCount = (trimmed.match(/\d/g) || []).length;
  if (digitCount < 6) {
    return { isValid: false, error: 'Phone number must have at least 6 digits' };
  }
  
  // Must only consist of valid phone characters (+, digits, spaces, hyphens, periods, parentheses)
  const validCharsRegex = /^[+]?[\d\s\-().]{6,25}$/;
  if (!validCharsRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid phone format (e.g. +1 (555) 019-9000)' };
  }

  return { isValid: true };
}
