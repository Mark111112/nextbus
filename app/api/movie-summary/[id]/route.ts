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
  
  // Set up headers to mimic a browser
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cookie': 'age_check_done=1'
  };
  
  // Try each URL in sequence
  for (const url of urls) {
    console.log(`Trying URL: ${url}`);
    try {
      // Send request with timeout and cookies
      const response = await axios.get(url, { 
        headers,
        timeout: 10000,
        validateStatus: (status) => status === 200
      });
      
      // Check for region restriction
      if (response.request?.responseURL?.includes('not-available-in-your-region')) {
        console.log('Region restricted content');
        continue;
      }
      
      // Extract summary using various methods
      let summary = getSummaryFromJsonLd(response.data);
      if (summary) {
        return {
          summary,
          source: 'json-ld',
          url,
          fanza_id: url.match(/cid=([^/&]+)/)?.[1] || ''
        };
      }
      
      summary = getSummaryFromHtml(response.data);
      if (summary) {
        return {
          summary,
          source: 'html',
          url,
          fanza_id: url.match(/cid=([^/&]+)/)?.[1] || ''
        };
      }
      
      summary = getSummaryFromMeta(response.data);
      if (summary) {
        return {
          summary,
          source: 'meta',
          url,
          fanza_id: url.match(/cid=([^/&]+)/)?.[1] || ''
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
      const response = await axios.get(url, {
        headers,
        timeout: 10000,
        validateStatus: (status) => status === 200
      });
      
      // Check for region restriction
      if (response.request?.responseURL?.includes('not-available-in-your-region')) {
        console.log('Region restricted content');
        return null;
      }
      
      // Try extraction methods
      let summary = getSummaryFromJsonLd(response.data);
      if (summary) {
        return {
          summary,
          source: 'json-ld',
          url,
          fanza_id: originalId
        };
      }
      
      summary = getSummaryFromHtml(response.data);
      if (summary) {
        return {
          summary,
          source: 'html',
          url,
          fanza_id: originalId
        };
      }
      
      summary = getSummaryFromMeta(response.data);
      if (summary) {
        return {
          summary,
          source: 'meta',
          url,
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