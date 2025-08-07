// start-server.js (ESM versiyasi)
import { exec } from 'child_process';

const server = exec("npx serve -s dist -l 5173");

server.stdout.on("data", data => {
  console.log(data.toString());
});

server.stderr.on("data", data => {
  console.error(data.toString());
});



server.on("close", code => {
  console.log(`Serve process exited with code ${code}`);
});

