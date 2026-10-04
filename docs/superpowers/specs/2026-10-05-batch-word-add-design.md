# Batch Word Add Design

## Goal

Add a two-step batch workflow to the existing Add page. A user pastes up to 100 English words, one per line, generates Chinese meanings with the existing local translation service, reviews and edits the results, then saves all valid non-duplicate words in one action.

## Scope

- Add a **Batch add** tab beside the existing word and phrase tabs.
- Accept one English word or short English expression per line.
- Trim whitespace, ignore blank lines, and de-duplicate input case-insensitively while preserving the first occurrence.
- Limit a batch to 100 unique entries.
- Generate meanings through the existing `/api/translate` endpoint, which uses ECDICT first and MarianMT as fallback.
- Show every input in an editable preview, including translation failures.
- Detect words already present in the current language library and exclude them from saving by default.
- Save all valid entries with one request.

This feature does not add spreadsheet upload, automatic part-of-speech detection, phrases with delimiters, or migration of old application data.

## User Flow

1. The user opens **Add → Batch add**.
2. The user enters up to 100 English entries, one per line, and selects a default word type. The default type is `other`.
3. The user selects **Generate meanings**.
4. The page normalizes and validates the input, then requests Chinese meanings with limited concurrency while displaying progress.
5. A preview table displays:
   - English entry, editable;
   - Chinese meaning, editable;
   - status: ready, translation failed, duplicate in input, or already in library;
   - an include checkbox.
6. Translation failures remain visible and selected, but cannot be saved until the Chinese meaning is filled manually.
7. Existing-library duplicates are unselected and cannot be included unless their English entry is changed to a non-duplicate value.
8. The user selects **Save valid words**. All selected rows containing both English and Chinese text are submitted together.
9. The page reports saved, skipped, and failed counts. Successfully saved rows are removed; unresolved rows remain for correction or retry.

## Architecture and Data Flow

### Frontend

The existing `public/js/pages/add.js` receives the new tab, input panel, preview state, progress display, row editing, retry, and save controls. Batch state stays in memory and is cleared when the page reloads.

Translation requests use `/api/translate?word=...` with a concurrency limit of four. A failure affects only its row. The browser checks existing words once through `/api/words?lang=en` before building the preview.

### Backend

Add `POST /api/words/batch` before the existing `/:id` word routes. The request body is:

```json
{
  "lang": "en",
  "type": "other",
  "items": [
    { "literal": "hope", "translation": "希望；期待" }
  ]
}
```

The endpoint:

- accepts at most 100 items;
- applies the same word type and required-field validation as single add;
- rejects invalid rows independently instead of failing the entire batch;
- detects existing words case-insensitively;
- creates the same word schema and progress defaults as single add;
- writes the word file once after processing;
- returns `saved`, `duplicates`, and `errors` arrays so the page can reconcile individual rows.

The route must be declared before `/api/words/:id` so Express does not interpret `batch` as a word ID.

## Error Handling

- Invalid or empty input shows an inline message without making requests.
- More than 100 unique entries is rejected before translation.
- Translation timeouts or missing meanings produce editable failed rows.
- A manual Chinese meaning converts a failed row to ready.
- A duplicate detected between preview and save is returned as a duplicate, not overwritten.
- Network failure while saving leaves all preview rows intact for retry.
- Server responses never overwrite existing vocabulary entries.

## Compatibility

- Existing single-word and phrase forms remain unchanged.
- Batch-added words participate in flashcards, spelling practice, progress scoring, TTS, vocabulary display, and A4 unfamiliarity printing exactly like individually added words.
- The feature remains single-user and uses the current language selection.

## Verification

- Input normalization: blank lines, repeated capitalization, and surrounding whitespace.
- Maximum batch size: 100 accepted, 101 rejected.
- Translation: successful and failed rows appear together; failed meanings are editable.
- Duplicate handling: duplicates within the paste and in the saved library are clearly marked and not saved.
- Batch API: valid rows save together; invalid rows return individual errors; only one storage write occurs.
- Browser flow: paste, generate, edit a failed meaning, save, and confirm new words in Vocabulary.
- Regression: single add, automatic Chinese meaning, and A4 print selection continue to work.
- Deployment: validate on a temporary port, then restart the existing `openflashcards.service` and verify from `http://10.0.0.22:8090/`.
