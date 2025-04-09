import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';

// Create axios instance with better configuration for streaming
const axiosInstance = axios.create({
  timeout: 30000,
  httpAgent: new https.Agent({
    keepAlive: true,
    rejectUnauthorized: false
  }),
  responseType: 'arraybuffer',
  maxRedirects: 5
});

/**
 * Proxy stream data to avoid CORS issues
 * This handles HLS, .m3u8 files and other media assets
 */
export async function GET(
  request: NextRequest,
) {
  try {
    // Get URL from query parameters
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }
    
    console.log(`[Stream Proxy] Forwarding request to: ${url}`);
    
    // Parse the URL to get base URL for relative paths
    const parsedUrl = new URL(url);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/') + 1)}`;
    
    // Set up browser-like headers
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': parsedUrl.origin,
      'Origin': parsedUrl.origin
    };
    
    // Forward range headers if present
    if (request.headers.get('range')) {
      headers['Range'] = request.headers.get('range') || '';
    }
    
    // Make the request to the target URL
    const response = await axiosInstance.get(url, { 
      headers,
      responseType: 'arraybuffer'
    });
    
    // Get content type
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    
    // Set CORS and other response headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range'
    };
    
    // Special handling for HLS content
    if (contentType.includes('application/vnd.apple.mpegurl') || 
        contentType.includes('application/x-mpegurl') ||
        url.endsWith('.m3u8')) {
      
      // Convert buffer to string
      let m3u8Content = Buffer.from(response.data).toString('utf-8');
      
      // Process each line to handle relative and absolute URLs
      const processedLines = m3u8Content.split('\n').map(line => {
        // Skip comments and empty lines
        if (line.trim() === '' || line.startsWith('#')) {
          return line;
        }
        
        // Process URLs
        let absoluteUrl;
        if (line.startsWith('http')) {
          // Already absolute URL
          absoluteUrl = line;
        } else {
          // Convert relative URL to absolute
          absoluteUrl = new URL(line, baseUrl).toString();
        }
        
        // Wrap the URL in our proxy
        return `/api/proxy/stream?url=${encodeURIComponent(absoluteUrl)}`;
      });
      
      // Join lines back together
      const processedContent = processedLines.join('\n');
      
      // Return the modified content
      return new NextResponse(processedContent, {
        status: 200,
        headers: responseHeaders
      });
    }
    
    // For non-m3u8 content, forward other important headers
    if (response.headers['content-length']) {
      responseHeaders['Content-Length'] = response.headers['content-length'];
    }
    
    if (response.headers['content-range']) {
      responseHeaders['Content-Range'] = response.headers['content-range'];
      responseHeaders['Accept-Ranges'] = 'bytes';
    }
    
    // Handle partial content response (206)
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
    console.error('[Stream Proxy] Request failed:', error);
    
    // Create detailed error response
    let errorMessage = 'Stream proxy error';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      errorMessage = `Stream proxy error: ${error.message}`;
      statusCode = error.response?.status || 500;
      
      // Handle specific errors
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Connection timed out';
        statusCode = 504; // Gateway Timeout
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused';
        statusCode = 503; // Service Unavailable
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range'
    }
  });
} 