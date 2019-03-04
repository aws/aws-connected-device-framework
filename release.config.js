/**
 * Release configuration for the monorepo
 *
 * For more info;
 * - https://semantic-release.gitbook.io/semantic-release/
 * - https://github.com/Updater/semantic-release-monorepo
 * - https://github.com/semantic-release/semantic-release
 */
const releaseRules = require('./cicd/releaseRules');

module.exports = {
  branch: 'master',
  monorepo: {
    analyzeCommits: [
      {
        path: '@semantic-release/commit-analyzer',
        preset: 'angular',
        releaseRules
      }
      
    ],
    generateNotes: [
      '@semantic-release/release-notes-generator'
    ]
  },
  verifyConditions: [],
  /**
   * Move plugins from verifyConditions to verifyRelease to
   * reduce expensive network calls (50%+ runtime reduction).
   * https://github.com/Updater/semantic-release-monorepo#reduce-expensive-network-calls-50-runtime-reduction
   */
  verifyRelease: [
    '@semantic-release/changelog',
    '@semantic-release/git'
  ]
    .map(require)
    .map(x => x.verifyConditions),
  prepare: [
    '@semantic-release/changelog',
    {
      path: '@semantic-release/npm',
      npmPublish: false
    },
    {
      path: '@semantic-release/git',
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      assets: ['**/CHANGELOG.md', '**/package.json', '**/package-lock.json', 'shrinkwrap.yaml']
    }
  ]
};