/**
 * Tarjimalar — har bir til alohida JSON faylda (lib/locales/*.json).
 * t(key) fallback: currentLocale → en
 */

const en = require("./locales/en.json");
const uz = require("./locales/uz.json");
const es = require("./locales/es.json");
const fr = require("./locales/fr.json");
const de = require("./locales/de.json");
const it = require("./locales/it.json");
const pt = require("./locales/pt.json");
const ja = require("./locales/ja.json");
const ko = require("./locales/ko.json");
const zh = require("./locales/zh.json");
const ar = require("./locales/ar.json");
const ru = require("./locales/ru.json");
const nl = require("./locales/nl.json");
const tr = require("./locales/tr.json");
const pl = require("./locales/pl.json");
const sv = require("./locales/sv.json");
const th = require("./locales/th.json");
const he = require("./locales/he.json");
const hi = require("./locales/hi.json");

function withFallback(localeObj, fallback = en) {
  if (!localeObj || typeof localeObj !== "object") return { ...fallback };
  return { ...fallback, ...localeObj };
}

const translations = {
  en,
  uz: withFallback(uz, en),
  es: withFallback(es, en),
  fr: withFallback(fr, en),
  de: withFallback(de, en),
  it: withFallback(it, en),
  pt: withFallback(pt, en),
  ja: withFallback(ja, en),
  ko: withFallback(ko, en),
  zh: withFallback(zh, en),
  ar: withFallback(ar, en),
  ru: withFallback(ru, en),
  nl: withFallback(nl, en),
  tr: withFallback(tr, en),
  pl: withFallback(pl, en),
  sv: withFallback(sv, en),
  th: withFallback(th, en),
  he: withFallback(he, en),
  hi: withFallback(hi, en),
};

const supportedLocales = Object.keys(translations);

module.exports = { translations, supportedLocales };
