export interface SearchSourceOptions {
  title?: string;
  searchUrl?: string;
  available?: boolean;
  enabled?: boolean;
  order?: number;
  distance?: number;
  params?: { [key: string]: string };
  settings?: SearchSourceSettings[];
  showInPointerSummary?: boolean;
  showInSettings?: boolean;
}

export interface SearchSourceSettings {
  type: 'radiobutton' | 'checkbox';
  values: SettingOptions[];
  title: string;
  name: string;
  allEnabled?: boolean;
}

export interface SettingOptions {
  value: string | number;
  enabled: boolean;
  title: string;
  hashtags?: string[];
  available?: boolean;
}

export interface TextSearchOptions {
  params?: { [key: string]: string };
  searchType?: 'Feature' | 'Layer'; // refer to search.enum.ts SEARCH_TYPES = [FEATURE, LAYER];
  getEnabledOnly?: boolean;
  extent?: [number, number, number, number];
  page?: number;
  sourceId?: string;
  forceNA?: boolean;
}

export interface ReverseSearchOptions {
  distance?: number;
  conf?: number;
  zoom?: number;
  params?: { [key: string]: string };
}
