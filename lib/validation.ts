// Form validation utilities

export type ValidationResult = {
  valid: boolean
  error?: string
}

/**
 * Validate a required field
 */
export function validateRequired(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value || value.trim() === "") {
    return { valid: false, error: `${fieldName} is required` }
  }
  return { valid: true }
}

/**
 * Validate minimum length
 */
export function validateMinLength(value: string, minLength: number, fieldName: string): ValidationResult {
  if (value.trim().length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` }
  }
  return { valid: true }
}

/**
 * Validate a name field (required, min 2 chars, only letters/spaces)
 */
export function validateName(value: string | null | undefined, fieldName: string = "Name"): ValidationResult {
  if (!value || value.trim() === "") {
    return { valid: false, error: `${fieldName} is required` }
  }

  const trimmed = value.trim()

  if (trimmed.length < 2) {
    return { valid: false, error: `${fieldName} must be at least 2 characters` }
  }

  // Allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
    return { valid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` }
  }

  return { valid: true }
}

/**
 * Validate a title field (required, min 3 chars)
 */
export function validateTitle(value: string | null | undefined, fieldName: string = "Title"): ValidationResult {
  if (!value || value.trim() === "") {
    return { valid: false, error: `${fieldName} is required` }
  }

  if (value.trim().length < 3) {
    return { valid: false, error: `${fieldName} must be at least 3 characters` }
  }

  return { valid: true }
}

/**
 * Validate that a date is in the future (or today)
 */
export function validateFutureDate(value: string | null | undefined, fieldName: string = "Date"): ValidationResult {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` }
  }

  const date = new Date(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isNaN(date.getTime())) {
    return { valid: false, error: `${fieldName} is not a valid date` }
  }

  if (date < today) {
    return { valid: false, error: `${fieldName} cannot be in the past` }
  }

  return { valid: true }
}

/**
 * Validate grade selection
 */
export function validateGrade(value: string | null | undefined): ValidationResult {
  if (!value || value === "") {
    return { valid: false, error: "Please select a grade level" }
  }
  return { valid: true }
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  for (const result of results) {
    if (!result.valid) {
      return result
    }
  }
  return { valid: true }
}
