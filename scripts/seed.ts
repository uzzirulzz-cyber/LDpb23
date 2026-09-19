import { db } from "@/lib/db";

// FX rates relative to USD
const FX: Record<string, number> = { USD: 1, PKR: 278, AED: 3.67 };

const reps = [
  { name: "Ayesha Khan", email: "ayesha@playbeat.io", role: "manager", region: "PK", target: 80000 },
  { name: "Bilal Ahmed", email: "bilal@playbeat.io", role: "sales", region: "PK", target: 50000 },
  { name: "Sara Malik", email: "sara@playbeat.io", role: "sales", region: "AE", target: 60000 },
  { name: "Daniyal Raza", email: "daniyal@playbeat.io", role: "sales", region: "PK", target: 45000 },
  { name: "Hira Sheikh", email: "hira@playbeat.io", role: "sales", region: "US", target: 70000 },
];

const sources = ["website", "facebook", "instagram", "whatsapp", "referral", "ads", "organic", "api"];
const companies = ["NovaTech", "Skyline Ventures", "Crescent Media", "Apex Digital", "Horizon Labs", "Vertex Co", "Lumen Studio", "Quantum Reach", "Stellar Group", "BluePeak", "Orbit Agency", "Meridian IO"];
const firstNames = ["Ahmed", "Fatima", "Usman", "Zainab", "Hassan", "Maryam", "Omar", "Aisha", "Bilal", "Khadija", "Ali", "Noor", "Hamza", "Sana", "Fahad", "Hira", "Talha", "Anum", "Rizwan", "Mahnoor"];
const lastNames = ["Khan", "Ahmed", "Malik", "Sheikh", "Raza", "Iqbal", "Hussain", "Akhtar", "Butt", "Cheema", "Javed", "Siddiqui", "Aslam", "Tariq", "Shah"];
const countries = ["Pakistan", "UAE", "USA", "Saudi Arabia", "UK", "India"];
const statuses = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function genPhone(cc: string) {
  const code = cc === "Pakistan" ? "+92" : cc === "UAE" ? "+971" : cc === "USA" ? "+1" : cc === "Saudi Arabia" ? "+966" : cc === "UK" ? "+44" : "+91";
  return `${code} 3${randInt(10, 89)} ${randInt(1000000, 9999999)}`;
}

export async function seed() {
  console.log("🌱 Seeding PLAYBEAT PULSE...");

  await db.pixelEvent.deleteMany();
  await db.deal.deleteMany();
  await db.message.deleteMany();
  await db.activity.deleteMany();
  await db.lead.deleteMany();
  await db.rep.deleteMany();

  const repRows = await Promise.all(reps.map((r) => db.rep.create({ data: r })));

  const now = Date.now();
  let leadCount = 0;
  for (let i = 0; i < 60; i++) {
    const first = rand(firstNames);
    const last = rand(lastNames);
    const name = `${first} ${last}`;
    const country = rand(countries);
    const currency = country === "Pakistan" ? "PKR" : country === "UAE" ? "AED" : "USD";
    const source = rand(sources);
    const status = rand(statuses);
    const daysAgo = randInt(0, 90);
    const createdAt = new Date(now - daysAgo * 86400000 - randInt(0, 86400000));
    const valueUsd = randInt(500, 25000);
    const value = Math.round(valueUsd * FX[currency]);
    const rep = rand(repRows);
    const lead = await db.lead.create({
      data: {
        name,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@${rand(companies).toLowerCase().replace(/\s/g, "")}.com`,
        phone: genPhone(country),
        company: rand(companies),
        country,
        source,
        status,
        stage: status,
        value,
        currency,
        score: randInt(20, 98),
        tags: rand([["hot"], ["enterprise"], ["smb"], ["inbound", "hot"], ["outbound"], ["webinar"], ["trial"], []]).join(","),
        assignedTo: rep.id,
        createdAt,
        updatedAt: createdAt,
      },
    });
    leadCount++;

    const actCount = randInt(1, 4);
    for (let a = 0; a < actCount; a++) {
      const actType = rand(["call", "email", "meeting", "note", "status_change", "assigned", "message"]);
      const when = new Date(createdAt.getTime() + randInt(0, Math.max(1, daysAgo)) * 3600000);
      await db.activity.create({
        data: {
          leadId: lead.id,
          type: actType,
          description:
            actType === "call" ? `Called ${first}, ${rand(["answered", "voicemail left", "missed call", "follow-up scheduled"])}.`
            : actType === "email" ? `Sent ${rand(["intro proposal", "pricing sheet", "demo invite", "follow-up"])} to ${first}.`
            : actType === "meeting" ? `Discovery meeting with ${first} — ${rand(["positive", "needs follow-up", "decision pending"])}.`
            : actType === "note" ? `Note: ${first} ${rand(["asked about enterprise tier", "wants custom integrations", "budget confirmed", "comparing competitors"])}.`
            : actType === "status_change" ? `Status moved to ${status}.`
            : actType === "assigned" ? `Assigned to ${rep.name}.`
            : `${rand(["WhatsApp", "Messenger", "Instagram DM"])} reply from ${first}.`,
          meta: JSON.stringify({ rep: rep.name }),
          createdAt: when,
        },
      });
    }

    if (Math.random() > 0.5) {
      const ch = rand(["meta", "whatsapp", "sms", "email"]);
      const mCount = randInt(2, 6);
      for (let m = 0; m < mCount; m++) {
        const outbound = m % 2 === 0;
        await db.message.create({
          data: {
            leadId: lead.id,
            channel: ch,
            direction: outbound ? "outbound" : "inbound",
            content: outbound
              ? rand([`Hi ${first}, thanks for your interest in Playbeat!`, `Following up on your inquiry about our enterprise plan.`, `Can we schedule a quick demo this week?`, `Sharing the pricing sheet as requested.`])
              : rand([`Hi, I saw your ad — can you share details?`, `What are the pricing tiers?`, `We're comparing vendors, what makes you different?`, `Thanks, looks good. Let me discuss internally.`]),
            status: rand(["sent", "delivered", "read", "delivered", "read"]),
            createdAt: new Date(createdAt.getTime() + m * randInt(1800000, 7200000)),
          },
        });
      }
    }

    if (["proposal", "negotiation", "won", "lost"].includes(status)) {
      await db.deal.create({
        data: {
          leadId: lead.id,
          title: `${lead.company} — ${currency} ${value.toLocaleString()}`,
          value,
          currency,
          stage: status,
          closeDate: status === "won" || status === "lost" ? new Date(createdAt.getTime() + randInt(1, 20) * 86400000) : null,
          createdAt,
        },
      });
    }
  }

  console.log(`✅ Seeded ${repRows.length} reps, ${leadCount} leads.`);
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
