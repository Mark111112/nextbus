'use client';

import axios from 'axios';
import { Actor, Movie, MagnetLink, Config } from './types';

// Default API URL - will be overridden by environment variable
let API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://busapi.furey.top/api';
let WATCH_URL_PREFIX = process.env.NEXT_PUBLIC_WATCH_URL_PREFIX || 'https://missav.ai';
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true';

// 使用代理来避免CORS问题
const useProxy = true;

// Immediately log the API URL when the module loads
console.log(`[API] 初始化设置 - API_URL: ${API_URL}, DEBUG: ${DEBUG}, useProxy: ${useProxy}`);

// Load fanza mappings from environment variable
const getFanzaMappings = (): Record<string, string> => {
  try {
    const mappingsStr = process.env.NEXT_PUBLIC_FANZA_MAPPINGS;
    if (mappingsStr) {
      return JSON.parse(mappingsStr);
    }
  } catch (error) {
    console.error('Error parsing fanza mappings:', error);
  }
  
  // Default mappings
  return {
    "ibw": "504ibw"
  };
};

// Load fanza suffixes from environment variable
const getFanzaSuffixes = (): Record<string, string> => {
  try {
    const suffixesStr = process.env.NEXT_PUBLIC_FANZA_SUFFIXES;
    if (suffixesStr) {
      return JSON.parse(suffixesStr);
    }
  } catch (error) {
    console.error('Error parsing fanza suffixes:', error);
  }
  
  // Default suffixes
  return {
    "ibw": "z"
  };
};

// 使用代理发送GET请求
const proxyGet = async (path: string, params: Record<string, any> = {}) => {
  const proxyParams = { ...params, path };
  return axios.get('/api/proxy', { params: proxyParams });
};

// Get movie data
export const getMovieData = async (movieId: string): Promise<Movie | null> => {
  try {
    console.log(`[API] 尝试获取影片数据: ${movieId}, API URL: ${API_URL}`);
    
    // 尝试发送一个HEAD请求来测试API是否可访问
    try {
      if (useProxy) {
        await proxyGet('movies');
      } else {
        await axios.head(API_URL);
      }
      console.log(`[API] API服务器可访问: ${API_URL}`);
    } catch (headError) {
      console.error(`[API] 警告: 无法连接到API服务器: ${API_URL}`, headError);
    }
    
    // 使用代理或直接请求
    const response = useProxy
      ? await proxyGet(`movies/${movieId}`)
      : await axios.get(`${API_URL}/movies/${movieId}`);
    
    console.log(`[API] 获取影片数据响应: 状态=${response.status}, 数据=`, response.data);
    
    if (response.status === 200) {
      const movieData = response.data;
      return formatMovieData(movieData);
    }
    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`[API] 获取影片数据失败 ${movieId}:`, 
        error.response ? `状态=${error.response.status}, 数据=${JSON.stringify(error.response.data || {})}` : 
        `消息=${error.message}, 请求配置=${JSON.stringify(error.config || {})}`);
    } else {
      console.error(`[API] 获取影片数据未知错误 ${movieId}:`, error);
    }
    return null;
  }
};

// Search for movies by keyword
export const searchMovies = async (
  keyword: string, 
  page: number = 1, 
  magnet: string = 'exist', 
  type: string = 'normal',
  filterType: string = '',
  filterValue: string = ''
) => {
  try {
    // Build query parameters
    const params: Record<string, string | number> = { page };
    if (magnet) params.magnet = magnet;
    if (type) params.type = type;
    if (filterType) params.filterType = filterType;
    if (filterValue) params.filterValue = filterValue;
    
    // Determine which endpoint to use based on keyword presence
    const endpoint = keyword ? 'movies/search' : 'movies';
    
    // Add keyword to params only if it's present and we're using the search endpoint
    if (keyword) {
      params.keyword = keyword;
    }
    
    console.log(`[API] 搜索电影: endpoint=${endpoint}, params=`, params);
    
    // 使用代理或直接请求
    const response = useProxy
      ? await proxyGet(endpoint, params)
      : await axios.get(`${API_URL}/${endpoint}`, { params });
    
    console.log(`[API] 搜索电影响应: 状态=${response.status}, 数据=`, response.data);
    
    if (response.status === 200) {
      const data = response.data;
      const movies = data.movies || [];
      const pagination = data.pagination || {};
      
      // Format movie data
      const formattedMovies = movies.map((movie: any) => ({
        id: movie.id || '',
        title: movie.title || '',
        image_url: movie.img || '',
        date: movie.date || '',
        translated_title: movie.translated_title || '',
        tags: movie.tags || []
      }));
      
      return {
        movies: formattedMovies,
        pagination: {
          current_page: pagination.currentPage || 1,
          total_pages: (pagination.pages || []).length,
          has_next: pagination.hasNextPage || false,
          next_page: pagination.nextPage || 1,
          pages: pagination.pages || []
        }
      };
    }
    
    return { movies: [], pagination: {} };
  } catch (error) {
    console.error('Search movies error:', error);
    return { movies: [], pagination: {} };
  }
};

