import youtubedl from 'youtube-dl-exec';
import fs from 'fs';

async function test() {
  const url = 'https://www.instagram.com/reel/DKMxMijRD5K/';
  const outputFile = '/tmp/test_insta.mp4';
  try {
    console.log(`Downloading with yt-dlp: ${url}`);
    await youtubedl(url, {
      output: outputFile,
      format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      mergeOutputFormat: 'mp4',
      noWarnings: true,
      noCheckCertificates: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      referer: 'https://www.instagram.com/',
    });
    console.log('Download complete. File size:', fs.statSync(outputFile).size);
  } catch (e) {
    console.error('yt-dlp error:', e);
  }
}
test();
