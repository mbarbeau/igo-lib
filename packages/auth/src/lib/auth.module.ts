import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MsalModule } from '@azure/msal-angular';

import { StorageService, IgoLanguageModule } from '@igo2/core';

import { AuthStorageService } from './shared/storage.service';
import { ProtectedDirective } from './shared/protected.directive';
import { AuthInterceptor } from './shared/auth.interceptor';
import { provideAuthMicrosoft } from './shared/auth-microsoft.provider';

import { AuthInternComponent } from './auth-form/auth-intern.component';
import { AuthFormComponent } from './auth-form/auth-form.component';
import { AuthGoogleComponent } from './auth-form/auth-google.component';
import { AuthFacebookComponent } from './auth-form/auth-facebook.component';
import { AuthMicrosoftComponent } from './auth-form/auth-microsoft.component';
import { AuthMicrosoftb2cComponent } from './auth-form/auth-microsoftb2c.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    IgoLanguageModule,
    MsalModule
  ],
  declarations: [
    AuthFormComponent,
    AuthGoogleComponent,
    AuthInternComponent,
    AuthFacebookComponent,
    AuthMicrosoftComponent,
    AuthMicrosoftb2cComponent,
    ProtectedDirective
  ],
  exports: [AuthFormComponent, ProtectedDirective]
})
export class IgoAuthModule {
  static forRoot(): ModuleWithProviders<IgoAuthModule> {
    return {
      ngModule: IgoAuthModule,
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        },
        {
          provide: StorageService,
          useClass: AuthStorageService
        },
        ...provideAuthMicrosoft('add'),
        ...provideAuthMicrosoft('b2c')
      ]
    };
  }
}
