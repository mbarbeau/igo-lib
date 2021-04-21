import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

import { StorageService } from '@igo2/core';
import { AuthService } from '@igo2/auth';

@Component({
  selector: 'igo-user-dialog',
  templateUrl: './user-dialog.component.html'
})
export class UserDialogComponent {
  public user;
  public exp;

  constructor(
    public dialogRef: MatDialogRef<UserDialogComponent>,
    private auth: AuthService,
    private storageService: StorageService
  ) {
    const decodeToken = this.auth.decodeToken();
    this.user = decodeToken.user;
    this.exp = new Date(decodeToken.exp * 1000).toLocaleString();
  }

  clearPreferences() {
    this.storageService.clear();
  }
}
