import { igdl } from 'ruhend-scraper';

async function testRuhend() {
  try {
    const url = 'https://www.instagram.com/reel/DLDkrAvRHdy/';
    const res = await igdl(url);
    console.log(res);
  } catch (e) {
    console.log('Error:', e);
  }
}

testRuhend();
