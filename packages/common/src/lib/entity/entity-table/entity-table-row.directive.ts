import {
  Directive,
  Input,
  ElementRef,
  Renderer2,
  EventEmitter,
  Output,
  HostListener
} from '@angular/core';

import scrollIntoView from 'scroll-into-view-if-needed';

import { EntityTableScrollBehavior } from '../shared/entity.enums';

/**
 * Directive that handles an entity table row click and selection.
 */
@Directive({
  selector: '[igoEntityTableRow]'
})
export class EntityTableRowDirective {

  /**
   * Class added to a selected row
   */
  static selectedCls = 'igo-entity-table-row-selected';

  /**
   * Class added to a highlighted row
   */
  static highlightedCls = 'igo-entity-table-row-highlighted';

  /**
   * Whether a row supports selection
   */
  @Input() selection = false;

  /**
   * Whether clicking a row should select it (if selection is true)
   */
  @Input() selectOnClick: boolean = true;

  /**
   * Whether the selected row should be highlighted
   */
  @Input() highlightSelection: boolean = true;

  /**
   * Whether a row is selected
   */
  @Input()
  set selected(value: boolean) {
    if (this.selection === false) { return; }
    if (value === this._selected) { return; }

    this.toggleSelected(value);
    this.scroll();
  }
  get selected(): boolean {
    return this._selected;
  }
  private _selected = false;

  /**
   * Scroll behavior on selection
   */
  @Input()
  scrollBehavior: EntityTableScrollBehavior = EntityTableScrollBehavior.Auto;

  /**
   * Event emitted when a row is selected
   */
  @Output() select = new EventEmitter<EntityTableRowDirective>();

  /**
   * When a row is clicked, select it if it's supported
   * @ignore
   */
  @HostListener('click')
  onClick() {
    if (this.selection === false || this.selectOnClick === false) {
      return;
    }

    this.toggleSelected(true);
    this.select.emit(this);
  }

  constructor(private renderer: Renderer2, private el: ElementRef) {}

  /**
   * Select a row and add or remove the selected class from it
   * @param selected Whether the row should be selected
   */
  private toggleSelected(selected: boolean) {
    this._selected = selected;
    if (selected === true) {
      this.addCls(EntityTableRowDirective.selectedCls);
      if (this.highlightSelection === true) {
        this.addCls(EntityTableRowDirective.highlightedCls);
      }
    } else {
      this.removeCls(EntityTableRowDirective.selectedCls);
      this.removeCls(EntityTableRowDirective.highlightedCls);
    }
  }

  /**
   * Scroll to the selected row
   */
  private scroll() {
    if (this._selected === true) {
      scrollIntoView(this.el.nativeElement, {
        scrollMode: 'if-needed',
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  }

  /**
   * Add the selected CSS class
   */
  private addCls(cls: string) {
    this.renderer.addClass(this.el.nativeElement, cls);
  }

  /**
   * Remove the selected CSS class
   */
  private removeCls(cls: string) {
    this.renderer.removeClass(this.el.nativeElement, cls);
  }
}
