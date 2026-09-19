// Generate official product images for all 69 products using z-ai-web-dev-sdk
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const products = JSON.parse(fs.readFileSync('/tmp/products-for-images.json', 'utf8'));
const OUTPUT_DIR = '/home/z/my-project/public/products';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Build prompt for each product based on its name + category
function buildPrompt(product) {
  const { name, category } = product;
  const n = name.toLowerCase();

  if (category === 'Smart Projectors') {
    if (n.includes('stand')) {
      return `Professional product photography of a 190cm aluminum tripod projector stand, height-adjustable, black finish, studio lighting, clean white background, e-commerce product shot, high quality`;
    }
    return `Professional product photography of a ${name} smart LED projector, modern rectangular design, dark gray/black casing, lens glow, remote control beside it, studio lighting, clean white background, e-commerce product shot, high quality`;
  }

  if (category === 'Gift Cards') {
    return `Professional product photography of a ${name} digital gift card, official branded design, gift card on clean gradient background, studio lighting, e-commerce product shot, high quality`;
  }

  if (category === 'Gaming') {
    return `Professional product photography of ${name} digital subscription, gaming-themed branded card design, dark blue gradient background with gaming iconography, studio lighting, e-commerce product shot, high quality`;
  }

  if (category === 'Streaming') {
    return `Professional product photography of ${name} streaming service subscription, branded card design with streaming/play button motif, dark gradient background, studio lighting, e-commerce product shot, high quality`;
  }

  if (category === 'Subscriptions') {
    if (n.includes('vpn') || n.includes('surfshark') || n.includes('nord') || n.includes('express') || n.includes('proton') || n.includes('ipvanish') || n.includes('cyberghost') || n.includes('hotspot')) {
      return `Professional product photography of ${name} VPN subscription, shield/lock security themed branded card, blue gradient background, studio lighting, e-commerce product shot, high quality`;
    }
    if (n.includes('chatgpt') || n.includes('ai') || n.includes('perplexity') || n.includes('veo') || n.includes('eleven') || n.includes('leonardo') || n.includes('hailio') || n.includes('helium')) {
      return `Professional product photography of ${name} AI tool subscription, modern AI/tech themed branded card, purple/blue gradient background, studio lighting, e-commerce product shot, high quality`;
    }
    return `Professional product photography of ${name} software subscription, branded card design, clean gradient background, studio lighting, e-commerce product shot, high quality`;
  }

  if (category === 'Software') {
    if (n.includes('office') || n.includes('windows')) {
      return `Professional product photography of ${name} software license, Microsoft branded card design, blue gradient background, studio lighting, e-commerce product shot, high quality`;
    }
    if (n.includes('bitdefender') || n.includes('mcafee') || n.includes('kaspersky')) {
      return `Professional product photography of ${name} security software license, shield/protection themed branded card, red/blue gradient background, studio lighting, e-commerce product shot, high quality`;
    }
    return `Professional product photography of ${name} software license, branded card design, clean gradient background, studio lighting, e-commerce product shot, high quality`;
  }

  return `Professional product photography of ${name}, branded product card, clean gradient background, studio lighting, e-commerce product shot, high quality`;
}

async function generateAll() {
  console.log(`🎨 Generating ${products.length} product images...`);
  const zai = await ZAI.create();
  const results = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const filename = `${p.sku.toLowerCase()}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);

    // Skip if already exists
    if (fs.existsSync(filepath)) {
      console.log(`✓ [${i + 1}/${products.length}] SKIP (exists): ${filename}`);
      results.push({ sku: p.sku, filename, status: 'exists' });
      continue;
    }

    try {
      const prompt = buildPrompt(p);
      const response = await zai.images.generations.create({
        prompt,
        size: '1024x1024',
      });
      const imageBase64 = response.data[0].base64;
      const buffer = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync(filepath, buffer);
      console.log(`✓ [${i + 1}/${products.length}] Generated: ${filename} (${p.name})`);
      results.push({ sku: p.sku, filename, status: 'generated' });
    } catch (err) {
      console.error(`✗ [${i + 1}/${products.length}] FAILED: ${p.sku} - ${err.message}`);
      results.push({ sku: p.sku, filename, status: 'failed', error: err.message });
    }
  }

  fs.writeFileSync('/tmp/image-gen-results.json', JSON.stringify(results, null, 2));
  const ok = results.filter(r => r.status !== 'failed').length;
  console.log(`\n✅ Done: ${ok}/${products.length} images ready in ${OUTPUT_DIR}`);
}

generateAll().catch(console.error);
