import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';

// Constants from video_player2.py
const WATCH_URL_PREFIX = process.env.NEXT_PUBLIC_WATCH_URL_PREFIX || 'https://missav.ai';
const VIDEO_M3U8_PREFIX = 'https://surrit.com/';
const VIDEO_PLAYLIST_SUFFIX = '/playlist.m3u8';
const MATCH_UUID_PATTERN = /m3u8\|([a-f0-9\|]+)\|com\|surrit\|https\|video/;
const UUID_PATTERN = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;
const RESOLUTION_PATTERN = /RESOLUTION=(\d+)x(\d+)/g;

// Browser-like headers
const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': WATCH_URL_PREFIX,
  'Origin': WATCH_URL_PREFIX,
  'Accept': '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'
};

// Create axios instance with better configuration
const axiosInstance = axios.create({
  timeout: 30000,
  httpAgent: new https.Agent({
    keepAlive: true,
    rejectUnauthorized: false
  }),
  responseType: 'arraybuffer',
  maxRedirects: 5,
  headers: HEADERS
});

/**
 * Fetch video metadata to get UUID or direct m3u8 URL
 */
async function fetchMetadata(movieId: string): Promise<{ uuid?: string, directUrl?: string } | null> {
  console.log(`Fetching metadata for movie ID: ${movieId}`);
  const movieUrl = `${WATCH_URL_PREFIX}/${movieId}`;
  
  // Try multiple times to fetch the HTML
  let html = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await axiosInstance.get(movieUrl);
      html = response.data.toString('utf-8');
      break;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed to fetch HTML:`, error);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!html) {
    console.error(`Failed to fetch HTML for ${movieUrl}`);
    return null;
  }
  
  // Define patterns to match, similar to video_player2.py
  const patterns = [
    // Standard UUID matching pattern
    MATCH_UUID_PATTERN,
    // Backup pattern 1: direct surrit.com URL
    /https:\/\/surrit\.com\/([a-f0-9-]+)\/playlist\.m3u8/,
    // Backup pattern 2: video tag src
    /video[^>]*src=["'](https:\/\/surrit\.com\/[^"']+)["']/,
    // Backup pattern 3: find all UUID format
    UUID_PATTERN,
    // Backup pattern 4: find any .m3u8 links
    /https?:\/\/[^"'<>\s]+\.m3u8/,
    // Backup pattern 5: find JS-set video sources
    /source\s*=\s*["']+(https?:\/\/[^"'<>\s]+\.m3u8)['"]+/
  ];
  
  // Direct m3u8 URL to return if we don't find a UUID
  let directM3u8Url = null;
  
  console.log("Attempting to match video source...");
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = html.match(pattern);
    
    if (match) {
      console.log(`Successfully matched pattern ${i + 1}`);
      
      if (i === 0) { // Original pattern: special UUID format
        const result = match[1] as string;
        const uuid = result.split('|').reverse().join('-');
        if (UUID_PATTERN.test(uuid)) {
          console.log(`UUID format validated: ${uuid}`);
          return { uuid };
        }
      } else if (i === 1) { // Pattern 1: direct playlist link with UUID
        const uuid = match[1] as string;
        if (UUID_PATTERN.test(uuid)) {
          console.log(`UUID format validated: ${uuid}`);
          return { uuid };
        }
      } else if (i === 2) { // Pattern 2: video tag src URL
        const urlPart = match[1] as string;
        if (urlPart.endsWith('.m3u8')) {
          console.log(`Found direct m3u8 link: ${urlPart}`);
          directM3u8Url = urlPart;
        } else {
          const uuidMatch = urlPart.match(/\/([a-f0-9-]+)\//);
          if (uuidMatch && UUID_PATTERN.test(uuidMatch[1])) {
            console.log(`UUID format validated: ${uuidMatch[1]}`);
            return { uuid: uuidMatch[1] };
          }
        }
      } else if (i === 3) { // Pattern 3: direct UUID format match
        const uuid = match[0] as string;
        if (UUID_PATTERN.test(uuid)) {
          console.log(`UUID format validated: ${uuid}`);
          return { uuid };
        }
      } else if (i === 4 || i === 5) { // Patterns 4 and 5: direct m3u8 links
        directM3u8Url = i === 5 ? match[1] as string : match[0] as string;
        console.log(`Found direct m3u8 link: ${directM3u8Url}`);
      }
    }
  }
  
  // If we found a direct m3u8 URL but no UUID, use the direct URL
  if (directM3u8Url) {
    console.log(`No UUID found, using direct m3u8 link: ${directM3u8Url}`);
    return { directUrl: directM3u8Url };
  }
  
  console.error("Failed to match video source.");
  return null;
}

/**
 * Get the playlist URL from UUID
 */
async function getPlaylistUrl(uuid: string): Promise<string | null> {
  const playlistUrl = `${VIDEO_M3U8_PREFIX}${uuid}${VIDEO_PLAYLIST_SUFFIX}`;
  console.log(`Playlist URL: ${playlistUrl}`);
  
  // Verify URL is accessible
  try {
    await axiosInstance.get(playlistUrl);
    console.log(`Playlist URL verified successfully, accessible`);
    return playlistUrl;
  } catch (error) {
    console.error(`Failed to access playlist URL: ${playlistUrl}`, error);
    return null;
  }
}

/**
 * Get the stream URL with selected quality
 */
async function getStreamUrl(movieId: string, quality?: string): Promise<string | null> {
  // First try to get the metadata
  const metadata = await fetchMetadata(movieId);
  if (!metadata) {
    return null;
  }
  
  // Check if we got a direct URL
  if (metadata.directUrl) {
    console.log(`Using direct playlist URL: ${metadata.directUrl}`);
    return metadata.directUrl;
  }
  
  // Standard UUID processing
  if (!metadata.uuid) {
    return null;
  }
  
  const playlistUrl = await getPlaylistUrl(metadata.uuid);
  if (!playlistUrl) {
    return null;
  }
  
  // Try to analyze playlist content for resolution info
  console.log(`Analyzing playlist content...`);
  try {
    const response = await axiosInstance.get(playlistUrl);
    const playlistContent = response.data.toString('utf-8');
    
    // Check if it contains resolution information
    const matches = Array.from(playlistContent.matchAll(RESOLUTION_PATTERN));
    if (matches.length === 0) {
      console.log(`No resolution information found in playlist, using main playlist`);
      return playlistUrl;
    }
    
    // Handle multiple resolutions
    try {
      // Create quality map from matches
      const qualityMap: Record<string, string> = {};
      (matches as RegExpExecArray[]).forEach((match: RegExpExecArray) => {
        const width = match[1] as string;
        const height = match[2] as string;
        qualityMap[height] = width;
      });
      
      const qualityList = Object.keys(qualityMap).sort((a, b) => parseInt(a) - parseInt(b));
      
      if (!quality) {
        // Get highest resolution
        const finalQuality = `${qualityList[qualityList.length-1]}p`;
        const lines = playlistContent.split('\n');
        const resolutionUrl = lines[lines.length - 2];
        
        console.log(`Selected quality: ${finalQuality}, URL: ${resolutionUrl}`);
        
        // Check if resolutionUrl is a complete URL
        if (resolutionUrl.startsWith('http')) {
          return resolutionUrl;
        } else {
          // Construct relative path
          const baseUrl = playlistUrl.split('/').slice(0, -1).join('/');
          return `${baseUrl}/${resolutionUrl}`;
        }
      } else {
        // Find closest to requested quality
        const target = parseInt(quality.replace('p', ''));
        const heights = qualityList.map(h => parseInt(h));
        const closestHeight = heights.reduce((prev, curr) => {
          return (Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev);
        });
        
        const finalQuality = `${closestHeight}p`;
        
        // Try to find URL for this resolution
        const urlPatterns = [
          `${qualityMap[closestHeight.toString()]}x${closestHeight}/video.m3u8`,
          `${closestHeight}p/video.m3u8`
        ];
        
        let resolutionUrl = null;
        let found = false;
        
        for (const pattern of urlPatterns) {
          if (playlistContent.includes(pattern)) {
            const lines = playlistContent.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(pattern)) {
                resolutionUrl = lines[i];
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
        
        if (!found) {
          // If not found, use the last non-comment line
          const nonCommentLines = playlistContent.split('\n').filter((l: string) => !l.startsWith('#'));
          resolutionUrl = nonCommentLines.length ? nonCommentLines[nonCommentLines.length - 1] 
                                                 : playlistContent.split('\n')[playlistContent.split('\n').length - 1];
        }
        
        console.log(`Selected quality: ${finalQuality}, URL: ${resolutionUrl}`);
        
        // Check if resolutionUrl is a complete URL
        if (resolutionUrl.startsWith('http')) {
          return resolutionUrl;
        } else {
          // Construct relative path
          const baseUrl = playlistUrl.split('/').slice(0, -1).join('/');
          return `${baseUrl}/${resolutionUrl}`;
        }
      }
    } catch (error) {
      console.error(`Error parsing playlist: ${error}, will use main playlist URL`);
      return playlistUrl;
    }
  } catch (error) {
    console.error(`Failed to get playlist content: ${error}`);
    return playlistUrl;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movieId = params.id;
    
    // Get the URL path (e.g., /path/to/file.mp4 or /playlist.m3u8)
    const { pathname } = new URL(request.url);
    const pathParts = pathname.split('/');
    const videoPath = pathParts.slice(pathParts.indexOf('[id]') + 1).join('/') || 'index.m3u8';
    
    // Get query parameters from the original request
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const quality = queryParams['quality'] as string || undefined;
    
    // Build the query string
    const queryString = Object.keys(queryParams).length > 0 
      ? '?' + new URLSearchParams(queryParams).toString() 
      : '';
    
    // If the videoPath is index.m3u8 or ends with .m3u8 and we're not requesting a specific file part,
    // use the enhanced stream URL logic
    let targetUrl;
    if ((videoPath === 'index.m3u8' || videoPath === 'playlist.m3u8' || videoPath === 'master.m3u8') && !pathParts.slice(pathParts.indexOf('[id]') + 1).includes('/')) {
      console.log(`Video proxy: Getting optimized stream URL for ${movieId}`);
      const streamUrl = await getStreamUrl(movieId, quality);
      if (!streamUrl) {
        return NextResponse.json(
          { error: 'Failed to get stream URL' },
          { status: 404 }
        );
      }
      targetUrl = streamUrl;
    } else {
      // For segment files or other paths, build URL based on the standard pattern
      console.log(`Video proxy: Standard proxy for ${movieId}/${videoPath}${queryString}`);
      
      // Use cached UUID from previous request if available
      let baseUrl = `${WATCH_URL_PREFIX}/${movieId}`;
      
      // If it's a ts segment, it might be from surrit.com directly
      if (videoPath.endsWith('.ts')) {
        const metadata = await fetchMetadata(movieId);
        if (metadata && metadata.uuid) {
          const baseUrlParts = `${VIDEO_M3U8_PREFIX}${metadata.uuid}`.split('/');
          baseUrlParts.pop(); // Remove last part
          baseUrl = baseUrlParts.join('/');
        } else if (metadata && metadata.directUrl) {
          const baseUrlParts = metadata.directUrl.split('/');
          baseUrlParts.pop(); // Remove last part
          baseUrl = baseUrlParts.join('/');
        }
      }
      
      targetUrl = `${baseUrl}/${videoPath}${queryString}`;
    }
    
    console.log(`Final target URL: ${targetUrl}`);
    
    // Set up browser-like headers with range if present
    const headers: Record<string, string> = { ...HEADERS };
    if (request.headers.get('range')) {
      headers['Range'] = request.headers.get('range') || '';
    }
    
    // Make the request to the target URL
    const response = await axiosInstance.get(targetUrl, { 
      headers,
      responseType: 'arraybuffer'
    });
    
    // Extract content type and other relevant headers
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    
    // Create response headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range'
    };
    
    // For HLS content, we need to modify the m3u8 file contents
    if (contentType.includes('application/vnd.apple.mpegurl') || 
        contentType.includes('application/x-mpegurl') ||
        videoPath.endsWith('.m3u8')) {
      // Convert buffer to string
      let m3u8Content = Buffer.from(response.data).toString('utf-8');
      
      // Replace URLs in the m3u8 file to point to our proxy
      // Replace absolute URLs
      m3u8Content = m3u8Content.replace(
        new RegExp(`https?://[^/]+/${movieId}/`, 'g'), 
        `/api/video-proxy/${movieId}/`
      );
      
      // Replace other absolute URLs that might not contain movieId
      m3u8Content = m3u8Content.replace(
        /https?:\/\/[^/]+\/([^/]+\/)*(?!http)/g,
        (match) => {
          if (match.includes('surrit.com') || !match.includes('http')) {
            return `/api/video-proxy/${movieId}/`;
          }
          return match;
        }
      );
      
      // Replace relative URLs (those not starting with http)
      m3u8Content = m3u8Content.replace(
        /^((?!https?:\/\/).+\.ts)/gm, 
        `/api/video-proxy/${movieId}/$1`
      );
      
      // Return the modified content
      return new NextResponse(m3u8Content, {
        status: 200,
        headers: responseHeaders
      });
    }
    
    // Add content-length header for non-m3u8 content
    if (response.headers['content-length']) {
      responseHeaders['Content-Length'] = response.headers['content-length'];
    }
    
    // Add range headers if present
    if (response.headers['content-range']) {
      responseHeaders['Content-Range'] = response.headers['content-range'];
      responseHeaders['Accept-Ranges'] = 'bytes';
    }
    
    // Handle partial content response
    if (response.status === 206) {
      return new NextResponse(response.data, {
        status: 206,
        headers: responseHeaders
      });
    }
    
    // Return the response
    return new NextResponse(response.data, {
      status: 200,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Video proxy error:', error);
    
    // Create detailed error response
    let errorMessage = 'Failed to proxy video';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      errorMessage = `Video proxy error: ${error.message}`;
      statusCode = error.response?.status || 500;
      
      // If there's a network error or timeout, return a more specific error
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Video server connection timed out';
        statusCode = 504; // Gateway Timeout
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Video server refused connection';
        statusCode = 503; // Service Unavailable
      }
    }
    
    // Return JSON error for requests expecting JSON
    const acceptHeader = request.headers.get('accept') || '';
    if (acceptHeader.includes('application/json')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }
    
    // Return text error for other requests
    return new NextResponse(errorMessage, {
      status: statusCode,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range'
    }
  });
} 