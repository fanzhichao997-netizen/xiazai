import * as instagramUrlDirect from 'instagram-url-direct';

async function test() {
  try {
    console.log('Testing instagram-url-direct');
    const res = await instagramUrlDirect('https://www.instagram.com/reel/DLDkrAvRHdy/');
    console.log(res);
  } catch (e) {
    console.log('Error:', e);
  }
}

test();
