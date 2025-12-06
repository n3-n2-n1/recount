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

  @Output() edit = new EventEmitter<{ item: any; index: number }>();
  @Output() delete = new EventEmitter<{ item: any; index: number }>();
  @Output() add = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ item: any; index: number }>();
  @Output() cancel = new EventEmitter<{ item: any; index: number }>();

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
    if (confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
      this.delete.emit({ item, index });
    }
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
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(Number(value));
      case 'date':
        return new Date(value).toLocaleDateString();
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
    return index;
  }
}
