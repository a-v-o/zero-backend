import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(cors());

const stringStore = new Map();

function analyzeString(value) {
  const normalized = value.toLowerCase();
  const reversed = normalized.split("").reverse().join("");
  const is_palindrome = normalized === reversed;
  const unique_characters = new Set(normalized.replace(/\s+/g, "")).size;
  const word_count = value.trim().split(/\s+/).length;
  const sha256_hash = crypto.createHash("sha256").update(value).digest("hex");

  const charMap = {};
  for (const ch of normalized.replace(/\s+/g, "")) {
    charMap[ch] = (charMap[ch] || 0) + 1;
  }

  return {
    length: value.length,
    is_palindrome,
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map: charMap,
  };
}

function applyFilters(data, filters) {
  return data.filter((item) => {
    if (filters.is_palindrome && item.is_palindrome !== filters.is_palindrome)
      return false;
    if (filters.min_length && item.length < filters.min_length) return false;
    if (filters.max_length && item.length > filters.max_length) return false;
    if (filters.word_count && item.word_count !== filters.word_count)
      return false;
    if (
      filters.contains_character &&
      !item.value
        .toLowerCase()
        .includes(filters.contains_character.toLowerCase())
    )
      return false;
    return true;
  });
}

function parseNaturalQuery(query) {
  query = query.toLowerCase();
  const filters = {};

  if (query.includes("palindromic") || query.includes("palindrome"))
    filters.is_palindrome = true;
  if (query.includes("single word")) filters.word_count = 1;
  if (query.match(/longer than (\d+)/)) {
    const match = query.match(/longer than (\d+)/);
    filters.min_length = parseInt(match[1]) + 1;
  }
  if (query.includes("containing the letter")) {
    const m = query.match(/letter (\w)/);
    if (m) filters.contains_character = m[1];
  }

  if (Object.keys(filters).length === 0)
    throw new Error("Unable to parse natural language query");
  return filters;
}

app.post("/strings", (req, res) => {
  const { value } = req.body;
  if (typeof value !== "string") {
    return res.status(422).json({ error: "value must be a string" });
  }
  if (!value.trim()) {
    return res.status(400).json({ error: "Missing or empty 'value' field" });
  }

  const props = analyzeString(value);
  if (stringStore.has(props.sha256_hash)) {
    return res.status(409).json({ error: "String already exists" });
  }

  const record = {
    id: props.sha256_hash,
    value,
    properties: props,
    created_at: new Date().toISOString(),
  };

  stringStore.set(props.sha256_hash, record);
  res.status(201).json(record);
});

app.get("/strings", (req, res) => {
  const {
    is_palindrome,
    min_length,
    max_length,
    word_count,
    contains_character,
  } = req.query;

  try {
    const filters = {};
    if (is_palindrome) filters.is_palindrome = is_palindrome === "true";
    if (min_length) filters.min_length = parseInt(min_length);
    if (max_length) filters.max_length = parseInt(max_length);
    if (word_count) filters.word_count = parseInt(word_count);
    if (contains_character) filters.contains_character = contains_character;

    const data = Array.from(stringStore.values());
    const filtered = applyFilters(data, filters);

    res.json({
      data: filtered,
      count: filtered.length,
      filters_applied: filters,
    });
  } catch (err) {
    res.status(400).json({ error: "Invalid query parameters" });
  }
});

app.get("/strings/filter-by-natural-language", (req, res) => {
  const { query } = req.query;
  if (!query)
    return res.status(400).json({ error: "Missing 'query' parameter" });

  try {
    const filters = parseNaturalQuery(query);
    const data = Array.from(stringStore.values());
    const filtered = applyFilters(data, filters);

    res.json({
      data: filtered,
      count: filtered.length,
      interpreted_query: {
        original: query,
        parsed_filters: filters,
      },
    });
  } catch (err) {
    if (err.message.includes("Unable to parse")) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(422).json({ error: "Query parsed but resulted in conflicts" });
    }
  }
});

app.get("/strings/:value", (req, res) => {
  const { value } = req.params;
  const hash = crypto.createHash("sha256").update(value).digest("hex");
  if (!stringStore.has(hash)) {
    return res.status(404).json({ error: "String not found" });
  }
  res.json(stringStore.get(hash));
});

app.delete("/strings/:value", (req, res) => {
  const { value } = req.params;
  const hash = crypto.createHash("sha256").update(value).digest("hex");

  if (!stringStore.has(hash)) {
    return res.status(404).json({ error: "String not found" });
  }
  stringStore.delete(hash);
  res.status(204).send();
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the String Analyzer Service" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
