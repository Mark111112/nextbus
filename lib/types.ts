export interface Movie {
  id: string;
  title: string;
  translated_title?: string;
  image_url: string;
  date: string;
  producer?: string;
  publisher?: string;
  director?: string;
  series?: string;
  // New structured entity fields with URLs
  director_obj?: {
    id: string;
    name: string;
    url: string;
  };
  producer_obj?: {
    id: string;
    name: string;
    url: string;
  };
  publisher_obj?: {
    id: string;
    name: string;
    url: string;
  };
  series_obj?: {
    id: string;
    name: string;
    url: string;
  };
  genres_obj?: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  videoLength?: string;
  summary?: string;
  translated_summary?: string;
  genres?: string[];
  actors?: Actor[];
  magnet_links?: MagnetLink[];
  sample_images?: SampleImage[];
  is_favorite?: boolean;
  gid?: string;
  uc?: string;
  // TMDB specific fields
  poster_path?: string;
  release_date?: string;
  overview?: string;
  credits?: {
    cast?: Array<{
      id: string;
      name: string;
    }>;
  };
}

export interface Actor {
  id: string;
  name: string;
  image_url: string;
  url?: string; // Add URL field for filtering by actor
  birthdate?: string;
  age?: string;
  height?: string;
  measurements?: string;
  birthplace?: string;
  hobby?: string;
  // TMDB specific fields
  profile_path?: string;
  biography?: string;
}

export interface MagnetLink {
  name: string;
  size: string;
  link: string;
  date: string;
  is_hd: boolean;
  has_subtitle: boolean;
}

export interface SampleImage {
  index: number;
  src: string;
  thumbnail: string;
  url: string;
}

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  has_next: boolean;
  next_page: number;
  pages: number[];
}

export interface FanzaMapping {
  [key: string]: string;
}

export interface FanzaSuffix {
  [key: string]: string;
}

export interface TranslationConfig {
  api_url: string;
  source_lang: string;
  target_lang: string;
  api_token: string;
  model: string;
}

export interface Config {
  api_url: string;
  watch_url_prefix: string;
  fanza_mappings: FanzaMapping;
  fanza_suffixes: FanzaSuffix;
  translation: TranslationConfig;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
} 