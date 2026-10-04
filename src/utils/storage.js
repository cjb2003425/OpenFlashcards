'use strict';
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const CONFIG_DIR = process.env.CONFIG_DIR || path.join(__dirname, '..', '..', 'config');
const USERS_FILE = path.join(CONFIG_DIR, 'users.json');
const SINGLE_USER_MODE = process.env.SINGLE_USER_MODE !== 'false';

// ── Init ─────────────────────────────────────────────────────────────────────
function ensureDataDirs() {
  [DATA_DIR, CONFIG_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // Bootstrap users.json. The Cijian deployment is single-user by default.
  if (!fs.existsSync(USERS_FILE)) {
    if (SINGLE_USER_MODE) {
      writeJson(USERS_FILE, {
        local: {
          id: 'local',
          username: '本机用户',
          role: 'user',
          createdAt: new Date().toISOString()
        }
      });
      console.log('👤 Single-user mode enabled.');
      return;
    }
    const bcrypt = require('bcryptjs');
    const { randomUUID } = require('crypto');
    const adminId = randomUUID();
    const users = {
      [adminId]: {
        id: adminId,
        username: 'admin',
        passwordHash: bcrypt.hashSync('admin', 10),
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    };
    writeJson(USERS_FILE, users);
    console.log('🔑 Default admin created. Login: admin / admin  ← CHANGE THIS!');
  }
}

// ── Generic JSON helpers ─────────────────────────────────────────────────────
function readJson(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ── Users ────────────────────────────────────────────────────────────────────
function getUsers() {
  return readJson(USERS_FILE, {});
}

function saveUsers(users) {
  writeJson(USERS_FILE, users);
}

function getUserById(id) {
  const users = getUsers();
  return users[id] || null;
}

function getUserByUsername(username) {
  const users = getUsers();
  return Object.values(users).find(u => u.username === username) || null;
}

// ── User data paths ──────────────────────────────────────────────────────────
function userDir(userId) {
  const d = path.join(DATA_DIR, userId);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function wordsFile(userId, langCode) {
  return path.join(userDir(userId), `Words_${userId}_${langCode}.json`);
}

function phrasesFile(userId, langCode) {
  return path.join(userDir(userId), `Sentences_${userId}_${langCode}.json`);
}

function userConfigFile(userId) {
  return path.join(userDir(userId), 'config.json');
}

// ── User config (languages, prefs) ──────────────────────────────────────────
function getUserConfig(userId) {
  return readJson(userConfigFile(userId), {
    nativeLang: SINGLE_USER_MODE ? 'zh' : 'en',
    targetLangs: SINGLE_USER_MODE ? [{
      isoCode: 'en',
      name: 'English',
      flag: '🇬🇧',
      nativeName: '英语',
      tenses: [{ nativeName: '现在时', targetName: 'Present' }]
    }] : [],
    currentLang: SINGLE_USER_MODE ? 'en' : null,
    uiLang: SINGLE_USER_MODE ? 'zh' : 'en',
    darkMode: false,
    autoTranslate: SINGLE_USER_MODE,
    suggestions: false,
    hideZeroStats: false,
    accentColor: '#439b00',
    iconStyle: 'emoji',
    iconWeight: 'regular',
    iconColor: 'text'
  });
}

function saveUserConfig(userId, cfg) {
  writeJson(userConfigFile(userId), cfg);
}

// ── Words ────────────────────────────────────────────────────────────────────
function getWords(userId, langCode) {
  return readJson(wordsFile(userId, langCode), []);
}

function saveWords(userId, langCode, words) {
  writeJson(wordsFile(userId, langCode), words);
}

// ── Phrases ──────────────────────────────────────────────────────────────────
function getPhrases(userId, langCode) {
  return readJson(phrasesFile(userId, langCode), []);
}

function savePhrases(userId, langCode, phrases) {
  writeJson(phrasesFile(userId, langCode), phrases);
}

function notebookFile(userId, langCode) {
  return path.join(userDir(userId), `Notebook_${userId}_${langCode}.json`);
}

function getNotebook(userId, langCode) {
  return readJson(notebookFile(userId, langCode), { sections: [] });
}

function saveNotebook(userId, langCode, notebook) {
  writeJson(notebookFile(userId, langCode), notebook);
}

function imagesDir(userId, langCode) {
  const d = path.join(userDir(userId), 'images', langCode);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

module.exports = {
  ensureDataDirs,
  readJson, writeJson,
  getUsers, saveUsers, getUserById, getUserByUsername,
  getUserConfig, saveUserConfig,
  getWords, saveWords,
  getPhrases, savePhrases,
  getNotebook, saveNotebook, imagesDir
};
