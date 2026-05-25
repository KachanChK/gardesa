document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('dashboard-sidebar')
    const layout = document.getElementById('dashboard-layout')
    const labels = document.querySelectorAll('[data-sidebar-label]')
    const navLinks = document.querySelectorAll('[data-nav-link]')
    const brand = document.getElementById('sidebar-brand')
    const brandText = document.getElementById('sidebar-brand-text')
    const brandIcon = document.getElementById('sidebar-brand-icon')

    if (!sidebar || !layout || !brand || !brandText || !brandIcon) {
        return
    }

    const userMenu = document.querySelector('[data-user-menu]')
    const userMenuToggle = document.getElementById('user-menu-toggle')
    const userMenuDropdown = document.getElementById('user-menu-dropdown')
    const userMenuArrow = document.querySelector('[data-user-menu-arrow]')

    let hoveringSidebar = false
    let focusingSidebar = false
    let userMenuOpen = false

    function applyCollapsedPresentation(value, options = {}) {
        const updateLayout = options.updateLayout !== false

        sidebar.classList.toggle('w-[84px]', value)
        sidebar.classList.toggle('w-[240px]', !value)

        if (updateLayout) {
            layout.classList.toggle('pl-[84px]', value)
            layout.classList.toggle('pl-[240px]', !value)
        }

        labels.forEach((label) => {
            label.classList.toggle('hidden', value)
        })

        brand.classList.toggle('justify-center', value)
        brand.classList.toggle('px-0', value)
        brand.classList.toggle('justify-start', !value)
        brand.classList.toggle('px-5', !value)
        brandText.classList.toggle('hidden', value)
        brandIcon.classList.toggle('hidden', !value)
        brandIcon.classList.toggle('block', value)

        navLinks.forEach((link) => {
            link.classList.toggle('justify-center', value)
            link.classList.toggle('px-0', value)
            link.classList.toggle('justify-start', !value)
            link.classList.toggle('px-3', !value)
        })
    }

    function syncSidebar() {
        applyCollapsedPresentation(!(hoveringSidebar || focusingSidebar), { updateLayout: false })
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

    sidebar.addEventListener('mouseenter', () => {
        hoveringSidebar = true
        syncSidebar()
    })

    sidebar.addEventListener('mouseleave', () => {
        hoveringSidebar = false
        syncSidebar()
    })

    sidebar.addEventListener('focusin', () => {
        focusingSidebar = true
        syncSidebar()
    })

    sidebar.addEventListener('focusout', (event) => {
        if (event.relatedTarget instanceof Node && sidebar.contains(event.relatedTarget)) {
            return
        }

        focusingSidebar = false
        syncSidebar()
    })

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

    applyCollapsedPresentation(true)
})
