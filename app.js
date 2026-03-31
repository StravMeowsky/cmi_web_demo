async function loadSamples() {
  const response = await fetch("data/samples.json");
  if (!response.ok) {
    throw new Error(`Failed to load samples: ${response.status}`);
  }
  return response.json();
}

async function loadSchemaMarkdown() {
  const response = await fetch("schema.md");
  if (!response.ok) {
    throw new Error(`Failed to load schema: ${response.status}`);
  }
  return response.text();
}

function resolveAssetPath(src) {
  if (!src) {
    return "";
  }
  if (
    src.startsWith("assets/") ||
    src.startsWith("cmi_pref/") ||
    src.startsWith("./") ||
    src.startsWith("/")
  ) {
    return src;
  }
  return `assets/${src}`;
}

function formatPreference(value) {
  if (value === "model_a") {
    return "A";
  }
  if (value === "model_b") {
    return "B";
  }
  return "—";
}

function formatScore(value) {
  return typeof value === "number" ? value.toFixed(3) : "—";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function formatMarkdownCell(value) {
  return escapeHtml(value)
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function splitMarkdownRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isMarkdownTableLine(line) {
  return line.trim().startsWith("|");
}

function isMarkdownSeparator(line) {
  const cells = splitMarkdownRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function extractTableIntro(lines, tableStartIndex) {
  let end = tableStartIndex - 1;
  while (end >= 0 && !lines[end].trim()) {
    end -= 1;
  }

  if (end < 0 || lines[end].trim().startsWith(">") || isMarkdownTableLine(lines[end])) {
    return "";
  }

  let start = end;
  while (start - 1 >= 0) {
    const previousLine = lines[start - 1].trim();
    if (!previousLine || previousLine.startsWith(">") || isMarkdownTableLine(previousLine)) {
      break;
    }
    start -= 1;
  }

  return lines
    .slice(start, end + 1)
    .map((line) => line.trim())
    .join(" ");
}

function extractMarkdownTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tables = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (
      !isMarkdownTableLine(lines[index]) ||
      !isMarkdownTableLine(lines[index + 1]) ||
      !isMarkdownSeparator(lines[index + 1])
    ) {
      continue;
    }

    const headers = splitMarkdownRow(lines[index]);
    const intro = extractTableIntro(lines, index);
    const rows = [];
    index += 2;

    while (index < lines.length && isMarkdownTableLine(lines[index])) {
      rows.push(splitMarkdownRow(lines[index]));
      index += 1;
    }

    tables.push({ headers, intro, rows });
    index -= 1;
  }

  return tables;
}

function buildAudioBlock(template, label, model, src, scoresText = "") {
  const fragment = template.content.firstElementChild.cloneNode(true);
  fragment.querySelector("strong").textContent = label;
  fragment.querySelector("span").textContent = model;
  fragment.querySelector("audio").src = resolveAssetPath(src);
  const scores = fragment.querySelector(".audio-scores");
  scores.textContent = scoresText;
  scores.hidden = !scoresText;
  return fragment;
}

function buildComparisonText(sample) {
  if (!sample.predictions) {
    return "";
  }

  const lines = [
    `Human label: Musicality ${formatPreference(sample.preferences.musicality)} ｜ Alignment ${formatPreference(sample.preferences.alignment)}`,
    `Model pred: Musicality ${formatPreference(sample.predictions.musicality)} ｜ Alignment ${formatPreference(sample.predictions.alignment)}`,
  ];

  if (sample.prediction_scores) {
    lines.push(
      `Model score: Musicality A ${formatScore(sample.prediction_scores.musicality_a)} ｜ B ${formatScore(sample.prediction_scores.musicality_b)}`
    );
    lines.push(
      `Model score: Alignment A ${formatScore(sample.prediction_scores.alignment_a)} ｜ B ${formatScore(sample.prediction_scores.alignment_b)}`
    );
  }

  if (sample.scores) {
    lines.push(
      `Human confidence: Musicality ${sample.scores.music_conf ?? "—"} ｜ Alignment ${sample.scores.align_conf ?? "—"}`
    );
  }

  return lines.join("\n");
}

function buildPreferenceText(sample) {
  if (!sample.scores) {
    return "";
  }

  if ("mq_a" in sample.scores && "mq_b" in sample.scores) {
    return (
      `Musicality : ${sample.preferences.musicality === "model_a" ? "A" : "B"}\n` +
      `Alignment: ${sample.preferences.alignment === "model_a" ? "A" : "B"}`
    );
  }

  return (
    `Musicality : ${sample.preferences.musicality === "model_a" ? "A" : "B"} ｜ Confidence: ${sample.scores.music_conf}\n` +
    `Alignment: ${sample.preferences.alignment === "model_a" ? "A" : "B"} ｜ Confidence: ${sample.scores.align_conf}`
  );
}

function renderSample(sample, sampleIndex, sampleTemplate, audioTemplate) {
  const card = sampleTemplate.content.firstElementChild.cloneNode(true);
  const showAudioScores = sample.dataset !== "cmi-pref-pseudo";
  card.querySelector(".sample-tag").textContent = `sample ${sampleIndex + 1}`;
  card.querySelector(".prompt").textContent = sample.prompt;

  const excerpt = sample.feedback_excerpt || sample.lyrics_excerpt || "";
  const excerptLabel = card.querySelector(".excerpt-label");
  excerptLabel.textContent = sample.feedback_excerpt
    ? "Feedback"
    : sample.lyrics_excerpt
      ? "Lyrics"
      : "";
  excerptLabel.hidden = !excerpt;
  card.querySelector(".excerpt").textContent = excerpt;

  const sampleScoresLabel = card.querySelector(".sample-scores-label");
  const sampleScores = card.querySelector(".sample-scores");
  let sampleScoresText = "";

  if (sample.predictions) {
    sampleScoresLabel.textContent = "Prediction vs Human";
    sampleScoresText = buildComparisonText(sample);
  } else if (sample.scores) {
    sampleScoresLabel.textContent = "Preference";
    sampleScoresText = buildPreferenceText(sample);
  }

  sampleScoresLabel.hidden = !sampleScoresText;
  sampleScores.textContent = sampleScoresText;
  sampleScores.hidden = !sampleScoresText;
  card.querySelector(".badge-row").hidden = true;

  const audioBlocks = card.querySelector(".audio-blocks");
  if (sample.assets.ref) {
    audioBlocks.append(
      buildAudioBlock(audioTemplate, "Reference", "reference audio", sample.assets.ref)
    );
  }

  if (sample.assets.a) {
    const audioAScores = showAudioScores && sample.scores && "mq_a" in sample.scores
      ? `Music Quality: ${sample.scores.mq_a}  |  Instruction Following: ${sample.scores.if_a}`
      : "";
    audioBlocks.append(
      buildAudioBlock(
        audioTemplate,
        "Audio A",
        sample.models.a,
        sample.assets.a,
        audioAScores
      )
    );
  }

  if (sample.assets.b) {
    const audioBScores = showAudioScores && sample.scores && "mq_b" in sample.scores
      ? `Music Quality: ${sample.scores.mq_b}  |  Instruction Following: ${sample.scores.if_b}`
      : "";
    audioBlocks.append(
      buildAudioBlock(
        audioTemplate,
        "Audio B",
        sample.models.b,
        sample.assets.b,
        audioBScores
      )
    );
  }

  return card;
}

function renderDataset(dataset, datasetTemplate, sampleTemplate, audioTemplate) {
  const section = datasetTemplate.content.firstElementChild.cloneNode(true);
  section.querySelector("h2").textContent = dataset.label;
  section.querySelector(".section-description").textContent = dataset.description;

  const grid = section.querySelector(".sample-grid");
  dataset.samples.forEach((sample, index) => {
    grid.append(renderSample(sample, index, sampleTemplate, audioTemplate));
  });
  return section;
}

function renderSchemaTables(schemaMarkdown, container) {
  const tables = extractMarkdownTables(schemaMarkdown);
  const schemaTableMeta = [
    {
      title: "CMI-Pref and CMI-Pseudo",
      description: "Released dataset fields and whether each field is included.",
    },
    {
      title: "CMIBench",
      description: "Relevant evaluation keys across benchmark subsets.",
    },
  ];

  container.innerHTML = "";

  tables.forEach((table, index) => {
    const card = document.createElement("article");
    const meta = schemaTableMeta[index] ?? {
      title: `Schema Table ${index + 1}`,
      description: "",
    };

    card.className = "schema-card";
    card.innerHTML = `
      <div>
        <p class="section-kicker">Table ${index + 1}</p>
        <h3>${escapeHtml(meta.title)}</h3>
      </div>
      <p>${formatMarkdownCell(table.intro || meta.description)}</p>
      <div class="table-wrap">
        <table class="schema-table">
          <thead>
            <tr>
              ${table.headers.map((header) => `<th>${formatMarkdownCell(header)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${table.rows.map((row) => `
              <tr>
                ${row.map((cell) => `<td>${formatMarkdownCell(cell)}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    container.append(card);
  });

  if (!tables.length) {
    container.innerHTML = `<p class="loading">No markdown tables found in schema.md.</p>`;
  }
}

async function main() {
  const container = document.querySelector("#content");
  const schemaContainer = document.querySelector("#schema-content");
  const datasetTemplate = document.querySelector("#dataset-template");
  const sampleTemplate = document.querySelector("#sample-template");
  const audioTemplate = document.querySelector("#audio-template");

  const [samplesResult, schemaResult] = await Promise.allSettled([
    loadSamples(),
    loadSchemaMarkdown(),
  ]);

  try {
    if (samplesResult.status !== "fulfilled") {
      throw samplesResult.reason;
    }

    const payload = samplesResult.value;
    container.innerHTML = "";
    payload.datasets.forEach((dataset) => {
      container.append(
        renderDataset(dataset, datasetTemplate, sampleTemplate, audioTemplate)
      );
    });
  } catch (error) {
    container.innerHTML = `<p class="loading">${error.message}</p>`;
  }

  if (schemaContainer) {
    if (schemaResult.status === "fulfilled") {
      renderSchemaTables(schemaResult.value, schemaContainer);
    } else {
      schemaContainer.innerHTML = `<p class="loading">${schemaResult.reason.message}</p>`;
    }
  }
}

main();
