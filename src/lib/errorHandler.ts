/**
 * Safe error handler that prevents database schema details from leaking to the client.
 * Maps common database error codes to user-friendly messages.
 */
export function getSafeErrorMessage(error: any, fallbackAction?: string): string {
  // Log full error for debugging (visible in console but not to end users)
  console.error('Operation error:', error);

  // Handle Supabase/PostgreSQL error codes
  if (error?.code) {
    switch (error.code) {
      case '23505':
        return 'This record already exists.';
      case '23503':
        return 'Cannot complete this operation due to related records.';
      case '23502':
        return 'Required fields are missing. Please fill in all required fields.';
      case '42501':
        return 'You do not have permission to perform this action.';
      case '23514':
        return 'The data provided does not meet the required constraints.';
      case 'PGRST301':
        return 'You do not have permission to perform this action.';
      default:
        break;
    }
  }

  // Handle common error message patterns without exposing details
  const msg = error?.message?.toLowerCase?.() || '';
  if (msg.includes('permission denied') || msg.includes('row-level security')) {
    return 'You do not have permission to perform this action.';
  }
  if (msg.includes('unique constraint') || msg.includes('duplicate key')) {
    return 'This record already exists.';
  }
  if (msg.includes('not-null constraint') || msg.includes('null value')) {
    return 'Required fields are missing. Please fill in all required fields.';
  }
  if (msg.includes('foreign key constraint')) {
    return 'Cannot complete this operation due to related records.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
    return 'A network error occurred. Please check your connection and try again.';
  }
  if (msg.includes('non-2xx status code')) {
    return fallbackAction
      ? `${fallbackAction} failed. Please try again or contact support.`
      : 'The operation failed. Please try again or contact support.';
  }

  return fallbackAction
    ? `${fallbackAction} failed. Please try again or contact support.`
    : 'An error occurred. Please try again or contact support.';
}
