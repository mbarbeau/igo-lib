import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy
} from '@angular/core';

import { BehaviorSubject } from 'rxjs';

import { EntityStore } from '@igo2/common';
import type { EntityStateManager } from '@igo2/common';

import {
  Catalog,
  CatalogItem,
  CatalogItemGroup,
  CatalogItemLayer,
  CatalogItemState,
  CatalogItemType
} from '../shared';

/**
 * Catalog browser group item
 */
@Component({
  selector: 'igo-catalog-browser-group',
  templateUrl: './catalog-browser-group.component.html',
  styleUrls: ['./catalog-browser-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogBrowserGroupComponent implements OnInit, OnDestroy {

  /**
   * Group's items store
   * @internal
   */
  store = new EntityStore<CatalogItem, CatalogItemState>([]);

  /**
   * Whether all the layers of the group are added
   * @internal
   */
  added$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  preview$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  /**
   * Whether the toggle button is disabled
   * @internal
   */
  disabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  /**
   * Catalog
   */
  @Input() catalog: Catalog;

  /**
   * Catalog group
   */
  @Input() group: CatalogItemGroup;

  /**
   * Whether the group is collapsed
   */
  @Input() collapsed: boolean = true;

  @Input() resolution: number;

  @Input() catalogAllowLegend = false;

  /**
   * Whether the group can be toggled when it's collapsed
   */
  @Input() toggleCollapsed: boolean = true;

  /**
   * Parent catalog's items store state. Groups share a unique
   * EntityState that tracks the group and it's layers state (whether they are added or not).
   * Sharing a unique state would also allow us to expand this component to allow
   * the selection of a layer while unselecting any layer already selected in another group.
   * This could be useful to display some layer info before adding it, for example.
   */
  @Input() state: EntityStateManager<CatalogItem, CatalogItemState>;

  /**
   * Event emitted when the add/remove button of the group is clicked
   */
  @Output() addedChange = new EventEmitter<{
    added: boolean;
    group: CatalogItemGroup;
  }>();

  /**
   * Event emitted when the add/remove button of a layer is clicked
   */
  @Output() layerAddedChange = new EventEmitter<{
    added: boolean;
    layer: CatalogItemLayer;
  }>();

  /**
   * @internal
   */
  get title(): string {
    return this.group.title;
  }

  /**
   * @internal
   */
  ngOnInit() {
    this.store.load(this.group.items);
    this.evaluateAdded();
    this.evaluateDisabled(this.collapsed);
    if (this.group.sortDirection !== undefined) {
      this.store.view.sort({
        direction: this.group.sortDirection,
        valueAccessor: (item: CatalogItem) => item.title
        });
    }
  }

  ngOnDestroy() {
    this.store.destroy();
  }

  /**
   * @internal
   */
  isGroup(item: CatalogItem): boolean {
    return item.type === CatalogItemType.Group;
  }

  /**
   * @internal
   */
  isLayer(item: CatalogItem): boolean {
    return item.type === CatalogItemType.Layer;
  }

  /**
   * On toggle button click, emit the added change event
   * @internal
   */
  onToggleClick() {
    this.added$.value ? this.remove() : this.add();
  }

  /**
   * On toggle button click, emit the added change event
   * @internal
   */
  onToggleCollapsed(collapsed: boolean) {
    this.evaluateDisabled(collapsed);
  }

  /**
   * When a layer is added or removed, evaluate if all the layers of the group
   * are now added or removed. If so, consider that the group itself is added
   * or removed.
   * @internal
   * @param event Layer added change event
   */
  onLayerAddedChange(event: { added: boolean; layer: CatalogItemLayer }) {
    this.layerAddedChange.emit(event);
    this.tryToggleGroup(event);
  }

  /**
   * Emit added change event with added = true
   */
  private add() {
    this.added$.next(true);
    this.addedChange.emit({
      added: true,
      group: this.group
    });
  }

  /**
   * Emit added change event with added = true
   */
  private remove() {
    this.added$.next(false);
    this.addedChange.emit({
      added: false,
      group: this.group
    });
  }

  onLayerPreview(event) {
    this.preview$.next(event);
  }

  /**
   * If all the layers of the group added or removed, add or remove the group itself.
   * @param event The last layer added change event to occur
   */
  private tryToggleGroup(event: { added: boolean; layer: CatalogItemLayer }) {
    const added = event.added;
    const layer = event.layer;

    const layersAdded = this.store.view
      .all()
      .filter((item: CatalogItem) => item.id !== layer.id)
      .map((item: CatalogItem) => this.state.get(item).added || false);

    if (layersAdded.every(value => value === added)) {
      added ? this.add() : this.remove();
    } else if (this.added$.value === true) {
      this.added$.next(false);
    }
  }

  private evaluateAdded() {
    const added = this.store.all().every((item: CatalogItem) => {
      return (this.state.get(item).added || false) === true;
    });
    this.added$.next(added);
  }

  private evaluateDisabled(collapsed: boolean) {
    let disabled = false;
    if (this.toggleCollapsed === false) {
      disabled = collapsed;
    }
    this.disabled$.next(disabled);
  }

  onTitleClick() {
    this.collapsed = !this.collapsed;
  }
}
