import { Routes } from '@angular/router';
import { DynamicFormPageComponent } from './dynamic-form-page/dynamic-form-page.component';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
    { path: '', component: DashboardComponent }, // Default route
    { path: 'dynamic-form', component: DynamicFormPageComponent }
];
