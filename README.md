# Contact Your Representatives

A free, open-source civic engagement tool that helps U.S. citizens contact their federal representatives about the issues that matter to them.

## Features

- **Find Your Representatives**: Enter your ZIP code to instantly look up your U.S. Senators and House Representative
- **Select Issues**: Choose from a curated list of civic issues or customize your message
- **Generate Messages**: Automatically compose professional messages with appropriate salutations and formatting
- **Personalize & Send**: Edit the generated message directly in the app, then copy and paste it into your representative's contact form
- **Voteprint**: A visual record of each representative's voting history, color-coded by issue category and encoding alignment with progressive positions

## Privacy First

This application is designed with privacy as a core principle:

- **No Data Storage**: Your ZIP code and selections are not stored
- **No Message Sending**: We never send messages on your behalf—you maintain full control
- **No User Tracking**: No cookies, no fingerprinting, no personal data collected. We use [Vercel Analytics](https://vercel.com/analytics) for anonymous, aggregate traffic counts only

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/contact-your-rep.git
cd contact-your-rep

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your API tokens (see Environment Variables below)

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

| Variable | Required | Description |
|----------|----------|-------------|
| `FIVE_CALLS_TOKEN` | Yes | [5calls.org](https://5calls.org/representatives-api/) API token for representative lookup |
| `CONGRESS_GOV_API_KEY` | Voteprint only | [Congress.gov](https://api.congress.gov/sign-up/) API key for fetching voting records |
| `ANTHROPIC_API_KEY` | Voteprint only | [Anthropic](https://console.anthropic.com/settings/keys) API key for AI-assisted vote categorization |
| `BLOB_READ_WRITE_TOKEN` | Production only | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) token for caching vote data across deployments |
| `VOTE_FETCH_LIMIT` | No | Max votes to fetch per session (default: 100; use 20 for local dev) |
| `VOTEPRINT_BYPASS_CACHE` | No | Set to `true` to skip the cache and always fetch fresh data |
| `FORCE_BLOB_CACHE` | No | Set to `true` to use Vercel Blob locally (requires `BLOB_READ_WRITE_TOKEN`) |

### Building for Production

```bash
pnpm build
pnpm start
```

## Voteprint

Voteprint is a canvas-based visualization of a representative's voting record. Each issue category is a wedge in a donut chart; individual votes are drawn as radial spokes:

- **Outward spoke** — voted in line with the issue position
- **Inward spoke** — voted against the issue position
- **Short stub** — voted but no position data
- **No line** — absent

Click a wedge or legend item to filter to that issue category.

### Data pipeline

Voteprint vote data is maintained through a two-step offline pipeline. Run these scripts locally when you want to add or update vote mappings.

**Step 1 — Fetch and categorize votes**

```bash
pnpm run map-votes
```

This fetches voting records from Congress.gov, enriches them with bill details, and uses the Anthropic API to suggest issue category mappings. Results are written to `data/vote-mappings-suggestions.json`.

To fetch votes for specific representatives only, pass their bioguide IDs:

```bash
pnpm run map-votes -- --reps S000344,W000187,P000197
```

Bioguide IDs can be found in the URL on a rep's Voteprint page (e.g. `/rep/S000344`).

**Step 2 — Review and merge suggestions**

Open `data/vote-mappings-suggestions.json`. Suggestions are split into two buckets:

- `"high"` — AI confidence is high; safe to apply automatically
- `"review"` — lower confidence; inspect before accepting

For `"review"` entries, check the `note` field and the vote description, then either move the entry to `"high"` or delete it.

Once you're happy with the high-confidence entries, merge them into the canonical mappings file:

```bash
pnpm run apply-mappings
```

This is idempotent — existing mappings are never overwritten, so it's safe to run multiple times.

**Step 3 — Commit the updated mappings**

```bash
git add data/vote-mappings.json
git commit -m "feat(data): add vote mappings for <session/topic>"
```

The mappings file is committed to the repository and shipped with the app. No database or external data store is needed at runtime for categorization — only the Vercel Blob cache for raw vote records.

### Adding a new issue category

1. Add the issue to `data/issues.ts` with a unique `id`, `title`, `description`, `messageParagraph`, and `messageLabel`
2. Add a color for the new `id` to `lib/voteprint/utils.ts` in `CATEGORY_COLORS`
3. Add a display label to `CATEGORY_LABELS` in the same file
4. Run the data pipeline above to categorize existing votes into the new category

## Customization

### Styling

The application uses CSS Modules with CSS Custom Properties for theming. Edit `app/globals.css` to customize colors (light and dark mode), typography, and spacing.

## Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: CSS Modules with CSS Custom Properties
- **Data Sources**: [5calls.org](https://5calls.org/representatives-api/) (representative lookup), [Congress.gov](https://api.congress.gov/) (voting records)
- **AI**: [Anthropic Claude](https://www.anthropic.com/) for vote categorization (offline pipeline only)
- **Cache**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (production), local filesystem (development)
- **Accessibility**: WCAG 2.1 AA compliant

## Accessibility

This application is built with accessibility as a priority:

- Semantic HTML structure
- ARIA labels and live regions
- Keyboard navigation support (Voteprint: arrow keys cycle categories, Escape clears, Enter toggles)
- Focus management
- High contrast color ratios
- Reduced motion support
- Screen reader optimized

## Testing

```bash
pnpm test
```

The project has a comprehensive test suite covering all components, lib functions, the API route, and full integration flows.

## Disclaimer

**This is an independent, open-source project and is not affiliated with, endorsed by, or connected to the U.S. government or any government agency.**

The information provided by this tool is sourced from public APIs and may not always be current. Always verify representative contact information through official government sources.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License—see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Representative lookup powered by [5calls.org](https://5calls.org/representatives-api/)
- Voting records from [Congress.gov](https://api.congress.gov/)
- Inspired by civic engagement tools and democracy advocates everywhere
