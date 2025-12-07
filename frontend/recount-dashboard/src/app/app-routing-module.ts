import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { Login } from './pages/auth/login/login';
import { UsersList } from './pages/users/users-list/users-list';
import { AccountDetail } from './pages/users/account-detail/account-detail';
import { PlatformUsers } from './pages/users/platform-users/platform-users';
import { Movements } from './pages/movements/movements/movements';
import { HistoryList } from './pages/history/history-list/history-list';
import { Settings } from './pages/settings/settings';

const routes: Routes = [
  // Auth routes
  {
    path: 'auth/login',
    component: Login
  },

  // Dashboard routes (protected)

  // Accounts management
  {
    path: 'users',
    component: UsersList,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['super_admin', 'reviewer'] }
  },
  {
    path: 'account/:id',
    component: AccountDetail,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['super_admin', 'reviewer'] }
  },
  {
    path: 'movements',
    component: Movements,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['super_admin', 'reviewer'] }
  },
  {
    path: 'history',
    component: HistoryList,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['super_admin', 'reviewer'] }
  },
  {
    path: 'team',
    component: PlatformUsers,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['super_admin'] }
  },
  {
    path: 'settings',
    component: Settings,
    canActivate: [AuthGuard]
  },


  // Default redirect
  {
    path: '',
    redirectTo: '/movements',
    pathMatch: 'full'
  },

  // Wildcard route
  {
    path: '**',
    redirectTo: '/movements'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    onSameUrlNavigation: 'reload'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
