export type ApiId = string;
export type IsoDate = string;
export type IsoDateTime = string;
export interface BackendErrorResponse {
  status: number;
  error: string;
  message: string;
  timestamp: IsoDateTime;
}
