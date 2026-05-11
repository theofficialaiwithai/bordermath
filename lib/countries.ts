export interface Country {
  code: string
  name: string
  schengen: boolean
}

export const COUNTRIES: Country[] = [
  { code: 'AT', name: 'Austria',        schengen: true  },
  { code: 'BE', name: 'Belgium',        schengen: true  },
  { code: 'CO', name: 'Colombia',       schengen: false },
  { code: 'HR', name: 'Croatia',        schengen: true  },
  { code: 'CZ', name: 'Czech Republic', schengen: true  },
  { code: 'DK', name: 'Denmark',        schengen: true  },
  { code: 'EE', name: 'Estonia',        schengen: true  },
  { code: 'FI', name: 'Finland',        schengen: true  },
  { code: 'FR', name: 'France',         schengen: true  },
  { code: 'GE', name: 'Georgia',        schengen: false },
  { code: 'DE', name: 'Germany',        schengen: true  },
  { code: 'GR', name: 'Greece',         schengen: true  },
  { code: 'HU', name: 'Hungary',        schengen: true  },
  { code: 'IS', name: 'Iceland',        schengen: true  },
  { code: 'ID', name: 'Indonesia',      schengen: false },
  { code: 'IT', name: 'Italy',          schengen: true  },
  { code: 'LV', name: 'Latvia',         schengen: true  },
  { code: 'LI', name: 'Liechtenstein',  schengen: true  },
  { code: 'LT', name: 'Lithuania',      schengen: true  },
  { code: 'LU', name: 'Luxembourg',     schengen: true  },
  { code: 'MT', name: 'Malta',          schengen: true  },
  { code: 'MX', name: 'Mexico',         schengen: false },
  { code: 'NL', name: 'Netherlands',    schengen: true  },
  { code: 'NO', name: 'Norway',         schengen: true  },
  { code: 'PL', name: 'Poland',         schengen: true  },
  { code: 'PT', name: 'Portugal',       schengen: true  },
  { code: 'SK', name: 'Slovakia',       schengen: true  },
  { code: 'SI', name: 'Slovenia',       schengen: true  },
  { code: 'ES', name: 'Spain',          schengen: true  },
  { code: 'SE', name: 'Sweden',         schengen: true  },
  { code: 'CH', name: 'Switzerland',    schengen: true  },
  { code: 'TH', name: 'Thailand',       schengen: false },
  { code: 'VN', name: 'Vietnam',        schengen: false },
]
