import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { DashboardLayout } from './components/dashboard/dashboard-layout/dashboard-layout';
import { EditableTable } from './components/tables/editable-table/editable-table';
import { Login } from './pages/auth/login/login';
import { UsersList } from './pages/users/users-list/users-list';
import { AccountDetail } from './pages/users/account-detail/account-detail';
import { PlatformUsers } from './pages/users/platform-users/platform-users';
import { Movements } from './pages/movements/movements/movements';
import { HistoryList } from './pages/history/history-list/history-list';

@NgModule({
  declarations: [
    App,
    DashboardLayout,
    EditableTable,
    Login,
    UsersList,
    AccountDetail,
    PlatformUsers,
    Movements,
    HistoryList
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    RouterModule,
    HttpClientModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
