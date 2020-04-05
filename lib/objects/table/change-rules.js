/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const { DataTypes } = require('../../constants/types');

const validateTypeChange = (prev, next) => (from, to) => {
  return prev.components[0] === from && to.includes(next.components[0]);
};

exports.isColumnModificationAllowed = (prev, next) => {
  const validate = validateTypeChange(prev, next);

  // ARRAY type
  if (prev.dimensions !== next.dimensions) {
    return false;
  }

  switch (true) {
    // numeric types
    case validate(DataTypes.numeric, [DataTypes.numeric]) &&
      prev.components[1] <= next.components[1]: {
      return true;
    }

    case validate(DataTypes.smallint, [
      DataTypes.integer,
      DataTypes.bigint,
      DataTypes.real,
      DataTypes.doublePrecision,
    ]): {
      return true;
    }

    case validate(DataTypes.integer, [
      DataTypes.bigint,
      DataTypes.real,
      DataTypes.doublePrecision,
    ]): {
      return true;
    }

    case validate(DataTypes.real, [DataTypes.doublePrecision]): {
      return true;
    }

    case validate(DataTypes.bigint, [
      DataTypes.real,
      DataTypes.doublePrecision,
    ]): {
      return true;
    }

    // character types
    case validate(DataTypes.characterVarying, [
      DataTypes.characterVarying,
      DataTypes.character,
    ]) && prev.components[1] <= next.components[1]: {
      return true;
    }

    case validate(DataTypes.characterVarying, [DataTypes.text]): {
      return true;
    }

    case validate(DataTypes.character, [
      DataTypes.characterVarying,
      DataTypes.character,
    ]) && prev.components[1] <= next.components[1]: {
      return true;
    }

    case validate(DataTypes.character, [DataTypes.text]): {
      return true;
    }

    // date/time types
    case validate(DataTypes.time, [DataTypes.time, DataTypes.timeTZ]): {
      return true;
    }

    case validate(DataTypes.timeTZ, [DataTypes.timeTZ, DataTypes.time]): {
      return true;
    }

    case validate(DataTypes.timeStamp, [
      DataTypes.timeStamp,
      DataTypes.timeStampTZ,
    ]): {
      return true;
    }

    case validate(DataTypes.timeStampTZ, [
      DataTypes.timeStampTZ,
      DataTypes.timeStamp,
    ]): {
      return true;
    }

    default:
      return false;
  }
};
