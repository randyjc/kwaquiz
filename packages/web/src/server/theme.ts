import Config from "@rahoot/socket/services/config"

export type ThemeSettings = {
  brandName: string
  backgroundUrl: string | null
}

export const getTheme = (): ThemeSettings => {
  const theme = Config.theme()
  return {
    brandName: theme.brandName || "Rahoot",
    backgroundUrl:
      typeof theme.backgroundUrl === "string" && theme.backgroundUrl.length > 0
        ? theme.backgroundUrl
        : null,
  }
}

export const saveTheme = (payload: Partial<ThemeSettings>): ThemeSettings => {
  const current = getTheme()
  const merged = {
    brandName: payload.brandName ?? current.brandName,
    backgroundUrl:
      payload.backgroundUrl === undefined
        ? current.backgroundUrl
        : payload.backgroundUrl,
  }
  return Config.saveTheme(merged)
}
