// Test script for movie-summary functionality
const axios = require('axios');

// Enhanced age verification cookies
const cookies = [
  'age_check_done=1',
  'cklg=ja',  // Language setting
  'uid=apt',  // User identifier
  'adultchecked=1', // Additional age check
  'check_done=1', // Another variation
  'digital_check=true' // Digital content check
].join('; ');

// Set up headers to mimic a browser
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cookie': cookies,
  'Referer': 'https://www.dmm.co.jp/',
};

// Axios config with enhanced settings
const axiosConfig = {
  headers,
  timeout: 10000,
  maxRedirects: 5, // Allow following redirects
  validateStatus: (status) => status >= 200 && status < 500, // Accept all responses except server errors
};

// Helper function to check if a redirect is age verification
const isAgeVerificationRedirect = (url) => {
  return url.includes('/age_check/') || 
         url.includes('/age_confirmation/') || 
         url.includes('/notice/') ||
         url.includes('confirm?');
};

// Function to test a direct request to DMM
async function testDmmRequest() {
  try {
    // First try to get past age verification if needed
    console.log('Making initial request to DMM homepage...');
    const initialResponse = await axios.get('https://www.dmm.co.jp/', axiosConfig);
    
    console.log('Initial response status:', initialResponse.status);
    console.log('Initial response URL:', initialResponse.request?.responseURL || 'No redirect');
    
    // If we're redirected to age verification, handle it
    if (initialResponse.request?.responseURL && 
        isAgeVerificationRedirect(initialResponse.request.responseURL)) {
      console.log('Handling age verification redirect...');
      
      // Try to get past age verification by directly requesting the verification URL with proper cookies
      const verificationUrl = initialResponse.request.responseURL;
      const verifyResponse = await axios.get(verificationUrl, {
        ...axiosConfig,
        headers: {
          ...headers,
          'Cookie': cookies + '; age_check_done=1',
        }
      });
      
      console.log('Verification response status:', verifyResponse.status);
      console.log('Verification response URL:', verifyResponse.request?.responseURL || 'No redirect');
    }
    
    // Test a movie page
    const movieId = 'ipz-127';
    const normalizedId = movieId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const movieUrl = `https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=118${normalizedId}/`;
    
    console.log('Testing movie URL:', movieUrl);
    const movieResponse = await axios.get(movieUrl, axiosConfig);
    
    console.log('Movie response status:', movieResponse.status);
    console.log('Movie response URL:', movieResponse.request?.responseURL || 'No redirect');
    
    // Check if we got content or a verification page
    if (movieResponse.request?.responseURL && 
        isAgeVerificationRedirect(movieResponse.request.responseURL)) {
      console.log('Still getting age verification for movie page...');
    } else {
      console.log('Successfully accessed movie page!');
      // Check for content indicators
      const hasTitle = movieResponse.data.includes('<title>');
      const hasContent = movieResponse.data.includes('mg-b20 lh4');
      console.log('Page has title:', hasTitle);
      console.log('Page has content:', hasContent);
      
      // Extract a small sample of the content
      const contentSample = movieResponse.data.substring(0, 200) + '...';
      console.log('Content sample:', contentSample);
    }
    
  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response headers:', error.response.headers);
    }
  }
}

// Run the test
console.log('Starting DMM age verification test...');
testDmmRequest().then(() => {
  console.log('Test completed');
}).catch(err => {
  console.error('Test failed:', err);
}); 