import * as instagramVideoDl from 'instagram-video-dl';

async function test() {
  try {
    console.log('Testing instagram-video-dl');
    const res = await instagramVideoDl('https://www.instagram.com/reel/DLDkrAvRHdy/');
    console.log(res);
  } catch (e) {
    console.log('Error:', e);
  }
}

test();
