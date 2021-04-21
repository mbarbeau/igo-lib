import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';

import {
  Context,
  ContextPermission,
  ContextPermissionsList,
  ContextProfils
} from '../shared/context.interface';
import { TypePermission } from '../shared/context.enum';

import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { AuthService } from '@igo2/auth';
import { ConfigService } from '@igo2/core';

@Component({
  selector: 'igo-context-permissions',
  templateUrl: './context-permissions.component.html',
  styleUrls: ['./context-permissions.component.scss']
})
export class ContextPermissionsComponent implements OnInit {
  public form: FormGroup;

  @Input()
  get context(): Context {
    return this._context;
  }
  set context(value: Context) {
    this._context = value;
    this.cd.detectChanges();
  }
  private _context: Context;

  @Input()
  get permissions(): ContextPermissionsList {
    return this._permissions;
  }
  set permissions(value: ContextPermissionsList) {
    this._permissions = value;
    this.cd.detectChanges();
  }
  private _permissions: ContextPermissionsList;

  get profils(): ContextProfils[] {
    return this._profils;
  }
  set profils(value: ContextProfils[]) {
    this._profils = value;
    this.cd.detectChanges();
  }
  private _profils: ContextProfils[] = [];

  get canWrite(): boolean {
    return this.context.permission === TypePermission[TypePermission.write];
  }

  private baseUrlProfils;

  public formControl = new FormControl();
  formValueChanges$$: Subscription;

  @Output() addPermission: EventEmitter<ContextPermission> = new EventEmitter();
  @Output() removePermission: EventEmitter<ContextPermission> = new EventEmitter();
  @Output() scopeChanged: EventEmitter<Context> = new EventEmitter();

  constructor(private formBuilder: FormBuilder,
              private cd: ChangeDetectorRef,
              private http: HttpClient,
              public authService: AuthService,
              private config: ConfigService) {}

  ngOnInit(): void {
    this.buildForm();

    this.baseUrlProfils = this.config.getConfig('context.url') + '/profils-users?';

    this.formValueChanges$$ = this.formControl.valueChanges.subscribe((value) => {
      if (value.length) {
        this.http.get(this.baseUrlProfils + 'q=' + value).subscribe(profils => {
          this.profils = profils as ContextProfils[];
        });
        this.profils.filter((profil) => {
          const filterNormalized = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const profilTitleNormalized = profil.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const profilNameNormalized = profil.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const profilNormalized = profilNameNormalized + profilTitleNormalized;
          return profilNormalized.includes(filterNormalized);
        });
      } else {
        this.profils = [];
      }
    });
  }

  displayFn(profil?: ContextProfils): string | undefined {
    return profil ? profil.title : undefined;
  }

  public handleFormSubmit(value) {
    this.addPermission.emit(value);
  }

  private buildForm(): void {
    this.form = this.formBuilder.group({
      profil: [],
      typePermission: ['read']
    });
  }

  onProfilSelected(value) {
    this.form.setValue({
      profil: value.name,
      typePermission: this.form.value.typePermission
    });
  }
}
