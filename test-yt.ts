import youtubedl from 'youtube-dl-exec';
async function test() {
  try {
    const output = await youtubedl('https://DQ7e0cBjvme', {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
    });
    console.log(output);
  } catch (e: any) {
    console.error(e.message);
  }
}
test();
