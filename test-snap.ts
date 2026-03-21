import * as snapsave from 'snapsave-media-downloader';
async function test() {
  try {
    // @ts-ignore
    const snapRes = await (snapsave.default ? snapsave.default('https://www.instagram.com/p/DQ7e0cBjvme/') : snapsave.snapsave('https://www.instagram.com/p/DQ7e0cBjvme/'));
    console.log(JSON.stringify(snapRes, null, 2));
  } catch (e: any) {
    console.error(e.message);
  }
}
test();
