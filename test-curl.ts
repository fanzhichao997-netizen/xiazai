import axios from 'axios';
async function test() {
  try {
    const res = await axios.head('https://www.instagram.com/p/DQ7e0cBjvme/');
    console.log(res.status);
  } catch (e: any) {
    console.error(e.response ? e.response.status : e.message);
  }
}
test();
