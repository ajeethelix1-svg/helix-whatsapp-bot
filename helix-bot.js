// ============================================================
// HELIX BIOFAST LABS — Complete Interactive Flowchart Bot
// File: helix-bot.js
// Hosted on Render.com — 100% Free, 24/7, Unlimited
// ============================================================

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode');
const express = require('express');
const pino = require('pino');
const https = require('https');
const http = require('http');

// Configuration from Environment Variables or defaults
const CONFIG = {
  ADMIN_PHONE:  process.env.ADMIN_PHONE  || '918383897225@s.whatsapp.net',
  BROCHURE_URL: process.env.BROCHURE_URL || '',
  PORT:         process.env.PORT         || 3000
};

// Memory Session Store for Multi-step Conversations
const userSessions = {};

function getSession(chatId) {
  if (!userSessions[chatId]) {
    userSessions[chatId] = { state: 'IDLE', failedAttempts: 0, data: {} };
  }
  return userSessions[chatId];
}

function resetSession(chatId) {
  userSessions[chatId] = { state: 'IDLE', failedAttempts: 0, data: {} };
}

// ============================================================
// MESSAGES & FLOW RESPONSES
// ============================================================

const MESSAGES = {
  mainMenu:
    'Hello! 👋 Thank you for contacting *Helix BioFast Labs Pvt. Ltd.*, Noida.\n\n' +
    'I can instantly help you with our training programs, fees, and services.\n\n' +
    'Please select:\n\n' +
    '1️⃣ Training Courses\n' +
    '2️⃣ Training Brochure (PDF)\n' +
    '3️⃣ Student Projects & Dissertation\n' +
    '4️⃣ PhD Assistance\n' +
    '5️⃣ Forensic Services\n' +
    '6️⃣ Talk to Our Team 👨‍🔬\n\n' +
    'Type the number (1-6) or ask your question directly. 😊',

  trainingMenu:
    'Thanks for showing interest in our training program! 🧬\n\n' +
    'Please select the duration / type:\n\n' +
    'A. Short Term Training (7 Days)\n' +
    'B. Advance Training (15 Days)\n' +
    'C. Industrial Training (30 Days)\n' +
    'D. Job-Oriented Training\n\n' +
    'Type A, B, C, or D to select.',

  shortTerm:
    '🔬 *Short-Term Training (7 Days) — Your First Step Towards a Biotech Career*\n\n' +
    'Each short-term module is of *7 days*. You can choose multiple modules according to your requirement.\n\n' +
    '📋 *Available 7-Day Modules:*\n' +
    '• Microbiology\n' +
    '• Molecular Biology\n' +
    '• Medical Biotechnology\n' +
    '• Food Biotechnology\n' +
    '• Immunology & more\n\n' +
    '🌐 *Module details & fees:* https://www.helixbiofastlabs.com/short-term-biotechnology-training\n\n' +
    'Type *2* for Brochure PDF | Type *6* to Talk to Our Team.',

  advanceTraining:
    '🧪 *Advance Training (15 Days) — Advanced Skills & Real Lab Experience*\n\n' +
    'Each advance training module is of *15 days*. You can select multiple modules for your training.\n\n' +
    '📋 *Available 15-Day Modules:*\n' +
    '• Microbiology\n' +
    '• Molecular Biology\n' +
    '• Medical Biotechnology\n' +
    '• Food Biotechnology\n' +
    '• Immunology\n' +
    '• Cancer Biology & more\n\n' +
    '🌐 *Module details & fees:* https://www.helixbiofastlabs.com/advance-biotech-training-programes\n\n' +
    'Type *2* for Brochure PDF | Type *6* to Talk to Our Team.',

  industrialTraining:
    '🏬 *Industrial Training (30 Days) — Hands-On Experience & Career-Ready Skills*\n\n' +
    '📋 *Available 30-Day Modules:*\n' +
    '• Industrial Microbiology\n' +
    '• Molecular Biology\n' +
    '• Medical Biotechnology\n' +
    '• Food Biotechnology\n' +
    '• Forensic Science\n' +
    '• Animal Cell Culture\n\n' +
    '🌐 *Module details & fees:* https://www.helixbiofastlabs.com/industrial-biotech-training-programs\n\n' +
    'Type *2* for Brochure PDF | Type *6* to Talk to Our Team.',

  jobOrientedInfo:
    '💼 *JOB-ORIENTED BIOTECHNOLOGY TRAINING PROGRAMME*\n' +
    'Learn Practical Skills. Gain Industry Exposure. Build Your Career.\n\n' +
    '🧫 *Get hands-on laboratory training in:*\n' +
    '• Molecular Biology\n' +
    '• Microbiology\n' +
    '• Medical Biotechnology / Food Biotechnology\n\n' +
    '✅ Practical & Hands-on Training\n' +
    '✅ Industry-Relevant Skills\n' +
    '✅ Certificate of Training\n' +
    '✅ Resume & Interview Guidance\n' +
    '🎓 Designed for B.Sc. / M.Sc. Life Science Students\n\n' +
    'To help us guide you better, *what is your qualification?*\n' +
    '1. B.Sc\n' +
    '2. M.Sc\n' +
    '3. Other',

  projectStart:
    '🔬 *STUDENT PROJECTS & DISSERTATION TRAINING*\n' +
    'Turn Your Research Idea into Real Laboratory Experience!\n' +
    'Hands-on Projects | Expert Mentorship | Complete Research Guidance\n\n' +
    'What are you looking for?\n' +
    '1️⃣ Project Work\n' +
    '2️⃣ Dissertation Training\n' +
    '3️⃣ Research Assistance\n\n' +
    'Type 1, 2, or 3 to select.',

  phdStart:
    '🎓 *PhD RESEARCH ASSISTANCE*\n' +
    'Need support with your PhD research? We can help you move from idea to research output.\n\n' +
    'What type of assistance do you need?\n' +
    '1️⃣ Research Topic & Experimental Planning\n' +
    '2️⃣ Laboratory & Experimental Support\n' +
    '3️⃣ Data Analysis & Interpretation\n' +
    '4️⃣ Thesis & Research Paper Support\n\n' +
    'Type 1, 2, 3, or 4.',

  forensicStart:
    '🔍 *FORENSIC SCIENCE SERVICES*\n' +
    'Reliable Laboratory Support for Forensic Investigations & Research.\n\n' +
    'What do you need?\n' +
    '1️⃣ Blood Grouping & ABO/Rh Analysis\n' +
    '2️⃣ Other Sample Examination & Lab Testing\n\n' +
    'Type 1 or 2.',

  humanPrompt:
    '👨‍🔬 *Talk to Our Team*\n\n' +
    'Please write a brief message telling us what you need help with. Our staff will review and contact you shortly.'
};

