// @a2ui/react is typed against zod 3 (the zod @a2ui/web_core depends on), but it also declares zod
// as a peer, so pnpm hands it this app's zod 4 and its catalog types stop matching @a2ui/web_core's
// (`ReactCatalogComponent` no longer satisfies `ComponentApi`). It does not import zod at runtime;
// drop the peer so its types resolve the zod 3 it depends on.
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === '@a2ui/react' && pkg.peerDependencies) delete pkg.peerDependencies.zod
      return pkg
    },
  },
}
