import { issues } from '@/data/issues';

describe('issues data', () => {
  it('contains at least one issue', () => {
    expect(issues.length).toBeGreaterThan(0);
  });

  it('every issue has required fields', () => {
    for (const issue of issues) {
      expect(issue.id).toBeTruthy();
      expect(issue.title).toBeTruthy();
      expect(issue.description).toBeTruthy();
      expect(issue.messageParagraph).toBeTruthy();
    }
  });

  it('all issue IDs are unique', () => {
    const ids = issues.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all issue IDs are non-empty strings', () => {
    for (const issue of issues) {
      expect(typeof issue.id).toBe('string');
      expect(issue.id.length).toBeGreaterThan(0);
    }
  });
});
