require.config({
  baseUrl: 'scripts',
  paths: {
    'react': 'lib/react',
    'bacon': 'lib/bacon',
    'mori': 'lib/mori',
    'lens': 'lib/lens'
  }
});

require(['main']);