// ============================================================
// HELIX BIOFAST LABS — Complete WhatsApp Bot
// File: helix-bot.js (Render.com Cloud Edition)
// ============================================================

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode');
const express = require('express');
const pino = require('pino');
const https = require('https');
const http = require('http');
const fs = require('fs');

// Environment variables from Render dashboard (or fallbacks)
const CONFIG = {
  ADMIN_PHONE:  process.env.ADMIN_PHONE  || '91XXXXXXXXXX@s.whatsapp.net',
  BROCHURE_URL: process.env.BROCHURE_URL || '',
  PORT:         process.env.PORT         || 3000
};

const INTENTS = {
  menu:     ['hi','hello','hey','helo','hii','hai','hy','start','menu','help','namaste','good morning','good afternoon','good evening','good night','ji','ok'],
  courses:  ['1','course','courses','training','trainning','program','programme','internship','intern','learn','study','biotechnology','microbiology','molecular biology','biochemistry','cell culture','animal cell','plant cell','pcr','elisa','western blot','bioinformatics','recombinant','genomics','proteomics','immunology','tissue culture','fermentation','chromatography','protein','dna extraction','rna'],
  fees:     ['2','fee','fees','price','prices','cost','costs','charge','charges','how much','kitna','amount','rate','rupee','rupees','rs ','paisa','money','scholarship','discount','payment'],
  brochure: ['3','brochure','brocher','brochur','brocure','pdf','catalogue','catalog','prospectus','syllabus','send details','course details','more details'],
  projects: ['4','project','projects','student project','mini project','major project','project work','bsc project','msc project','final year'],
  phd:      ['5','phd','ph.d','doctorate','doctoral','phd assistance','thesis','dissertation','research scholar'],
  forensic: ['6','forensic','forensics','forensic service','dna test','fingerprint','crime scene','forensic biology'],
  human:    ['7','team','staff','human','person','talk','call','contact','speak','expert','counselor','admission','enquiry','register','enroll','join'],
  address:  ['address','location','where','kahan','noida','sector 2','office','lab','how to reach','directions','map','nearest metro'],
  cert:     ['certificate','cert','certification','letter','completion letter','internship letter'],
  duration: ['duration','how long','how many weeks','weeks','days','months','1 week','2 week','3 week','4 week']
};

