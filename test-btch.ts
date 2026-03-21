import { igdl } from 'btch-downloader';
async function test() {
  try {
    const res = await igdl('https://www.instagram.com/p/DQ7e0cBjvme');
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
