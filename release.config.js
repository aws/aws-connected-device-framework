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
        // Determine the type of release by analyzing commits with conventional-changelog.
        path: '@semantic-release/commit-analyzer',
        preset: 'angular',
        releaseRules
      }
      
    ],
    generateNotes: [
      // Generate release notes for the commits added since the last release with conventional-changelog.
      '@semantic-release/release-notes-generator'
    ]
  },
  /**
   * Move plugins from verifyConditions to verifyRelease to reduce expensive network calls (50%+ runtime reduction).
   * https://github.com/Updater/semantic-release-monorepo#reduce-expensive-network-calls-50-runtime-reduction
   */
  verifyConditions: ['@semantic-release/git'],
  verifyRelease: [
    // Verify the changelogFile and changelogTitle options configuration
    '@semantic-release/changelog'
    // Verify the access to the remote Git repository, the commit message and the assets option configuration.
    //'@semantic-release/git'
  ]
    .map(require)
    .map(x => x.verifyConditions),
  prepare: [
    // Create or update a changelog file in the local project directory with the changelog content created in the generate notes step.
    '@semantic-release/changelog',
    {
      // Updates the package.json version
      path: '@semantic-release/npm',
      npmPublish: false
    },
    {
      // Create a release commit, including configurable file assets.
      path: '@semantic-release/git',
      assets: ['**/CHANGELOG.md', '**/package.json', '**/package-lock.json', 'pnpm-lock.yaml']
    }
  ],
  /**
   * By default, semantic-release pushes to github on publish/uccess/fail.  override this
   * behavior by setting to false
   */
  publish: false,
  fail: false,
  success: false
};