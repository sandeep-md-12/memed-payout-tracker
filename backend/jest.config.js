/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testTimeout: 60000,
  // Integration suites each start their own in-memory replica set; run files one at a time
  // so they don't compete for ports and CPU on small machines.
  maxWorkers: 1,
};
