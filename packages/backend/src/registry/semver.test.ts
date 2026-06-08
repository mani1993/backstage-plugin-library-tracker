import { driftSeverity, isOutdated } from './semver';

describe('driftSeverity', () => {
  it.each([
    ['^1.2.3', '2.0.0', 'major'],
    ['~1.2.0', '1.5.0', 'minor'],
    ['1.2.3', '1.2.9', 'patch'],
    ['^1.0.0', '1.0.0', 'up-to-date'],
    ['2.0.0', '1.9.0', 'up-to-date'], // pinned ahead of latest
  ])('classifies %s vs %s as %s', (declared, latest, expected) => {
    expect(driftSeverity(declared, latest)).toBe(expected);
  });

  it('returns unknown when latest is missing or versions are unparseable', () => {
    expect(driftSeverity('^1.0.0', undefined)).toBe('unknown');
    expect(driftSeverity('${revision}', '1.0.0')).toBe('unknown');
  });

  it('isOutdated is true only for major/minor/patch', () => {
    expect(isOutdated('major')).toBe(true);
    expect(isOutdated('up-to-date')).toBe(false);
    expect(isOutdated('unknown')).toBe(false);
  });
});
