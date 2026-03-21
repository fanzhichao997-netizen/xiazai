import { instagramGetUrl } from 'instagram-url-direct';

async function test() {
  const url = 'https://www.instagram.com/reel/DKMxMijRD5K/';
  try {
    const res = await instagramGetUrl(url);
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
