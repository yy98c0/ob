/**
 * 简化版 3b1b 透视网格背景（Canvas 2D，无 GSAP 依赖）
 */
;(function () {
  if (typeof window === "undefined") return

  const canvas = document.createElement("canvas")
  canvas.id = "site-background"
  document.body.prepend(canvas)
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  let w = 0
  let h = 0
  let t = 0

  function resize() {
    w = canvas.width = window.innerWidth
    h = canvas.height = window.innerHeight
  }

  window.addEventListener("resize", resize)
  resize()

  function project(x, y, z, rot) {
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    const xr = x * cos - y * sin
    const yr = x * sin + y * cos
    const scale = 280 / (280 + z)
    return { x: w / 2 + xr * scale, y: h / 2 + yr * scale }
  }

  function draw() {
    t += 0.003
    ctx.clearRect(0, 0, w, h)
    const rot = t * 0.15
    const lines = 14
    const span = 1.2

    ctx.lineWidth = 1
    for (let i = 0; i <= lines; i++) {
      const u = -span + (2 * span * i) / lines
      ctx.strokeStyle = i % 4 === 0 ? "oklch(55% 0.15 240)" : "oklch(60% 0 240)"
      for (let j = 0; j <= lines; j++) {
        const v = -span + (2 * span * j) / lines
        const a = project(u, v, -0.5, rot)
        const b = project(u + span / lines, v, -0.5, rot)
        const c = project(u, v + span / lines, -0.5, rot)
        if (j < lines) {
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        if (i < lines) {
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(c.x, c.y)
          ctx.stroke()
        }
      }
    }
    requestAnimationFrame(draw)
  }

  draw()
})()
