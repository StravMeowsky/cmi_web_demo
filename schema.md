
> Could the authors clarify the contents of CMI-Pref and CMI-Pref-Pseudo?

Here is a schema of CMI-Pref and CMI-Psuedo as our released dataset. You can also refer to the collection protocal in Appendix C and Figure 5.

| Field | Type | Description | CMI-Pref | CMI-Psuedo
|-------|------|-------------|----|----|
| `audio-a` | string | Relative path to the first evaluated audio sample (Model A) | ✅ | ✅|
| `audio-b` | string | Relative path to the second evaluated audio sample (Model B) | ✅ | ✅|
| `text` | string | Text prompt (often style instructions) |✅ | ✅|
| `lyrics` | string | Lyrics associated with the generation|Partial | Partial | 
| `ref-audio` | string | Relative path to the reference/prompt audio used for generation | Partial | Partial |
| `preference-musicality` | enum | Preferred model for musicality: `model_a` / `model_b` | human | llm |
| `preference-alignment` | enum | Preferred model for prompt alignment: `model_a` / `model_b` | human | llm| 
| `confidence_preference-musicality` | float | Confidence score (1.0–5.0, step 0.5) for musicality preference | human| llm|
| `confidence_preference-alignment` | float | Confidence score (1.0–5.0, step 0.5) for alignment preference | human | llm|
| `model_a` | string | Name/identifier of the first generation model |✅ | ✅|
| `model_b` | string | Name/identifier of the second generation model |✅ | ✅|
| `user_id` | string | Hashed anonymized user identifier | ✅ |❌|
| `feedback` | string | Human-written rationale explaining the preference decision |  ✅ |❌|
| `total_listening_time_a` | float | Total time (seconds) user spent listening to sample A |✅ |❌|
| `total_listening_time_b` | float | Total time (seconds) user spent listening to sample B |✅ |❌|
>It is also unclear whether MusicEval and MusicArena are part of the proposed datasets or separate benchmarks used for evaluation.

CMIBench consists of test samples of PAM-Music MusicEval MusicArena(all samples) and CMI-Pref.  To be more specific on CMI-Bench, we provide a general schema for every item in our benchmark. The schemas only contains keys that are relevant to our evaluation.

| Field                   | Description                                                               | PAM-Music | MusicEval | Music Arena | CMI-Pref |
| ----------------------- | ------------------------------------------------------------------------- | --------- | --------- | ----------- | -------- |
| `audio`                 | Relative path to the first evaluated audio sample                         | ✅         | ✅         | ✅           | ✅        |
| `audio-b`               | Relative path to the second evaluated audio sample, if it is a comparison | ❌<br>     | ❌<br>     | ✅           | ✅        |
| `text`                  | Text prompt (often style instructions)                                    | ✅         | ❌         | ✅           | ✅        |
| `lyrics`                | Lyrics associated with the generation                                     | ❌         | ❌         | Partial     | Partial  |
| `ref-audio`             | Relative path to the reference/prompt audio used for generation           | ❌         | ❌         | ❌           | Partial  |
| `preference-musicality` | Preferred model for musicality: `model_a` / `model_b`                     | ❌         | ❌         | ✅           | ✅        |
| `preference-alignment`  | Preferred model for prompt alignment: `model_a` / `model_b`               | ❌         | ❌         | ❌           | ✅        |
| `musicality-score`      | A scaler score for the audio.                                             | ✅         | ✅         | ❌           | ❌        |
| `aligment-score`        | A scaler alignment score for audio&text                                   | ✅         | ❌         | ❌           | ❌        |
