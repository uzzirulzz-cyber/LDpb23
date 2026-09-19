import { db } from "@/lib/db";

const FX: Record<string, number> = { USD: 1, PKR: 278, AED: 3.67 };

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickN<T>(arr: T[], n: number): T[] { return [...arr].sort(() => Math.random() - 0.5).slice(0, n); }

export async function seed() {
  console.log("🌱 Seeding PLAYBEAT PULSE CRM (15 domains)...");
  await Promise.all([
    db.pixelEvent.deleteMany(),
    db.crawlResult.deleteMany(), db.crawler.deleteMany(),
    db.callLog.deleteMany(), db.outreachCampaign.deleteMany(),
    db.trafficEvent.deleteMany(), db.homepageBlock.deleteMany(),
    db.cmsPage.deleteMany(), db.enrichmentRun.deleteMany(), db.waterfallSource.deleteMany(),
    db.workflow.deleteMany(),
    db.invoice.deleteMany(), db.quote.deleteMany(),
    db.contact.deleteMany(), db.account.deleteMany(),
    db.inventoryItem.deleteMany(), db.product.deleteMany(),
    db.order.deleteMany(),
    db.seat.deleteMany(),
    db.deal.deleteMany(), db.message.deleteMany(), db.activity.deleteMany(),
    db.lead.deleteMany(), db.rep.deleteMany(),
  ]);

  // ===== Reps =====
  const reps = await Promise.all([
    db.rep.create({ data: { name: "Ayesha Khan", email: "ayesha@playbeat.digital", role: "manager", region: "PK", target: 80000 } }),
    db.rep.create({ data: { name: "Bilal Ahmed", email: "bilal@playbeat.digital", role: "sales", region: "PK", target: 50000 } }),
    db.rep.create({ data: { name: "Sara Malik", email: "sara@playbeat.digital", role: "sales", region: "AE", target: 60000 } }),
    db.rep.create({ data: { name: "Daniyal Raza", email: "daniyal@playbeat.digital", role: "sales", region: "PK", target: 45000 } }),
    db.rep.create({ data: { name: "Hira Sheikh", email: "hira@playbeat.digital", role: "admin", region: "US", target: 70000 } }),
  ]);

  // ===== Products (digital marketplace from izoko) =====
  const productDefs = [
    ["Steam Wallet $50 Code", "steam-wallet-50", "Gaming", "Wallets", 50, true],
    ["Netflix Premium 1-Month", "netflix-premium-1m", "Streaming", "Subscriptions", 12.99, true],
    ["ChatGPT Plus 1-Month", "chatgpt-plus-1m", "AI Tools", "Subscriptions", 20, true],
    ["Spotify Premium 3-Month", "spotify-premium-3m", "Streaming", "Subscriptions", 29.99, true],
    ["PlayStation Plus 12-Month", "psn-plus-12m", "Gaming", "Memberships", 59.99, true],
    ["Xbox Game Pass Ultimate 1-Month", "xbox-gpu-1m", "Gaming", "Memberships", 14.99, true],
    ["Adobe Creative Cloud 1-Month", "adobe-cc-1m", "Software", "Subscriptions", 54.99, true],
    ["Microsoft Office 365 Family", "office365-family", "Software", "Licenses", 99.99, true],
    ["NordVPN 2-Year Plan", "nordvpn-2yr", "Security", "Licenses", 89, true],
    ["Disney+ Premium 1-Month", "disney-plus-1m", "Streaming", "Subscriptions", 10.99, true],
    ["PlayBeat Pro Projector 4K", "playbeat-pro-projector-4k", "Projectors", "Hardware", 549, false],
    ["PlayBeat Mini Projector 1080p", "playbeat-mini-projector", "Projectors", "Hardware", 199, false],
    ["PlayBeat Pulse Soundbar", "playbeat-pulse-soundbar", "Audio", "Hardware", 129, false],
    ["Notion Plus 1-Year", "notion-plus-1yr", "SaaS", "Licenses", 96, true],
    ["Figma Professional 1-Month", "figma-pro-1m", "SaaS", "Subscriptions", 15, true],
    ["YouTube Premium 3-Month", "youtube-premium-3m", "Streaming", "Subscriptions", 35.99, true],
    ["EA FC 25 Account PS5", "ea-fc-25-ps5", "Gaming", "Accounts", 45, true],
    ["Valorant 5000 Points", "valorant-5000", "Gaming", "Currency", 49.99, true],
    ["Canva Pro 1-Year", "canva-pro-1yr", "SaaS", "Licenses", 119.99, true],
    ["Discord Nitro 1-Month", "discord-nitro-1m", "Gaming", "Memberships", 9.99, true],
  ] as const;

  const products = await Promise.all(productDefs.map(([name, slug, cat, sub, price, digital]) =>
    db.product.create({
      data: {
        name, slug, sku: "PB-" + slug.toUpperCase().replace(/-/g, "_"),
        category: cat, subcategory: sub, price: Number(price), currency: "USD",
        digital: digital as boolean,
        deliveryType: digital ? "Instant Auto-Email" : "Courier Shipping",
        stock: digital ? 999 : randInt(3, 40),
        description: `${name} — instant digital delivery for playbeat.digital customers. Verified license keys, 24/7 support.`,
        images: JSON.stringify([`https://picsum.photos/seed/${slug}/600/600`]),
        variants: digital ? "[]" : JSON.stringify([{ name: "Standard", priceDelta: 0 }]),
        active: true,
        rating: Number((3.8 + Math.random() * 1.2).toFixed(1)),
      },
    })
  ));

  // ===== Inventory =====
  await Promise.all(products.map((p) =>
    db.inventoryItem.create({
      data: {
        sku: p.sku,
        name: p.name,
        productId: p.id,
        stock: p.stock,
        reserved: randInt(0, Math.min(5, p.stock)),
        reorderLevel: p.digital ? 50 : 5,
        location: p.digital ? "Digital Vault" : randInt(0, 1) ? "Warehouse PK" : "Warehouse AE",
        cost: Number((p.price * 0.6).toFixed(2)),
        currency: p.currency,
      },
    })
  ));

  // ===== Accounts & Contacts =====
  const industries = ["Gaming", "SaaS", "Media", "E-commerce", "Agency", "Education", "Fintech"];
  const countries = ["Pakistan", "UAE", "USA", "Saudi Arabia", "UK", "India"];
  const accounts = await Promise.all(
    ["NovaTech Studios", "Skyline Media", "Crescent Gaming", "Apex Digital", "Horizon Labs", "Vertex Agency", "Lumen IO", "Quantum Play"]
      .map((name) => db.account.create({
        data: {
          name,
          website: `https://${name.toLowerCase().replace(/\s/g, "")}.io`,
          industry: rand(industries),
          country: rand(countries),
          currency: rand(["USD", "PKR", "AED"]),
          size: rand(["1-10", "11-50", "51-200", "201-500"]),
          ownerRepId: rand(reps).id,
        },
      }))
  );

  const firstNames = ["Ahmed", "Fatima", "Usman", "Zainab", "Hassan", "Maryam", "Omar", "Aisha", "Bilal", "Khadija", "Ali", "Noor", "Hamza", "Sana", "Fahad"];
  const lastNames = ["Khan", "Ahmed", "Malik", "Sheikh", "Raza", "Iqbal", "Hussain", "Akhtar", "Butt", "Cheema"];
  const contacts = await Promise.all(
    Array.from({ length: 24 }).map(() => {
      const f = rand(firstNames), l = rand(lastNames);
      return db.contact.create({
        data: {
          accountId: rand(accounts).id,
          firstName: f, lastName: l,
          email: `${f.toLowerCase()}.${l.toLowerCase()}@${rand(accounts).website!.replace("https://", "")}`,
          phone: `+${rand(["92", "971", "1", "966", "44"])} ${randInt(300, 899)} ${randInt(1000000, 9999999)}`,
          title: rand(["CEO", "CTO", "Head of Growth", "Marketing Lead", "Procurement", "IT Manager"]),
          country: rand(countries),
          source: rand(["website", "referral", "ads", "organic"]),
          tags: rand([["enterprise"], ["smb"], ["reseller"], ["vip"], []]).join(","),
        },
      });
    })
  );

  // ===== Leads =====
  const leadStatuses = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
  const sources = ["website", "facebook", "instagram", "whatsapp", "referral", "ads", "organic", "api"];
  const companies = ["NovaTech", "Skyline", "Crescent", "Apex", "Horizon", "Vertex", "Lumen", "Quantum"];
  const now = Date.now();
  const leads = [];
  for (let i = 0; i < 60; i++) {
    const f = rand(firstNames), l = rand(lastNames);
    const country = rand(countries);
    const currency = country === "Pakistan" ? "PKR" : country === "UAE" ? "AED" : "USD";
    const status = rand(leadStatuses);
    const daysAgo = randInt(0, 90);
    const createdAt = new Date(now - daysAgo * 86400000 - randInt(0, 86400000));
    const valueUsd = randInt(500, 25000);
    const lead = await db.lead.create({
      data: {
        name: `${f} ${l}`,
        email: `${f.toLowerCase()}.${l.toLowerCase()}@${rand(companies).toLowerCase()}.com`,
        phone: `+${rand(["92", "971", "1", "966", "44"])} 3${randInt(10, 89)} ${randInt(1000000, 9999999)}`,
        company: rand(companies),
        country, source: rand(sources), status, stage: status,
        value: Math.round(valueUsd * FX[currency]), currency,
        score: randInt(20, 98),
        tags: rand([["hot"], ["enterprise"], ["smb"], ["reseller"], []]).join(","),
        assignedTo: rand(reps).id,
        createdAt, updatedAt: createdAt,
      },
    });
    leads.push(lead);
    for (let a = 0; a < randInt(1, 3); a++) {
      const t = rand(["call", "email", "meeting", "note", "status_change", "message"]);
      await db.activity.create({
        data: {
          leadId: lead.id, type: t,
          description: t === "call" ? `Called ${f}, ${rand(["answered", "voicemail", "missed"])}.`
            : t === "email" ? `Sent ${rand(["proposal", "pricing", "demo invite"])} to ${f}.`
            : t === "meeting" ? `Discovery meeting — ${rand(["positive", "follow-up needed"])}.`
            : t === "note" ? `Note: ${f} ${rand(["asked about enterprise", "wants integrations", "budget confirmed"])}.`
            : t === "status_change" ? `Status moved to ${status}.` : `Message from ${f}.`,
          createdAt: new Date(createdAt.getTime() + randInt(0, daysAgo) * 3600000),
        },
      });
    }
    if (["proposal", "negotiation", "won", "lost"].includes(status)) {
      await db.deal.create({
        data: {
          leadId: lead.id, title: `${lead.company} deal`,
          value: lead.value, currency: lead.currency, stage: status,
          closeDate: (status === "won" || status === "lost") ? new Date(createdAt.getTime() + randInt(1, 20) * 86400000) : null,
          createdAt,
        },
      });
    }
  }

  // ===== Quotes & Invoices =====
  let qNum = 1000, iNum = 2000;
  for (let i = 0; i < 12; i++) {
    const acct = rand(accounts);
    const items = pickN(products, randInt(1, 3)).map((p) => ({ name: p.name, qty: randInt(1, 5), price: p.price }));
    const total = items.reduce((s, it) => s + it.qty * it.price, 0);
    const status = rand(["draft", "sent", "accepted", "rejected", "expired"]);
    const created = new Date(now - randInt(1, 60) * 86400000);
    await db.quote.create({
      data: {
        number: `Q-${++qNum}`, accountId: acct.id, subject: `${acct.name} — Digital Licenses`,
        status, currency: acct.currency, total,
        items: JSON.stringify(items),
        validUntil: new Date(created.getTime() + 14 * 86400000),
        createdAt: created,
      },
    });
  }
  for (let i = 0; i < 14; i++) {
    const acct = rand(accounts);
    const items = pickN(products, randInt(1, 4)).map((p) => ({ name: p.name, qty: randInt(1, 5), price: p.price }));
    const total = items.reduce((s, it) => s + it.qty * it.price, 0);
    const status = rand(["paid", "paid", "sent", "overdue", "draft"]);
    const created = new Date(now - randInt(1, 80) * 86400000);
    const paid = status === "paid" ? new Date(created.getTime() + randInt(1, 10) * 86400000) : null;
    await db.invoice.create({
      data: {
        number: `INV-${++iNum}`, accountId: acct.id, subject: `${acct.name} — Invoice`,
        status, currency: acct.currency, total,
        items: JSON.stringify(items),
        dueDate: new Date(created.getTime() + 30 * 86400000),
        paidAt: paid, createdAt: created,
      },
    });
  }

  // ===== Workflows =====
  const wfDefs = [
    ["New Lead Auto-Assign", "Round-robin assign new leads to available reps", "lead_created", [{ type: "assign_round_robin" }]],
    ["High-Score Alert", "Notify manager when lead score > 85", "score_threshold", [{ type: "notify", config: { channel: "email", target: "manager" } }]],
    ["Order Thank-You", "Send WhatsApp thank-you on order completion", "order_placed", [{ type: "send_message", config: { channel: "whatsapp" } }]],
    ["Stale Lead Re-engage", "Email leads with no activity for 14 days", "status_change", [{ type: "send_message", config: { channel: "email", template: "reengage" } }]],
    ["VIP Contact Tag", "Auto-tag enterprise contacts as VIP", "contact_added", [{ type: "add_tag", config: { tag: "vip" } }]],
  ] as const;
  for (const [name, desc, trigger, actions] of wfDefs) {
    await db.workflow.create({
      data: {
        name: name as string, description: desc as string, trigger: trigger as string,
        actions: JSON.stringify(actions), enabled: rand([true, true, false]),
        runs: randInt(0, 240), lastRunAt: new Date(now - randInt(0, 48) * 3600000),
      },
    });
  }

  // ===== Waterfall Engine =====
  const wfSources = [
    ["LinkedIn Sales Navigator", "api", 1, "B2B professional enrichment"],
    ["Apollo.io", "api", 2, "Email + phone discovery"],
    ["Facebook Lead Ads", "api", 3, "Paid social leads"],
    ["Instagram Scraper", "scrape", 4, "DM + profile enrichment"],
    ["WhatsApp Business API", "api", 5, "Opt-in leads"],
    ["Partner Referral Feed", "partner", 6, "Reseller referrals"],
    ["CSV Import", "import", 7, "Bulk lead import"],
    ["Clearbit Enrichment", "enrichment", 8, "Company firmographics"],
  ] as const;
  for (const [name, type, step, config] of wfSources) {
    const found = randInt(120, 1800);
    await db.waterfallSource.create({
      data: {
        name: name as string, type: type as string, priority: step, step,
        enabled: rand([true, true, false]), found, converted: Math.floor(found * (0.05 + Math.random() * 0.25)),
        config: JSON.stringify({ description: config, endpoint: `https://api.${(name as string).toLowerCase().replace(/\s/g, "")}.com/v1` }),
      },
    });
  }
  // a few enrichment runs
  const allSources = await db.waterfallSource.findMany();
  for (const s of allSources.slice(0, 6)) {
    await db.enrichmentRun.create({
      data: { sourceId: s.id, status: rand(["completed", "completed", "running", "failed"]),
        found: randInt(20, 200), enriched: randInt(10, 150),
        completedAt: new Date(now - randInt(0, 24) * 3600000) },
    });
  }

  // ===== 4-Seat Capacity =====
  const seatLabels = ["Seat 1 — Sales", "Seat 2 — Support", "Seat 3 — Outreach", "Seat 4 — Manager"];
  for (let i = 0; i < 4; i++) {
    const rep = reps[i] ?? rand(reps);
    await db.seat.create({
      data: {
        label: seatLabels[i], repId: rep.id,
        status: i < 3 ? "active" : rand(["idle", "active"]),
        role: rep.role, lastActiveAt: new Date(now - randInt(0, 60) * 60000),
      },
    });
  }

  // ===== VoIP & Outreach =====
  const campaigns = [
    ["Q4 Win-back WhatsApp", "whatsapp", "running", "Hi {name}, 20% off your next PlayBeat order!"],
    ["Steam Wallet Promo Email", "email", "completed", "Steam Wallet codes now in stock — instant delivery."],
    ["Projector Cold Outreach", "voip", "running", "Hello, PlayBeat Pro 4K projector demo call."],
    ["Black Friday SMS Blast", "sms", "draft", "BF2026: 30% off all subscriptions. Code PLAYBEAT30."],
    ["Meta Retarget DM", "meta", "paused", "Saw you browsing — here's 10% off your cart."],
  ] as const;
  for (const [name, ch, status, msg] of campaigns) {
    const sent = randInt(40, 800);
    const c = await db.outreachCampaign.create({
      data: { name: name as string, channel: ch as string, status: status as string,
        audience: String(randInt(100, 2000)), sent, opened: Math.floor(sent * (0.2 + Math.random() * 0.4)),
        replied: Math.floor(sent * (0.02 + Math.random() * 0.12)), message: msg as string },
    });
    for (let k = 0; k < randInt(3, 8); k++) {
      const lead = rand(leads);
      await db.callLog.create({
        data: { campaignId: c.id, leadId: lead.id, contactName: lead.name, contactPhone: lead.phone,
          direction: rand(["outbound", "inbound"]), durationSec: randInt(0, 900),
          status: rand(["completed", "completed", "missed", "voicemail", "busy"]),
          notes: rand(["Interested", "Callback scheduled", "Not available", "Converted"]),
          startedAt: new Date(now - randInt(0, 72) * 3600000) },
      });
    }
  }
  // some standalone call logs
  for (let k = 0; k < 10; k++) {
    const lead = rand(leads);
    await db.callLog.create({
      data: { contactName: lead.name, contactPhone: lead.phone, direction: "outbound",
        durationSec: randInt(30, 600), status: rand(["completed", "missed", "voicemail"]),
        notes: "Direct support call", startedAt: new Date(now - randInt(0, 48) * 3600000) },
    });
  }

  // ===== Crawler Lab =====
  const crawlers = [
    ["Competitor Price Tracker", "https://store.steampowered.com/search", "0 2 * * *", { type: "price", selector: ".search_price" }],
    ["Reddit Lead Scraper", "https://reddit.com/r/gamedeals", "0 */6 * * *", { type: "posts", selector: ".Post" }],
    ["Gaming Forum Discovery", "https://www.resetera.com/forums/gaming.", "manual", { type: "threads" }],
    ["SaaS Directory Scraper", "https://www.saashub.com/software", "0 0 * * 1", { type: "listings" }],
    ["YouTube Influencer Finder", "https://youtube.com/results?search=gaming", "0 3 * * *", { type: "channels" }],
  ] as const;
  for (const [name, url, sched, config] of crawlers) {
    const found = randInt(5, 120);
    const c = await db.crawler.create({
      data: { name: name as string, targetUrl: url as string, schedule: sched as string,
        status: rand(["idle", "completed", "running", "error"]), found,
        lastRunAt: new Date(now - randInt(0, 72) * 3600000),
        config: JSON.stringify(config) },
    });
    for (let r = 0; r < randInt(2, 6); r++) {
      await db.crawlResult.create({
        data: { crawlerId: c.id, title: `${rand(["Steam", "Epic", "GOG", "Reddit User", "Channel"])} ${randInt(1000, 9999)}`,
          url: `${url}/${randInt(100, 999)}`, price: rand([randInt(5, 80), null]) as number | null,
          data: JSON.stringify({ matched: rand(["price", "post", "channel"]), score: randInt(50, 99) }) },
      });
    }
  }

  // ===== CMS Pages =====
  const cmsPages = [
    ["about", "About PlayBeat", "published", { hero: "Premium digital marketplace", body: "PlayBeat Digital delivers instant digital keys, gaming accounts, subscriptions, AI tools and smart projectors." }],
    ["terms", "Terms of Service", "published", { body: "By using playbeat.digital you agree..." }],
    ["privacy", "Privacy Policy", "published", { body: "We respect your privacy..." }],
    ["refund-policy", "Refund Policy", "published", { body: "Digital keys are non-refundable once delivered..." }],
    ["shipping", "Shipping & Delivery", "draft", { body: "Hardware ships in 2-5 business days..." }],
    ["faq", "Frequently Asked Questions", "published", { body: "Common questions about digital delivery..." }],
  ] as const;
  for (const [slug, title, status, content] of cmsPages) {
    await db.cmsPage.create({ data: { slug: slug as string, title: title as string, status: status as string, content: JSON.stringify(content) } });
  }

  // ===== Homepage Blocks =====
  const blocks = [
    ["hero", "Hero Banner", { headline: "Instant Digital Delivery", sub: "Gaming keys, subscriptions, AI tools & smart projectors", cta: "Shop Now" }, 0],
    ["banner", "Black Friday Banner", { text: "30% OFF all subscriptions — BF2026", bg: "gradient" }, 1],
    ["category", "Shop by Category", { categories: ["Gaming", "Streaming", "AI Tools", "SaaS", "Projectors"] }, 2],
    ["feature", "Why PlayBeat", { features: ["Instant Delivery", "Verified Keys", "24/7 Support", "Secure Payments"] }, 3],
    ["product-grid", "Trending Products", { count: 8 }, 4],
    ["cta", "Newsletter CTA", { text: "Get 10% off your first order", button: "Subscribe" }, 5],
    ["testimonial", "Customer Reviews", { rating: 4.8, count: 1240 }, 6],
  ] as const;
  for (const [type, title, content, order] of blocks) {
    await db.homepageBlock.create({
      data: { type: type as string, title: title as string, content: JSON.stringify(content),
        sortOrder: order as number, enabled: order < 5 },
    });
  }

  // ===== Traffic Events =====
  const paths = ["/", "/category/gaming", "/product/steam-wallet-50", "/checkout", "/account", "/category/streaming", "/product/playbeat-pro-projector-4k", "/cart"];
  const trafficSources = ["direct", "organic", "referral", "social", "ads", "email"];
  const devices = ["desktop", "mobile", "tablet"];
  const trafficCountries = ["Pakistan", "UAE", "USA", "Saudi Arabia", "UK", "India", "Germany"];
  for (let i = 0; i < 400; i++) {
    await db.trafficEvent.create({
      data: {
        path: rand(paths), source: rand(trafficSources), country: rand(trafficCountries),
        device: rand(devices), sessionId: `s_${randInt(10000, 99999)}`,
        durationSec: randInt(5, 900), createdAt: new Date(now - randInt(0, 30) * 86400000 - randInt(0, 86400000)),
      },
    });
  }

  // ===== Orders =====
  const orderStatuses = ["completed", "completed", "completed", "pending", "refunded", "cancelled"];
  const payments = ["card", "paypal", "crypto", "bank-transfer", "easypaisa"];
  for (let i = 0; i < 80; i++) {
    const items = pickN(products, randInt(1, 3)).map((p) => {
      const qty = randInt(1, 3);
      const keys = p.digital ? Array.from({ length: qty }).map(() =>
        `PB-${p.sku}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      ) : [];
      return { name: p.name, price: p.price, qty, licenseKeys: keys, deliveryType: p.deliveryType };
    });
    const total = items.reduce((s, it) => s + it.qty * it.price, 0);
    const allKeys = items.flatMap((it) => it.licenseKeys);
    const created = new Date(now - randInt(0, 60) * 86400000 - randInt(0, 86400000));
    const f = rand(firstNames), l = rand(lastNames);
    await db.order.create({
      data: {
        orderNumber: `PB-${created.getTime().toString().slice(-6)}-${randInt(100, 999)}`,
        customerName: `${f} ${l}`, customerEmail: `${f.toLowerCase()}.${l.toLowerCase()}@gmail.com`,
        status: rand(orderStatuses), total: Number(total.toFixed(2)), currency: "USD",
        paymentMethod: rand(payments),
        items: JSON.stringify(items), licenseKeys: JSON.stringify(allKeys),
        createdAt: created, updatedAt: created,
      },
    });
  }

  console.log(`✅ Seeded: ${reps.length} reps, ${products.length} products, ${accounts.length} accounts, ${contacts.length} contacts, ${leads.length} leads, 12 quotes, 14 invoices, 5 workflows, 8 waterfall sources, 4 seats, 5 campaigns, 5 crawlers, 6 CMS pages, 7 homepage blocks, 400 traffic events, 80 orders.`);
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
