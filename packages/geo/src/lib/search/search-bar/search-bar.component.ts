import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef
} from '@angular/core';
import {
  FloatLabelType,
  MatFormFieldAppearance
} from '@angular/material/form-field';
import { BehaviorSubject, Subscription, EMPTY, timer } from 'rxjs';
import { debounce, distinctUntilChanged } from 'rxjs/operators';

import { LanguageService } from '@igo2/core';
import { EntityStore } from '@igo2/common';

import { SEARCH_TYPES } from '../shared/search.enums';
import { SearchResult, Research } from '../shared/search.interfaces';
import { SearchService } from '../shared/search.service';
import { SearchSourceService } from '../shared/search-source.service';

/**
 * Searchbar that triggers a research in all search sources enabled.
 * If the store input is defined, the search results will be loaded
 * into that store. An event is always emitted when a research is completed.
 */
@Component({
  selector: 'igo-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchBarComponent implements OnInit, OnDestroy {
  /**
   * Invalid keys
   */
  static invalidKeys = [
    'Control',
    'Shift',
    'Alt',
    'ArrowDown',
    'ArrowUp',
    'ArrowRight',
    'ArrowLeft'
  ];

  readonly placeholder$: BehaviorSubject<string> = new BehaviorSubject(
    'igo.geo.search.placeholder'
  );

  readonly empty$: BehaviorSubject<boolean> = new BehaviorSubject(true);

  /**
   * Subscription to the ssearch bar term
   */
  private term$$: Subscription;

  /**
   * Search term stream
   */
  private stream$: BehaviorSubject<string> = new BehaviorSubject('');

  /**
   * Subscription to the search term stream
   */
  private stream$$: Subscription;

  /**
   * Subscription to the search type
   */
  private searchType$$: Subscription;

  private researches$$: Subscription[];

  /**
   * List of available search types
   */
  @Input() searchTypes: string[] = SEARCH_TYPES;

  /**
   * Search term
   */
  @Input()
  set searchType(value: string) {
    this.setSearchType(value);
  }
  get searchType(): string {
    return this.searchType$.value;
  }
  readonly searchType$: BehaviorSubject<string> = new BehaviorSubject(
    undefined
  );

  /**
   * Event emitted when the pointer summary is activated by the searchbar setting
   */
  @Output() pointerSummaryStatus = new EventEmitter<boolean>();

  /**
   * Event emitted when the show geometry setting is changed
   */
   @Output() searchResultsGeometryStatus = new EventEmitter<boolean>();

  /**
   * Search term
   */
  @Input()
  set term(value: string) {
    this.setTerm(value);
  }
  get term(): string {
    return this.term$.value;
  }
  readonly term$: BehaviorSubject<string> = new BehaviorSubject('');

  /**
   * Whether this component is disabled
   */
  @Input()
  set disabled(value: boolean) {
    this.disabled$.next(value);
  }
  get disabled(): boolean {
    return this.disabled$.value;
  }
  readonly disabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  @Input() pointerSummaryEnabled: boolean = false;
  @Input() searchResultsGeometryEnabled: boolean = false;
  /**
   * Whether a float label should be displayed
   */
  @Input() floatLabel: FloatLabelType = 'never';

  @Input() appearance: MatFormFieldAppearance = 'legacy';

  @Input() placeholder: string;

  @Input() label: string;

  /**
   * Icons color (search and clear)
   */
  @Input() color = 'primary';

  @Input() termSplitter: string = '|';

  /**
   * Debounce time between each keystroke
   */
  @Input() debounce = 200;

  /**
   * Minimum term length required to trigger a research
   */
  @Input() minLength = 2;

  /**
   * Search icon
   */
  @Input() searchIcon: string;

  /**
   * Search Selector
   */
  @Input() searchSelector = false;

  /**
   * Search Settings
   */
  @Input() searchSettings = false;

  /**
   * Force coordinates in north america
   */
  @Input() forceNA = false;

  /**
   * Search results store
   */
  @Input() store: EntityStore<SearchResult>;

  /**
   * Event emitted when the search term changes
   */
  @Output() searchTermChange = new EventEmitter<string>();

  /**
   * Event emitted when a research is completed
   */
  @Output() search = new EventEmitter<{
    research: Research;
    results: SearchResult[];
  }>();

  /**
   * Event emitted when the search type changes
   */
  @Output() searchTypeChange = new EventEmitter<string>();

  /**
   * Event emitted when the search type changes
   */
  @Output() clearFeature = new EventEmitter();

  /**
   * Event emitted when the search settings changes
   */
  @Output() searchSettingsChange = new EventEmitter();

  /**
   * Input element
   * @internal
   */
  @ViewChild('input', { static: true }) input: ElementRef;

  /**
   * Whether the search bar is empty
   * @internal
   */
  get empty(): boolean {
    return this.term.length === 0;
  }

  constructor(
    private languageService: LanguageService,
    private searchService: SearchService,
    private searchSourceService: SearchSourceService
  ) {}

  /**
   * Subscribe to the search term stream and trigger researches
   * @internal
   */
  ngOnInit(): void {
    this.term$$ = this.term$.subscribe((term: string) => {
      this.empty$.next(term === undefined || term.length === 0);
    });

    this.stream$$ = this.stream$
      .pipe(
        debounce((term: string) => (term === '' ? EMPTY : timer(this.debounce)))
      )
      .subscribe((term: string) => this.onSetTerm(term));

    this.handlePlaceholder();

    this.searchType$$ = this.searchType$
      .pipe(distinctUntilChanged())
      .subscribe((searchType: string) => this.onSetSearchType(searchType));
  }

  /**
   * Unsubscribe to the search term stream
   * @internal
   */
  ngOnDestroy() {
    this.term$$.unsubscribe();
    this.stream$$.unsubscribe();
    this.searchType$$.unsubscribe();
  }

  /**
   * When a user types, validates the key and send it into the
   * stream if it's valid
   * @param event Keyboard event
   * @internal
   */
  onKeyup(event: KeyboardEvent) {
    const key = event.key;
    if (!this.keyIsValid(key)) {
      return;
    }
    const term = (event.target as HTMLInputElement).value;
    this.setTerm(term);
  }

  /**
   * Clear the stream and the input
   * @internal
   */
  onClearButtonClick() {
    this.clear();
    this.clearFeature.emit();
  }

  /**
   * Update search type
   * @param searchType Enabled search type
   * @internal
   */
  onSearchTypeChange(searchType: string) {
    this.setSearchType(searchType);
  }

  /**
   * Update the placeholder with the enabled search type. The placeholder
   * for all availables search typers needs to be defined in the locale
   * files or an error will be thrown.
   * @param searchType Enabled search type
   * @internal
   */
  setSearchType(searchType: string) {
    this.searchType$.next(searchType);
  }

  onSearchSettingsChange() {
    this.doSearch(this.term);
    this.searchSettingsChange.emit();
    this.handlePlaceholder();
  }

  /**
   * Send the term into the stream only if this component is not disabled
   * @param term Search term
   */
  setTerm(term: string) {
    if (this.disabled) {
      return;
    }

    term = term || '';

    if (term !== this.term) {
      this.term$.next(term);
    }

    const slug = term.replace(/(#[^\s]*)/g, '').trim();
    if (slug.length >= this.minLength || slug.length === 0) {
      this.stream$.next(term);
    }
  }

  /**
   * Clear the stream and the input
   */
  private clear() {
    this.term$.next('');
    this.stream$.next('');
    this.input.nativeElement.focus();
  }

  /**
   * Validate if a given key stroke is a valid input
   */
  private keyIsValid(key: string) {
    return SearchBarComponent.invalidKeys.indexOf(key) === -1;
  }

  /**
   * When the search term changes, emit an event and trigger a
   * research in every enabled search sources.
   * @param term Search term
   */
  private onSetTerm(term: string | undefined) {
    this.searchTermChange.emit(term);
    this.doSearch(term);
  }

  private handlePlaceholder() {
    const searchTypes = [
      ...new Set(
        this.searchSourceService
          .getEnabledSources()
          .filter((ss) => !['map', 'coordinatesreverse'].includes(ss.getId()))
          .map((ss) => ss.getType())
      )
    ];

    let placeholder = `igo.geo.search.placeholder`;
    if (searchTypes.length === 1) {
      placeholder = `igo.geo.search.${searchTypes[0].toLowerCase()}.placeholder`;
    } else if (searchTypes.length === 0) {
      placeholder = `igo.geo.search.emptyType.placeholder`;
    }
    this.placeholder$.next(placeholder);
  }

  private onSetSearchType(searchType: string) {
    if (searchType === undefined || searchType === null) {
      return;
    }

    this.searchTypeChange.emit(searchType);

    const placeholder = `igo.geo.search.${searchType.toLowerCase()}.placeholder`;
    this.placeholder$.next(placeholder);

    this.setTerm(this.term);
  }

  /**
   * Execute the search
   * @param term Search term
   */
  private doSearch(rawTerm: string | undefined) {
    if (this.researches$$) {
      this.researches$$.map((research) => research.unsubscribe());
      this.researches$$ = undefined;
    }

    let terms;
    if (this.termSplitter && rawTerm.match(new RegExp(this.termSplitter, 'g'))) {
      terms = rawTerm.split(this.termSplitter).filter((t) => t.length >= this.minLength);
      this.store.clear();
    } else {
      terms = [rawTerm];
    }

    let researches: Research[] = [];
    terms.map((term: string) => {
      const slug = term ? term.replace(/(#[^\s]*)/g, '').trim() : '';
      if (slug === '') {
        if (this.store !== undefined) {
          this.store.clear();
        }
        return;
      }

      researches = researches.concat(this.searchService.search(term, {
        forceNA: this.forceNA
      }));
    });
    this.researches$$ = researches.map((research) => {
      return research.request.subscribe((results: SearchResult[]) => {
        this.onResearchCompleted(research, results);
      });
    });
  }

  /**
   * When a research  is completed, emit an event and update
   * the store's items.
   * @param research Research
   * @param results Research results
   */
  private onResearchCompleted(research: Research, results: SearchResult[]) {
    this.search.emit({ research, results });

    if (this.store !== undefined) {
      const newResults = this.store
        .all()
        .filter((result) => result.source !== research.source)
        .concat(results);
      this.store.updateMany(newResults);
    }
  }
}
