import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  FormControl,
  Validators
} from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import { PrintOptions } from '../shared/print.interface';

import {
  PrintOutputFormat,
  PrintPaperFormat,
  PrintOrientation,
  PrintResolution,
  PrintSaveImageFormat,
  PrintLegendPosition
} from '../shared/print.type';

@Component({
  selector: 'igo-print-form',
  templateUrl: './print-form.component.html',
  styleUrls: ['./print-form.component.scss']
})
export class PrintFormComponent implements OnInit {
  public form: FormGroup;
  public outputFormats = PrintOutputFormat;
  public paperFormats = PrintPaperFormat;
  public orientations = PrintOrientation;
  public resolutions = PrintResolution;
  public imageFormats = PrintSaveImageFormat;
  public legendPositions = PrintLegendPosition;
  public isPrintService = true;

  @Input() disabled$: BehaviorSubject<boolean>;

  @Input()
  get imageFormat(): PrintSaveImageFormat {
    return this.imageFormatField.value;
  }
  set imageFormat(value: PrintSaveImageFormat) {
    this.imageFormatField.setValue(value || PrintSaveImageFormat.Jpeg, {
      onlySelf: true
    });
  }

  @Input()
  get outputFormat(): PrintOutputFormat {
    return this.outputFormatField.value;
  }
  set outputFormat(value: PrintOutputFormat) {
    this.outputFormatField.setValue(value || PrintOutputFormat.Pdf, {
      onlySelf: true
    });
  }

  @Input()
  get paperFormat(): PrintPaperFormat {
    return this.paperFormatField.value;
  }
  set paperFormat(value: PrintPaperFormat) {
    this.paperFormatField.setValue(value || PrintPaperFormat.Letter, {
      onlySelf: true
    });
  }

  @Input()
  get orientation(): PrintOrientation {
    return this.orientationField.value;
  }
  set orientation(value: PrintOrientation) {
    this.orientationField.setValue(value || PrintOrientation.landscape, {
      onlySelf: true
    });
  }

  @Input()
  get resolution(): PrintResolution {
    return this.resolutionField.value;
  }
  set resolution(value: PrintResolution) {
    this.resolutionField.setValue(value || PrintResolution['96'], {
      onlySelf: true
    });
  }

  @Input()
  get legendPosition(): PrintLegendPosition {
    return this.legendPositionField.value;
  }
  set legendPosition(value: PrintLegendPosition) {
    this.legendPositionField.setValue(value || PrintLegendPosition.none, {
      onlySelf: true
    });
  }

  @Input()
  get title(): string {
    return this.titleField.value;
  }
  set title(value: string) {
    this.titleField.setValue(value, { onlySelf: true });
  }
  @Input()
  get subtitle(): string {
    return this.subtitleField.value;
  }
  set subtitle(value: string) {
    this.subtitleField.setValue(value, { onlySelf: true });
  }
  @Input()
  get comment(): string {
    return this.commentField.value;
  }
  set comment(value: string) {
    this.commentField.setValue(value, { onlySelf: true });
  }
  @Input()
  get showProjection(): boolean {
    return this.showProjectionField.value;
  }
  set showProjection(value: boolean) {
    this.showProjectionField.setValue(value, { onlySelf: true });
  }
  @Input()
  get showScale(): boolean {
    return this.showScaleField.value;
  }
  set showScale(value: boolean) {
    this.showScaleField.setValue(value, { onlySelf: true });
  }
  @Input()
  get showLegend(): boolean {
    return this.showLegendField.value;
  }
  set showLegend(value: boolean) {
    this.showLegendField.setValue(value, { onlySelf: true });
  }

  @Input()
  get doZipFile(): boolean {
    return this.doZipFileField.value;
  }
  set doZipFile(value: boolean) {
    this.doZipFileField.setValue(value, { onlySelf: true });
  }

  get outputFormatField() {
    return (this.form.controls as any).outputFormat as FormControl;
  }

  get paperFormatField() {
    return (this.form.controls as any).paperFormat as FormControl;
  }

  get imageFormatField() {
    return (this.form.controls as any).imageFormat as FormControl;
  }

  get orientationField() {
    return (this.form.controls as any).orientation as FormControl;
  }

  get resolutionField() {
    return (this.form.controls as any).resolution as FormControl;
  }

  get commentField() {
    return (this.form.controls as any).comment as FormControl;
  }

  get showProjectionField() {
    return (this.form.controls as any).showProjection as FormControl;
  }

  get showScaleField() {
    return (this.form.controls as any).showScale as FormControl;
  }

  get showLegendField() {
    return (this.form.controls as any).showLegend as FormControl;
  }

  get doZipFileField() {
    return (this.form.controls as any).doZipFile as FormControl;
  }

  get titleField() {
    return (this.form.controls as any).title as FormControl;
  }

  get subtitleField() {
    return (this.form.controls as any).subtitle as FormControl;
  }

  get legendPositionField() {
    return (this.form.controls as any).legendPosition as FormControl;
  }

  @Output() submit: EventEmitter<PrintOptions> = new EventEmitter();

  constructor(private formBuilder: FormBuilder) {
    this.form = this.formBuilder.group({
      title: ['', []],
      subtitle: ['', []],
      comment: ['', []],
      outputFormat: ['', [Validators.required]],
      paperFormat: ['', [Validators.required]],
      imageFormat: [ '', [Validators.required]],
      resolution: ['', [Validators.required]],
      orientation: ['', [Validators.required]],
      legendPosition: ['', [Validators.required]],
      showProjection: false,
      showScale: false,
      showLegend: false,
      doZipFile: [{hidden: this.isPrintService }]
    });
  }

  ngOnInit() {
    this.doZipFileField.setValue(false);
  }

  handleFormSubmit(data: PrintOptions, isValid: boolean) {
    data.isPrintService = this.isPrintService;
    if (isValid) {
      this.submit.emit(data);
    }
  }

  toggleImageSaveProp() {
    if (this.outputFormatField.value === 'Image') {
      this.isPrintService = false;
    } else {
      this.isPrintService = true;
    }
  }
}
