import fs from 'fs';
import path from 'path';

function findImages(dir) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fp = path.join(dir, file);
      try {
        const stat = fs.statSync(fp);
        if (stat.isDirectory()) {
          if (fp.startsWith('/proc') || fp.startsWith('/sys') || fp.startsWith('/dev') || fp.startsWith('/lib') || fp.startsWith('/usr') || fp.startsWith('/node_modules')) continue;
          findImages(fp);
        } else {
          if (/\.(png|jpe?g|gif|svg|webp)$/i.test(file)) {
            console.log(`FOUND IMAGE: ${fp} (${stat.size} bytes)`);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

findImages('/');
console.log("Search done.");
