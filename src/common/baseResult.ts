class BaseResult {

  /**
   * HTTP-style status from the DashScope response envelope.
   */
  public status_code = 0;

  /**
   * Server-issued request id for tracing.
   */
  public request_id = '';

  /**
   * Business error code when the call fails.
   */
  public code?: string;

  /**
   * Human-readable error message when the call fails.
   */
  public message?: string;

  constructor(status: number, data?: any) {
    Object.assign(this, {
      status_code: status,
      ...data,
    });
  }
}

export default BaseResult;
