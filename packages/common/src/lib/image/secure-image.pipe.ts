import { Pipe, PipeTransform } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Cacheable } from 'ngx-cacheable';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Pipe({
  name: 'secureImage'
})
export class SecureImagePipe implements PipeTransform {
  constructor(private http: HttpClient) {}

  @Cacheable({
    maxCacheCount: 20
  })
  transform(url: string): Observable<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'text/plain',
      activityInterceptor: 'false'
    });

    return this.http
      .get(url, {
        headers,
        responseType: 'blob'
      })
      .pipe(
        switchMap((blob) => {
          return new Observable((observer) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              observer.next(reader.result);
              observer.complete();
            };
          });
        })
      ) as Observable<string>;
  }
}
