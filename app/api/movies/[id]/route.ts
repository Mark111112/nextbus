import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Get the API base URL from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://busapi.furey.top/api';

/**
 * GET handler for /api/movies/[id] endpoint
 * This acts as a proxy to forward requests to the actual API server
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movieId = params.id;
    
    // Get any additional query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    console.log(`[API Proxy] Forwarding request for movie: ${movieId}, params:`, queryParams);
    
    // Set up headers to mimic a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Referer': 'https://www.javbus.com/',
      'Accept': 'application/json',
      'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'
    };
    
    // Forward the request to the actual API
    const apiUrl = `${API_BASE_URL}/movies/${movieId}`;
    const response = await axios.get(apiUrl, { 
      headers,
      params: queryParams,
      timeout: 10000
    });
    
    // Return the API response data
    return NextResponse.json(response.data);
  } catch (error) {
    console.error(`[API Proxy] Movie request failed for ${params.id}:`, error);
    
    // Provide detailed error response
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: `API request failed: ${error.message}`,
          response: error.response?.data
        },
        { status: error.response?.status || 500 }
      );
    }
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: `API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
} 