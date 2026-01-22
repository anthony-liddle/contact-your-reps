# Contact Your Representatives

A free, open-source civic engagement tool that helps U.S. citizens contact their federal representatives about the issues that matter to them.

## Features

- **Find Your Representatives**: Enter your ZIP code to instantly look up your U.S. Senators and House Representative
- **Select Issues**: Choose from a curated list of civic issues or customize your message
- **Generate Messages**: Automatically compose professional messages with appropriate salutations and formatting
- **Copy & Send**: One-click copy to clipboard, then paste into your representative's contact form

## Privacy First

This application is designed with privacy as a core principle:

- **No Data Storage**: Your ZIP code and selections are processed entirely in your browser
- **No Message Sending**: We never send messages on your behalf—you maintain full control
- **No Tracking**: No analytics, cookies, or user tracking of any kind
- **No Backend**: All processing happens client-side; no data is ever transmitted to our servers

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/contact-your-rep.git
cd contact-your-rep

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
# Create a production build
npm run build

# Start the production server
npm start
```

## Deployment

This application can be deployed to any static hosting platform:

- **Vercel**: Connect your repository and deploy automatically
- **Netlify**: Import from Git and deploy with zero configuration
- **GitHub Pages**: Build and deploy the `out` directory

For static export:

```bash
npm run build
```

## Customization

### Adding Issues

Edit `data/issues.ts` to add or modify the available issues:

```typescript
export const issues: Issue[] = [
  {
    id: 'your-issue-id',
    title: 'Issue Title',
    description: 'Brief description shown to users',
    messageParagraph: 'The paragraph that will appear in the generated message...',
  },
  // ... more issues
];
```

### Styling

The application uses CSS Modules with CSS Custom Properties for theming. Edit `app/globals.css` to customize:

- Colors (light and dark mode)
- Typography
- Spacing and layout

## Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: CSS Modules with CSS Custom Properties
- **Data Sources**:
  - [whoismyrepresentative.com](https://whoismyrepresentative.com/) - ZIP code to representative lookup (CC 3.0)
  - [unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators) - Contact form URLs and details (Public Domain)
- **Accessibility**: WCAG 2.1 AA compliant

## Accessibility

This application is built with accessibility as a priority:

- Semantic HTML structure
- ARIA labels and live regions
- Keyboard navigation support
- Focus management
- High contrast color ratios
- Reduced motion support
- Screen reader optimized

## Disclaimer

**This is an independent, open-source project and is not affiliated with, endorsed by, or connected to the U.S. government or any government agency.**

The information provided by this tool is sourced from public APIs and may not always be current. Always verify representative contact information through official government sources.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License—see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Representative lookup powered by [whoismyrepresentative.com](https://whoismyrepresentative.com/)
- Contact form URLs from [unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators)
- Inspired by civic engagement tools and democracy advocates everywhere
