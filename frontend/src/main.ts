import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideHttpClient } from '@angular/common/http';


bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideHttpClient(), // Add this line for HTTP client support
    ...appConfig.providers
  ]
})
.catch((err) => console.error(err));
