import express from 'express';
import axios from 'axios';
import youtubedl from 'youtube-dl-exec';
import * as snapsave from 'snapsave-media-downloader';
import { igdl, ttdl, fbdown, twitter, youtube } from 'btch-downloader';
import ffmpeg from 'fluent-ffmpeg';

const app = express();

app.use(express.json());

function detectPlatform(url: string) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) return 'facebook';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  return 'unknown';
}

app.post('/api/extract', async (req, res) => {
  let { url, audioOnly } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: '需要提供链接' });
  }

  // Ensure URL has protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  const platform = detectPlatform(url);

  try {
    let downloadUrl = '';
    let title = '';
    let errorMessage = '提取失败';

    // Helper to generate a fallback title based on URL
    const getFallbackTitle = () => {
      try {
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        const id = parts[parts.length - 1] || Date.now().toString();
        return `${platform.charAt(0).toUpperCase() + platform.slice(1)}_${id}`;
      } catch {
        return `${platform}_Video_${Date.now()}`;
      }
    };

    // Format title to Platform_AuthorAccount_Description
    const formatTitle = (rawTitle: any, platform: string, username: string = 'unknown', targetUrl: string = '') => {
      let clean = String(rawTitle || '').replace(/[\n\r]+/g, ' ').trim();
      
      // If title is too generic, make it more descriptive
      const isGeneric = !clean || 
        ['instagram', 'tiktok', 'video by tiktok', 'facebook', 'twitter', 'x'].includes(clean.toLowerCase());
        
      if (isGeneric) {
        let id = 'Video';
        try {
          if (targetUrl) {
            const urlObj = new URL(targetUrl);
            const parts = urlObj.pathname.split('/').filter(Boolean);
            const lastPart = parts[parts.length - 1];
            if (lastPart) {
              id = /^\d+$/.test(lastPart) ? `Video_${lastPart}` : lastPart;
            }
          }
        } catch (e) {}
        return `${platform.charAt(0).toUpperCase() + platform.slice(1)}_${username}_${id}`;
      }

      // Remove character limit, just clean up invalid characters
      return `${platform.charAt(0).toUpperCase() + platform.slice(1)}_${username}_${clean}`;
    };

    // Helper to fetch metadata (title and username)
    const fetchMetadata = async (targetUrl: string, platform: string) => {
      let title = '';
      let username = 'unknown';
      
      // Try to extract username from URL first
      try {
        const urlObj = new URL(targetUrl);
        if (platform === 'tiktok') {
          const match = urlObj.pathname.match(/@([^/]+)/);
          if (match) username = match[1];
        } else if (platform === 'youtube') {
          const match = urlObj.pathname.match(/@([^/]+)/);
          if (match) username = match[1];
        } else if (platform === 'instagram') {
          // Match /username/reel/ or /username/p/
          const match = urlObj.pathname.match(/^\/([^/]+)\/(?:reel|p)\//);
          if (match) username = match[1];
        } else if (platform === 'twitter') {
          const match = urlObj.pathname.match(/^\/([^/]+)\/status\//);
          if (match) username = match[1];
        } else if (platform === 'facebook') {
          const match = urlObj.pathname.match(/^\/([^/]+)\/videos\//);
          if (match && match[1] !== 'watch') username = match[1];
        }
      } catch (e) {}

      try {
        const res = await axios.get(targetUrl, {
          headers: {
            'User-Agent': platform === 'instagram'
              ? 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
              : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          },
          timeout: 5000
        });
        const html = res.data;
        
        const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
        
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
          if (igMatch && username === 'unknown') username = igMatch[1];
          
          // With Googlebot, ogDesc might be: "31K likes, 125 comments - eastwestgemco on June 18, 2025: "Description""
          if (username === 'unknown' && ogDesc) {
            const descUserMatch = ogDesc.match(/ - ([a-zA-Z0-9_.]+) on /);
            if (descUserMatch) username = descUserMatch[1];
          }
          
          if (ogDesc) {
            // Try to extract the actual text from ogDesc (after the colon and quotes)
            const descTextMatch = ogDesc.match(/: "([\s\S]+)"/);
            if (descTextMatch) {
              title = descTextMatch[1];
            } else {
              title = ogDesc;
            }
          } else {
            const descMatch = ogTitle.match(/: "([\s\S]+)"/);
            if (descMatch) title = descMatch[1];
            else title = ogTitle;
          }
        } else if (platform === 'tiktok') {
          title = ogDesc || ogTitle;
        } else {
          title = ogTitle || ogDesc;
        }
        
        if (['instagram', 'tiktok', 'facebook', 'twitter', 'x'].includes(title.toLowerCase())) {
          title = '';
        }
      } catch (e) {}
      
      // If title is still generic, try yt-dlp to get metadata
      if (!title || ['instagram', 'tiktok', 'facebook', 'twitter', 'x'].includes(title.toLowerCase())) {
        try {
          const options: any = {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificates: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            skipDownload: true,
          };
          if (platform === 'instagram') {
            options.referer = 'https://www.instagram.com/';
          }
          const output: any = await youtubedl(targetUrl, options);
          if (output) {
            title = output.description || output.title || title;
            if (username === 'unknown') {
              username = output.uploader || output.uploader_id || output.channel || username;
            }
          }
        } catch (e) {}
      }
      
      return { title, username };
    };

    // 1. TikTok specific API (tikwm is very reliable for TikTok)
    if (platform === 'tiktok') {
      try {
        const ttRes = await axios.post('https://www.tikwm.com/api/', { url }, { validateStatus: () => true });
        if (ttRes.data?.data) {
          // If audioOnly, try to get music, else prefer hdplay over play
          let videoUrl = '';
          if (audioOnly && ttRes.data.data.music) {
            videoUrl = ttRes.data.data.music;
          } else {
            videoUrl = ttRes.data.data.hdplay || ttRes.data.data.play;
          }
          
          if (videoUrl) {
            let username = 'unknown';
            let title = ttRes.data.data.title;
            const meta = await fetchMetadata(url, platform);
            if (!title || ['instagram', 'tiktok', 'facebook', 'twitter', 'x'].includes(title.toLowerCase())) {
              title = meta.title;
            }
            username = meta.username;
            return res.json({
              success: true,
              data: {
                url: videoUrl,
                title: formatTitle(title, 'tiktok', username, url),
                platform: 'tiktok',
                isAudio: audioOnly && !!ttRes.data.data.music
              }
            });
          }
        }
      } catch (e) {
        console.log('Tikwm fallback failed');
      }
    }

    // 2. Instagram, Facebook, and TikTok specific API (snapsave)
    if (platform === 'instagram' || platform === 'facebook' || platform === 'tiktok') {
      try {
        console.log(`Extracting with snapsave: ${url}`);
        // @ts-ignore
        const snapRes = await (snapsave.default ? snapsave.default(url, { retry: 3 }) : snapsave.snapsave(url, { retry: 3 }));
        if (snapRes && snapRes.success && snapRes.data && snapRes.data.media && snapRes.data.media.length > 0) {
          
          // Filter for videos
          let videos = snapRes.data.media.filter((m: any) => m.type === 'video' || (m.url && m.url.includes('.mp4')));
          if (videos.length === 0) videos = snapRes.data.media;

          // Sort by quality/resolution to get the highest quality (HD)
          videos.sort((a: any, b: any) => {
            const getQ = (obj: any) => {
              if (typeof obj.quality === 'number') return obj.quality;
              if (typeof obj.quality === 'string') return parseInt(obj.quality.replace(/\D/g, '')) || 0;
              if (typeof obj.resolution === 'string') return parseInt(obj.resolution.replace(/\D/g, '')) || 0;
              return 0;
            };
            return getQ(b) - getQ(a); // Descending
          });

          const bestMedia = videos[0];
          console.log('Snapsave selected media:', JSON.stringify(bestMedia, null, 2));
          if (bestMedia && bestMedia.url) {
            // Try to get a real title instead of fallback
            let realTitle = snapRes.data.description || snapRes.data.title || '';
            let username = 'unknown';
            
            const meta = await fetchMetadata(url, platform);
            const isGeneric = !realTitle || ['instagram', 'tiktok', 'facebook', 'twitter', 'x'].includes(realTitle.toLowerCase());
            if (isGeneric) {
              realTitle = meta.title;
            }
            username = meta.username;

            return res.json({
              success: true,
              data: {
                url: bestMedia.url,
                title: formatTitle(realTitle, platform, username, url),
                platform: platform,
                isAudio: audioOnly
              }
            });
          }
        }
      } catch (e: any) {
        console.log('Snapsave fallback failed:', e.message);
      }
    }

    // 2.5 btch-downloader fallback
    if (platform === 'instagram' || platform === 'tiktok' || platform === 'facebook' || platform === 'youtube' || platform === 'twitter') {
      try {
        console.log(`Extracting with btch-downloader: ${url}`);
        let btchRes: any;
        if (platform === 'instagram') btchRes = await igdl(url);
        else if (platform === 'tiktok') btchRes = await ttdl(url);
        else if (platform === 'facebook') btchRes = await fbdown(url);
        else if (platform === 'youtube') btchRes = await youtube(url);
        else if (platform === 'twitter') btchRes = await twitter(url);

        if (btchRes) {
          let downloadUrl = '';
          let rawTitle = '';
          
          if (platform === 'instagram' && btchRes.status && btchRes.result && btchRes.result.length > 0) {
            downloadUrl = btchRes.result[0].url;
          } else if (platform === 'tiktok' && btchRes.status && btchRes.video && btchRes.video.length > 0) {
            // If audioOnly, try to get audio from btchRes, else video
            downloadUrl = audioOnly && btchRes.audio && btchRes.audio.length > 0 ? btchRes.audio[0] : btchRes.video[0];
            rawTitle = btchRes.title || '';
          } else if (platform === 'facebook' && btchRes.status && (btchRes.HD || btchRes.Normal_video)) {
            downloadUrl = btchRes.HD || btchRes.Normal_video;
          } else if (platform === 'youtube' && btchRes.status) {
            if (audioOnly && btchRes.mp3) {
              downloadUrl = btchRes.mp3;
            } else if (!audioOnly && btchRes.mp4) {
              downloadUrl = btchRes.mp4;
            } else if (!audioOnly) {
              downloadUrl = btchRes.mp4 || btchRes.mp3;
            }
            rawTitle = btchRes.title || '';
          } else if (platform === 'twitter' && btchRes.status && btchRes.url && btchRes.url.length > 0) {
            // Get the highest quality video
            const videos = btchRes.url.filter((v: any) => v.hd || v.sd);
            downloadUrl = videos.length > 0 ? (videos[0].hd || videos[0].sd) : btchRes.url[0].url;
            rawTitle = btchRes.title || '';
          }

          if (downloadUrl) {
            let username = 'unknown';
            const meta = await fetchMetadata(url, platform);
            const isGeneric = !rawTitle || ['instagram', 'tiktok', 'facebook', 'twitter', 'x'].includes(rawTitle.toLowerCase());
            if (isGeneric) {
              rawTitle = meta.title;
            }
            username = meta.username;
            return res.json({
              success: true,
              data: {
                url: downloadUrl,
                title: formatTitle(rawTitle, platform, username, url),
                platform: platform,
                isAudio: audioOnly
              }
            });
          }
        }
      } catch (e: any) {
        console.log('btch-downloader fallback failed:', e.message);
      }
    }

      // 2.6 mrnima fallback (Instagram only for now)
      if (platform === 'instagram') {
        try {
          console.log(`Extracting with @mrnima/instagram-downloader: ${url}`);
          const mrnima = await import('@mrnima/instagram-downloader');
          const mrnimaRes = await mrnima.instagram(url);
          if (mrnimaRes && mrnimaRes.status && mrnimaRes.result && mrnimaRes.result.length > 0) {
            const downloadUrl = mrnimaRes.result[0].url;
            if (downloadUrl) {
              const meta = await fetchMetadata(url, platform);
              return res.json({
                success: true,
                data: {
                  url: downloadUrl,
                  title: formatTitle(meta.title, platform, meta.username, url),
                  platform: platform,
                  isAudio: audioOnly
                }
              });
            }
          }
        } catch (e: any) {
          console.log('@mrnima/instagram-downloader fallback failed:', e.message);
        }
      }

      // 2.7 ruhend-scraper fallback (Instagram only for now)
      if (platform === 'instagram') {
        try {
          console.log(`Extracting with ruhend-scraper: ${url}`);
          const { igdl: ruhendIgdl } = await import('ruhend-scraper');
          const ruhendRes = await ruhendIgdl(url);
          if (ruhendRes && ruhendRes.status && ruhendRes.data && ruhendRes.data.length > 0) {
            const downloadUrl = ruhendRes.data[0].url;
            if (downloadUrl) {
              const meta = await fetchMetadata(url, platform);
              return res.json({
                success: true,
                data: {
                  url: downloadUrl,
                  title: formatTitle(meta.title, platform, meta.username, url),
                  platform: platform,
                  isAudio: audioOnly
                }
              });
            }
          }
        } catch (e: any) {
          console.log('ruhend-scraper fallback failed:', e.message);
        }

        // 2.7 ab-downloader fallback (Instagram only for now)
        try {
          console.log(`Extracting with ab-downloader: ${url}`);
          const { igdl: abIgdl } = await import('ab-downloader');
          const abRes = await abIgdl(url);
          if (Array.isArray(abRes) && abRes.length > 0 && abRes[0].url) {
            const downloadUrl = abRes[0].url;
            if (downloadUrl) {
              const meta = await fetchMetadata(url, platform);
              return res.json({
                success: true,
                data: {
                  url: downloadUrl,
                  title: formatTitle(meta.title, platform, meta.username, url),
                  platform: platform,
                  isAudio: audioOnly
                }
              });
            }
          }
        } catch (e: any) {
          console.log('ab-downloader fallback failed:', e.message);
        }
      }

    // 3. Use youtube-dl-exec (yt-dlp) for everything else (and as a fallback)
    try {
      console.log(`Extracting with yt-dlp: ${url}`);
      const options: any = {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      };
      
      if (audioOnly) {
        options.format = 'bestaudio/best';
        options.extractAudio = true;
      } else {
        options.format = 'best[ext=mp4]/best'; // Ensure we get a single file with both video and audio
      }
      
      if (platform === 'instagram') {
        options.referer = 'https://www.instagram.com/';
      }

      const output: any = await youtubedl(url, options);

      if (output) {
        console.log('yt-dlp output title:', output.title);
        // Use description if available, otherwise title
        const rawTitle = output.description || output.title;
        const uploader = output.uploader || output.uploader_id || output.channel || 'unknown';
        title = formatTitle(rawTitle, platform, uploader, url);
        
        if (audioOnly && output.formats) {
          // Try to find an audio-only format
          const audioFormats = output.formats.filter((f: any) => f.vcodec === 'none' && f.acodec !== 'none');
          if (audioFormats.length > 0) {
            // Sort by quality (usually higher abr or tbr is better)
            audioFormats.sort((a: any, b: any) => (b.abr || 0) - (a.abr || 0));
            downloadUrl = audioFormats[0].url;
          }
        }
        
        if (!downloadUrl) {
          downloadUrl = output.url || (output.requested_downloads && output.requested_downloads[0]?.url);
        }
      }
    } catch (e: any) {
      console.log('yt-dlp error:', e.message);
      errorMessage = '提取视频失败。视频可能是私密的、不支持的，或者需要登录。';
    }

    if (!downloadUrl) {
      return res.status(400).json({ success: false, error: errorMessage });
    }

    res.json({
      success: true,
      data: {
        url: downloadUrl,
        title: title || getFallbackTitle(), 
        platform,
        isAudio: audioOnly
      }
    });
  } catch (error: any) {
    console.error('Extraction error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: '提取视频失败。服务可能受到速率限制，或者不支持该链接。' 
    });
  }
});

