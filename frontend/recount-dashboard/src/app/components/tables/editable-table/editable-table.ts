import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { TableColumn } from '../../../models/api.model';

@Component({
  selector: 'app-editable-table',
  standalone: false,
  templateUrl: './editable-table.html',
  styleUrl: './editable-table.css',
})
export class EditableTable implements OnInit {
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() loading = false;
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Input() canAdd = true;
  @Input() sortable: { [key: string]: (field: string) => void } | null = null;
  @Input() sortBy: string | null = null;
  @Input() sortOrder: 'asc' | 'desc' | null = null;

  @Output() edit = new EventEmitter<{ item: any; index: number }>();
  @Output() delete = new EventEmitter<{ item: any; index: number }>();
  @Output() add = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ item: any; index: number }>();
  @Output() cancel = new EventEmitter<{ item: any; index: number }>();
  @Output() cellClick = new EventEmitter<{ item: any; column: string; index: number }>();

  editingIndex: number | null = null;
  editedItem: any = null;

  ngOnInit(): void {
    // Initialize component
  }

  startEdit(item: any, index: number): void {
    if (!this.canEdit) return;

    this.editingIndex = index;
    this.editedItem = { ...item };
  }

  saveEdit(): void {
    if (this.editingIndex !== null && this.editedItem) {
      this.save.emit({ item: this.editedItem, index: this.editingIndex });
      this.cancelEdit();
    }
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.editedItem = null;
  }

  confirmDelete(item: any, index: number): void {
    this.delete.emit({ item, index });
  }

  addNew(): void {
    this.add.emit();
  }

  getColumnValue(item: any, column: TableColumn): any {
    if (!item) return '';
    return item[column.key];
  }

  setColumnValue(value: any, column: TableColumn): void {
    if (this.editedItem && column.key) {
      this.editedItem[column.key] = value;
    }
  }

  formatValue(value: any, column: TableColumn): string {
    if (value == null) return '';

    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'USD'
        }).format(Number(value));
      case 'date':
        const date = new Date(value);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
        const displayHours = date.getHours() % 12 || 12;
        return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`;
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  }

  isEditing(index: number): boolean {
    return this.editingIndex === index;
  }

  trackByFn(index: number, item: any): any {
    return item?._id || item?.id || index;
  }

  onHeaderClick(column: TableColumn): void {
    if (this.sortable && column.key && this.sortable[column.key as string]) {
      this.sortable[column.key as string](column.key as string);
    }
  }

  isSortable(column: TableColumn): boolean {
    return this.sortable !== null && column.key !== undefined && this.sortable[column.key as string] !== undefined;
  }

  getSortIndicator(column: TableColumn): string {
    if (!this.isSortable(column) || this.sortBy !== column.key) {
      return '';
    }
    return this.sortOrder === 'asc' ? '↑' : '↓';
  }

  onCellClick(item: any, column: TableColumn, index: number): void {
    if (!this.isEditing(index)) {
      this.cellClick.emit({ item, column: String(column.key), index });
    }
  }
}
