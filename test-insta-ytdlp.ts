import youtubedl from 'youtube-dl-exec';

async function test() {
  const url = 'https://www.instagram.com/reel/DKMxMijRD5K/';
  try {
    console.log(`Extracting with yt-dlp: ${url}`);
    const output: any = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      format: 'best[height>=720]/best',
    });
    console.log('yt-dlp output:', JSON.stringify(output, null, 2));
  } catch (e) {
    console.error('yt-dlp error:', e);
  }
}
test();
