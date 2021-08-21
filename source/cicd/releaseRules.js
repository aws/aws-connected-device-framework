/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

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
