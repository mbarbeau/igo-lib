import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { EntityStore } from '@igo2/common';
import { LanguageService, MessageService, StorageService } from '@igo2/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Md5 } from 'ts-md5';
import { CapabilitiesService, TypeCapabilities } from '../../datasource';
import { IgoMap } from '../../map';
import { standardizeUrl } from '../../utils/id-generator';
import { Catalog } from '../shared/catalog.abstract';

/**
 * Component to browse a list of available catalogs
 */
@Component({
  selector: 'igo-catalog-library',
  templateUrl: './catalog-library.component.html',
  styleUrls: ['./catalog-library.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogLibaryComponent implements OnInit, OnDestroy {

  public form: FormGroup;

  /**
   * Store holding the catalogs
   */
  @Input() store: EntityStore<Catalog>;

  /**
   * Map to add the catalog items to
   */
  @Input() map: IgoMap;

  /**
   * Determine if the form to add a catalog is allowed
   */
  @Input() addCatalogAllowed: boolean = false;

  /**
   * Determine if the form to add a catalog is allowed
   */
  @Input() predefinedCatalogs: Catalog[] = [];

  /**
   * Event emitted a catalog is selected or unselected
   */
  @Output() catalogSelectChange = new EventEmitter<{
    selected: boolean;
    catalog: Catalog;
  }>();

  submitDisabled = true;
  typeCapabilities: string[];
  private defaultAddedCatalogType = 'wms';
  private addingCatalog$$: Subscription;
  private addedCatalogType$$: Subscription;
  private storeViewAll$$: Subscription;

  get addedCatalogs(): Catalog[] {
    return (this.storageService.get('addedCatalogs') || []) as Catalog[];
  }
  set addedCatalogs(catalogs: Catalog[]) {
    this.storageService.set('addedCatalogs', catalogs);
  }

 public predefinedCatalogsList$ = new BehaviorSubject<Catalog[]>([]);

  constructor(
    private formBuilder: FormBuilder,
    private capabilitiesService: CapabilitiesService,
    private messageService: MessageService,
    private languageService: LanguageService,
    private storageService: StorageService
  ) {

    this.form = this.formBuilder.group({
      id: ['', []],
      title: ['', []],
      url: ['', [Validators.required]],
      type: [this.defaultAddedCatalogType, [Validators.required]]
    });
  }

  /**
   * @internal
   */
  ngOnInit() {
    this.store.state.clear();
    this.typeCapabilities = Object.keys(TypeCapabilities);

    this.addedCatalogType$$ = this.form.get('type').valueChanges
      .subscribe(value => {
        if (value === 'wmts') {
          this.form.get('title').setValidators(Validators.required);
        } else {
          this.form.get('title').setValidators([]);
        }
        this.form.get('title').updateValueAndValidity();
      });
    this.computePredefinedCatalogList();
    this.storeViewAll$$ = this.store.view.all$().subscribe(() => this.computePredefinedCatalogList());


  }

  getCatalogs(): Observable<Catalog[]> {
    return this.store.view.all$();
  }


  /**
   * When a catalog is selected, update it's state in the store
   * and emit the catalog select change event
   * @internal
   */
  onCatalogSelect(catalog: Catalog) {
    this.store.state.update(catalog, {
      selected: true,
      focused: true
    }, true);
    this.catalogSelectChange.emit({ selected: true, catalog });
  }

  private unsubscribeAddingCatalog() {
    if (this.addingCatalog$$) {
      this.addingCatalog$$.unsubscribe();
    }
  }

  addCatalog(addedCatalog: Catalog) {
    let id = Md5.hashStr(addedCatalog.type + standardizeUrl(addedCatalog.url)) as string;
    const predefinedCatalog = this.predefinedCatalogs.find(c => c.id === addedCatalog.id);
    if (predefinedCatalog) {
      addedCatalog.externalProvider = predefinedCatalog.externalProvider;
      id = predefinedCatalog.id;
    }

    if (this.store.get(id)) {
      const title = this.languageService.translate.instant(
        'igo.geo.catalog.library.inlist.title'
      );
      const message = this.languageService.translate.instant(
        'igo.geo.catalog.library.inlist.message'
      );
      this.messageService.alert(message, title);
      this.form.patchValue({ url: '' });
      return;
    }
    this.unsubscribeAddingCatalog();

    this.addingCatalog$$ = this.capabilitiesService
      .getCapabilities(TypeCapabilities[addedCatalog.type], addedCatalog.url)
      .pipe(
        catchError((e) => {
          const title = this.languageService.translate.instant(
            'igo.geo.catalog.unavailableTitle'
          );
          const message = this.languageService.translate.instant(
            'igo.geo.catalog.unavailable',
            { value: addedCatalog.url }
          );
          this.messageService.error(message, title);
          throw e;
        })).subscribe((capabilies) => {
          let title;

          switch (addedCatalog.type) {
            case 'wms':
              title = addedCatalog.title || capabilies.Service.Title;
              break;
            case 'arcgisrest':
            case 'imagearcgisrest':
            case 'tilearcgisrest':
              title = addedCatalog.title || capabilies.mapName;
              break;
            case 'wmts':
              title = addedCatalog.title || capabilies.ServiceIdentification.ServiceType;
              break;
            default:
              title = addedCatalog.title;
          }

          const catalogToAdd = {
            id,
            title,
            url: addedCatalog.url,
            type: addedCatalog.type || 'wms',
            externalProvider: addedCatalog.externalProvider || false,
            removable: true
          } as Catalog;
          this.store.insert(catalogToAdd);
          const newCatalogs = this.addedCatalogs.slice(0);
          newCatalogs.push(catalogToAdd);
          this.addedCatalogs = newCatalogs;
          this.unsubscribeAddingCatalog();
          this.form.patchValue({ title: '' });
          this.form.patchValue({ url: '' });
        }
        );
  }

  ngOnDestroy() {
    this.unsubscribeAddingCatalog();
    this.addedCatalogType$$.unsubscribe();
    this.storeViewAll$$.unsubscribe();
  }

  onCatalogRemove(catalog) {
    this.store.delete(catalog);
    this.addedCatalogs = this.addedCatalogs.slice(0).filter(c => c.id !== catalog.id);
  }

  changeUrl(catalog: Catalog) {
    this.form.patchValue(catalog);
    this.computePredefinedCatalogList();
  }

  computePredefinedCatalogList() {
    this.predefinedCatalogsList$
    .next(this.predefinedCatalogs.filter(c => !this.store.get(c.id)));
  }
}
