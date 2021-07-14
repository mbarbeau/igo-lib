import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  Renderer2,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { Subscription, BehaviorSubject } from 'rxjs';

import { MetadataLayerOptions } from '../../metadata/shared/metadata.interface';
import { layerIsQueryable } from '../../query/shared/query.utils';
import { Layer, TooltipType } from '../shared/layers';
import { NetworkService, ConnectionState } from '@igo2/core';

@Component({
  selector: 'igo-layer-item',
  templateUrl: './layer-item.component.html',
  styleUrls: ['./layer-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayerItemComponent implements OnInit, OnDestroy {
  public focusedCls = 'igo-layer-item-focused';

  @Input()
  get activeLayer() {
    return this._activeLayer;
  }
  set activeLayer(value) {
    if (value && this.layer && value.id === this.layer.id && !this.selectionMode) {
      this.layerTool$.next(true);
      this.renderer.addClass(this.elRef.nativeElement, this.focusedCls);
    } else {
      this.renderer.removeClass(this.elRef.nativeElement, this.focusedCls);
    }
  }
  private _activeLayer;

  layerTool$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  showLegend$: BehaviorSubject<boolean> = new BehaviorSubject(true);

  inResolutionRange$: BehaviorSubject<boolean> = new BehaviorSubject(true);

  queryBadgeHidden$: BehaviorSubject<boolean> = new BehaviorSubject(true);

  tooltipText: string;

  state: ConnectionState;

  @Input()
  get selectAll() {
    return this._selectAll;
  }
  set selectAll(value: boolean) {
    this._selectAll = value;
    if (value === true) {
      this.layerCheck = true;
    }
  }
  private _selectAll = false;

  @Input() layerCheck;

  private resolution$$: Subscription;
  private network$$: Subscription;
  private layers$$: Subscription;

  layers$: BehaviorSubject<Layer> = new BehaviorSubject<Layer>(undefined);

  @Input()
  get layer() {
    return this._layer;
  }
  set layer(value) {
    this._layer = value;
    this.layers$.next(value);
  }
  private _layer;

  @Input() toggleLegendOnVisibilityChange: boolean = false;

  @Input() expandLegendIfVisible: boolean = false;

  @Input() updateLegendOnResolutionChange: boolean = false;

  @Input() orderable: boolean = true;

  @Input() lowerDisabled: boolean = false;

  @Input() raiseDisabled: boolean = false;

  @Input() queryBadge: boolean = false;

  @Input() selectionMode;

  @Input() changeDetection;

  get opacity() {
    return this.layer.opacity * 100;
  }
  set opacity(opacity: number) {
    this.layer.opacity = opacity / 100;
  }

  @Output() action: EventEmitter<Layer> = new EventEmitter<Layer>(undefined);
  @Output() checkbox = new EventEmitter<{
    layer: Layer;
    check: boolean;
  }>();

  constructor(
    private networkService: NetworkService,
    private renderer: Renderer2,
    private elRef: ElementRef,
    private cdRef: ChangeDetectorRef) {}

  ngOnInit() {
    if (
      this.layer.visible &&
      this.expandLegendIfVisible &&
      this.layer.firstLoadComponent === true
    ) {
      this.layer.firstLoadComponent = false;
      this.layer.legendCollapsed = false;
    }
    this.toggleLegend(this.layer.legendCollapsed);
    this.updateQueryBadge();

    const resolution$ = this.layer.map.viewController.resolution$;
    this.resolution$$ = resolution$.subscribe(() => {
      this.onResolutionChange();
    });
    this.tooltipText = this.computeTooltip();

    this.network$$ = this.networkService.currentState().subscribe((state: ConnectionState) => {
      this.state = state;
      this.onResolutionChange();
    });

    this.layers$$ = this.layers$.subscribe(() => {
      if (this.layer && this.layer.options.active) {
        this.layerTool$.next(true);
        this.renderer.addClass(this.elRef.nativeElement, this.focusedCls);
      }
    });

    if (this.changeDetection) {
      this.changeDetection.subscribe(() => this.cdRef.detectChanges());
    }
  }

  ngOnDestroy() {
    this.resolution$$.unsubscribe();
    this.network$$.unsubscribe();
    this.layers$$.unsubscribe();
  }

  toggleLegend(collapsed: boolean) {
    this.layer.legendCollapsed = collapsed;
    this.showLegend$.next(!collapsed);
  }

  toggleLegendOnClick() {
    this.toggleLegend(this.showLegend$.value);
  }

  toggleVisibility() {
    this.layer.visible = !this.layer.visible;
    if (this.toggleLegendOnVisibilityChange) {
      this.toggleLegend(!this.layer.visible);
    }
    this.updateQueryBadge();
  }

  computeTooltip(): string {
    const layerOptions = this.layer.options;
    if (!layerOptions.tooltip) {
      return this.layer.title;
    }
    const layerTooltip = layerOptions.tooltip;
    const layerMetadata = (layerOptions as MetadataLayerOptions).metadata;
    switch (layerOptions.tooltip.type) {
      case TooltipType.TITLE:
        return this.layer.title;
      case TooltipType.ABSTRACT:
        if (layerMetadata && layerMetadata.abstract) {
          return layerMetadata.abstract;
        } else {
          return this.layer.title;
        }
      case TooltipType.CUSTOM:
        if (layerTooltip && layerTooltip.text) {
          return layerTooltip.text;
        } else {
          return this.layer.title;
        }
      default:
        return this.layer.title;
    }
  }

  private onResolutionChange() {
    const inResolutionRange = this.layer.isInResolutionsRange;
    if (
      inResolutionRange === false &&
      this.updateLegendOnResolutionChange === true
    ) {
      this.toggleLegend(true);
    }
    this.inResolutionRange$.next(inResolutionRange);
  }

  private updateQueryBadge() {
    const hidden =
      this.queryBadge === false ||
      this.layer.visible === false ||
      !layerIsQueryable(this.layer);
    this.queryBadgeHidden$.next(hidden);
  }

  toggleLayerTool() {
    this.layerTool$.next(!this.layerTool$.getValue());
    if (this.layerTool$.getValue() === true) {
      this.renderer.addClass(this.elRef.nativeElement, this.focusedCls);
    } else {
      this.renderer.removeClass(this.elRef.nativeElement, this.focusedCls);
    }
    this.action.emit(this.layer);
  }

  public check() {
    this.layerCheck = !this.layerCheck;
    this.checkbox.emit({layer: this.layer, check: this.layerCheck});
  }
}
