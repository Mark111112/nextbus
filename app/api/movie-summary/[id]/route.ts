import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Map of prefixes for FANZA
const getFanzaMappings = (): Record<string, string> => {
  try {
    const mappingsStr = process.env.FANZA_MAPPINGS;
    if (mappingsStr) {
      return JSON.parse(mappingsStr);
    }
  } catch (error) {
    console.error('Error parsing fanza mappings:', error);
  }
  
  // Default mappings from the original config
  return {
    "ibw": "504ibw",
    "abf": "118abf",
    "abp": "118abp",
    "atom": "1atom",
    "bazx": "7bazx",
    "bdd": "1BDD",
    "dandy": "1Dandy",
    "dph": "33dph",
    "dphn": "33dphn",
    "drtp": "1drpt",
    "emth": "h_1638emth",
    "fcp": "h_001fcp",
    "fsdss": "1fsdss",
    "fset": "1FSET",
    "gar": "1GAR",
    "gesu": "49gesu",
    "glod": "196glod",
    "gvg": "13gvg",
    "gvh": "13gvh",
    "hbad": "1HBAD",
    "hodv": "41hodv",
    "hunt": "1HUNT",
    "hvad": "1HVAD",
    "idol": "1IDOL",
    "iene": "1IENE",
    "iesp": "1IESP",
    "ksd": "5421ksd",
    "ktds": "h_094ktds",
    "lol": "12lol",
    "love": "h_491love",
    "midv": "48midv",
    "mjad": "h_402mjad",
    "mxgs": "h_068mxgs",
    "natr": "h_067natr",
    "need": "h_198need",
    "nhdt": "1NHDT",
    "nhdta": "1NHDTA",
    "nxg": "h_254nxg",
    "okad": "84okad",
    "open": "1open",
    "ped": "24ped",
    "piyo": "1piyo",
    "r": "h_093r",
    "rct": "1rct",
    "rctd": "1rctd",
    "sace": "1SACE",
    "sama": "h_244sama",
    "san": "h_796san",
    "sdde": "1SDDE",
    "sddm": "1SDDM",
    "sdmt": "1SDMT",
    "sma": "83sma",
    "star": "1STAR",
    "stars": "1stars",
    "svdvd": "1SVDVD",
    "sw": "h_635SW",
    "t": "55t",
    "tkbn": "h_254tkbn",
    "vspdr": "1VSPDR",
    "vspds": "1VSPDS",
    "wnz": "3wnz",
    // Additional mappings can be added here
  };
};

