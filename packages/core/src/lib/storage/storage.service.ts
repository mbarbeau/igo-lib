import { Injectable } from '@angular/core';

import { ConfigService } from '../config/config.service';
import { StorageScope, StorageOptions, StorageServiceEvent, StorageServiceEventEnum } from './storage.interface';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  protected options: StorageOptions;

  public storageChange$: BehaviorSubject<StorageServiceEvent> = new BehaviorSubject(undefined);

  constructor(private config: ConfigService) {
    this.options = this.config.getConfig('storage') || { key: 'igo' };
  }
  /**
   * Use to get the data found in storage file
   */
  get(key: string, scope?: StorageScope): string | object | boolean | number {
    let value: any;

    if (!scope || scope === StorageScope.SESSION) {
      value = sessionStorage.getItem(`${this.options.key}.${key}`);
    }

    if (scope === StorageScope.LOCAL || (!value && !scope)) {
      value = localStorage.getItem(`${this.options.key}.${key}`);
    }

    if (value) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value;
      }
    }

    return value;
  }

  set(
    key: string,
    value: string | object | boolean | number,
    scope: StorageScope = StorageScope.LOCAL
  ) {
    const previousValue = this.get(key, scope);
    if (scope === StorageScope.SESSION) {
      sessionStorage.setItem(
        `${this.options.key}.${key}`,
        JSON.stringify(value)
      );
    } else {
      localStorage.setItem(`${this.options.key}.${key}`, JSON.stringify(value));
    }
    const currentValue = this.get(key, scope);

    if (currentValue !== previousValue) {
      this.storageChange$.next({
        key, scope,
        event: previousValue !== undefined ? StorageServiceEventEnum.MODIFIED : StorageServiceEventEnum.ADDED,
        previousValue,
        currentValue
      });
    }
  }

  remove(key: string, scope: StorageScope = StorageScope.LOCAL) {
    const previousValue = this.get(key, scope);
    if (scope === StorageScope.SESSION) {
      sessionStorage.removeItem(`${this.options.key}.${key}`);
    } else {
      localStorage.removeItem(`${this.options.key}.${key}`);
    }
    this.storageChange$.next({key, scope, event: StorageServiceEventEnum.REMOVED, previousValue });
  }

  clear(scope: StorageScope = StorageScope.LOCAL) {
    if (scope === StorageScope.SESSION) {
      sessionStorage.clear();
    } else {
      localStorage.clear();
    }
    this.storageChange$.next({scope, event: StorageServiceEventEnum.CLEARED });
  }
}
