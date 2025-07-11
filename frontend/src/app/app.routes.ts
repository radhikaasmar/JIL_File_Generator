import { Routes } from '@angular/router';
import { DynamicFormPageComponent } from './dynamic-form-page/dynamic-form-page.component';

export const routes: Routes = [
    { path: '', redirectTo: 'dynamic-form', pathMatch: 'full' }, // Redirect root to dynamic-form
    { path: 'dynamic-form', component: DynamicFormPageComponent },
];
