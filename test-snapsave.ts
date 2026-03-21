import axios from 'axios';

async function testSnapsave() {
  try {
    const url = 'https://www.instagram.com/reel/DLDkrAvRHdy/';
    const snapsaveRes = await axios.get(`https://snapsave.app/api/ajax/getVideo?url=${encodeURIComponent(url)}`);
    console.log(snapsaveRes.data);
  } catch (e) {
    console.log('Error:', e);
  }
}

testSnapsave();
