import { Injectable, OnDestroy } from '@angular/core';

import {
  Action,
  EntityStoreFilterCustomFuncStrategy,
  EntityStoreFilterSelectionStrategy
} from '@igo2/common';

import { BehaviorSubject, Subscription } from 'rxjs';
import {
  FeatureWorkspace,
  mapExtentStrategyActiveToolTip,
  noElementSelected,
  ExportOptions
} from '@igo2/geo';
import { StorageService, StorageServiceEvent, StorageServiceEventEnum, LanguageService, MediaService} from '@igo2/core';
import { StorageState } from '../../storage/storage.state';
import { map, skipWhile } from 'rxjs/operators';
import { ToolState } from '../../tool/tool.state';
import { handleZoomAuto } from './workspace.utils';

@Injectable({
  providedIn: 'root'
})
export class FeatureActionsService implements OnDestroy {

  public maximize$: BehaviorSubject<boolean> = new BehaviorSubject(
    this.storageService.get('workspaceMaximize') as boolean
  );

  zoomAuto$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private storageChange$$: Subscription;

  get storageService(): StorageService {
    return this.storageState.storageService;
  }

  get zoomAuto(): boolean {
    return this.storageService.get('zoomAuto') as boolean;
  }

  constructor(
    private storageState: StorageState,
    public languageService: LanguageService,
    private toolState: ToolState,
    private mediaService: MediaService
  ) {}

  ngOnDestroy(): void {
    if (this.storageChange$$) {
      this.storageChange$$.unsubscribe();
    }
  }

  loadActions(
    workspace: FeatureWorkspace,
    rowsInMapExtentCheckCondition$: BehaviorSubject<boolean>,
    selectOnlyCheckCondition$: BehaviorSubject<boolean>
    ) {
    const actions = this.buildActions(
      workspace,
      rowsInMapExtentCheckCondition$,
      selectOnlyCheckCondition$
      );
    workspace.actionStore.load(actions);
  }

  buildActions(
    workspace: FeatureWorkspace,
    rowsInMapExtentCheckCondition$: BehaviorSubject<boolean>,
    selectOnlyCheckCondition$: BehaviorSubject<boolean>
    ): Action[] {
    this.zoomAuto$.next(this.zoomAuto);
    this.storageChange$$ = this.storageService.storageChange$
      .pipe(
        skipWhile(
          (storageChange: StorageServiceEvent) =>
            storageChange.key !== 'zoomAuto' || storageChange.event === StorageServiceEventEnum.CLEARED
        )
      )
      .subscribe(() => {
        this.zoomAuto$.next(this.zoomAuto);
        handleZoomAuto(workspace, this.storageService);
      });
    return [
      {
        id: 'zoomAuto',
        checkbox: true,
        title: 'igo.integration.workspace.zoomAuto.title',
        tooltip: 'igo.integration.workspace.zoomAuto.tooltip',
        checkCondition: this.zoomAuto$,
        handler: () => {
          handleZoomAuto(workspace, this.storageService);
          this.storageService.set(
            'zoomAuto',
            !this.storageService.get('zoomAuto') as boolean
          );
        }
      },
      {
        id: 'filterInMapExtent',
        checkbox: true,
        title: 'igo.integration.workspace.inMapExtent.title',
        tooltip: mapExtentStrategyActiveToolTip(workspace),
        checkCondition: rowsInMapExtentCheckCondition$,
        handler: () => rowsInMapExtentCheckCondition$.next(!rowsInMapExtentCheckCondition$.value)
      },
      {
        id: 'selectedOnly',
        checkbox: true,
        title: 'igo.integration.workspace.selected.title',
        tooltip: 'igo.integration.workspace.selected.tooltip',
        checkCondition: selectOnlyCheckCondition$,
        handler: () => selectOnlyCheckCondition$.next(!selectOnlyCheckCondition$.value)
      },
      {
        id: 'clearselection',
        icon: 'select-off',
        title: 'igo.integration.workspace.clearSelection.title',
        tooltip: 'igo.integration.workspace.clearSelection.tooltip',
        handler: (ws: FeatureWorkspace) => {
          ws.entityStore.state.updateMany(ws.entityStore.view.all(), {
            selected: false
          });
        },
        args: [workspace],
        availability: (ws: FeatureWorkspace) => noElementSelected(ws)
      },
      {
        id: 'featureDownload',
        icon: 'file-export',
        title: 'igo.integration.workspace.download.title',
        tooltip: 'igo.integration.workspace.download.tooltip',
        handler: (ws: FeatureWorkspace) => {
          const filterStrategy = ws.entityStore.getStrategyOfType(
            EntityStoreFilterCustomFuncStrategy
          );
          const filterSelectionStrategy = ws.entityStore.getStrategyOfType(
            EntityStoreFilterSelectionStrategy
          );
          const layersWithSelection = filterSelectionStrategy.active
            ? [ws.layer.id]
            : [];
          this.toolState.toolToActivateFromOptions({
            tool: 'importExport',
            options: {
              layers: [ws.layer.id],
              featureInMapExtent: filterStrategy.active,
              layersWithSelection
            } as ExportOptions
          });
        },
        args: [workspace]
      },
      {
        id: 'maximize',
        title: this.languageService.translate.instant('igo.integration.workspace.maximize'),
        tooltip: this.languageService.translate.instant(
          'igo.integration.workspace.maximizeTooltip'
        ),
        icon: 'resize',
        display: () => {
          return this.maximize$.pipe(map((v) => !v && !this.mediaService.isMobile()));
        },
        handler: () => {
          if (!this.mediaService.isMobile()) {
            this.maximize$.next(true);
          }
        },
      },
      {
        id: 'standardExtent',
        title: this.languageService.translate.instant(
          'igo.integration.workspace.standardExtent'
        ),
        tooltip: this.languageService.translate.instant(
          'igo.integration.workspace.standardExtentTooltip'
        ),
        icon: 'resize',
        display: () => {
          return this.maximize$.pipe(map((v) => v && !this.mediaService.isMobile()));
        },
        handler: () => {
          this.maximize$.next(false);
        }
      }
    ];
  }
}
