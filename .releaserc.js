/**
 * Release configuration for the monorepo
 *
 * For more info;
 * - https://github.com/Updater/semantic-release-monorepo
 * - https://github.com/semantic-release/semantic-release
 */

module.exports = {
  branch: 'master',
  monorepo: {
    analyzeCommits: [
      '@semantic-release/commit-analyzer'
    ],
    generateNotes: [
      '@semantic-release/release-notes-generator'
    ]
  },
  /**
   * Move plugins from verifyConditions to verifyRelease to
   * reduce expensive network calls (50%+ runtime reduction).
   * https://github.com/Updater/semantic-release-monorepo#reduce-expensive-network-calls-50-runtime-reduction
   */
  verifyConditions: [],
  verifyRelease: [
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/git'
  ]
    .map(require)
    .map(x => x.verifyConditions),
  prepare: [
    {
      path: '@semantic-release/changelog',
      changelogTitle: '# CHANGELOG'
    },
    '@semantic-release/npm',
    {
      'path': '@semantic-release/git',
      'message': 'chore(release): ${nextRelease.gitTag} [skip ci]\n\n${nextRelease.notes}'
    }
  ],
  // publish: [
  //   // {
  //   //   path: '@semantic-release/exec',
  //   //   cmd: 'echo "Execute publish/deploy commands and scripts"'
  //   // },
  //   '@semantic-release/npm',
  //   '@semantic-release/github'
  // ],
  // success: [
  //   '@semantic-release/github'
  // ],
  // fail: [
  //   '@semantic-release/github'
  // ],
  npmPublish: false
};