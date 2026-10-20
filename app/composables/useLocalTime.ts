/**
 * [TBD] The company's time zone (IANA name, e.g. 'America/New_York') once its city is supplied.
 * Until then the clock shows the visitor's own local time.
 */
export const OPENING_TIME_ZONE: string | undefined = undefined

/** Live local time as "h:mm" plus the zone abbreviation ("3:07 EDT"); updates on the minute. */
export function useLocalTime() {
  const time = ref('')
  const zone = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null

  function tick() {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: OPENING_TIME_ZONE,
      timeZoneName: 'short',
    }).formatToParts(now)
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
    time.value = `${get('hour')}:${get('minute')}`
    zone.value = get('timeZoneName')
    // Next tick right after the minute changes.
    timer = setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50)
  }

  onMounted(tick)
  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })
  return { time, zone }
}
