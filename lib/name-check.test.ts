import { describe, expect, it } from "vitest";
import { validateName } from "./application";
import { checkName, checkNames } from "./name-check";

/**
 * Real names that must never be nudged. Common first names, written the way
 * parents type them, with the spellings most likely to trip a rule: few or no
 * a/e/i/o/u (Rhythm, Glynn), clusters (Kshitij, Hrishikesh), doubled letters
 * (Aarav, Lulu), keyboard-row stretches (Liberty), accents, apostrophes,
 * hyphens and non-Latin scripts.
 */
const REAL_NAMES = [
  // Hindi, Gujarati, Marathi, Bengali and pan-Indian spellings
  "Aarav",
  "Aadhya",
  "Aaradhya",
  "Advik",
  "Anika",
  "Ananya",
  "Arjun",
  "Ayaan",
  "Bhavya",
  "Dhruv",
  "Dhwani",
  "Diya",
  "Hrishikesh",
  "Hrithik",
  "Ira",
  "Ishaan",
  "Jhanvi",
  "Kiaan",
  "Krish",
  "Kshama",
  "Kshitij",
  "Meera",
  "Mrunal",
  "Myra",
  "Om",
  "Prithvi",
  "Reyansh",
  "Rhythm",
  "Saanvi",
  "Shloka",
  "Shrestha",
  "Shyam",
  "Swara",
  "Trisha",
  "Tvisha",
  "Ved",
  "Vihaan",
  "Vrinda",
  // South Indian
  "Aadhav",
  "Dharshini",
  "Kavin",
  "Lakshmi",
  "Nithya",
  "Sreeja",
  "Thrisha",
  "Venkat",
  // Punjabi and Sikh
  "Ekam",
  "Gurnoor",
  "Gurpreet",
  "Harjot",
  "Jaskirat",
  "Navjot",
  "Simran",
  // Muslim and Urdu
  "Aaliyah",
  "Inaaya",
  "Md Rahim",
  "Mohd Zaid",
  "Zoya",
  // Two words, hyphens, apostrophes
  "Sai Krishna",
  "Mary-Kate",
  "Jean-Luc",
  "De'Andre",
  "Ja'Marr",
  // Elsewhere in the diaspora and beyond
  "Aoife",
  "Bryn",
  "Glynn",
  "Gerty",
  "Kiki",
  "Liberty",
  "Lulu",
  "Lynn",
  "Mimi",
  "Ngozi",
  "Nkechi",
  "Nnamdi",
  "Nguyen",
  "Niamh",
  "Rhys",
  "Siobhan",
  "Thanh",
  "Wynn",
  "Xochitl",
  // Accents and other scripts
  "Zoë",
  "Chloé",
  "José",
  "Renée",
  "Bjørn",
  "Łukasz",
  "आरव",
  "अनन्या",
  "ਗੁਰਪ੍ਰੀਤ",
  "অর্জুন",
  "கவின்",
  "明",
  "乐乐",
];

describe("checkName: real names", () => {
  it("has a long list to check against", () => {
    expect(REAL_NAMES.length).toBeGreaterThanOrEqual(50);
    expect(new Set(REAL_NAMES).size).toBe(REAL_NAMES.length);
  });

  it.each(REAL_NAMES)("never flags %s", (name) => {
    // Checked as the server sees it: cleaned by the shared name validation.
    const valid = validateName(name);
    expect(valid.ok).toBe(true);
    expect(checkName(valid.ok ? valid.name : name)).toBe("ok");
  });

  it("doesn't care about case or spacing", () => {
    for (const name of ["aarav", "AARAV", "  Aarav  ", "sai  krishna"]) {
      expect(checkName(name)).toBe("ok");
    }
  });
});

describe("checkName: likely fake", () => {
  it.each([
    // Keyboard mashes: rows in either direction, the alphabet, xyz
    "asdf",
    "Asdfgh",
    "qwerty",
    "Qwer",
    "zxcv",
    "hjkl",
    "lkjh",
    "poiu",
    "As Df",
    "abcd",
    "xyz",
    "Xyz",
    "Mxyz",
    // One letter, or one letter repeated
    "A",
    "aa",
    "Mmmm",
    "ZZZZZZ",
    // A short unit over and over
    "hahaha",
    "Dhdhdh",
    "abcabcabc",
    // No vowels, longer than 3 letters
    "Bcdfg",
    "Jsdk",
    "Hshsjs",
    "Prtk",
    // Placeholder names and words
    "test",
    "Test",
    "TESTING",
    "kid",
    "Kids",
    "child",
    "abc",
    "na",
    "NA",
    "none",
    "Unknown",
    "Test Kid A",
    "Kid One",
    "Child Two",
    "Dummy",
  ])("flags %s", (name) => {
    expect(checkName(name)).toBe("suspicious");
  });

  it("leaves short no-vowel names and initials alone", () => {
    // 3 letters or fewer: abbreviations like Md stay, as do names like Ty.
    for (const name of ["Md", "Ty", "Sky", "Ed"]) expect(checkName(name)).toBe("ok");
  });

  it("only flags placeholder words as whole words", () => {
    for (const name of ["Kidist", "Testa", "Nadia", "Abel"]) {
      expect(checkName(name)).toBe("ok");
    }
  });

  it("treats an empty name as ok (validation catches it)", () => {
    expect(checkName("")).toBe("ok");
    expect(checkName("   ")).toBe("ok");
  });
});

describe("checkNames", () => {
  it("is suspicious if any one name is", () => {
    expect(checkNames(["Aarav", "Meera"])).toBe("ok");
    expect(checkNames(["Aarav", "asdf"])).toBe("suspicious");
    expect(checkNames([])).toBe("ok");
  });
});
