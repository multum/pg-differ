/**
 * Copyright (c) 2018-present Andrew Vereshchak
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const { DataTypes } = require('../../constants');

const validateTypeChange = (prev, next) => (
  expectPrev,
  expectNext = [expectPrev]
) => {
  const prevType = prev.name;
  const nextType = next.components[0];
  return prevType === expectPrev && expectNext.includes(nextType);
};

exports.isColumnModificationAllowed = (prev, next) => {
  const validate = validateTypeChange(prev, next);
  switch (true) {
    // numeric types
    case validate(DataTypes.numeric) && prev.precision <= next.components[1]: {
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
    ]) && prev.length <= next.components[1]: {
      return true;
    }

    case validate(DataTypes.characterVarying, [DataTypes.text]): {
      return true;
    }

    case validate(DataTypes.character, [
      DataTypes.characterVarying,
      DataTypes.character,
    ]) && prev.length <= next.components[1]: {
      return true;
    }

    case validate(DataTypes.character, [DataTypes.text]): {
      return true;
    }

    // date/time types
    case validate(DataTypes.time, [DataTypes.time, DataTypes.timeZ]): {
      return true;
    }

    case validate(DataTypes.timeZ, [DataTypes.timeZ, DataTypes.time]): {
      return true;
    }

    case validate(DataTypes.timeStamp, [
      DataTypes.timeStamp,
      DataTypes.timeStampZ,
    ]): {
      return true;
    }

    case validate(DataTypes.timeStampZ, [
      DataTypes.timeStampZ,
      DataTypes.timeStamp,
    ]): {
      return true;
    }

    default:
      return false;
  }
};
