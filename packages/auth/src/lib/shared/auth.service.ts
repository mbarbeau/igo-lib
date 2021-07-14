import { Injectable, Optional } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { globalCacheBusterNotifier } from 'ngx-cacheable';

import { ConfigService, LanguageService, MessageService } from '@igo2/core';
import { Base64 } from '@igo2/utils';

import { User, IInfosUser } from './auth.interface';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public authenticate$ = new BehaviorSubject<boolean>(undefined);
  public logged$ = new BehaviorSubject<boolean>(undefined);
  public redirectUrl: string;
  private anonymous = false;

  get hasAuthService() {
    return this.config.getConfig('auth.url') !== undefined;
  }

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private config: ConfigService,
    private languageService: LanguageService,
    private messageService: MessageService,
    @Optional() private router: Router
  ) {
    this.authenticate$.next(this.authenticated);
    this.authenticate$.subscribe((authenticated) => {
      this.logged$.next(authenticated);
      globalCacheBusterNotifier.next();
    });
  }

  login(username: string, password: string): Observable<void> {
    const myHeader = new HttpHeaders({ 'Content-Type': 'application/json' });

    const body = {
      username,
      password: this.encodePassword(password)
    };

    return this.loginCall(body, myHeader);
  }

  loginWithToken(token: string, type: string, infosUser?: IInfosUser): Observable<void> {
    const myHeader = new HttpHeaders({ 'Content-Type': 'application/json' });

    const body = {
      token,
      typeConnection: type,
      infosUser
    };

    return this.loginCall(body, myHeader);
  }

  loginAnonymous(): Observable<boolean> {
    this.anonymous = true;
    this.logged$.next(true);
    return of(true);
  }

  refresh(): Observable<void> {
    const url = this.config.getConfig('auth.url');
    return this.http.post(`${url}/refresh`, {}).pipe(
      tap((data: any) => {
        this.tokenService.set(data.token);
      }),
      catchError((err) => {
        err.error.caught = true;
        throw err;
      })
    );
  }

  logout(): Observable<boolean> {
    this.anonymous = false;
    this.tokenService.remove();
    this.authenticate$.next(false);
    return of(true);
  }

  isAuthenticated(): boolean {
    return !this.tokenService.isExpired();
  }

  getToken(): string {
    return this.tokenService.get();
  }

  decodeToken() {
    if (this.isAuthenticated()) {
      return this.tokenService.decode();
    }
    return false;
  }

  goToRedirectUrl() {
    if (!this.router) {
      return;
    }
    const redirectUrl = this.redirectUrl || this.router.url;

    const options = this.config.getConfig('auth') || {};
    if (redirectUrl === options.loginRoute) {
      const homeRoute = options.homeRoute || '/';
      this.router.navigateByUrl(homeRoute);
    } else if (redirectUrl) {
      this.router.navigateByUrl(redirectUrl);
    }
  }

  getUserInfo(): Observable<User> {
    const url = this.config.getConfig('auth.url') + '/info';
    return this.http.get<User>(url);
  }

  getProfils(): Observable<{ profils: string[] }> {
    const url = this.config.getConfig('auth.url');
    return this.http.get<{ profils: string[] }>(`${url}/profils`);
  }

  updateUser(user: User): Observable<User> {
    const url = this.config.getConfig('auth.url');
    return this.http.patch<User>(url, user);
  }

  private encodePassword(password: string) {
    return Base64.encode(password);
  }

  // authenticated or anonymous
  get logged(): boolean {
    return this.authenticated || this.isAnonymous;
  }

  get isAnonymous(): boolean {
    return this.anonymous;
  }

  get authenticated(): boolean {
    return this.isAuthenticated();
  }

  get isAdmin(): boolean {
    const token = this.decodeToken();
    if (token && token.user && token.user.isAdmin) {
      return true;
    }
    return false;
  }

  private loginCall(body, headers) {
    const url = this.config.getConfig('auth.url');
    return this.http.post(`${url}/login`, body, { headers }).pipe(
      tap((data: any) => {
        this.tokenService.set(data.token);
        const tokenDecoded = this.decodeToken();
        if (tokenDecoded && tokenDecoded.user) {
          if (tokenDecoded.user.locale) {
            this.languageService.setLanguage(tokenDecoded.user.locale);
          }
          if (tokenDecoded.user.isExpired) {
            this.languageService.translate
              .get('igo.auth.error.Password expired')
              .subscribe((expiredAlert) =>
                this.messageService.alert(expiredAlert)
              );
          }
        }
        this.authenticate$.next(true);
      }),
      catchError((err) => {
        err.error.caught = true;
        throw err;
      })
    );
  }
}
