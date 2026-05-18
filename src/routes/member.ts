import { Router } from 'express'
import { requireAuth } from '../middlewares/auth'

const router = Router()

router.use('/member', requireAuth)

router.get('/member', (_req, res) => {
    res.render('member', {
        currentUser: res.locals.currentUser
    })
})

router.get('/member/render', (_req, res) => {
    res.render('render-ai', {
        currentUser: res.locals.currentUser
    })
})

export default router
