import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { Subscription } from 'rxjs';

import { SubjectStatus } from '@igo2/utils';
import { ActivityService } from '@igo2/core';

import { IgoMap } from '../shared/map';
import { MapControlsOptions, MapViewOptions } from '../shared/map.interface';

@Component({
  selector: 'igo-map-browser',
  templateUrl: './map-browser.component.html',
  styleUrls: ['./map-browser.component.scss']
})
export class MapBrowserComponent implements OnInit, AfterViewInit, OnDestroy {
  private activityId: string;
  private status$$: Subscription;

  @Input() map: IgoMap;

  @Input()
  get view(): MapViewOptions {
    return this._view;
  }
  set view(value: MapViewOptions) {
    this._view = value;
    if (this.map !== undefined) {
      this.map.updateView(value);
    }
  }
  private _view: MapViewOptions;

  get controls(): MapControlsOptions {
    return this._controls;
  }

  set controls(value: MapControlsOptions) {
    this._controls = value;
    if (this.map !== undefined) {
      this.map.updateControls(value);
    }
  }
  private _controls: MapControlsOptions;

  public id = `igo-map-target-${new Date().getTime()}`;

  constructor(private activityService: ActivityService) {}

  ngOnInit() {
    this.status$$ = this.map.status$.subscribe(status =>
      this.handleStatusChange(status)
    );
  }

  ngAfterViewInit() {
    this.map.setTarget(this.id);
  }

  ngOnDestroy() {
    this.map.setTarget(undefined);
    this.activityService.unregister(this.activityId);
    this.status$$.unsubscribe();
  }

  private handleStatusChange(status: SubjectStatus) {
    if (status === SubjectStatus.Working && this.activityId === undefined) {
      this.activityId = this.activityService.register();
    } else if (status === SubjectStatus.Done && this.activityId !== undefined) {
      this.activityService.unregister(this.activityId);
      this.activityId = undefined;
    }
  }
}
