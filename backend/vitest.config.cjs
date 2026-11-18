module.exports = {
  test: {
    include: ['src/tests/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 120000,
    fileParallelism: false,
    pool: 'forks'
  }
};
