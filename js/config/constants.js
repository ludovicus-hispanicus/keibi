// Global constants and default configurations

export const NAME_PARTICLES = [
    'de', 'del', 'da', 'das', 'do', 'dos', 'du', // Romance (Spanish, Portuguese, French, Italian)
    'la', 'le', 'les',                           // French
    'el',                                         // Arabic
    'van', 'von', 'vom', 'zu', 'zum', 'zur',      // Germanic (Dutch, German)
    'den', 'der', 'des', 'ter', 'ten', 'thoe',    // Dutch, German
    'af',                                         // Scandinavian
    'mac', 'mc', 'o\'',                           // Gaelic (Irish, Scottish)
    'st', 'ste',                                  // Saint
    'y'                                           // Spanish 'and'
];

export const DEFAULT_STYLE_TEMPLATES = {
    book: "[LIST_LASTNAMES:bold], [LIST_NAMES], [TITLE] ([SERIES] [SERIES NUMBER]). [PLACE] [YEAR].",
    bookeditorfirst: "[ED_LIST_LASTNAMES:bold], [ED_LIST_NAMES] (Hg.), [TITLE] ([SERIES] [SERIES NUMBER]). [PLACE] [YEAR].",
    bookeditorsecond: "[ED_LIST_LASTNAMES:italic], [ED_LIST_INITIALS:italic] <i>(Hg.)</i>, [TITLE] ([SERIES] [SERIES NUMBER]). [PLACE] [YEAR].",
    chapter: "[LIST_LASTNAMES], [LIST_NAMES], [TITLE]: [ED_LIST_LASTNAMES], [ED_LIST_INITIALS] (Hg.), [TITLE_COLLECTION] ([YEAR]) [<i>:</i>] [PAGES].",
    journalarticle: "[LIST_LASTNAMES], [LIST_NAMES], [TITLE]: [JOURNAL] [VOLUME] ([YEAR]) [PAGES][CONFER:italic].",
    nabu: "[LIST_LASTNAMES], [LIST_NAMES], [TITLE]: [JOURNAL] [VOLUME].",
    reviewfirst: "[LIST_LASTNAMES:bold], [LIST_NAMES], [TITLE]: [JOURNAL] [VOLUME] ([YEAR]) [PAGES] ([REVIEWER:italic]).",
    reviewsecond: "[LIST_LASTNAMES:italic], [LIST_INITIALS:italic], [TITLE] [[KEIBI:italic]]: [JOURNAL] [VOLUME] ([YEAR]) [PAGES] ([REVIEWER:italic])[CONFER:italic].",
    revieweditorfirst: "[ED_LIST_LASTNAMES:bold], [ED_LIST_NAMES] (Hg.), [TITLE]: [JOURNAL] ([YEAR]) [PAGES] ([REVIEWER:italic]).",
    revieweditorsecond: "[ED_LIST_LASTNAMES:italic], [ED_LIST_INITIALS:italic] <i>(Hg.)</i>, [TITLE] [[KEIBI:italic]]: [JOURNAL] [VOLUME] ([YEAR]) [PAGES] ([REVIEWER:italic])[CONFER:italic]."
};

export const CSV_CONFIG = {
    STANDARD_COLUMN_WIDTH: 150,
    MIN_HEIGHT: 80
};