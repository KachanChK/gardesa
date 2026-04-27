document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('dashboard-sidebar')
    const layout = document.getElementById('dashboard-layout')
    const overlay = document.getElementById('sidebar-overlay')
    const toggle = document.getElementById('sidebar-toggle')
    const labels = document.querySelectorAll('[data-sidebar-label]')
    const navLinks = document.querySelectorAll('[data-nav-link]')
    const brand = document.getElementById('sidebar-brand')
    const brandText = document.getElementById('sidebar-brand-text')
    const brandIcon = document.getElementById('sidebar-brand-icon')

    if (!sidebar || !layout || !overlay || !toggle || !brand || !brandText || !brandIcon) {
        return
    }

    let collapsed = false

    function isDesktop() {
        return window.matchMedia('(min-width: 768px)').matches
    }

    function setMobileMenu(open) {
        sidebar.classList.toggle('-left-[260px]', !open)
        sidebar.classList.toggle('left-0', open)
        overlay.classList.toggle('hidden', !open)
    }

    function setCollapsed(value) {
        collapsed = value
        sidebar.classList.toggle('w-[84px]', collapsed)
        sidebar.classList.toggle('w-[260px]', !collapsed)
        layout.classList.toggle('md:pl-[84px]', collapsed)
        layout.classList.toggle('md:pl-[260px]', !collapsed)

        labels.forEach((label) => {
            label.classList.toggle('md:hidden', collapsed)
        })

        brand.classList.toggle('md:justify-center', collapsed)
        brand.classList.toggle('md:px-0', collapsed)
        brand.classList.toggle('md:justify-start', !collapsed)
        brand.classList.toggle('md:px-5', !collapsed)
        brandText.classList.toggle('md:hidden', collapsed)
        brandIcon.classList.toggle('hidden', !collapsed)
        brandIcon.classList.toggle('md:hidden', !collapsed)

        navLinks.forEach((link) => {
            link.classList.toggle('md:justify-center', collapsed)
            link.classList.toggle('md:px-0', collapsed)
            link.classList.toggle('md:justify-start', !collapsed)
            link.classList.toggle('md:px-3', !collapsed)
        })
    }

    toggle.addEventListener('click', () => {
        if (isDesktop()) {
            setCollapsed(!collapsed)
        } else {
            setMobileMenu(sidebar.classList.contains('-left-[260px]'))
        }
    })

    overlay.addEventListener('click', () => setMobileMenu(false))

    window.addEventListener('resize', () => {
        if (isDesktop()) {
            setMobileMenu(false)
        } else {
            setCollapsed(false)
        }
    })

    if (isDesktop()) {
        setCollapsed(false)
    }
})
