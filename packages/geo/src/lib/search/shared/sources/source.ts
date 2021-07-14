import { Observable } from 'rxjs';

import { ObjectUtils } from '@igo2/utils';
import { StorageService } from '@igo2/core';
import { SearchResult } from '../search.interfaces';
import {
  SearchSourceOptions,
  TextSearchOptions,
  ReverseSearchOptions,
  SearchSourceSettings
} from './source.interfaces';

/**
 * Base search source class
 */
export class SearchSource {
  /**
   * Search source ID
   * @internal
   */
  static id = '';

  /**
   * Search source type
   * @internal
   */
  static type = '';

  /**
   * Search source options
   * @internal
   */
  protected options: SearchSourceOptions;

  /**
   * Get search source's id
   * @returns Search source's id
   */
  getId(): string {
    throw new Error('You have to implement the method "getId".');
  }
  /**
   * Get search source's type
   * @returns Search source's type
   */
  getType(): string {
    throw new Error('You have to implement the method "getType".');
  }

  /**
   * Get search source's default options
   * @returns Search source default options
   */
  protected getDefaultOptions(): SearchSourceOptions {
    throw new Error('You have to implement the method "getDefaultOptions".');
  }

  /**
   * Search source's title
   */
  get title(): string {
    return this.options.title;
  }

  /**
   * Whether the search source is available
   */
  get available(): boolean {
    return this.options.available !== false;
  }

  /**
   * Whether the search source is enabled
   */
  set enabled(value: boolean) {
    this.options.enabled = value;
  }
  get enabled(): boolean {
    return this.available && this.options.enabled !== false;
  }

  get showInPointerSummary(): boolean {
    const showInPointerSummary = this.options.showInPointerSummary;
    return showInPointerSummary ? showInPointerSummary : false;
  }

  get showInSettings(): boolean {
    const showInSettings = this.options.showInSettings;
    return showInSettings === undefined ? true : showInSettings;
  }

  /**
   * Search url
   */
  get searchUrl(): string {
    return this.options.searchUrl;
  }

  /**
   * Search query params
   */
  get params(): { [key: string]: string } {
    return this.options.params === undefined ? {} : this.options.params;
  }

  /**
   * Search settings
   */
  get settings(): SearchSourceSettings[] {
    return this.options.settings === undefined ? [] : this.options.settings;
  }

  /**
   * Set params from selected settings
   */
  setParamFromSetting(setting: SearchSourceSettings, saveInStorage = true) {
    switch (setting.type) {
      case 'radiobutton':
        setting.values.forEach(conf => {
          if (conf.enabled) {
            this.options.params = Object.assign(this.options.params || {}, {
              [setting.name]: conf.value
            });
          }
        });
        break;
      case 'checkbox':
        let confValue = '';
        setting.values
          .filter(s => s.available !== false)
          .forEach(conf => {
            if (conf.enabled) {
              confValue += conf.value + ',';
            }
          });
        confValue = confValue.slice(0, -1);
        this.options.params = Object.assign(this.options.params || {}, {
          [setting.name]: confValue
        });
        break;
    }

    if (saveInStorage && this.storageService) {
      this.storageService.set(
        this.getId() + '.options',
        {params: this.options.params}
      );
    }
  }

  /**
   * Search results display order
   */
  get displayOrder(): number {
    return this.options.order === undefined ? 99 : this.options.order;
  }

  constructor(options: SearchSourceOptions, private storageService?: StorageService) {
    this.options = options;
    if (this.storageService) {
      const storageOptions = this.storageService.get(
        this.getId() + '.options'
      ) as object;
      if (storageOptions) {
        this.options = ObjectUtils.mergeDeep(this.options, storageOptions);
      }
    }

    this.options = ObjectUtils.mergeDeep(this.getDefaultOptions(), this.options);


    // Set Default Params from Settings
    this.settings.forEach(setting => {
      this.setParamFromSetting(setting, false);
    });
  }

  /**
   * Get hashtags valid
   * @param hashtag hashtag from query
   */
  getHashtagsValid(term: string, settingsName: string): string[] {
    const hashtags = term.match(/(#[A-Za-z]+)/g);
    if (!hashtags) {
      return undefined;
    }

    const searchSourceSetting = this.getSettingsValues(settingsName);
    const hashtagsValid = [];
    hashtags.forEach(hashtag => {
      searchSourceSetting.values.forEach(conf => {
        const hashtagKey = hashtag.substring(1);
        if (typeof conf.value === 'string') {
          const types = conf.value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .split(',');
          const index = types.indexOf(
            hashtagKey
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
          );
          if (index !== -1) {
            hashtagsValid.push(types[index]);
          }
        }
        if (conf.hashtags && conf.hashtags.indexOf(hashtagKey) !== -1) {
          hashtagsValid.push(conf.value);
        }
      });
    });

    return hashtagsValid.filter((a, b) => hashtagsValid.indexOf(a) === b);
  }

  getSettingsValues(search: string): SearchSourceSettings {
    return this.getDefaultOptions().settings.find(
      (value: SearchSourceSettings) => {
        return value.name === search;
      }
    );
  }
}

/**
 * Search sources that allow searching by text implement this class
 */
export interface TextSearch {
  /**
   * Search by text
   * @param term Text
   * @param options Optional: TextSearchOptions
   * @returns Observable or search results
   */
  search(
    term: string | undefined,
    options?: TextSearchOptions
  ): Observable<SearchResult[]>;
}

/**
 * Search sources that allow searching by coordinates implement this class
 */
export interface ReverseSearch {
  /**
   * Search by text
   * @param lonLat Coordinates
   * @param options Optional: ReverseSearchOptions
   * @returns Observable or search results
   */
  reverseSearch(
    lonLat: [number, number],
    options?: ReverseSearchOptions
  ): Observable<SearchResult[]>;
}
