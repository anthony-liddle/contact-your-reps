# Contributing to Contact Your Representatives

Thank you for your interest in contributing to this civic engagement project! Every contribution helps make it easier for citizens to contact their representatives.

## Code of Conduct

This project is committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior vs. actual behavior
4. Your browser and operating system
5. Screenshots if applicable

### Suggesting Features

Feature suggestions are welcome! Please open an issue with:

1. A clear description of the feature
2. Why it would be useful for civic engagement
3. Any implementation ideas you have

### Submitting Code

1. **Fork the repository** and create a new branch from `main`
2. **Make your changes** following the code style guidelines below
3. **Test your changes** thoroughly
4. **Submit a pull request** with a clear description of your changes

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/contact-your-rep.git
cd contact-your-rep

# Install dependencies
npm install

# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build
```

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define explicit types for function parameters and return values
- Use interfaces for object shapes
- Avoid `any` types

### React

- Use functional components with hooks
- Keep components focused and single-purpose
- Use CSS Modules for component styling
- Prefer composition over prop drilling

### CSS

- Use CSS Modules (`.module.css` files)
- Use CSS Custom Properties from `globals.css` for theming
- Follow mobile-first responsive design
- Ensure all interactive elements have visible focus states

### Accessibility

All contributions must maintain WCAG 2.1 AA compliance:

- Use semantic HTML elements
- Include appropriate ARIA labels
- Ensure keyboard navigation works
- Maintain color contrast ratios (4.5:1 for text, 3:1 for UI components)
- Support reduced motion preferences

## Adding New Issues

To add new civic issues to the application:

1. Edit `data/issues.ts`
2. Add a new issue object with:
   - `id`: Unique lowercase identifier (e.g., `'climate-change'`)
   - `title`: Display title for the checkbox
   - `description`: Brief explanation shown to users (optional)
   - `messageParagraph`: The paragraph that will appear in generated messages

### Writing Effective Message Paragraphs

- Keep paragraphs focused on a single topic
- Use respectful, professional language
- Avoid partisan rhetoric—focus on policy outcomes
- Include specific asks when possible
- Keep paragraphs to 2-4 sentences

## Pull Request Process

1. Ensure your code passes linting (`npm run lint`)
2. Update documentation if needed
3. Write a clear PR description explaining your changes
4. Link any related issues
5. Request review from maintainers

## Questions?

If you have questions about contributing, feel free to open an issue with the "question" label.

Thank you for helping make civic engagement more accessible!
