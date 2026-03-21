import * as instagramSave from 'instagram-save';

async function test() {
  try {
    console.log('Testing instagram-save');
    const res = await instagramSave('https://www.instagram.com/reel/DLDkrAvRHdy/');
    console.log(res);
  } catch (e) {
    console.log('Error:', e);
  }
}

test();
