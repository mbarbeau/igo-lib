import { LanguageService, ConfigService } from '@igo2/core';
import { Component, OnInit, OnDestroy, Optional, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, BehaviorSubject } from 'rxjs';

import { EntityStore } from '@igo2/common';
import { TypeCapabilities } from '../../datasource';
import { Catalog } from '../shared/catalog.abstract';

@Component({
  selector: 'igo-add-catalog-dialog',
  templateUrl: './add-catalog-dialog.component.html',
  styleUrls: ['./add-catalog-dialog.component.scss']
})
export class AddCatalogDialogComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  private defaultAddedCatalogType = 'wms';
  private addedCatalogType$$: Subscription;
  public predefinedCatalogsList$ = new BehaviorSubject<Catalog[]>([]);
  typeCapabilities: string[];
  predefinedCatalogs: Catalog[] = [];
  store: EntityStore<Catalog>;
  error = false;
  addedCatalog: Catalog;
  emailAddress: string;
  private storeViewAll$$: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    public languageService: LanguageService,
    private configService: ConfigService,
    public dialogRef: MatDialogRef<AddCatalogDialogComponent>,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data: { predefinedCatalogs: Catalog[]; store: EntityStore<Catalog>; error: boolean; addedCatalog: Catalog }
  ) {
    this.store = data.store;
    this.predefinedCatalogs = data.predefinedCatalogs;
    this.error = data.error;
    this.addedCatalog = data.addedCatalog;
    this.form = this.formBuilder.group({
      id: ['', []],
      title: ['', []],
      url: ['', [Validators.required]],
      type: [this.defaultAddedCatalogType, [Validators.required]]
    });
  }

  ngOnInit() {
    this.store.state.clear();
    this.typeCapabilities = Object.keys(TypeCapabilities);

    this.addedCatalogType$$ = this.form
      .get('type')
      .valueChanges.subscribe((value) => {
        if (value === 'wmts') {
          this.form.get('title').setValidators(Validators.required);
        } else {
          this.form.get('title').setValidators([]);
        }
        this.form.get('title').updateValueAndValidity();
      });

    this.computePredefinedCatalogList();
    this.storeViewAll$$ = this.store.view
      .all$()
      .subscribe(() => this.computePredefinedCatalogList());

    this.emailAddress = this.configService.getConfig('emailAddress');
  }

  ngOnDestroy() {
    this.addedCatalogType$$.unsubscribe();
    this.storeViewAll$$.unsubscribe();
  }

  changeUrl(catalog: Catalog) {
    this.form.patchValue(catalog);
    this.error = false;
    this.computePredefinedCatalogList();
  }

  computePredefinedCatalogList() {
    this.predefinedCatalogsList$.next(
      this.predefinedCatalogs.filter((c) => !this.store.get(c.id))
    );
  }

  addCatalog(addedCatalog: Catalog) {
    this.error = false;
    this.dialogRef.close(addedCatalog);
  }

  cancel() {
    this.error = false;
    this.dialogRef.close();
  }
}