// Map of suffixes for FANZA
const getFanzaSuffixes = (): Record<string, string> => {
  try {
    const suffixesStr = process.env.FANZA_SUFFIXES;
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

// FANZA uses multiple URL templates
const URL_TEMPLATES = [
  "https://www.dmm.co.jp/mono/dvd/-/detail/=/cid={}/",
  "https://www.dmm.co.jp/digital/videoa/-/detail/=/cid={}/",
  "https://www.dmm.co.jp/digital/videoc/-/detail/=/cid={}/",
  "https://www.dmm.co.jp/digital/anime/-/detail/=/cid={}/",
  "https://www.dmm.co.jp/mono/anime/-/detail/=/cid={}/",
  "https://www.dmm.co.jp/digital/nikkatsu/-/detail/=/cid={}/"
];

// Function to normalize movie ID for FANZA - improved based on movieinfo.py
const normalizeMovieId = (movieId: string): string => {
  // Get mappings and suffixes
  const prefixMappings = getFanzaMappings();
  const suffixMappings = getFanzaSuffixes();
  
  // Convert to lowercase for case-insensitive matching
  const lowerId = movieId.toLowerCase();
  
  // Remove non-alphanumeric characters (like hyphens)
  const cleanedId = lowerId.replace(/[^a-z0-9]/g, '');
  
  // First try to match with a known prefix
  for (const [prefix, mappedPrefix] of Object.entries(prefixMappings)) {
    if (cleanedId.startsWith(prefix)) {
      // Get the numeric part after the prefix
      const numPart = cleanedId.slice(prefix.length);
      const numMatch = numPart.match(/^(\d+)/);
      
      if (numMatch) {
        const num = numMatch[1].padStart(3, '0'); // Ensure at least 3 digits
        console.log(`Found known prefix ${prefix}, mapping to ${mappedPrefix}`);
        
        // Check if we need to add a suffix
        const suffix = suffixMappings[prefix] || '';
        if (suffix) {
          console.log(`Adding suffix ${suffix}`);
        }
        
        const result = `${mappedPrefix}${num}${suffix}`;
        console.log(`Final mapped ID: ${result}`);
        return result;
      }
    }
  }
  
  // Standard format parsing (prefix + number)
  const match = cleanedId.match(/^([a-z]+)(\d+)$/);
  if (match) {
    const [, prefix, number] = match;
    
    // If we have a mapping for this prefix
    if (prefix in prefixMappings) {
      const mappedPrefix = prefixMappings[prefix];
      console.log(`Mapping prefix ${prefix} to ${mappedPrefix}`);
      
      // Ensure number is at least 3 digits
      const formattedNumber = number.padStart(3, '0');
      
      // Check if we need to add a suffix
      if (prefix in suffixMappings) {
        const suffix = suffixMappings[prefix];
        const result = `${mappedPrefix}${formattedNumber}${suffix}`;
        console.log(`Adding suffix ${suffix}, final ID: ${result}`);
        return result;
      } else {
        const result = `${mappedPrefix}${formattedNumber}`;
        console.log(`Final ID: ${result}`);
        return result;
      }
    }
    
    // No mapping, add default "00" between prefix and padded number
    const formattedNumber = number.padStart(3, '0');
    
    if (prefix in suffixMappings) {
      const suffix = suffixMappings[prefix];
      const result = `${prefix}00${formattedNumber}${suffix}`;
      console.log(`No prefix mapping but adding suffix ${suffix}, final ID: ${result}`);
      return result;
    } else {
      const result = `${prefix}00${formattedNumber}`;
      console.log(`No mapping, using default format, final ID: ${result}`);
      return result;
    }
  }
  
  // If format doesn't match standard patterns, return cleaned ID
  console.log(`Cannot match standard format, using original ID: ${cleanedId}`);
  return cleanedId;
};

// Get URLs to try for a movie ID
const getUrlsById = (movieId: string): string[] => {
  // If ID already contains underscores, use it directly
  if (movieId.includes('_')) {
    console.log(`Using ID with underscore: ${movieId}`);
    return URL_TEMPLATES.map(template => template.replace('{}', movieId));
  }
  
  // Normalize the ID according to FANZA's format
  const normalizedId = normalizeMovieId(movieId);
  console.log(`Normalized ${movieId} to ${normalizedId}`);
  
  // Generate all possible URLs using the templates
  const urls = URL_TEMPLATES.map(template => template.replace('{}', normalizedId));
  
  // For IDs matching certain patterns, prioritize digital video URLs
  if (/[a-z]+00\d{3,}/i.test(normalizedId)) {
    // Swap first two URLs to prioritize digital videoa
    [urls[0], urls[1]] = [urls[1], urls[0]];
    console.log(`Prioritizing digital URL: ${urls[0]}`);
  }
  
  return urls;
};

// Extract summary from JSON-LD script tag
const getSummaryFromJsonLd = (html: string): string | null => {
  try {
    // Find script tag with type application/ld+json
    const scriptTagMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    
    if (scriptTagMatch && scriptTagMatch[1]) {
      const jsonData = JSON.parse(scriptTagMatch[1]);
      if (jsonData.description) {
        console.log('Found summary in JSON-LD');
        return jsonData.description;
      }
    }
    return null;
  } catch (error) {
    console.error('Error parsing JSON-LD:', error);
    return null;
  }
};

// Extract summary from HTML content
const getSummaryFromHtml = (html: string): string | null => {
  try {
    // Try div.mg-b20.lh4 pattern (most common)
    const summaryDivMatch = html.match(/<div class="mg-b20 lh4">([\s\S]*?)<\/div>/);
    if (summaryDivMatch && summaryDivMatch[1]) {
      // Extract paragraph content
      const pMatch = summaryDivMatch[1].match(/<p class="mg-b20">([\s\S]*?)<\/p>/);
      if (pMatch && pMatch[1].trim()) {
        console.log('Found summary in p.mg-b20');
        // Remove HTML tags
        return pMatch[1].replace(/<[^>]+>/g, '').trim();
      }
      
      // Try any p tag
      const anyPMatch = summaryDivMatch[1].match(/<p>([\s\S]*?)<\/p>/);
      if (anyPMatch && anyPMatch[1].trim()) {
        console.log('Found summary in p tag');
        return anyPMatch[1].replace(/<[^>]+>/g, '').trim();
      }
      
      // Use entire div content
      const content = summaryDivMatch[1].replace(/<[^>]+>/g, '').trim();
      if (content) {
        console.log('Found summary in div.mg-b20.lh4');
        return content;
      }
    }
    
    // Try .txt.introduction p pattern
    const introPMatch = html.match(/<div class="txt introduction">[\s\S]*?<p>([\s\S]*?)<\/p>/i);
    if (introPMatch && introPMatch[1].trim()) {
      console.log('Found summary in .txt.introduction p');
      return introPMatch[1].replace(/<[^>]+>/g, '').trim();
    }
    
    // Try .nw-video-description pattern
    const descDivMatch = html.match(/<div class="nw-video-description">([\s\S]*?)<\/div>/i);
    if (descDivMatch && descDivMatch[1].trim()) {
      console.log('Found summary in .nw-video-description');
      return descDivMatch[1].replace(/<[^>]+>/g, '').trim();
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting HTML summary:', error);
    return null;
  }
};

// Extract summary from meta tags
const getSummaryFromMeta = (html: string): string | null => {
  try {
    // Try meta description
    const metaDescMatch = html.match(/<meta name="description" content="([^"]*?)"/i);
    if (metaDescMatch && metaDescMatch[1].trim()) {
      console.log('Found summary in meta description');
      return metaDescMatch[1].trim();
    }
    
    // Try Open Graph description
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]*?)"/i);
    if (ogDescMatch && ogDescMatch[1].trim()) {
      console.log('Found summary in og:description');
      return ogDescMatch[1].trim();
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting meta summary:', error);
    return null;
  }
};

// Helper function to check if a redirect is age verification
const isAgeVerificationRedirect = (url: string): boolean => {
  return url.includes('/age_check/') || 
         url.includes('/age_confirmation/') || 
         url.includes('/notice/') ||
         url.includes('confirm?');
};

// Function to check if content is from an age verification page rather than movie content
const isAgeVerificationContent = (html: string): boolean => {
  // Check for common content in the age verification page
  return html.includes('日本を代表するアダルトポータルへようこそ') || 
         html.includes('あなたは18歳以上ですか') || 
         html.includes('age_check') || 
         html.includes('年齢確認');
};

// Function to handle age verification and proceed to target URL
const bypassAgeVerification = async (targetUrl: string): Promise<{data: string, finalUrl: string} | null> => {
  try {
    console.log(`Attempting to bypass age verification for: ${targetUrl}`);
    
    // Enhanced age verification cookies
    const cookies = [
      'age_check_done=1',
      'cklg=ja',          // Language setting
      'uid=apt',          // User identifier
      'adultchecked=1',   // Additional age check
      'check_done=1',     // Another variation
      'digital_check=true', // Digital content check
      'declared=yes'      // Explicitly declared age
    ].join('; ');
    
    // Set up headers to mimic a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cookie': cookies,
      'Referer': 'https://www.dmm.co.jp/',
    };
    
    // Instead of following redirects, we'll handle them manually to properly process age verification
    const axiosConfig = {
      headers,
      timeout: 10000,
      maxRedirects: 0, // Don't follow redirects automatically
      validateStatus: (status: number) => status >= 200 && status < 500, // Accept all responses except server errors
    };
    
    // First attempt - direct request with age verification cookies
    let response = await axios.get(targetUrl, axiosConfig);
    
    // If we get a redirect to age verification page
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      const redirectUrl = new URL(response.headers.location, targetUrl).toString();
      console.log(`Redirected to: ${redirectUrl}`);
      
      // If it's an age verification redirect
      if (isAgeVerificationRedirect(redirectUrl)) {
        console.log('Handling age verification redirect');
        
        // Extract the rurl parameter if available (target URL after verification)
        let targetAfterVerification = targetUrl;
        try {
          const urlObj = new URL(redirectUrl);
          const rurl = urlObj.searchParams.get('rurl');
          if (rurl) {
            targetAfterVerification = decodeURIComponent(rurl);
            console.log(`Found target URL in rurl: ${targetAfterVerification}`);
          }
        } catch (e) {
          console.error('Error parsing redirect URL:', e);
        }
        
        // Make a POST request to the age verification page as if the user clicked "I Agree"
        const verificationResponse = await axios.post(redirectUrl, 
          'confirmed=yes&age_check_done=1', // Form data to simulate clicking "I Agree"
          {
            ...axiosConfig,
            headers: {
              ...headers,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Cookie': cookies + '; age_check_done=1; declared=yes;',
            }
          }
        );
        
        // Check if we were redirected to the target page
        if (verificationResponse.status >= 300 && verificationResponse.status < 400 && 
            verificationResponse.headers.location) {
          const finalRedirectUrl = new URL(
            verificationResponse.headers.location, 
            redirectUrl
          ).toString();
          
          console.log(`Post-verification redirect to: ${finalRedirectUrl}`);
          
          // Follow the final redirect
          const finalResponse = await axios.get(finalRedirectUrl, {
            ...axiosConfig,
            headers: {
              ...headers, 
              'Cookie': cookies + '; age_check_done=1; declared=yes;',
            },
            maxRedirects: 5 // Allow some redirects for this final request
          });
          
          if (isAgeVerificationContent(finalResponse.data)) {
            console.log('Still getting age verification page after POST request');
            return null;
          }
          
          return {data: finalResponse.data, finalUrl: finalRedirectUrl};
        }
        
        // If we get HTML content directly after POST (some sites work this way)
        if (verificationResponse.status === 200 && !isAgeVerificationContent(verificationResponse.data)) {
          return {data: verificationResponse.data, finalUrl: redirectUrl};
        }
        
        // Last resort - try to directly request the target URL again but with enhanced cookies
        console.log('Trying direct request to target URL with enhanced cookies');
        const enhancedResponse = await axios.get(targetAfterVerification, {
          ...axiosConfig,
          headers: {
            ...headers,
            'Cookie': cookies + '; age_check_done=1; declared=yes; is_already_checked=1;',
          },
          maxRedirects: 5 // Allow redirects for this final attempt
        });
        
        if (!isAgeVerificationContent(enhancedResponse.data)) {
          return {data: enhancedResponse.data, finalUrl: targetAfterVerification};
        }
      }
      
      // Handle non-age verification redirect
      response = await axios.get(redirectUrl, {
        ...axiosConfig,
        maxRedirects: 5 // Allow redirects for non-age verification redirects
      });
    }
    
    // Check if the result is still an age verification page
    if (isAgeVerificationContent(response.data)) {
      console.log('Still on age verification page after attempts');
      return null;
    }
    
    return {data: response.data, finalUrl: response.request?.responseURL || targetUrl};
  } catch (error) {
    console.error(`Error bypassing age verification: ${error}`);
    return null;
  }
};

