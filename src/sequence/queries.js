/**
 * Copyright (c) 2018-present Andrey Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

exports.increment = fullName => `nextval('${fullName}'::regclass)`;

exports.restart = (fullName, value) =>
  `alter sequence ${fullName} restart with ${value};`;

exports.getCurrentValue = fullName =>
  `select last_value as "currentValue" from ${fullName}`;

exports.hasCorrectCurrValue = (fullName, min, max) => `
select exists ( 
  select last_value from ${fullName}
    where last_value between ${min} and ${max}
) as correct
`;
