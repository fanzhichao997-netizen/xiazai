import axios from 'axios';
async function test() {
  try {
    const res = await axios.post('https://v3.igdownloader.app/api/ajaxSearch', 
      new URLSearchParams({ q: 'https://www.instagram.com/p/DQ7e0cBjvme/', t: 'media', lang: 'en' }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      }
    );
    console.log(res.data);
  } catch (e: any) {
    console.error(e.message);
  }
}
test();