// ============================================================
// INTENT DETECTION LOGIC
// ============================================================

function detectDirectIntent(text) {
  const msg = text.toLowerCase().trim();

  // Menu Numbers
  if (msg === '1' || msg === 'courses' || msg === 'training') return 'trainingMenu';
  if (msg === '2' || msg === 'brochure' || msg === 'pdf') return 'brochure';
  if (msg === '3' || msg === 'project' || msg === 'projects' || msg === 'dissertation') return 'projects';
  if (msg === '4' || msg === 'phd' || msg === 'ph.d' || msg === 'doctorate') return 'phd';
  if (msg === '5' || msg === 'forensic' || msg === 'forensics' || msg === 'dna test') return 'forensic';
  if (msg === '6' || msg === 'human' || msg === 'talk' || msg === 'contact' || msg === 'call' || msg === 'team') return 'human';

  // Sub-menu Options
  if (msg === 'a' || msg.includes('short term') || msg.includes('7 day') || msg.includes('7 days')) return 'shortTerm';
  if (msg === 'b' || msg.includes('advance') || msg.includes('15 day') || msg.includes('15 days')) return 'advanceTraining';
  if (msg === 'c' || msg.includes('industrial') || msg.includes('30 day') || msg.includes('30 days')) return 'industrialTraining';
  if (msg === 'd' || msg.includes('job oriented') || msg.includes('career')) return 'jobOriented';

  // Greetings
  if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey') || msg.includes('start') || msg.includes('menu')) return 'mainMenu';

  // Direct Keyword Smart Matching (Skips menu!)
  if (msg.includes('microbiology') || msg.includes('molecular') || msg.includes('biotech') || msg.includes('immunology') || msg.includes('cancer') || msg.includes('cell culture')) {
    if (msg.includes('15') || msg.includes('advance')) return 'advanceTraining';
    if (msg.includes('30') || msg.includes('industrial')) return 'industrialTraining';
    if (msg.includes('job')) return 'jobOriented';
    return 'shortTerm';
  }

  return null;
}

