/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const Types = require('../../types');

const validateTypeChange = (prev, next) => (from, to) => {
  return prev.name === from && to.includes(next.name);
};

exports.isColumnModificationAllowed = (prev, next) => {
  const validate = validateTypeChange(prev, next);

  // ARRAY type
  if (prev.dimensions !== next.dimensions) {
    return false;
  }

  switch (true) {
    // numeric types
    case validate(Types.numeric, [Types.numeric]) &&
      prev.arguments[0] <= next.arguments[0]: {
      return true;
    }

    case validate(Types.smallint, [
      Types.integer,
      Types.bigint,
      Types.real,
      Types.doublePrecision,
    ]): {
      return true;
    }

    case validate(Types.integer, [
      Types.bigint,
      Types.real,
      Types.doublePrecision,
    ]): {
      return true;
    }

    case validate(Types.real, [Types.doublePrecision]): {
      return true;
    }

    case validate(Types.bigint, [Types.real, Types.doublePrecision]): {
      return true;
    }

    // character types
    case validate(Types.characterVarying, [
      Types.characterVarying,
      Types.character,
    ]) && prev.arguments[0] <= next.arguments[0]: {
      return true;
    }

    case validate(Types.characterVarying, [Types.text]): {
      return true;
    }

    case validate(Types.character, [Types.characterVarying, Types.character]) &&
      prev.arguments[0] <= next.arguments[0]: {
      return true;
    }

    case validate(Types.character, [Types.text]): {
      return true;
    }

    // date/time types
    case validate(Types.time, [Types.time, Types.timeTZ]): {
      return true;
    }

    case validate(Types.timeTZ, [Types.timeTZ, Types.time]): {
      return true;
    }

    case validate(Types.timeStamp, [Types.timeStamp, Types.timeStampTZ]): {
      return true;
    }

    case validate(Types.timeStampTZ, [Types.timeStampTZ, Types.timeStamp]): {
      return true;
    }

    default:
      return false;
  }
};