// Get actor data
export const getActorData = async (actorId: string): Promise<Actor | null> => {
  try {
    const response = await axios.get(`${API_URL}/stars/${actorId}`);
    
    if (response.status === 200) {
      const actorData = response.data;
      
      return {
        id: actorData.id || '',
        name: actorData.name || '',
        image_url: actorData.avatar || '',
        birthdate: actorData.birthday || '',
        age: actorData.age || '',
        height: actorData.height || '',
        measurements: actorData.bust ? 
          `${actorData.bust} - ${actorData.waistline} - ${actorData.hipline}` : '',
        birthplace: actorData.birthplace || '',
        hobby: actorData.hobby || ''
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to get actor data for ${actorId}:`, error);
    return null;
  }
};

// Search for actors
export const searchActors = async (name: string) => {
  try {
    const response = await axios.get(`${API_URL}/stars/search`, {
      params: { keyword: name }
    });
    
    if (response.status === 200) {
      const data = response.data;
      return data.stars || [];
    }
    return [];
  } catch (error) {
    console.error('Search actors error:', error);
    return [];
  }
};

// Get actor's movies
export const getActorMovies = async (actorId: string, page: number = 1) => {
  try {
    const response = await axios.get(`${API_URL}/movies`, {
      params: {
        filterType: 'star',
        filterValue: actorId,
        page: page,
        magnet: 'all'
      }
    });
    
    if (response.status === 200) {
      const data = response.data;
      const movies = data.movies || [];
      
      // Format simplified movie data
      const formattedMovies = movies.map((movie: any) => ({
        id: movie.id || '',
        title: movie.title || '',
        image_url: movie.img || '',
        date: movie.date || ''
      }));
      
      return formattedMovies;
    }
    return [];
  } catch (error) {
    console.error(`Failed to get actor movies for ${actorId}:`, error);
    return [];
  }
};

// Get magnet links for a movie
export const getMagnetLinks = async (movieId: string, gid?: string, uc?: string): Promise<MagnetLink[]> => {
  try {
    // Build query parameters
    const params: Record<string, string> = {};
    if (gid) params.gid = gid;
    if (uc) params.uc = uc;
    
    // Use our proxy endpoint instead of directly calling the API
    const response = await axios.get(`/api/magnets/${movieId}`, { params });
    
    if (response.status === 200) {
      const magnets = response.data || [];
      
      // Format magnet links
      const formattedMagnets = magnets.map((magnet: any) => ({
        name: magnet.title || '',
        size: magnet.size || '',
        link: magnet.link || '',
        date: magnet.shareDate || '',
        is_hd: magnet.isHD || false,
        has_subtitle: magnet.hasSubtitle || false
      }));
      
      // Sort magnets: HD first, then with subtitles, then by size
      formattedMagnets.sort((a: MagnetLink, b: MagnetLink) => {
        if (a.is_hd !== b.is_hd) return a.is_hd ? -1 : 1;
        if (a.has_subtitle !== b.has_subtitle) return a.has_subtitle ? -1 : 1;
        
        // Convert size strings to numbers for comparison
        const sizeA = parseFloat(a.size.replace('GB', '').replace('MB', '').trim()) || 0;
        const sizeB = parseFloat(b.size.replace('GB', '').replace('MB', '').trim()) || 0;
        
        return sizeB - sizeA; // Descending order for size
      });
      
      return formattedMagnets;
    }
    return [];
  } catch (error) {
    console.error(`Failed to get magnet links for ${movieId}:`, error);
    return [];
  }
};

// Translate text using the translation API
export const translateText = async (
  text: string, 
  translate_summary: boolean = false, 
  movie_id: string = ''
) => {
  try {
    const response = await axios.post('/api/translate', {
      text,
      translate_summary,
      movie_id
    });
    
    if (response.status === 200) {
      return response.data.translated_text || '';
    }
    return '';
  } catch (error) {
    console.error('Translation error:', error);
    return '';
  }
};

// Get movie summary from FANZA
export const getMovieSummary = async (movieId: string) => {
  try {
    const response = await axios.get(`/api/movie-summary/${movieId}`, {
      // Add a timeout to avoid long waits
      timeout: 10000,
      // Only try once to avoid browser console spam
      validateStatus: (status) => status < 500
    });
    
    if (response.status === 200 && response.data.summary) {
      return {
        summary: response.data.summary || '',
        translated_summary: response.data.translated_summary || '',
        available: true
      };
    }
    
    // If we got a 404 or any other status, clearly indicate summary is not available
    console.log(`Summary not available for ${movieId}: ${response.status}`);
    return { 
      summary: '', 
      translated_summary: '', 
      available: false 
    };
  } catch (error) {
    console.error(`Failed to get summary for ${movieId}:`, error);
    // Clearly indicate summary is not available to prevent further attempts
    return { 
      summary: '', 
      translated_summary: '', 
      available: false 
    };
  }
};

// Helper function to format movie data
export const formatMovieData = (movieData: any): Movie => {
  const formattedMovie: Movie = {
    id: movieData.id || '',
    title: movieData.title || '',
    translated_title: movieData.translated_title || '',
    image_url: movieData.img || '',
    date: movieData.date || '',
    producer: movieData.publisher?.name || movieData.publisher || '',
    summary: movieData.description || '',
    translated_summary: movieData.translated_description || '',
    genres: (movieData.genres || []).map((genre: any) => genre.name || ''),
    actors: [],
    magnet_links: [],
    sample_images: [],
    gid: movieData.gid || '',
    uc: movieData.uc || '0'
  };

  // Format actors
  if (movieData.stars && Array.isArray(movieData.stars)) {
    formattedMovie.actors = movieData.stars.map((actor: any) => ({
      id: actor.id || '',
      name: actor.name || '',
      image_url: actor.avatar || ''
    }));
  }

  // Format magnet links
  if (movieData.magnets && Array.isArray(movieData.magnets)) {
    formattedMovie.magnet_links = movieData.magnets.map((magnet: any) => ({
      name: magnet.name || '',
      size: magnet.size || '',
      link: magnet.link || '',
      date: magnet.date || '',
      is_hd: magnet.isHD || false,
      has_subtitle: magnet.hasSubtitle || false
    }));
  }

  // Format sample images
  if (movieData.samples && Array.isArray(movieData.samples)) {
    formattedMovie.sample_images = movieData.samples.map((sample: any, index: number) => ({
      index: index + 1,
      src: sample.src || '',
      thumbnail: sample.thumbnail || sample.src || '',
      url: `/api/images/${formattedMovie.id}/sample_${index + 1}`
    }));
  }

  return formattedMovie;
};

// Update API URL and watch URL prefix - useful when loading from config
export const updateApiConfig = (apiUrl: string, watchUrlPrefix: string) => {
  if (apiUrl) API_URL = apiUrl;
  if (watchUrlPrefix) WATCH_URL_PREFIX = watchUrlPrefix;
  console.log(`API config updated: ${API_URL}, ${WATCH_URL_PREFIX}`);
};

// Get watch URL prefix
export const getWatchUrlPrefix = () => WATCH_URL_PREFIX;

// 直接测试API连接
export const testApiConnection = async () => {
  try {
    console.log(`[API] 正在测试API连接: ${API_URL}`);
    const startTime = Date.now();
    
    // 使用代理或直接请求
    const response = useProxy
      ? await proxyGet('movies', { page: 1 })
      : await axios.get(`${API_URL}/movies?page=1`);
      
    const endTime = Date.now();
    console.log(`[API] API测试成功: 响应时间=${endTime - startTime}ms, 状态=${response.status}`);
    console.log(`[API] API返回数据:`, response.data);
    return {
      success: true,
      message: `连接成功 (${endTime - startTime}ms)`,
      data: response.data
    };
  } catch (error) {
    console.error('[API] API测试失败:', error);
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : null,
        request: error.request || null
      };
    }
    return {
      success: false,
      message: String(error)
    };
  }
}; 