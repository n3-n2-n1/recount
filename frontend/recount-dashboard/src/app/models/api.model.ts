export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  transactions: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'select' | 'boolean' | 'custom';
  editable?: boolean;
  options?: { value: any; label: string }[];
  required?: boolean;
  formatter?: (value: any, item: T) => string;
  customRenderer?: (value: any, item: T) => any;
  width?: string;
}