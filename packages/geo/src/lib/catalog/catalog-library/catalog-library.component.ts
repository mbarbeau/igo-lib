import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { EntityStore } from '@igo2/common';
import { LanguageService, MessageService, StorageService } from '@igo2/core';
import { Observable, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Md5 } from 'ts-md5';
import { CapabilitiesService, TypeCapabilities } from '../../datasource';
import { IgoMap } from '../../map';
import { standardizeUrl } from '../../utils/id-generator';
import { Catalog } from '../shared/catalog.abstract';
import { AddCatalogDialogComponent } from './add-catalog-dialog.component';

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
  private addingCatalog$$: Subscription;

  get addedCatalogs(): Catalog[] {
    return (this.storageService.get('addedCatalogs') || []) as Catalog[];
  }
  set addedCatalogs(catalogs: Catalog[]) {
    this.storageService.set('addedCatalogs', catalogs);
  }

  constructor(
    private capabilitiesService: CapabilitiesService,
    private messageService: MessageService,
    private languageService: LanguageService,
    private storageService: StorageService,
    private dialog: MatDialog
  ) {}

  /**
   * @internal
   */
  ngOnInit() {
    this.store.state.clear();

    this.predefinedCatalogs = this.predefinedCatalogs.map(c => {
      c.id = Md5.hashStr(
        (c.type || 'wms') + standardizeUrl(c.url)
      ) as string;
      return c;
    });
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
    this.store.state.update(
      catalog,
      {
        selected: true,
        focused: true
      },
      true
    );
    this.catalogSelectChange.emit({ selected: true, catalog });
  }

  private unsubscribeAddingCatalog() {
    if (this.addingCatalog$$) {
      this.addingCatalog$$.unsubscribe();
    }
  }

  addCatalog(addedCatalog: Catalog) {
    if (!addedCatalog) {
      return;
    }
    let id = Md5.hashStr(
      addedCatalog.type + standardizeUrl(addedCatalog.url)
    ) as string;
    const predefinedCatalog = this.predefinedCatalogs.find(
      (c) => c.id === addedCatalog.id
    );

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
        })
      )
      .subscribe((capabilies) => {
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
            title =
              addedCatalog.title ||
              capabilies.ServiceIdentification.ServiceType;
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
      });
  }

  ngOnDestroy() {
    this.unsubscribeAddingCatalog();
  }

  onCatalogRemove(catalog) {
    this.store.delete(catalog);
    this.addedCatalogs = this.addedCatalogs
      .slice(0)
      .filter((c) => c.id !== catalog.id);
  }

  addCatalogDialog() {
    const dialogRef = this.dialog.open(AddCatalogDialogComponent, {
      width: '700px',
      data: {
        predefinedCatalogs: this.predefinedCatalogs,
        store: this.store
      }
    });

    dialogRef.afterClosed().subscribe((catalog) => {
      this.addCatalog(catalog);
    });
  }
}
