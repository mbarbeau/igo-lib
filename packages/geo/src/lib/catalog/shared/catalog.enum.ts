export enum CatalogItemType {
  Layer = 'layer',
  Group = 'group'
}

export enum TypeCatalog {
  wms, wmts, baselayers, arcgisrest, tilearcgisrest, imagearcgisrest, composite
}

export type TypeCatalogStrings = keyof typeof TypeCatalog;
