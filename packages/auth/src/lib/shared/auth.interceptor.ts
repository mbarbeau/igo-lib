import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Md5 } from 'ts-md5';

import { ConfigService } from '@igo2/core';
import { TokenService } from './token.service';
import { WithCredentialsOptions } from './auth.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthInterceptor implements HttpInterceptor {
  private refreshInProgress = false;

  private get trustHosts() {
    const trustHosts = this.config.getConfig('auth.trustHosts') || [];
    trustHosts.push(window.location.hostname);
    return trustHosts;
  }

  private get hostsWithCredentials(): WithCredentialsOptions[] {
    return this.config.getConfig('auth.hostsWithCredentials') || [];
  }

  constructor(
    private config: ConfigService,
    private tokenService: TokenService,
    private http: HttpClient
  ) {}

  intercept(
    originalReq: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const withCredentials = this.handleHostsWithCredentials(originalReq.url);
    let req = originalReq.clone();
    if (withCredentials) {
      req = originalReq.clone({
        withCredentials
      });
    }
    this.refreshToken();
    const token = this.tokenService.get();
    const element = document.createElement('a');
    element.href = req.url;
    if (element.host === '') {
      element.href = element.href; // FIX IE11, DO NOT REMOVE
    }

    if (!token || this.trustHosts.indexOf(element.hostname) === -1) {
      return next.handle(req);
    }

    const authHeader = `Bearer ${token}`;
    let authReq = req.clone({
      headers: req.headers.set('Authorization', authHeader)
    });

    const tokenDecoded: any = this.tokenService.decode();
    if (
      authReq.params.get('_i') === 'true' &&
      tokenDecoded &&
      tokenDecoded.user &&
      tokenDecoded.user.sourceId
    ) {
      const hashUser = Md5.hashStr(tokenDecoded.user.sourceId) as string;
      authReq = authReq.clone({
        params: authReq.params.set('_i', hashUser)
      });
    } else if (authReq.params.get('_i') === 'true') {
      authReq = authReq.clone({
        params: authReq.params.delete('_i')
      });
    }

    return next.handle(authReq);
  }

  interceptXhr(xhr, url: string): boolean {
    const withCredentials = this.handleHostsWithCredentials(url);
    if (withCredentials) {
       xhr.withCredentials = withCredentials;
       return true;
    }

    this.refreshToken();
    const element = document.createElement('a');
    element.href = url;

    const token = this.tokenService.get();
    if (!token || this.trustHosts.indexOf(element.hostname) === -1) {
      return false;
    }
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    return true;
  }

  private handleHostsWithCredentials(reqUrl: string) {
    let withCredentials = false;
    for (const hostWithCredentials of this.hostsWithCredentials) {
      const domainRegex = new RegExp(hostWithCredentials.domainRegFilters);
      if (domainRegex.test(reqUrl)) {
        withCredentials = hostWithCredentials.withCredentials !== undefined ? hostWithCredentials.withCredentials : undefined;
        break;
      }
    }
    return withCredentials;
  }

  refreshToken() {
    const jwt = this.tokenService.decode();
    const currentTime = new Date().getTime() / 1000;

    if (
      !this.refreshInProgress &&
      jwt &&
      currentTime < jwt.exp &&
      currentTime > jwt.exp - 1800
    ) {
      this.refreshInProgress = true;

      const url = this.config.getConfig('auth.url');
      return this.http.post(`${url}/refresh`, {}).subscribe(
        (data: any) => {
          this.tokenService.set(data.token);
          this.refreshInProgress = false;
        },
        err => {
          err.error.caught = true;
          return err;
        }
      );
    }
  }
}
