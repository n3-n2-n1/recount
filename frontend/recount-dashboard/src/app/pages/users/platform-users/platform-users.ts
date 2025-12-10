import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../services/auth.service';

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'reviewer' | 'viewer';
  createdAt: string;
}

@Component({
  selector: 'app-platform-users',
  standalone: false,
  templateUrl: './platform-users.html',
  styleUrl: './platform-users.css',
})
export class PlatformUsers implements OnInit {
  users: PlatformUser[] = [];
  loading = true; // Start as true
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  creatingUser = false; // Separate flag for modal loading
  updatingUser = false;
  deletingUser = false;
  selectedUser: PlatformUser | null = null;
  
  // Form data
  newUser = {
    email: '',
    password: '',
    name: '',
    role: '' as any
  };

  editUser = {
    email: '',
    password: '',
    name: '',
    role: '' as any
  };
  
  successMessage = '';
  errorMessage = '';
  currentUser: any = null;

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🎬 PlatformUsers component initialized');
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.loadUsers();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showCreateModal && !this.creatingUser) {
      this.closeCreateModal();
    }
    if (this.showEditModal && !this.updatingUser) {
      this.closeEditModal();
    }
    if (this.showDeleteModal && !this.deletingUser) {
      this.closeDeleteModal();
    }
  }

  canCreateUsers(): boolean {
    return this.currentUser?.role === 'super_admin';
  }

  loadUsers(): void {
    this.loading = true;
    console.log('📋 Loading users...');
    
    this.authService.getAllUsers().subscribe({
      next: (response: any) => {
        console.log('✅ Users loaded:', response.users?.length || 0);
        this.users = response.users || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading users:', error);
        this.users = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.clearForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeCreateModal(): void {
    if (this.creatingUser) return; // Don't close if creating user
    
    console.log('❌ Closing modal');
    this.showCreateModal = false;
    this.errorMessage = '';
    this.clearForm();
  }

  clearForm(): void {
    this.newUser = {
      email: '',
      password: '',
      name: '',
      role: '' as any
    };
  }

  createUser(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    this.creatingUser = true;
    this.errorMessage = '';
    const userName = this.newUser.name;

    console.log('🔄 Creating user:', userName);

    this.authService.register(this.newUser).subscribe({
      next: (response) => {
        console.log('✅ User created successfully:', response);
        
        // Reset creating flag
        this.creatingUser = false;
        
        // Close modal
        this.showCreateModal = false;
        this.clearForm();
        
        // Show success message
        this.successMessage = `Usuario ${userName} creado exitosamente!`;
        
        // Reload users list (this will set loading = true)
        this.loadUsers();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        console.error('❌ Error creating user:', error);
        
        // Better error messages
        if (error.message.includes('already exists')) {
          this.errorMessage = `This email is already registered. Please use a different email.`;
        } else if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
          this.errorMessage = 'You do not have permission to create users.';
        } else {
          this.errorMessage = error.message || 'Error creating user. Please try again.';
        }
        
        this.creatingUser = false;
      }
    });
  }

  isFormValid(): boolean {
    // Check all required fields
    if (!this.newUser.name || !this.newUser.email || !this.newUser.password || !this.newUser.role) {
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newUser.email)) {
      return false;
    }
    
    // Validate password length
    if (this.newUser.password.length < 6) {
      return false;
    }
    
    return true;
  }

  getValidationError(): string {
    if (!this.newUser.name) return 'Name is required';
    if (!this.newUser.email) return 'Email is required';
    if (this.newUser.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newUser.email)) {
      return 'Invalid email format';
    }
    if (!this.newUser.password) return 'Password is required';
    if (this.newUser.password && this.newUser.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (!this.newUser.role) return 'Role is required';
    return '';
  }

  getRoleLabel(role: string): string {
    const labels: any = {
      'super_admin': 'Super Admin',
      'reviewer': 'Reviewer',
      'viewer': 'Viewer'
    };
    return labels[role] || role;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  openEditModal(user: PlatformUser): void {
    this.selectedUser = user;
    this.editUser = {
      email: user.email,
      password: '', // Don't pre-fill password
      name: user.name,
      role: user.role
    };
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeEditModal(): void {
    if (this.updatingUser) return;
    
    this.showEditModal = false;
    this.selectedUser = null;
    this.errorMessage = '';
    this.editUser = {
      email: '',
      password: '',
      name: '',
      role: '' as any
    };
  }

  updateUserData(): void {
    if (!this.selectedUser) return;

    if (!this.editUser.name || !this.editUser.email || !this.editUser.role) {
      this.errorMessage = 'Por favor, complete todos los campos requeridos';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.editUser.email)) {
      this.errorMessage = 'Formato de email inválido';
      return;
    }

    // Validate password if provided
    if (this.editUser.password && this.editUser.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.updatingUser = true;
    this.errorMessage = '';

    const updateData: any = {
      email: this.editUser.email,
      name: this.editUser.name,
      role: this.editUser.role
    };

    // Only include password if it was changed
    if (this.editUser.password) {
      updateData.password = this.editUser.password;
    }

    this.authService.updateUser(this.selectedUser.id, updateData).subscribe({
      next: (response) => {
        this.updatingUser = false;
        this.showEditModal = false;
        this.successMessage = 'Usuario actualizado exitosamente!';
        this.loadUsers();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        this.updatingUser = false;
        
        if (error.message.includes('already in use') || error.message.includes('already exists')) {
          this.errorMessage = 'Este email ya está en uso';
        } else {
          this.errorMessage = error.message || 'Error al actualizar usuario';
        }
      }
    });
  }

  openDeleteModal(user: PlatformUser): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeDeleteModal(): void {
    if (this.deletingUser) return;
    
    this.showDeleteModal = false;
    this.selectedUser = null;
    this.errorMessage = '';
  }

  confirmDelete(): void {
    if (!this.selectedUser) return;

    this.deletingUser = true;
    this.errorMessage = '';

    this.authService.deleteUser(this.selectedUser.id).subscribe({
      next: (response) => {
        this.deletingUser = false;
        this.showDeleteModal = false;
        this.successMessage = 'Usuario eliminado exitosamente!';
        this.loadUsers();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        this.deletingUser = false;
        
        if (error.message.includes('Cannot delete your own account')) {
          this.errorMessage = 'No puedes eliminar tu propia cuenta';
        } else {
          this.errorMessage = error.message || 'Error al eliminar usuario';
        }
      }
    });
  }

  isEditFormValid(): boolean {
    if (!this.editUser.name || !this.editUser.email || !this.editUser.role) {
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.editUser.email)) {
      return false;
    }
    
    if (this.editUser.password && this.editUser.password.length < 6) {
      return false;
    }
    
    return true;
  }

  isCurrentUser(user: PlatformUser): boolean {
    return this.currentUser?.id === user.id;
  }
}
