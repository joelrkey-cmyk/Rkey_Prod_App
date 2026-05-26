const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function run() {
  const svgPath = path.join(__dirname, 'frontend', 'public', 'favicon.svg');
  const icoPath = path.join(__dirname, 'frontend', 'public', 'favicon.ico');
  
  if (!fs.existsSync(svgPath)) {
    console.error('favicon.svg not found at', svgPath);
    process.exit(1);
  }
  
  try {
    console.log('Converting favicon.svg to favicon.ico (256x256 PNG format)...');
    const buffer = await sharp(svgPath)
      .resize(256, 256)
      .png()
      .toBuffer();
      
    fs.writeFileSync(icoPath, buffer);
    console.log('Successfully written to', icoPath);
  } catch (err) {
    console.error('Error during conversion:', err);
    process.exit(1);
  }
}

run();