// Function to get movie summary from FANZA - completely rewritten based on movieinfo.py
const getMovieSummary = async (movieId: string) => {
  // Check if this is a compatible ID format
  if (!movieId.match(/^[a-z0-9-_]+$/i)) {
    console.log(`Incompatible movie ID format for FANZA: ${movieId}`);
    return null;
  }
  
  // Get all possible URLs to try
  const urls = getUrlsById(movieId);
  console.log(`Generated ${urls.length} URLs to try for ${movieId}`);
  
  // Try each URL in sequence
  for (const url of urls) {
    console.log(`Trying URL: ${url}`);
    try {
      // Use the enhanced bypass function instead of direct axios call
      const result = await bypassAgeVerification(url);
      
      if (!result) {
        console.log(`Failed to bypass age verification for ${url}`);
        continue;
      }
      
      const {data, finalUrl} = result;
      
      // Extract summary using various methods
      let summary = getSummaryFromJsonLd(data);
      if (summary) {
        return {
          summary,
          source: 'json-ld',
          url: finalUrl,
          fanza_id: finalUrl.match(/cid=([^/&]+)/)?.[1] || ''
        };
      }
      
      summary = getSummaryFromHtml(data);
      if (summary) {
        return {
          summary,
          source: 'html',
          url: finalUrl,
          fanza_id: finalUrl.match(/cid=([^/&]+)/)?.[1] || ''
        };
      }
      
      summary = getSummaryFromMeta(data);
      if (summary) {
        return {
          summary,
          source: 'meta',
          url: finalUrl,
          fanza_id: finalUrl.match(/cid=([^/&]+)/)?.[1] || ''
        };
      }
      
      console.log('No summary found in page content');
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
    }
  }
  
  // If normalized ID failed, try with original ID format (without hyphens)
  const originalId = movieId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (originalId !== normalizeMovieId(movieId)) {
    console.log(`Trying original ID format: ${originalId}`);
    // Only try the DVD URL format
    const url = `https://www.dmm.co.jp/mono/dvd/-/detail/=/cid=${originalId}/`;
    
    try {
      const result = await bypassAgeVerification(url);
      
      if (!result) {
        console.log(`Failed to bypass age verification for ${url}`);
        return null;
      }
      
      const {data, finalUrl} = result;
      
      // Try extraction methods
      let summary = getSummaryFromJsonLd(data);
      if (summary) {
        return {
          summary,
          source: 'json-ld',
          url: finalUrl,
          fanza_id: originalId
        };
      }
      
      summary = getSummaryFromHtml(data);
      if (summary) {
        return {
          summary,
          source: 'html',
          url: finalUrl,
          fanza_id: originalId
        };
      }
      
      summary = getSummaryFromMeta(data);
      if (summary) {
        return {
          summary,
          source: 'meta',
          url: finalUrl,
          fanza_id: originalId
        };
      }
    } catch (error) {
      console.error(`Error fetching ${url} with original ID:`, error);
    }
  }
  
  console.log(`Failed to retrieve summary for ${movieId}`);
  return null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movieId = params.id;
    
    console.log(`Attempting to fetch summary for movie ID: ${movieId}`);
    
    // Try to fetch summary from FANZA
    const summaryData = await getMovieSummary(movieId);
    
    if (summaryData && summaryData.summary) {
      console.log(`Successfully retrieved summary for ${movieId}`);
      return NextResponse.json({
        status: 'success',
        summary: summaryData.summary,
        source: summaryData.source,
        fanza_id: summaryData.fanza_id,
        url: summaryData.url,
        available: true
      });
    } else {
      console.log(`No summary found for ${movieId}`);
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Could not find summary',
          available: false
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to get summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: `Failed to get summary: ${errorMessage}`,
        available: false
      },
      { status: 500 }
    );
  }
} 