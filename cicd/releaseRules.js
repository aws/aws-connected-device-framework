/**
 * `releaseRules` rules for use by semantic-release and cicd pipeline
 *
 * @type {Array}
 */
module.exports = [
    {breaking: true, release: 'major'},
    {type: 'feat', release: 'minor'},
    
    {type: 'fix', release: 'patch'},
    {type: 'docs', release: 'patch'},
    {type: 'style', release: 'patch'},
    {type: 'perf', release: 'patch'},
    {type: 'refactor', release: 'patch'},
    {type: 'test', release: 'patch'},
    {type: 'build', release: 'patch'},
    {type: 'chore', release: 'patch'},
    {revert: true, release: 'patch'},
  ];