// Download PDF helper
function downloadFile(url) {
  return new Promise((res, rej) => {
    const p = url.startsWith('https') ? https : http;
    p.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
      if ([301, 302, 303].includes(resp.statusCode)) {
        downloadFile(resp.headers.location).then(res).catch(rej);
        return;
      }
      const chunks = [];
      resp.on('data', d => chunks.push(d));
      resp.on('end', () => res(Buffer.concat(chunks)));
      resp.on('error', rej);
    }).on('error', rej);
  });
}

// Notify staff of new lead/handover
async function notifyStaff(sock, name, chatId, text, title = 'STUDENT LEAD') {
  if (!CONFIG.ADMIN_PHONE || CONFIG.ADMIN_PHONE.includes('XXXXXXXXXX')) return;
  try {
    const alertMsg =
      `🚨 *${title}*\n\n` +
      `👤 Name: ${name}\n` +
      `📱 Phone: ${chatId}\n` +
      `💬 Details: ${text}\n` +
      `⏰ Time: ${new Date().toLocaleString('en-IN')}`;
    await sock.sendMessage(CONFIG.ADMIN_PHONE, { text: alertMsg });
    console.log('🔔 Staff notified');
  } catch (err) {
    console.error('Failed to notify staff:', err.message);
  }
}

// ============================================================
// PROCESS INCOMING MESSAGES WITH FLOWCHART STATE MACHINE
// ============================================================

