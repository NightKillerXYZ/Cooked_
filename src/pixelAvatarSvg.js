let avatarInstance = 0

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]))
}

export function renderPixelAvatarSvg({ expression = 'neutral', motion = 'idle', hoodieColor = '#292b35', skinColor = '#ffd0ad', hairColor = '#2a2021', pantsColor = '#20222c', shoesColor = '#f2f4f7', size = '100%', className = '' } = {}) {
  const safeExpression = ['neutral', 'happy', 'sad', 'surprised', 'blink'].includes(expression) ? expression : 'neutral'
  const safeMotion = ['none', 'idle', 'walk'].includes(motion) ? motion : 'idle'
  const id = `pixel-avatar-${avatarInstance++}`
  const isBlinking = safeExpression === 'blink'
  const hoodie = escapeAttribute(hoodieColor)
  const skin = escapeAttribute(skinColor)
  const hair = escapeAttribute(hairColor)
  const pants = escapeAttribute(pantsColor)
  const shoes = escapeAttribute(shoesColor)
  const classes = `pixel-avatar pixel-avatar--${safeMotion} ${className}`.trim()
  const mouth = safeExpression === 'happy'
    ? '<path class="mouth" d="M56 92h16v4h-4v4h-8v-4h-4z" fill="#9c4c4c" />'
    : safeExpression === 'sad'
      ? '<path class="mouth" d="M56 100h4v-4h8v4h4v4H56z" fill="#9c4c4c" />'
      : safeExpression === 'surprised'
        ? '<rect class="mouth" x="60" y="92" width="8" height="8" fill="#9c4c4c" />'
        : '<rect class="mouth" x="60" y="96" width="8" height="4" fill="#c96b62" />'
  const eyeHighlights = isBlinking ? '' : '<rect x="52" y="72" width="4" height="4" fill="#ffffff" opacity=".9" /><rect x="76" y="72" width="4" height="4" fill="#ffffff" opacity=".9" />'
  const eyeHeight = isBlinking ? '2' : '12'

  const svg = `
    <svg viewBox="0 0 128 184" role="img" aria-label="Front-facing pixel avatar in a dark hoodie" class="${classes}" style="width:${escapeAttribute(size)};height:auto" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${id}-skin" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#ffd0ad" /><stop offset="1" stop-color="#f3a781" /></linearGradient>
        <linearGradient id="${id}-hoodie" x1="0" x2="0" y1="0" y2="1"><stop stop-color="${hoodie}" /><stop offset="1" stop-color="#1d1f29" /></linearGradient>
      </defs>
      <g class="avatar-shadow"><rect x="24" y="172" width="80" height="4" fill="#080a10" opacity=".58" /><rect x="32" y="168" width="64" height="8" fill="#080a10" opacity=".58" /></g>
      <g class="avatar-hair-back"><path fill="#090b11" d="M28 24h8v-8h12V8h16V4h12v8h16v8h12v8h8v12h8v28h-8v12h-8v8H32v-8h-8V68h-8V40h8V28h4z" /><path fill="#2a2021" d="M32 28h8v-8h12v-8h20v4h16v8h12v12h8v28h-8v12H28V64h-4V44h8z" /><path fill="#3d2b29" d="M40 24h16v-8h16v8h16v8h8v12H80V36H64v8H48v-8H36v12h-8V36h12z" /><path fill="#5a3931" d="M48 20h12v8H48zm28 0h12v8H76zm16 20h8v12h-8zm-56 8h8v12h-8zm12 24h12v8H48zm28 0h12v8H76z" /></g>
      <g class="avatar-head"><rect x="56" y="84" width="16" height="20" fill="url(#${id}-skin)" /><path fill="#090b11" d="M32 52h8v-8h48v8h8v8h8v28h-8v12h-8v8H40v-8h-8V88h-8V60h8z" /><path fill="url(#${id}-skin)" d="M40 56h8v-4h32v4h8v8h8v20h-8v12h-8v8H48v-8h-8V84h-8V64h8z" /><path fill="#ec9978" d="M40 80h8v12h8v8H48v-4h-8zm40 12h8V80h8v16h-8v4h-8z" /><g class="avatar-face avatar-face--${safeExpression}"><rect class="eye eye-left" x="48" y="72" width="8" height="${eyeHeight}" fill="#11121a" /><rect class="eye eye-right" x="72" y="72" width="8" height="${eyeHeight}" fill="#11121a" />${eyeHighlights}${mouth}</g></g>
      <g class="avatar-hair-front"><path fill="#171316" d="M28 48h8V36h12V24h16v8h16v-8h12v12h8v12h8v16H92v-8H80v16H68V56H56v12H44v-8H28z" /><path fill="#312526" d="M36 44h12V32h12v8h12V28h12v12h8v12H80V44H68v12H56V44H44v12H32V48h4z" /><path fill="#5a3931" d="M40 36h12v8H40zm20-12h12v8H60zm24 12h8v8h-8zm-28 8h12v8H56z" /></g>
      <g class="avatar-hoodie"><path fill="#080a10" d="M40 100h48v4h12v8h8v36h-8v8H84v-8H44v8H28v-8h-8v-36h8v-8h12z" /><path fill="url(#${id}-hoodie)" d="M40 104h48v8h12v32h-8v8H80v-12H48v12H36v-8h-8v-32h12z" /><path fill="#363946" d="M40 108h12v8H40zm36 0h12v8H76zm-40 20h8v16h-8zm48 0h8v16h-8z" /><path fill="#1a1c25" d="M48 104h32v8h8v12H40v-12h8z" /><rect x="52" y="116" width="4" height="20" fill="#e8eaf1" /><rect x="72" y="116" width="4" height="20" fill="#e8eaf1" /><rect x="48" y="140" width="32" height="4" fill="#161821" /><rect x="52" y="144" width="24" height="4" fill="#161821" /></g>
      <g class="avatar-hands" fill="url(#${id}-skin)"><rect x="24" y="144" width="12" height="12" /><rect x="92" y="144" width="12" height="12" /></g>
      <g class="avatar-legs"><path fill="#080a10" d="M40 148h48v8h4v20h-8v4H64v-4H44v-4h-8v-16h4z" /><path id="leg-left" fill="#20222c" d="M44 152h20v20H44z" /><path id="leg-right" fill="#272a34" d="M64 152h20v20H64z" /></g>
      <g class="avatar-shoes"><path id="shoe-left" fill="#080a10" d="M36 168h28v8h4v8H32v-8h4z" /><path fill="#f2f4f7" d="M40 172h20v4h4v4H36v-4h4z" /><rect x="40" y="172" width="12" height="4" fill="#b7bdc9" /><path id="shoe-right" fill="#080a10" d="M64 168h28v8h4v8H60v-8h4z" /><path fill="#f2f4f7" d="M68 172h20v4h4v4H64v-4h4z" /><rect x="68" y="172" width="12" height="4" fill="#b7bdc9" /></g>
    </svg>
  `
  return svg.replaceAll('#ffd0ad', skin).replaceAll('#f3a781', skin).replaceAll('#2a2021', hair).replaceAll('#20222c', pants).replaceAll('#f2f4f7', shoes)
}
