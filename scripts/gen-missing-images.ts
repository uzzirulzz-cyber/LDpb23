import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const OUTPUT_DIR = '/home/z/my-project/public/products';

const MISSING = [
  { sku: 'PB-AIT-004', name: 'Perplexity AI Private Yearly Plan' },
  { sku: 'PB-AIT-005', name: 'Google Veo 3 1 Month Normal' },
  { sku: 'PB-AIT-007', name: 'Leonardo AI Unlimited Plan Official 1 Month' },
  { sku: 'PB-AIT-008', name: 'Turnitin Instructor Account 1 Month' },
  { sku: 'PB-AIT-009', name: 'Hailio AI 1 Month' },
  { sku: 'PB-STU-001', name: 'Helium 10 Platinum Plan 1 Month' },
  { sku: 'PB-STU-002', name: 'Zoom Pro' },
  { sku: 'PB-STU-010', name: 'QuillBot Premium 1 Month' },
  { sku: 'PB-STU-011', name: 'Grammarly Premium 1 Month' },
  { sku: 'PB-VPN-001', name: 'NordVPN' },
  { sku: 'PB-VPN-004', name: 'Surfshark VPN' },
  { sku: 'PB-VPN-007', name: 'ExpressVPN 1 Month Single Device' },
  { sku: 'PB-VPN-008', name: 'ExpressVPN For PC' },
  { sku: 'PB-VPN-009', name: 'Proton VPN 1 Month' },
  { sku: 'PB-VPN-010', name: 'IPVanish VPN 1 Month' },
  { sku: 'PB-VPN-011', name: 'Hotspot Shield VPN 1 Month' },
];

function buildPrompt(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('vpn') || n.includes('nord') || n.includes('surfshark') || n.includes('express') || n.includes('proton') || n.includes('ipvanish') || n.includes('hotspot')) {
    return `Professional e-commerce product card for ${name} online privacy service, blue gradient background with network and globe motif, clean modern design, studio lighting, high quality`;
  }
  if (n.includes('chatgpt') || n.includes('ai') || n.includes('perplexity') || n.includes('veo') || n.includes('leonardo') || n.includes('hailio') || n.includes('helium')) {
    return `Professional product photography of ${name} AI tool subscription, modern AI and tech themed branded card design, purple and blue gradient background, studio lighting, e-commerce product shot, high quality`;
  }
  if (n.includes('zoom')) {
    return `Professional product photography of ${name} video conferencing subscription, blue branded card design with video call motif, studio lighting, e-commerce product shot, high quality`;
  }
  if (n.includes('quillbot') || n.includes('grammarly') || n.includes('turnitin')) {
    return `Professional product photography of ${name} writing tool subscription, branded card design with document and checkmark motif, green and blue gradient background, studio lighting, e-commerce product shot, high quality`;
  }
  return `Professional product photography of ${name} software subscription, branded card design, clean gradient background, studio lighting, e-commerce product shot, high quality`;
}

async function generateMissing() {
  console.log(`Generating ${MISSING.length} missing product images...`);
  const zai = await ZAI.create();

  for (let i = 0; i < MISSING.length; i++) {
    const p = MISSING[i];
    const filename = p.sku.toLowerCase() + '.png';
    const filepath = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(filepath)) {
      console.log(`✓ [${i + 1}/${MISSING.length}] SKIP: ${filename}`);
      continue;
    }

    try {
      const prompt = buildPrompt(p.name);
      const response = await zai.images.generations.create({ prompt, size: '1024x1024' });
      const buffer = Buffer.from(response.data[0].base64, 'base64');
      fs.writeFileSync(filepath, buffer);
      console.log(`✓ [${i + 1}/${MISSING.length}] Generated: ${filename} (${p.name})`);
    } catch (err) {
      console.error(`✗ [${i + 1}/${MISSING.length}] FAILED: ${p.sku} - ${err.message}`);
    }
  }
  console.log('Done.');
}

generateMissing().catch(console.error);
