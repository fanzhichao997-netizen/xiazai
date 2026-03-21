import * as igdl from 'instagram-video-dl';
async function test() {
  try {
    console.log(Object.keys(igdl));
  } catch (e) {
    console.error(e);
  }
}
test();