async function processMessage(sock, chatId, name, text) {
  const session = getSession(chatId);
  const msg = text.trim();
  const lower = msg.toLowerCase();

  // Check if student directly typed an intent (overrides current flow)
  const directIntent = detectDirectIntent(text);

  if (directIntent && session.state === 'IDLE') {
    session.failedAttempts = 0;
    return handleDirectIntent(sock, chatId, name, text, directIntent, session);
  }

  // Handle Multi-step Interactive Flows
  switch (session.state) {

    case 'WAITING_JOB_QUALIFICATION':
      session.data.qualification = msg;
      session.state = 'IDLE';
      await sock.sendMessage(chatId, {
        text: `Thank you! Qualified as *${msg}*.\n\n🌐 *More details & registration:* https://www.helixbiofastlabs.com/job-oriented-training\n\nType *2* for Brochure PDF | Type *6* to talk to our team.`
      });
      await notifyStaff(sock, name, chatId, `Job-Oriented Enquirer (Qual: ${msg})`, 'JOB-ORIENTED LEAD');
      break;

    case 'WAITING_PROJECT_TYPE':
      session.data.projectType = msg;
      session.state = 'WAITING_PROJECT_TOPIC';
      await sock.sendMessage(chatId, {
        text: 'Do you already have a research topic in mind?\n\n1. Yes\n2. No (Offer topic discussion)'
      });
      break;

    case 'WAITING_PROJECT_TOPIC':
      session.data.hasTopic = msg;
      session.state = 'IDLE';
      await sock.sendMessage(chatId, {
        text: 'Thank you! Our research coordinator has received your project request and will discuss topics/details with you shortly.\n\n🌐 *Website:* https://www.helixbiofastlabs.com/project-dissertation-training-in-biotechnology\n\n📞 Emergency Call: 8383897225'
      });
      await notifyStaff(sock, name, chatId, `Project Enquiry (Type: ${session.data.projectType}, Topic Preference: ${msg})`, 'PROJECT LEAD');
      break;

    case 'WAITING_PHD_ASSISTANCE':
      session.data.phdRequirement = msg;
      session.state = 'IDLE';
      await sock.sendMessage(chatId, {
        text: 'Thank you for sharing your PhD requirement. Our senior research scientist will contact you shortly to discuss your research work.\n\n📞 Direct Call: 8383897225\n📧 biofastlabs@gmail.com'
      });
      await notifyStaff(sock, name, chatId, `PhD Requirement: ${msg}`, 'PhD RESEARCH LEAD');
      break;

    case 'WAITING_FORENSIC_TYPE':
      session.data.forensicType = msg;
      session.state = 'IDLE';
      await sock.sendMessage(chatId, {
        text: 'Thank you! Your forensic testing request has been registered. Our forensic expert will connect with you to discuss sample submission & testing protocol.\n\n📞 Contact: 8383897225'
      });
      await notifyStaff(sock, name, chatId, `Forensic Testing Request: ${msg}`, 'FORENSIC LEAD');
      break;

    case 'WAITING_HUMAN_MESSAGE':
      session.state = 'IDLE';
      await sock.sendMessage(chatId, { text: MESSAGES.human });
      await notifyStaff(sock, name, chatId, msg, 'STUDENT HUMAN ENQUIRY');
      break;

    default:
      if (directIntent) {
        session.failedAttempts = 0;
        return handleDirectIntent(sock, chatId, name, text, directIntent, session);
      }

      // Handle Unknown / Failed Attempts with Universal Fallback
      session.failedAttempts += 1;

      if (session.failedAttempts >= 2) {
        // Automatic handover to human after 2 failed attempts
        session.failedAttempts = 0;
        session.state = 'IDLE';
        await sock.sendMessage(chatId, {
          text: 'I notice you need detailed help! I have forwarded your message directly to our team. Someone from Helix BioFast Labs will call/message you shortly.\n\n📞 8383897225 | 📧 biofastlabs@gmail.com'
        });
        await notifyStaff(sock, name, chatId, `Auto-Handover (2 failed bot attempts). Last message: "${text}"`, 'AUTO HUMAN HANDOVER');
      } else {
        await sock.sendMessage(chatId, { text: MESSAGES.unknown });
      }
      break;
  }
}

// Handle Single-Step / Triggered Intention
async function handleDirectIntent(sock, chatId, name, text, directIntent, session) {
  switch (directIntent) {
    case 'mainMenu':
      await sock.sendMessage(chatId, { text: MESSAGES.mainMenu });
      break;
    case 'trainingMenu':
      await sock.sendMessage(chatId, { text: MESSAGES.trainingMenu });
      break;
    case 'shortTerm':
      await sock.sendMessage(chatId, { text: MESSAGES.shortTerm });
      break;
    case 'advanceTraining':
      await sock.sendMessage(chatId, { text: MESSAGES.advanceTraining });
      break;
    case 'industrialTraining':
      await sock.sendMessage(chatId, { text: MESSAGES.industrialTraining });
      break;
    case 'jobOriented':
      session.state = 'WAITING_JOB_QUALIFICATION';
      await sock.sendMessage(chatId, { text: MESSAGES.jobOrientedInfo });
      break;
    case 'projects':
      session.state = 'WAITING_PROJECT_TYPE';
      await sock.sendMessage(chatId, { text: MESSAGES.projectStart });
      break;
    case 'phd':
      session.state = 'WAITING_PHD_ASSISTANCE';
      await sock.sendMessage(chatId, { text: MESSAGES.phdStart });
      break;
    case 'forensic':
      session.state = 'WAITING_FORENSIC_TYPE';
      await sock.sendMessage(chatId, { text: MESSAGES.forensicStart });
      break;
    case 'human':
      session.state = 'WAITING_HUMAN_MESSAGE';
      await sock.sendMessage(chatId, { text: MESSAGES.humanPrompt });
      break;
    case 'brochure':
      await sock.sendMessage(chatId, { text: '📄 *Helix BioFast Labs — Complete Brochure*\n\nPlease wait, sending PDF file...' });
      if (CONFIG.BROCHURE_URL) {
        try {
          const buf = await downloadFile(CONFIG.BROCHURE_URL);
          await sock.sendMessage(chatId, {
            document: buf,
            fileName: 'Helix_BioFast_Labs_Brochure.pdf',
            mimetype: 'application/pdf',
            caption: 'Helix BioFast Labs — Official Brochure\n\nWould you like more information?\nType 1 for Main Menu | Type 6 to Talk to Our Team.'
          });
        } catch (err) {
          await sock.sendMessage(chatId, { text: '📄 For full brochure, please contact us:\n📞 8383897225\n📧 biofastlabs@gmail.com' });
        }
      } else {
        await sock.sendMessage(chatId, { text: '📄 For full brochure, please contact us:\n📞 8383897225\n📧 biofastlabs@gmail.com' });
      }
      break;
  }
}

