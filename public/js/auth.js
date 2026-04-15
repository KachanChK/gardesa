document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('[data-toggle-password]')

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const inputId = button.getAttribute('data-target-input')

      if (!inputId) {
        return
      }

      const input = document.getElementById(inputId)
      const visibleIcon = button.querySelector('[data-icon-visible]')
      const hiddenIcon = button.querySelector('[data-icon-hidden]')
      const label = button.querySelector('[data-password-toggle-label]')

      if (!input) {
        return
      }

      const isPassword = input.getAttribute('type') === 'password'

      input.setAttribute('type', isPassword ? 'text' : 'password')
      visibleIcon?.classList.toggle('hidden', !isPassword)
      hiddenIcon?.classList.toggle('hidden', isPassword)

      if (label) {
        label.textContent = isPassword ? 'Ocultar senha' : 'Mostrar senha'
      }
    })
  })
})
