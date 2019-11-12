'use strict';

exports.expectError = async resolver => {
  try {
    await resolver();
  } catch (e) {
    return;
  }
  throw new Error('missing expected error');
};
