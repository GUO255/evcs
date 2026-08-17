function required(value: string | undefined, name: string): string {
  const normalized = value?.trim()
  if (!normalized) throw new Error(`Missing ${name}`)
  return normalized
}

function optional(value: string | undefined): string {
  return value?.trim() ?? ''
}

export const env = Object.freeze({
  maps: Object.freeze({
    tiandituToken: optional(import.meta.env.PUBLIC_TIANDITU_TOKEN),
    amapKey: required(import.meta.env.PUBLIC_AMAP_KEY, 'PUBLIC_AMAP_KEY'),
    amapSecurityJsCode: required(import.meta.env.PUBLIC_AMAP_SECURITY_JS_CODE, 'PUBLIC_AMAP_SECURITY_JS_CODE'),
  }),
})
