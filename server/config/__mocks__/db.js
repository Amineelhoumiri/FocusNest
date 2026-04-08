"use strict";

/** Jest manual mock — prevents real TCP connections during tests (see config/db.connect ping). */
const mockPool = {
  query: jest.fn(),
  connect: jest.fn((callback) => {
    if (typeof callback === "function") {
      process.nextTick(() => callback(null, { release: jest.fn() }, jest.fn()));
    }
    return Promise.resolve({ release: jest.fn() });
  }),
};

module.exports = mockPool;
