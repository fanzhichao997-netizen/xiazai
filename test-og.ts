import axios from 'axios';
async function fetchOgTitle(url: string) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 5000
    });
    console.log("Success");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
fetchOgTitle('https://www.instagram.com/p/DQ7e0cBjvme/');
