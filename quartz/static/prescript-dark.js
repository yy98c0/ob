;(function () {
  try {
    const stored = localStorage.getItem("theme")
    if (!stored || stored === "dark") {
      document.documentElement.setAttribute("saved-theme", "dark")
    }
  } catch (_) {
    document.documentElement.setAttribute("saved-theme", "dark")
  }
})()
