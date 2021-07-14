import { Observable } from 'rxjs';

import { CommonVectorStyleOptions } from '../../utils/commonVectorStyle.interface';
import { SearchSource } from './sources/source';

export interface Research {
  request: Observable<SearchResult[]>;
  reverse: boolean;
  source: SearchSource;
}

export interface SearchResult<T = { [key: string]: any }> {
  data: T;
  source: SearchSource;
  meta: {
    dataType: string;
    id: string;
    title: string;
    titleHtml?: string;
    icon: string;
    score?: number;
    nextPage?: boolean;
  };
  style?: {
    base?: CommonVectorStyleOptions;
    selection?: CommonVectorStyleOptions;
    focus?: CommonVectorStyleOptions;
  };
}
