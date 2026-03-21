import youtubedl from 'youtube-dl-exec';

async function testYtDlp() {
  try {
    const url = 'https://www.instagram.com/reel/DLDkrAvRHdy/';
    const options: any = {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      referer: 'https://www.instagram.com/',
    };
    
    const output: any = await youtubedl(url, options);
    console.log('Title:', output.title);
    console.log('Uploader:', output.uploader);
  } catch (e) {
    console.log('Error:', e);
  }
}

testYtDlp();
