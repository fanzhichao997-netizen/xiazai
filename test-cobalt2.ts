import axios from 'axios';

async function testCobalt() {
  const url = 'https://www.instagram.com/reel/DKMxMijRD5K/';
  try {
    const res = await axios.post('https://api.cobalt.tools/', {
      url: url,
      videoQuality: '1080'
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('Cobalt result:', JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.error('Cobalt error:', e.response?.data || e.message);
  }
}
testCobalt();
