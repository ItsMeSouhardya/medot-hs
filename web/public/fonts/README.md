# Local fonts

Downloaded on 2026-10-02 from the official [Google Fonts repository](https://github.com/google/fonts). These unmodified variable fonts are distributed under the SIL Open Font License 1.1; each family's full license is included beside its font.

| Local file | Source | Use |
| --- | --- | --- |
| `manrope.ttf` | [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope) | Latin headings and wordmark |
| `noto-sans-bengali.ttf` | [Noto Sans Bengali](https://github.com/google/fonts/tree/main/ofl/notosansbengali) | Bengali copy |
| `noto-sans-devanagari.ttf` | [Noto Sans Devanagari](https://github.com/google/fonts/tree/main/ofl/notosansdevanagari) | Hindi copy |

Manrope uses `next/font/local`. Script fonts use local CSS faces, loaded only when their characters are present. Body text uses the system sans stack. No Google Fonts request is needed at build or runtime. Preserve the licenses when distributing these assets.
