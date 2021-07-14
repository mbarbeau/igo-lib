import { strEnum } from '@igo2/utils';

export const PrintOutputFormat = strEnum(['Pdf', 'Image']);

export type PrintOutputFormat = keyof typeof PrintOutputFormat;

export const PrintPaperFormat = strEnum([
  'A0',
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'Letter',
  'Legal'
]);
export type PrintPaperFormat = keyof typeof PrintPaperFormat;

export const PrintOrientation = strEnum(['landscape', 'portrait']);
export type PrintOrientation = keyof typeof PrintOrientation;

export const PrintResolution = strEnum(['72', '96', '150', '300']);
export type PrintResolution = keyof typeof PrintResolution;

export const PrintSaveImageFormat = strEnum([
  'Bmp',
  'Gif',
  'Jpeg',
  'Png',
  'Tiff'
]);
export type PrintSaveImageFormat = keyof typeof PrintSaveImageFormat;

export const PrintLegendPosition = strEnum([
  'none',
  'topright',
  'topleft',
  'bottomleft',
  'bottomright',
  'newpage'
]);
export type PrintLegendPosition = keyof typeof PrintLegendPosition;