const R = {
  menu:
    'Hello! 👋 Thank you for contacting *Helix BioFast Labs Pvt. Ltd.*, Noida.\n\n' +
    'I can instantly help you with our training programs, fees, and services.\n\n' +
    'Please select:\n\n1️⃣ Training Courses\n2️⃣ Course Fees\n3️⃣ Training Brochure (PDF)\n' +
    '4️⃣ Student Projects\n5️⃣ PhD Assistance\n6️⃣ Forensic Services\n7️⃣ Talk to Our Team\n\n' +
    'Type the number or ask your question. 😊',
  courses:
    '🧬 *Helix BioFast Labs — Training Programs*\n\n' +
    'Hands-on laboratory training in:\n\n' +
    '🔬 Molecular Biology\n🧫 Microbiology\n🧪 Biochemistry\n' +
    '🦠 Animal & Plant Cell Culture\n🧬 PCR & Genomics\n💉 ELISA & Immunotechnology\n' +
    '🖥️ Bioinformatics\n🔬 Recombinant DNA Technology\n🧬 Western Blotting\n🔍 Forensic Biology\n\n' +
    'All training is *hands-on* at our *Noida laboratory*.\n\nType *2* for fees | *3* for brochure | *7* to talk to us.',
  fees:
    '💰 *Helix BioFast Labs — Training Fees*\n\n' +
    '📅 *1 Week*  — Contact for fee\n📅 *2 Weeks* — Contact for fee\n' +
    '📅 *3 Weeks* — Contact for fee\n📅 *4 Weeks* — Contact for fee\n\n' +
    '_Fees vary by course. Tell us your course of interest._\n\nType *3* for brochure | *7* to speak with team.',
  projects:
    '🔬 *Helix BioFast Labs — Student Projects*\n\n' +
    '✅ B.Sc / M.Sc Final Year Project Work\n✅ Hands-on Lab Training\n✅ Experimental Design\n' +
    '✅ Data Analysis Support\n✅ Thesis Lab Work\n✅ Project Completion Certificate\n\n' +
    'All at our Noida lab. Type *7* to discuss.',
  phd:
    '🎓 *Helix BioFast Labs — PhD Assistance*\n\n' +
    '✅ Experimental Design Consultation\n✅ PCR, ELISA, Western Blot, Cell Culture\n' +
    '✅ Bioinformatics & Data Analysis\n✅ Thesis Lab Work Support\n\nType *7* to connect with our team.',
  forensic:
    '🔍 *Helix BioFast Labs — Forensic Services*\n\n' +
    '✅ DNA Fingerprinting & Analysis\n✅ Forensic Biology Training\n✅ Molecular Forensics\n' +
    '✅ Forensic Training Programs\n\nType *7* for enquiries.',
  human:
    '🙏 *Thank you for contacting Helix BioFast Labs!*\n\n' +
    'Your enquiry has been received. Our team will contact you shortly.\n\n' +
    '📞 [YOUR PHONE NUMBER]\n📧 biofastlabs@gmail.com\n🌐 www.helixbiofastlabs.com\n' +
    '📍 A-52, First Floor, Sector-2, Noida — 201301\n\n🕐 Mon–Sat, 9 AM – 6 PM',
  address:
    '📍 *Helix BioFast Labs Pvt. Ltd.*\n\nA-52, First Floor, Sector-2,\nNoida, Uttar Pradesh — 201301\n\n' +
    '🗺️ https://maps.google.com/?q=A-52+Sector+2+Noida\n\n📞 [YOUR PHONE NUMBER]\n' +
    '📧 biofastlabs@gmail.com\n🌐 www.helixbiofastlabs.com\n\n🕐 Mon–Sat, 9 AM – 6 PM',
  cert:
    '🏆 *Helix BioFast Labs — Certificate*\n\n' +
    '✅ Course Completion Certificate after training\n✅ Includes course, duration, date\n' +
    '✅ Signed by Lab Director | Official seal\n✅ Separate Project Completion Certificate\n\nType *7* for queries.',
  duration:
    '⏰ *Helix BioFast Labs — Training Duration*\n\n' +
    '📅 *1 Week*  — Intensive\n📅 *2 Weeks* — Comprehensive\n' +
    '📅 *3 Weeks* — In-depth\n📅 *4 Weeks* — Full professional\n\nType *2* for fees | *3* for brochure.',
  unknown:
    '🤔 I did not understand your query fully.\n\n' +
    'Type *1* Courses | *2* Fees | *3* Brochure\nType *4* Projects | *5* PhD | *6* Forensic | *7* Team\n\n' +
    'Or just ask again! 😊\n📧 biofastlabs@gmail.com'
};

function intent(msg) {
  const t = msg.toLowerCase().trim();
  for (const [k,v] of Object.entries(INTENTS)) if (v.some(w => t===w||t.includes(w))) return k;
  return 'unknown';
}

function downloadFile(url) {
  return new Promise((res,rej) => {
    const p = url.startsWith('https') ? https : http;
    p.get(url, {headers:{'User-Agent':'Mozilla/5.0'}}, r => {
      if ([301,302,303].includes(r.statusCode)) { downloadFile(r.headers.location).then(res).catch(rej); return; }
      const c=[]; r.on('data',d=>c.push(d)); r.on('end',()=>res(Buffer.concat(c))); r.on('error',rej);
    }).on('error',rej);
  });
}

let sock=null, qrData=null, connected=false;

