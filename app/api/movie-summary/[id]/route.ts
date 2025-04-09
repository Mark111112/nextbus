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
    "wnz": "3wnz"
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

// Function to normalize movie ID for FANZA
const normalizeMovieId = (movieId: string): string => {
  // Get mappings and suffixes
  const prefixMappings = getFanzaMappings();
  const suffixMappings = getFanzaSuffixes();
  
  // Convert to lowercase for case-insensitive matching
  const lowerId = movieId.toLowerCase();
  
  // Extract prefix and number
  const match = lowerId.match(/^([a-z]+)[-_]?(\d+)$/i);
  if (!match) return movieId;
  
  const [, prefix, number] = match;
  
  // Check if we have a mapping for this prefix
  if (prefix in prefixMappings) {
    // Check if we need to add a suffix
    const suffix = prefix in suffixMappings ? suffixMappings[prefix] : '';
    
    // Combine the mapped prefix and number
    return `${prefixMappings[prefix]}${number}${suffix}`;
  }
  
  return movieId;
};

// Function to get movie summary from FANZA
const getMovieSummary = async (movieId: string) => {
  try {
    // Normalize movie ID
    const normalizedId = normalizeMovieId(movieId);
    
    // Fetch summary from FANZA API
    const fanzaUrl = `https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=${normalizedId}/`;
    
    // Set up headers to mimic a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
    };
    
    const response = await axios.get(fanzaUrl, { headers });
    
    if (response.status === 200) {
      // Extract summary from HTML
      const html = response.data;
      
      // Regex pattern to extract movie description - 使用兼容性更好的方式，不使用s标志
      const summaryPattern = /<div class="mg-b20 lh4">([\s\S]+?)<\/div>/;
      const match = html.match(summaryPattern);
      
      if (match && match[1]) {
        // Clean the summary text
        let summary = match[1].trim();
        
        // Remove HTML tags
        summary = summary.replace(/<[^>]+>/g, '');
        
        return {
          summary,
          source: 'fanza',
          url: fanzaUrl,
          fanza_id: normalizedId
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get summary from FANZA:', error);
    return null;
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movieId = params.id;
    
    // Try to fetch summary from FANZA
    const summaryData = await getMovieSummary(movieId);
    
    if (summaryData) {
      return NextResponse.json({
        status: 'success',
        summary: summaryData.summary,
        source: summaryData.source,
        fanza_id: summaryData.fanza_id
      });
    } else {
      return NextResponse.json(
        { status: 'error', message: 'Could not find summary' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to get summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { status: 'error', message: `Failed to get summary: ${errorMessage}` },
      { status: 500 }
    );
  }
} 