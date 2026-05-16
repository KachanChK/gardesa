import { Router } from 'express'
import { requireAuth } from '../middlewares/auth'

const router = Router()

router.use('/member', requireAuth)

router.get('/member', (_req, res) => {
    res.render('member', {
        currentUser: res.locals.currentUser
    })
})

export default router
