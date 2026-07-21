export const architecturePolicy = {
  '@replay/domain': {
    directory: 'packages/domain',
    allowedDependencies: [],
  },
  '@replay/application': {
    directory: 'packages/application',
    allowedDependencies: ['@replay/domain'],
  },
  '@replay/collector': {
    directory: 'packages/collector',
    allowedDependencies: ['@replay/domain', '@replay/application'],
  },
  '@replay/storage': {
    directory: 'packages/storage',
    allowedDependencies: ['@replay/domain', '@replay/application'],
  },
  '@replay/timeline': {
    directory: 'packages/timeline',
    allowedDependencies: ['@replay/domain', '@replay/application'],
  },
  '@replay/exporter': {
    directory: 'packages/exporter',
    allowedDependencies: ['@replay/domain', '@replay/application'],
  },
  '@replay/ai': {
    directory: 'packages/ai',
    allowedDependencies: ['@replay/domain', '@replay/application'],
  },
  '@replay/desktop': {
    directory: 'apps/desktop',
    allowedDependencies: [
      '@replay/domain',
      '@replay/application',
      '@replay/collector',
      '@replay/storage',
      '@replay/timeline',
      '@replay/exporter',
      '@replay/ai',
    ],
  },
};
