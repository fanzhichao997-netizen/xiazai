import * as snapsave from 'snapsave-media-downloader';

async function test() {
  const url = 'https://www.instagram.com/reel/DKMxMijRD5K/';
  try {
    console.log(`Extracting with snapsave: ${url}`);
    // @ts-ignore
    const snapRes = await (snapsave.default ? snapsave.default(url) : snapsave.snapsave(url));
    console.log('Snapsave result:', JSON.stringify(snapRes, null, 2));
  } catch (e) {
    console.error('Snapsave error:', e);
  }
}
test();
