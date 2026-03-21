import axios from 'axios';

const fetchMetadata = async (targetUrl: string, platform: string) => {
  let title = '';
  let username = 'unknown';
  
  // Try to extract username from URL first
  try {
    const urlObj = new URL(targetUrl);
    console.log('URL path:', urlObj.pathname);
    if (platform === 'instagram') {
      // Match /username/reel/ or /username/p/
      const match = urlObj.pathname.match(/^\/([^/]+)\/(?:reel|p)\//);
      console.log('Instagram URL match:', match);
      if (match) username = match[1];
    }
  } catch (e) {
    console.log('Error extracting username from URL:', e);
  }

  try {
    const res = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.instagram.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 5000
    });
    const html = res.data;
    
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
    
    console.log('ogTitleMatch:', ogTitleMatch ? ogTitleMatch[1] : 'none');
    console.log('ogDescMatch:', ogDescMatch ? ogDescMatch[1] : 'none');
    console.log('HTML snippet:', html.substring(0, 500));
    
    let ogTitle = ogTitleMatch ? ogTitleMatch[1] : '';
    let ogDesc = ogDescMatch ? ogDescMatch[1] : '';
    
    // Decode HTML entities
    const decode = (str: string) => str.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                                       .replace(/&quot;/g, '"')
                                       .replace(/&amp;/g, '&')
                                       .replace(/&lt;/g, '<')
                                       .replace(/&gt;/g, '>');
    
    ogTitle = decode(ogTitle);
    ogDesc = decode(ogDesc);

    if (platform === 'instagram') {
      // Instagram format: "Name (@username) on Instagram: "Description""
      const igMatch = ogTitle.match(/\(@([^)]+)\)/);
      console.log('Instagram ogTitle match:', igMatch);
      if (igMatch && username === 'unknown') username = igMatch[1];
      
      if (ogDesc) {
        title = ogDesc;
      } else {
        const descMatch = ogTitle.match(/: "([^"]+)"/);
        if (descMatch) title = descMatch[1];
        else title = ogTitle;
      }
      console.log('Instagram final title/username:', { title, username });
    }
  } catch (e) {
    console.log('Error fetching metadata:', e);
  }
  return { title, username };
};

fetchMetadata('https://www.instagram.com/reel/DLDkrAvRHdy/', 'instagram');
