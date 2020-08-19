import { Injectable } from '@angular/core';

import { Action, EntityStoreFilterCustomFuncStrategy, EntityStoreFilterSelectionStrategy } from '@igo2/common';

import { FeatureWorkspace } from './feature-workspace';
import { mapExtentStrategyActiveToolTip, FeatureMotionStrategyActiveToolTip, noElementSelected } from './workspace.utils';
import { ExportOptions } from '../../import-export/shared/export.interface';
import { FeatureStoreSelectionStrategy } from '../../feature/shared/strategies/selection';
import { FeatureMotion } from '../../feature';
import { StorageService, StorageScope } from '@igo2/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FeatureActionsService {

  toolToActivate$: BehaviorSubject<{ tool: string; options: {[key: string]: any} }> = new BehaviorSubject(undefined);

  get zoomAutoTable(): boolean {
    return this.storageService.get('zoomAutoTable') as boolean;
  }

  get rowsInMapExtent(): boolean {
    return this.storageService.get('rowsInMapExtent') as boolean;
  }

  constructor(private storageService: StorageService) {}

  loadActions(workspace: FeatureWorkspace) {
    const actions = this.buildActions(workspace);
    workspace.actionStore.load(actions);
  }

  buildActions(workspace: FeatureWorkspace): Action[] {
    return [
      {
        id: 'filterInMapExtent',
        checkbox: true,
        title: 'igo.geo.workspace.inMapExtent.title',
        tooltip: mapExtentStrategyActiveToolTip(workspace),
        checkCondition: this.rowsInMapExtent,
        handler: () => {
          const filterStrategy = workspace.entityStore
          .getStrategyOfType(EntityStoreFilterCustomFuncStrategy);
          if (filterStrategy.active) {
            filterStrategy.deactivate();
          } else {
            filterStrategy.activate();
          }
          this.storageService.set('rowsInMapExtent', !this.storageService.get('rowsInMapExtent') as boolean, StorageScope.SESSION);
        }
      },
      {
        id: 'featureDownload',
        icon: 'download',
        title: 'igo.geo.workspace.wfsDownload.title',
        tooltip: 'igo.geo.workspace.wfsDownload.tooltip',
        handler: (ws: FeatureWorkspace) => {
          const filterStrategy = ws.entityStore.getStrategyOfType(EntityStoreFilterCustomFuncStrategy);
          this.toolToActivate$.next({
            tool: 'importExport',
            options: { layer: [ws.layer.id], featureInMapExtent: filterStrategy.active } as ExportOptions
          });
        },
        args: [workspace]
      },
      {
        id: 'zoomAuto',
        checkbox: true,
        title: 'igo.geo.workspace.zoomAuto.title',
        tooltip: FeatureMotionStrategyActiveToolTip(workspace),
        checkCondition: this.zoomAutoTable,
        handler: () => {
          const zoomStrategy = workspace.entityStore
          .getStrategyOfType(FeatureStoreSelectionStrategy) as FeatureStoreSelectionStrategy;
          this.storageService.set('zoomAutoTable', !this.storageService.get('zoomAutoTable') as boolean);
          zoomStrategy.setMotion(this.zoomAutoTable ? FeatureMotion.Default : FeatureMotion.None);
        }
      },
      {
        id: 'selectedOnly',
        checkbox: true,
        title: 'igo.geo.workspace.selected.title',
        tooltip: 'selectedOnly',
        checkCondition: false,
        handler: () => {
          const filterStrategy = workspace.entityStore
          .getStrategyOfType(EntityStoreFilterSelectionStrategy);
          if (filterStrategy.active) {
            filterStrategy.deactivate();
          } else {
            filterStrategy.activate();
          }
        }
      },
      {
        id: 'clearselection',
        icon: 'select-off',
        title: 'igo.geo.workspace.clearSelection.title',
        tooltip: 'igo.geo.workspace.clearSelection.tooltip',
        handler: (ws: FeatureWorkspace) => {
          ws.entityStore.state.updateMany(ws.entityStore.view.all(), { selected: false });
        },
        args: [workspace],
        availability: (ws: FeatureWorkspace) => noElementSelected(ws)
      },
    ];
  }
}
