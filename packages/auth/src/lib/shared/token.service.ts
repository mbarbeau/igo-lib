import { Injectable, Injector } from '@angular/core';
import jwtDecode from 'jwt-decode';

import { ConfigService } from '@igo2/core';
import { AuthOptions } from './auth.interface';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private options: AuthOptions;

  constructor(private injector: Injector) {}

  set(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  remove() {
    localStorage.removeItem(this.tokenKey);
  }

  get(): string {
    return localStorage.getItem(this.tokenKey);
  }

  decode() {
    const token = this.get();
    if (!token) {
      return;
    }
    return jwtDecode(token);
  }

  isExpired() {
    const jwt = this.decode();
    const currentTime = new Date().getTime() / 1000;
    if (jwt && currentTime < jwt.exp) {
      return false;
    }
    return true;
  }

  private get tokenKey() {
    const config = this.injector.get<ConfigService>(ConfigService);
    this.options = config.getConfig('auth') || {};
    return this.options.tokenKey;
  }
}
