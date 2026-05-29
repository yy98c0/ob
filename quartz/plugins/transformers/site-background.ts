import type { QuartzTransformerPlugin } from "../types"

export const SiteBackground: QuartzTransformerPlugin = () => ({
  name: "SiteBackground",
  externalResources() {
    return {
      js: [
        {
          src: "/static/prescript-dark.js",
          loadTime: "beforeDOMReady",
          contentType: "external",
        },
        {
          src: "/static/grid-background.js",
          loadTime: "afterDOMReady",
          contentType: "external",
        },
      ],
    }
  },
})