async function start() {
  const {state,saveCreds} = await useMultiFileAuthState('./.session');
  const {version} = await fetchLatestBaileysVersion();
  sock = makeWASocket({version,auth:state,logger:pino({level:'silent'}),printQRInTerminal:false,browser:['Helix BioFast Labs','Chrome','1.0'],syncFullHistory:false});
  sock.ev.on('creds.update',saveCreds);
  sock.ev.on('connection.update', async ({connection,lastDisconnect,qr}) => {
    if (qr) { qrData=await qrcode.toDataURL(qr); connected=false; console.log('\n📱 QR ready!\n'); }
    if (connection==='open') { qrData=null; connected=true; console.log('\n🟢 WhatsApp CONNECTED! Bot running.\n'); }
    if (connection==='close') {
      connected=false;
      const code=(lastDisconnect?.error instanceof Boom)?lastDisconnect.error.output.statusCode:0;
      if (code===DisconnectReason.loggedOut) { console.log('❌ Logged out.'); }
      else { console.log('Reconnecting in 5s...'); setTimeout(start,5000); }
    }
  });
  sock.ev.on('messages.upsert', async ({messages,type}) => {
    if (type!=='notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe||msg.key.remoteJid==='status@broadcast'||msg.key.remoteJid.endsWith('@g.us')) continue;
      const text=msg.message?.conversation||msg.message?.extendedTextMessage?.text||'';
      if (!text.trim()) continue;
      const chatId=msg.key.remoteJid, name=msg.pushName||chatId.split('@')[0], it=intent(text);
      console.log('\n📥 ['+it+'] '+name+': "'+text.substring(0,50)+'"');
      try {
        if (it==='brochure') {
          await sock.sendMessage(chatId,{text:'📄 Sending brochure...'});
          if (CONFIG.BROCHURE_URL) {
            const buf=await downloadFile(CONFIG.BROCHURE_URL);
            await sock.sendMessage(chatId,{document:buf,fileName:'Helix_BioFast_Labs_Brochure.pdf',mimetype:'application/pdf',caption:'Helix BioFast Labs — Complete Brochure\nType 1 for courses | 7 to talk to us.'});
          } else {
            await sock.sendMessage(chatId,{text:'📄 Our brochure is not yet configured.\n📧 biofastlabs@gmail.com'});
          }
        } else if (it==='human') {
          await sock.sendMessage(chatId,{text:R.human});
          if (CONFIG.ADMIN_PHONE && !CONFIG.ADMIN_PHONE.includes('XXXXXXXXXX')) {
            await sock.sendMessage(CONFIG.ADMIN_PHONE,{text:'🚨 *Student Enquiry*\n\n👤 '+name+'\n📱 '+chatId+'\n💬 '+text+'\n⏰ '+new Date().toLocaleString('en-IN')});
          }
        } else {
          await sock.sendMessage(chatId,{text:R[it]||R.unknown});
        }
        console.log('✅ Replied');
      } catch(e) { console.error('❌ Error:',e.message); }
    }
  });
}

const app=express();
app.get('/qr',(req,res)=>{
  if (qrData) res.send(`<!DOCTYPE html><html><head><title>Helix QR</title><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="20"><style>body{font-family:Arial;background:#f0f4f8;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:#fff;border-radius:16px;padding:28px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.12);max-width:320px;width:90%}h2{color:#128C7E;margin:0 0 8px}p{color:#555;margin:6px 0;font-size:14px}img{width:240px;height:240px;border-radius:8px;margin:14px auto;display:block}.s{background:#f8f8f8;border-radius:8px;padding:12px;text-align:left;font-size:13px;margin:12px 0}.n{font-size:11px;color:#bbb;margin-top:12px}</style></head><body><div class="card"><h2>🔗 Link WhatsApp</h2><div class="s">1. Open WhatsApp Business App<br>2. Settings &rarr; Linked Devices<br>3. Link a Device &rarr; Scan below</div><img src="${qrData}"><p class="n">Auto-refreshes every 20 sec</p></div></body></html>`);
  else if (connected) res.send('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial;text-align:center;padding:60px 20px;background:#f0f4f8"><div style="background:#fff;border-radius:16px;padding:30px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,.1)"><h2 style="color:#128C7E">✅ WhatsApp Connected!</h2><p style="color:#555">Helix Bot is running 24/7. You can close this page.</p></div></body></html>');
  else res.send('<html><head><meta http-equiv="refresh" content="3"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial;text-align:center;padding:60px"><h2>Starting... please wait</h2></body></html>');
});
app.get('/health',(req,res)=>res.json({connected,time:new Date().toISOString()}));
app.listen(CONFIG.PORT,'0.0.0.0',()=>console.log('🌐 Server listening on port '+CONFIG.PORT));

console.log('\n🚀 Helix BioFast Labs WhatsApp Bot Starting...\n');
start();
