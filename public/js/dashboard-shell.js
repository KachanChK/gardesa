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

    const userMenu = document.querySelector('[data-user-menu]')
    const userMenuToggle = document.getElementById('user-menu-toggle')
    const userMenuDropdown = document.getElementById('user-menu-dropdown')
    const userMenuArrow = document.querySelector('[data-user-menu-arrow]')
    const initialCollapsed = layout.dataset.sidebarInitialCollapsed === 'true'
        || document.body.dataset.sidebarInitialCollapsed === 'true'

    let collapsed = false
    let hoverExpanded = false
    let userMenuOpen = false

    function isDesktop() {
        return window.matchMedia('(min-width: 768px)').matches
    }

    function setMobileMenu(open) {
        sidebar.classList.toggle('-left-[240px]', !open)
        sidebar.classList.toggle('left-0', open)
        overlay.classList.toggle('hidden', !open)
    }

    function applyCollapsedPresentation(value, options = {}) {
        const updateLayout = options.updateLayout !== false

        sidebar.classList.toggle('w-[84px]', value)
        sidebar.classList.toggle('w-[240px]', !value)

        if (updateLayout) {
            layout.classList.toggle('md:pl-[84px]', value)
            layout.classList.toggle('md:pl-[240px]', !value)
        }

        labels.forEach((label) => {
            label.classList.toggle('md:hidden', value)
        })

        brand.classList.toggle('md:justify-center', value)
        brand.classList.toggle('md:px-0', value)
        brand.classList.toggle('md:justify-start', !value)
        brand.classList.toggle('md:px-5', !value)
        brandText.classList.toggle('md:hidden', value)
        brandIcon.classList.toggle('hidden', !value)
        brandIcon.classList.toggle('md:block', value)
        brandIcon.classList.toggle('md:hidden', !value)

        navLinks.forEach((link) => {
            link.classList.toggle('md:justify-center', value)
            link.classList.toggle('md:px-0', value)
            link.classList.toggle('md:justify-start', !value)
            link.classList.toggle('md:px-3', !value)
        })
    }

    function setCollapsed(value) {
        collapsed = value
        hoverExpanded = false
        applyCollapsedPresentation(collapsed)
    }

    function setHoverExpanded(value) {
        if (!isDesktop() || !collapsed) {
            return
        }

        hoverExpanded = value
        applyCollapsedPresentation(!hoverExpanded, { updateLayout: false })
    }

    function setUserMenu(open) {
        if (!userMenuToggle || !userMenuDropdown) {
            return
        }

        userMenuOpen = open
        userMenuToggle.setAttribute('aria-expanded', String(userMenuOpen))
        userMenuDropdown.classList.toggle('hidden', !userMenuOpen)
        userMenuArrow?.classList.toggle('rotate-180', userMenuOpen)
    }

    toggle.addEventListener('click', () => {
        if (isDesktop()) {
            setCollapsed(!collapsed)
        } else {
            setMobileMenu(sidebar.classList.contains('-left-[240px]'))
        }
    })

    sidebar.addEventListener('mouseenter', () => setHoverExpanded(true))

    sidebar.addEventListener('mouseleave', () => {
        if (hoverExpanded) {
            setHoverExpanded(false)
        }
    })

    overlay.addEventListener('click', () => setMobileMenu(false))

    if (userMenu && userMenuToggle && userMenuDropdown) {
        userMenuToggle.addEventListener('click', () => {
            setUserMenu(!userMenuOpen)
        })

        document.addEventListener('click', (event) => {
            if (!userMenuOpen || userMenu.contains(event.target)) {
                return
            }

            setUserMenu(false)
        })

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                setUserMenu(false)
            }
        })
    }

    window.addEventListener('resize', () => {
        if (isDesktop()) {
            setMobileMenu(false)
            applyCollapsedPresentation(hoverExpanded ? false : collapsed)
        } else {
            setCollapsed(false)
        }
    })

    if (isDesktop()) {
        setCollapsed(initialCollapsed)
    } else {
        setCollapsed(false)
    }
})
