import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Get the API base URL from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://busapi.furey.top/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movieId = params.id;
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const gid = searchParams.get('gid') || '';
    const uc = searchParams.get('uc') || '';
    const sortBy = searchParams.get('sortBy') || 'size';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    console.log(`Fetching magnet links for movie: ${movieId}, gid: ${gid}, uc: ${uc}`);
    
    // Set up headers to mimic a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Referer': 'https://www.javbus.com/',
      'Accept': 'application/json',
      'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'
    };
    
    // Build query parameters
    const queryParams: Record<string, string> = {};
    if (gid) queryParams.gid = gid;
    if (uc) queryParams.uc = uc;
    if (sortBy) queryParams.sortBy = sortBy;
    if (sortOrder) queryParams.sortOrder = sortOrder;
    
    // Send request to the actual API
    const apiUrl = `${API_BASE_URL}/magnets/${movieId}`;
    console.log(`Proxying request to: ${apiUrl}`);
    
    const response = await axios.get(apiUrl, { 
      headers,
      params: queryParams,
      timeout: 10000
    });
    
    if (response.status === 200) {
      // Return the magnets data
      return NextResponse.json(response.data);
    } else {
      console.error(`Failed to get magnets: ${response.status}`);
      return NextResponse.json(
        { error: 'Failed to get magnet links' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Error getting magnet links:', error);
    
    // Detailed error response
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { 
          error: 'Failed to get magnet links',
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        },
        { status: error.response?.status || 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get magnet links' },
      { status: 500 }
    );
  }
} 