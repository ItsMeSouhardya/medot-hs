# Speech and multilingual behavior

## Language scope

`Language = 'en' | 'bn' | 'hi'`; UI names English, বাংলা, हिन्दी. English/Bengali labels, errors, warnings, instruction display and spoken fields are required. Hindi uses the same contract and reviewed demo fixtures, completed before extras if core gates are green. Do not display a complete-language claim for unimplemented content.

Use typed dictionaries in `src/lib/i18n/{en,bn,hi}.ts`; English keys define the contract. `index.ts` owns normalization, locale mappings (`en-IN`, `bn-IN`, `hi-IN`) and preference selection. Localize homepage, patient and the core pharmacy path. Dictionary parity is tested; untranslated provider/auth vendor UI may use English, visibly separated from medicine content.

Medicine brand, composition and strength remain the authoritative catalog labels. Any pronunciation aid is manually checked against the label and original spoken identity. Numerals, units and timing must survive localization. Use Bengali/Devanagari fonts with Latin fallback; do not rasterize translated text.

## Instructions and review

Persist English exactly in the existing `instruction` field, Bengali in `instruction_bn`, Hindi optionally in `instruction_hi`. New records need reviewed English and Bengali before activation. Do not send an English instruction to a Bengali TTS voice and call it translated. ElevenLabs generates speech, not translation.

The pharmacist enters approved text or selects a fictional demo preset with reviewed language variants. The teammate who knows the languages reviews quantity, frequency, before/after food, timing, negation and medicine identity. Editing the English source clears any preset-derived Bengali/Hindi text until reviewed. Editing one variant requires the physical review again. These are demo instructions, not clinically validated prescriptions.

For legacy active English-only records, selecting Bengali/Hindi localizes the shell but shows that the recorded instruction is in English. Speak the complete script in English and announce fallback; do not mix a translated shell with an invented translated dosage. Missing Hindi must not block English/Bengali creation.

## ElevenLabs integration

Server-only environment: `ELEVENLABS_API_KEY`, `ELEVENLABS_MODEL_ID=eleven_v3`, `ELEVENLABS_VOICE_ID_EN`, `_BN`, `_HI`, `ELEVENLABS_MAX_GENERATIONS_PER_DAY=100`. Voice IDs can be the same if that voice is tested in all target languages. Check sponsor credit availability and model entitlement at H0.

Use `POST https://api.elevenlabs.io/v1/text-to-speech/{serverVoiceId}?output_format=mp3_44100_128` with `xi-api-key`, `model_id`, and deterministic `text`. Supply ISO 639-1 `language_code` only after verifying the chosen model accepts it. Explicitly choose the model rather than accepting the API's default. `eleven_v3` supports the needed Bengali coverage; Multilingual v2 and Flash v2.5 do not list Bengali. [Model coverage](https://elevenlabs.io/docs/overview/models), [TTS API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).

Use direct server fetch, an eight-second timeout, no repeated retry loop, and a 2 MiB response limit. Unit tests mock provider fetch and never spend credits. Keep script length at most 2,000 characters. Do not expose a generic public TTS proxy or accept client text/model/voice. Audio is one speaker reading information, without emotion tags, music, or voice cloning. Validate actual quantity, names and expiry pronunciation on the phone.

The script order is warning (if expired), MEDOT identification, medicine brand/generic, strength/form, recorded instruction, labelled expiry, batch. Phrase missing fields explicitly; never infer dosage. The initial sample is enough to prove sponsor integration; a browser-only successful demo is not an ElevenLabs success.

## Cache and playback

Use the architecture's Neon audio cache and durable call-attempt budget. Check active state before cache lookup, hash the current script and configuration, and recheck after generation before responding. A current-to-expired boundary must invalidate the previous speech. Warm the primary demo's audio in each available language by pressing Read aloud before judging; a redeploy should retain the cache.

Client states: idle -> loading -> playing -> ended, with error/fallback branches. User press requests speech for the token and requested language. Stop aborts pending fetch, pauses audio, cancels browser speech, and releases the object URL. Language change stops old audio before loading new content. Ignore stale responses using an AbortController plus request generation ID. Repeat requests current state again; there is never overlapping playback.

Do not rely on autoplay after NFC navigation or after an asynchronous network response. Attempt playback from the user-initiated flow; if `audio.play()` is rejected, display a large `Play prepared audio` button for a fresh gesture. Keep loading feedback on screen. This browser restriction is not a provider outage and should not automatically trigger a second speech engine.

## Browser fallback

Use the existing `speechSynthesis` implementation behind a provider-independent patient controller. On provider timeout, budget/credit failure, or cache/connection error, announce `Online voice unavailable. Using this device's voice.` only after a fresh valid active record was resolved. If current record state is unavailable, show verification failure instead of speaking a stale record.

Select an exact voice locale or the same base language; listen for `voiceschanged` without hanging the UI. Set `utterance.lang` to the actual instruction language. If no suitable Bengali/Hindi voice is available, explicitly offer English speech from the stored English text or the screen reader. Do not silently substitute another language. If speech synthesis is absent, keep transcript and screen-reader access.

Unit test provider 401/429/500, timeout, response size, revoked cache, day/month expiry transition, missing translation, rapid switches, Stop during load, play rejection, no browser voice and provider-less screen-reader operation. Live test English and Bengali with ElevenLabs; Hindi with the reviewed demo if ready.