// Proxy download to avoid CORS and force attachment
app.get('/api/download', async (req, res) => {
  const videoUrl = req.query.url as string;
  const filename = req.query.filename as string || 'video.mp4';
  
  if (!videoUrl) return res.status(400).send('需要提供链接');

  try {
    const response = await axios({
      url: videoUrl,
      method: 'GET',
      responseType: 'stream'
    });
    
    // Replace invalid characters for filenames (Windows/Mac/Linux safe)
    let safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'video';
    
    // Truncate filename if it's too long to prevent header issues (max 240 bytes)
    let ext = safeFilename.includes('.') ? safeFilename.substring(safeFilename.lastIndexOf('.')) : '';
    let baseName = safeFilename.substring(0, safeFilename.length - ext.length);
    
    let chars = Array.from(baseName);
    while (Buffer.byteLength(chars.join('') + ext, 'utf8') > 240 && chars.length > 0) {
      chars.pop();
    }
    safeFilename = chars.join('').trim() + ext;
    
    // Ensure it has an extension, default to mp4 if not specified and not an audio file
    let finalFilename = safeFilename.toLowerCase();
    if (!finalFilename.includes('.')) {
      finalFilename = `${safeFilename}.mp4`;
    }
    
    // Create a safe ASCII fallback name
    const asciiFilename = finalFilename.replace(/[^\x20-\x7E]/g, '_');
    
    // Encode filename for Content-Disposition (RFC 5987)
    const encodedFilename = encodeURIComponent(finalFilename)
      .replace(/['()]/g, escape)
      .replace(/\*/g, '%2A');
    
    const contentType = response.headers['content-type'] || 'video/mp4';
    const isVideo = contentType.includes('video') || contentType.includes('application/octet-stream') || contentType.includes('binary');
    
    // Standard header for forcing download with UTF-8 filename support
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`);
    
    if (finalFilename.endsWith('.mp3') && isVideo) {
      res.setHeader('Content-Type', 'audio/mpeg');
      // We don't know the final length of the transcoded audio
      res.removeHeader('Content-Length');
      
      // Destroy the axios stream since we will let FFmpeg fetch the URL directly.
      // This is necessary because MP4 files often have the 'moov' atom at the end,
      // and FFmpeg needs to be able to seek (via HTTP Range requests) to read it.
      // Piping a non-seekable stream will cause FFmpeg to fail.
      response.data.destroy();
      
      const command = ffmpeg(videoUrl)
        .inputOptions([
          '-reconnect 1',
          '-reconnect_streamed 1',
          '-reconnect_delay_max 5'
        ])
        .toFormat('mp3')
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .noVideo()
        .on('error', (err, stdout, stderr) => {
          if (res.destroyed || res.closed) {
            console.log('Client disconnected, stopping FFmpeg');
            return;
          }
          console.error('FFmpeg error:', err.message);
          console.error('FFmpeg stderr:', stderr);
          if (!res.headersSent) {
            res.status(500).send('音频提取失败');
          }
        });
        
      command.pipe(res, { end: true });
      
      res.on('close', () => {
        command.kill('SIGKILL');
      });
    } else {
      res.setHeader('Content-Type', contentType);
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      response.data.pipe(res);
    }
  } catch (e) {
    console.error('Download proxy error:', e);
    res.status(500).send('下载失败');
  }
});

export default app;
