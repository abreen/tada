const { createApplyBasePath } = require('./util')

class GenerateManifestPlugin {
  constructor(siteVariables) {
    this.siteVariables = siteVariables || {}
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'GenerateManifestPlugin',
      compilation => {
        const wp = compilation.compiler.webpack || {}
        const { RawSource } =
          (wp.sources && wp.sources) || require('webpack-sources')

        compilation.hooks.processAssets.tapPromise(
          {
            name: 'GenerateManifestPlugin',
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
          },
          async () => {
            try {
              const manifest = createManifest(this.siteVariables)
              const output = JSON.stringify(manifest)
              compilation.emitAsset('manifest.json', new RawSource(output))
            } catch (err) {
              compilation.errors.push(
                new Error(`Error: ${err && err.message ? err.message : err}`),
              )
            }
          },
        )
      },
    )
  }
}

module.exports = GenerateManifestPlugin

function createManifest(siteVariables) {
  const applyBasePath = createApplyBasePath(siteVariables)

  return {
    name: siteVariables.courseTitle,
    short_name: siteVariables.courseCode,
    start_url: applyBasePath('/'),
    display: 'minimal-ui',
    theme_color: siteVariables.faviconColor,
    icons: [
      {
        src: 'favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: 'favicon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'favicon-256.png',
        sizes: '256x256',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'favicon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'favicon-128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'favicon-64.png',
        sizes: '64x64',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'favicon-48.png',
        sizes: '48x48',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'favicon-32.png',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'favicon-16.png',
        sizes: '16x16',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
