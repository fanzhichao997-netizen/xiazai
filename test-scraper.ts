import * as snapsave from 'snapsave-media-downloader';

async function test() {
  const url = 'https://www.instagram.com/reel/DLDkrAvRHdy/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==';
  try {
    const snapRes = await snapsave.snapsave(url);
    console.log('snapsave res:', JSON.stringify(snapRes, null, 2));
  } catch (e: any) {
    console.log('snapsave error:', e.message);
  }
}
test();
