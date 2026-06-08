import { MavenParser } from './maven';
import { NpmParser } from './npm';
import { NugetParser } from './nuget';
import { PythonParser } from './python';
import { isUnused } from './types';

describe('NpmParser', () => {
  const parser = new NpmParser();

  it('parses dependencies with normalised scopes', () => {
    const deps = parser.parseManifest('package.json', JSON.stringify({
      dependencies: { lodash: '^4.17.0', '@scope/pkg': '1.0.0' },
      devDependencies: { jest: '29.0.0' },
      peerDependencies: { react: '^18.0.0' },
    }));
    expect(deps).toEqual(expect.arrayContaining([
      { name: 'lodash', version: '^4.17.0', scope: 'prod' },
      { name: '@scope/pkg', version: '1.0.0', scope: 'prod' },
      { name: 'jest', version: '29.0.0', scope: 'dev' },
      { name: 'react', version: '^18.0.0', scope: 'peer' },
    ]));
  });

  it('extracts package roots from imports and requires, skipping relatives and builtins', () => {
    const refs = parser.extractImports({
      path: 'src/a.ts',
      content: [
        `import { x } from 'lodash/fp';`,
        `const fs = require('node:fs');`,
        `import Comp from '@scope/pkg/sub';`,
        `import './local';`,
        `await import('react');`,
      ].join('\n'),
    });
    const modules = refs.map(r => r.module);
    expect(modules).toEqual(['lodash', '@scope/pkg', 'react']);
  });

  it('matches used deps with occurrences and flags unused ones', () => {
    const imports = parser.extractImports({ path: 'src/a.ts', content: `import x from 'lodash';` });
    const used = parser.matchDependency({ name: 'lodash', version: '^4', scope: 'prod' }, imports);
    expect(used.used).toBe(true);
    expect(used.occurrences).toEqual([{ path: 'src/a.ts', line: 1 }]);

    const unused = parser.matchDependency({ name: 'left-pad', version: '1', scope: 'prod' }, imports);
    expect(unused.used).toBe(false);
    expect(isUnused(unused)).toBe(true); // npm absence is high-confidence
  });
});

describe('PythonParser', () => {
  const parser = new PythonParser();

  it('parses requirements.txt names and versions, marking dev files', () => {
    expect(parser.parseManifest('requirements.txt', 'Flask==2.0.1\n# comment\nrequests>=2.0\n-r base.txt'))
      .toEqual([
        { name: 'flask', version: '==2.0.1', scope: 'prod' },
        { name: 'requests', version: '>=2.0', scope: 'prod' },
      ]);
    expect(parser.parseManifest('requirements-dev.txt', 'pytest==7')[0].scope).toBe('dev');
  });

  it('parses PEP 621 and poetry pyproject tables', () => {
    const deps = parser.parseManifest('pyproject.toml', [
      '[project]',
      'dependencies = ["flask>=2", "requests"]',
      '[tool.poetry.dependencies]',
      'python = "^3.11"',
      'httpx = "^0.27"',
    ].join('\n'));
    const names = deps.map(d => d.name);
    expect(names).toEqual(expect.arrayContaining(['flask', 'requests', 'httpx']));
    expect(names).not.toContain('python');
  });

  it('maps distribution names to import names (PyYAML -> yaml)', () => {
    const imports = parser.extractImports({ path: 'app.py', content: 'import yaml\nfrom os import path' });
    const result = parser.matchDependency({ name: 'PyYAML', version: '6', scope: 'prod' }, imports);
    expect(result.used).toBe(true);
    expect(result.occurrences[0]).toEqual({ path: 'app.py', line: 1 });
  });
});

describe('MavenParser', () => {
  const parser = new MavenParser();
  const pom = `
    <project>
      <properties><guava.version>32.0</guava.version></properties>
      <dependencies>
        <dependency><groupId>com.google.guava</groupId><artifactId>guava</artifactId><version>\${guava.version}</version></dependency>
        <dependency><groupId>junit</groupId><artifactId>junit</artifactId><version>4.13</version><scope>test</scope></dependency>
      </dependencies>
    </project>`;

  it('parses dependencies, resolves property versions and maps test scope', () => {
    const deps = parser.parseManifest('pom.xml', pom);
    expect(deps).toEqual([
      { name: 'com.google.guava:guava', version: '32.0', scope: 'prod' },
      { name: 'junit:junit', version: '4.13', scope: 'dev' },
    ]);
  });

  it('matches imports by group id but never flags maven deps as unused', () => {
    const imports = parser.extractImports({ path: 'A.java', content: 'import com.google.guava.Hashing;' });
    const used = parser.matchDependency({ name: 'com.google.guava:guava', version: '32', scope: 'prod' }, imports);
    expect(used.used).toBe(true);

    const absent = parser.matchDependency({ name: 'junit:junit', version: '4', scope: 'dev' }, imports);
    expect(isUnused(absent)).toBe(false); // low confidence: not flagged
  });
});

describe('NugetParser', () => {
  const parser = new NugetParser();

  it('parses PackageReference entries from a csproj', () => {
    const deps = parser.parseManifest('App.csproj', `
      <Project>
        <ItemGroup>
          <PackageReference Include="Newtonsoft.Json" Version="13.0.1" />
          <PackageReference Include="Serilog"><Version>3.1.0</Version></PackageReference>
        </ItemGroup>
      </Project>`);
    expect(deps).toEqual([
      { name: 'Newtonsoft.Json', version: '13.0.1', scope: 'prod' },
      { name: 'Serilog', version: '3.1.0', scope: 'prod' },
    ]);
  });

  it('matches using-directives by namespace', () => {
    const imports = parser.extractImports({ path: 'A.cs', content: 'using Newtonsoft.Json;\nglobal using Serilog;' });
    expect(parser.matchDependency({ name: 'Newtonsoft.Json', version: '13', scope: 'prod' }, imports).used).toBe(true);
    expect(parser.matchDependency({ name: 'Serilog', version: '3', scope: 'prod' }, imports).used).toBe(true);
  });
});
