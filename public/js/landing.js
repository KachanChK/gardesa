document.addEventListener('DOMContentLoaded', () => {
  const faqButtons = Array.from(document.querySelectorAll('.faq-toggle'))

  faqButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item')

      if (!item) {
        return
      }

      const answer = item.querySelector('.faq-answer')
      const icon = item.querySelector('.faq-icon')
      const isOpen = answer ? !answer.classList.contains('hidden') : false

      document.querySelectorAll('.faq-item').forEach((element) => {
        const currentAnswer = element.querySelector('.faq-answer')
        const currentIcon = element.querySelector('.faq-icon')

        currentAnswer?.classList.add('hidden')

        if (currentIcon) {
          currentIcon.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
        }
      })

      if (!isOpen && answer) {
        answer.classList.remove('hidden')

        if (icon) {
          icon.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
        }
      }
    })
  })
})
