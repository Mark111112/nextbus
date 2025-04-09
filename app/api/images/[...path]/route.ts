import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path || [];
    
    if (path.length < 2) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }
    
    // Extract movie ID and image type
    const movieId = path[0];
    const imageName = path[1];
    
    let imageUrl = '';
    
    // Check if this is an actor image
    if (imageName.startsWith('actor_')) {
      const actorId = imageName.split('_')[1].split('.')[0];
      
      // Fetch actor data to get avatar URL
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://busapi.furey.top/api';
        const response = await axios.get(`${apiUrl}/stars/${actorId}`);
        
        if (response.status === 200 && response.data && response.data.avatar) {
          imageUrl = response.data.avatar;
        }
      } catch (error) {
        console.error(`Failed to get actor data for ${actorId}:`, error);
      }
    }
    // Check if this is a cover image
    else if (imageName === 'cover.jpg') {
      // Fetch movie data to get image URL
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://busapi.furey.top/api';
        const response = await axios.get(`${apiUrl}/movies/${movieId}`);
        
        if (response.status === 200 && response.data && response.data.img) {
          const thumbUrl = response.data.img;
          
          // Convert thumbnail URL to high-quality cover URL
          if (thumbUrl.includes('thumb')) {
            // Extract thumb ID
            const thumbId = thumbUrl.split('/').pop()?.split('.')[0];
            if (thumbId) {
              imageUrl = `https://www.javbus.com/pics/cover/${thumbId}_b.jpg`;
            } else {
              imageUrl = thumbUrl;
            }
          } else if (thumbUrl.includes('pics.dmm.co.jp') && thumbUrl.includes('ps.jpg')) {
            // Convert DMM thumbnail to full size
            imageUrl = thumbUrl.replace('ps.jpg', 'pl.jpg');
          } else {
            imageUrl = thumbUrl;
          }
        }
      } catch (error) {
        console.error(`Failed to get movie data for ${movieId}:`, error);
      }
    }
    // Check if this is a sample image
    else if (imageName.startsWith('sample_')) {
      const sampleIndex = parseInt(imageName.split('_')[1].split('.')[0]) - 1;
      
      if (isNaN(sampleIndex) || sampleIndex < 0) {
        return NextResponse.json(
          { error: 'Invalid sample index' },
          { status: 400 }
        );
      }
      
      // Fetch movie data to get sample images
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://busapi.furey.top/api';
        const response = await axios.get(`${apiUrl}/movies/${movieId}`);
        
        if (response.status === 200 && response.data && response.data.samples) {
          const samples = response.data.samples;
          
          if (samples.length > sampleIndex) {
            imageUrl = samples[sampleIndex].src;
          }
        }
      } catch (error) {
        console.error(`Failed to get movie data for ${movieId}:`, error);
      }
    }
    
    // If we couldn't determine the image URL, return a 404
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }
    
    // Proxy the image from the source
    try {
      // Set up headers to mimic a browser
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.javbus.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'
      };
      
      const response = await axios.get(imageUrl, {
        headers,
        responseType: 'arraybuffer'
      });
      
      // Get content type from response
      const contentType = response.headers['content-type'] || 'image/jpeg';
      
      // Return the image with appropriate content type
      return new NextResponse(response.data, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });
    } catch (error) {
      console.error(`Failed to proxy image from ${imageUrl}:`, error);
      
      return NextResponse.json(
        { error: 'Failed to proxy image' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Error serving image:', error);
    
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 