// ============================================================
// BAILEYS CLIENT SETUP
// ============================================================

let sock = null, qrData = null, connected = false;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./.session');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Helix BioFast Labs', 'Chrome', '1.0'],
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrData = await qrcode.toDataURL(qr);
      connected = false;
      console.log('\n📱 QR Code Ready!\n');
    }
    if (connection === 'open') {
      qrData = null;
      connected = true;
      console.log('\n🟢 WhatsApp CONNECTED! Bot is running 24/7.\n');
    }
    if (connection === 'close') {
      connected = false;
      const code = (lastDisconnect?.error instanceof Boom) ? lastDisconnect.error.output.statusCode : 0;
      if (code === DisconnectReason.loggedOut) {
        console.log('❌ Logged out from WhatsApp.');
      } else {
        console.log('Reconnecting in 5s...');
        setTimeout(startBot, 5000);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid.endsWith('@g.us')) continue;

      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      if (!text.trim()) continue;

      const chatId = msg.key.remoteJid;
      const name = msg.pushName || chatId.split('@')[0];

      await processMessage(sock, chatId, name, text);
    }
  });
}

// ============================================================
// EXPRESS WEB SERVER
// ============================================================

const app = express();

app.get('/qr', (req, res) => {
  if (qrData) {
    res.send(`<!DOCTYPE html><html><head><title>Helix QR</title><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="20"><style>body{font-family:Arial;background:#f0f4f8;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:#fff;border-radius:16px;padding:28px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.12);max-width:320px;width:90%}h2{color:#128C7E;margin:0 0 8px}p{color:#555;margin:6px 0;font-size:14px}img{width:240px;height:240px;border-radius:8px;margin:14px auto;display:block}.s{background:#f8f8f8;border-radius:8px;padding:12px;text-align:left;font-size:13px;margin:12px 0}.n{font-size:11px;color:#bbb;margin-top:12px}</style></head><body><div class="card"><h2>🔗 Link WhatsApp</h2><div class="s">1. Open WhatsApp Business App<br>2. Settings &rr; Linked Devices<br>3. Link a Device &rr; Scan below</div><img src="${qrData}"><p class="n">Auto-refreshes every 20 sec</p></div></body></html>`);
  } else if (connected) {
    res.send('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial;text-align:center;padding:60px 20px;background:#f0f4f8"><div style="background:#fff;border-radius:16px;padding:30px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,.1)"><h2 style="color:#128C7E">✅ WhatsApp Connected!</h2><p style="color:#555">Helix BioFast Labs Bot is running 24/7 on Render.</p></div></body></html>');
  } else {
    res.send('<html><head><meta http-equiv="refresh" content="3"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial;text-align:center;padding:60px"><h2>Starting... please wait</h2></body></html>');
  }
});

app.get('/health', (req, res) => res.json({ connected, time: new Date().toISOString() }));
app.listen(CONFIG.PORT, '0.0.0.0', () => console.log('🌐 Express listening on port ' + CONFIG.PORT));

console.log('\n🚀 Starting Helix BioFast Labs Complete Flowchart Bot...\n');
startBot();
