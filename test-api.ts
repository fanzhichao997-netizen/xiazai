import axios from 'axios';

async function test() {
  const url = 'https://www.instagram.com/reel/DKMxMijRD5K/';
  try {
    const res = await axios.post('https://cobalt-api.kwiatekm.dev/', {
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
test();
