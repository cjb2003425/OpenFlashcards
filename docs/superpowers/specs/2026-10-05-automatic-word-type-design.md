# Automatic Word Type Design

## Goal

Generate a vocabulary word's type together with its Chinese meaning in both single-word and batch-add workflows. Keep the result editable and preserve deliberate user choices.

## Source and Mapping

ECDICT translations contain part-of-speech prefixes even though the database `pos` column is commonly empty. The translator will inspect the unmodified dictionary translation before producing the concise Chinese meaning.

Map the first recognized prefix in source order:

| Dictionary prefix | OpenFlashcards type |
| --- | --- |
| `n.` | `noun` |
| `v.`, `vi.`, `vt.` | `verb` |
| `a.`, `adj.` | `adjective` |
| `adv.` | `adverb` |

Prefix matching is case-insensitive and must respect token boundaries so unrelated text does not match. When a word has multiple parts of speech, the first recognized prefix is the primary type. The translator may also return all recognized types for future UI use, but this feature stores one primary type.

If ECDICT has no entry or no recognized prefix, the type is `other`. MarianMT remains the fallback for the Chinese meaning; it does not attempt part-of-speech classification.

## Translation API

The local Python translator returns:

```json
{
  "word": "hope",
  "meaning": "希望；信心；期待",
  "type": "noun",
  "types": ["noun", "verb"]
}
```

The Node `/api/translate` proxy passes these fields through unchanged. Existing clients that only read `meaning` remain compatible.

The translation cache stores the full result rather than only the meaning, ensuring cached requests include word type.

## Single-Word Add Flow

- Typing an English word triggers the existing debounced local translation request.
- The response fills the Chinese meaning and selects the returned type button.
- The automatically selected type is visibly the same as a manual selection.
- If the user manually chooses a type while a translation request is pending, that response must not overwrite the manual choice.
- Changing the English word starts a new inference cycle and permits automatic type selection for the new word.
- Reverse translation from Chinese to English does not infer or change the word type.
- A result of `other` selects **Other**.

Implementation state distinguishes automatic selection from manual selection and associates inference results with the source word that produced them.

## Batch Add Flow

- Remove the one-type-for-the-whole-batch selector.
- Each preview row contains its own type dropdown.
- Successful translation fills both the Chinese meaning and the row type.
- Translation failure keeps the row, leaves its type as `other`, and allows manual edits.
- Retrying a row refreshes both meaning and inferred type unless the user changed that row's type manually after the last inference.
- Changing a row's English word resets its generated meaning and inferred type to `other`; retrying generates both again.
- Existing-library and duplicate rows still show a type dropdown but remain excluded from saving.

## Batch API

`POST /api/words/batch` accepts a type per item:

```json
{
  "lang": "en",
  "items": [
    { "literal": "hope", "translation": "希望；期待", "type": "noun" },
    { "literal": "young", "translation": "年轻的", "type": "adjective" }
  ]
}
```

For backward compatibility, a top-level `type` may remain as a fallback for older clients. Each item type takes precedence. Valid batch word types are `noun`, `verb`, `adjective`, `adverb`, and `other`; `phrase` is rejected. A row with an invalid type is returned in the item-level `errors` array and does not prevent valid rows from saving.

## Error Handling

- Missing dictionary type: return and display `other` without treating the translation as failed.
- Missing meaning: keep the current translation failure behavior and return `other` when possible.
- Stale asynchronous single-word response: discard it using the existing request version check and manual-type guard.
- Invalid batch item type: reject only that row.
- Network or translator failure: retain editable row data.

## Verification

- Unit-level mapping checks: `hope → noun`, `become → verb`, `young → adjective`, `alone → adjective`, and an unknown word → `other`.
- Multi-type words use the first dictionary prefix and return all recognized types without duplicates.
- Single add selects the inferred button; a manual type selection made during an in-flight request is preserved.
- Batch preview shows different generated types in different rows and permits manual overrides.
- Batch save persists each row's own type.
- Translation failures remain editable with `other` selected.
- Regression checks cover single Chinese-meaning generation, duplicate detection, 100-item batch limit, vocabulary display, and A4 printing.
- Validate on a temporary port before restarting the LAN service at `http://10.0.0.22:8090/`.
