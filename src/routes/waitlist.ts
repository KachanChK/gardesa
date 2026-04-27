import { Router } from 'express'
import { isEmail, normalizeEmail } from 'validator'
import { supabase } from '../config/supabase'
import { resend } from '../config/resend'
import { waitlistRateLimit } from '../middlewares/rateLimit'

const router = Router()

async function getWaitlistCount(): Promise<number | null> {
    const { count } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
    return count
}

router.post('/waitlist', waitlistRateLimit, async (req, res) => {
    const rawEmail: string = req.body?.email ?? ''

    const email = normalizeEmail(rawEmail.trim()) as string | false

    if (!email || !isEmail(email) || email.length > 254) {
        const count = await getWaitlistCount()
        return res.render('landing', {
            waitlistErro: 'Por favor, informe um e-mail válido.',
            waitlistSucesso: false,
            waitlistCount: count
        })
    }

    const { error: dbError } = await supabase.from('waitlist').insert({ email })

    if (dbError) {
        const count = await getWaitlistCount()

        if (dbError.code === '23505') {
            return res.render('landing', {
                waitlistErro: 'Este e-mail já está na lista de espera!',
                waitlistSucesso: false,
                waitlistCount: count
            })
        }

        console.error('[Waitlist] Erro ao inserir no banco:', dbError.message)
        return res.render('landing', {
            waitlistErro: 'Algo deu errado. Tente novamente em instantes.',
            waitlistSucesso: false,
            waitlistCount: count
        })
    }

    try {
        if (process.env.RESEND_AUDIENCE_ID) {
            await resend.contacts.create({
                email,
                audienceId: process.env.RESEND_AUDIENCE_ID,
                unsubscribed: false
            })
        }
    } catch (err) {
        console.warn('[Waitlist] Erro ao adicionar contato:', err)
    }

    try {
        await resend.emails.send({
            from: 'Gardesa <waitlist@gardesa.com.br>',
            to: [email],
            subject: 'Você está na lista de espera da Gardesa!',
            html: buildConfirmationEmail(email)
        })
    } catch (err) {
        console.error('[Waitlist] Erro ao enviar email:', err)
    }

    const count = await getWaitlistCount()
    return res.render('landing', {
        waitlistSucesso: true,
        waitlistErro: undefined,
        waitlistCount: count
    })
})

function buildConfirmationEmail(email: string): string {
    return /* html */`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Você está na lista de espera da Gardesa!</title>
</head>
<body style="margin:0;padding:0;background:#f3f3f3;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;padding:40px 24px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;border:1px solid #e5e5e5;padding:40px;">
          
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:20px;">
                <span style="font-size:24px;font-family:'Josefin Sans',sans-serif;font-weight:600;color:#368326;">
                    gardesa
                </span>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding-bottom:20px;">
              <hr style="border:none;border-top:1px solid #f0f0f0;margin:0;" />
            </td>
          </tr>

          <!-- Título -->
          <tr>
            <td style="padding-bottom:16px;">
              <h2 style="font-size:22px;color:#141414;margin:0;">
                Você está na lista de espera!
              </h2>
            </td>
          </tr>

          <!-- Parágrafo 1 -->
          <tr>
            <td style="padding-bottom:16px;">
              <p style="font-size:15px;color:#555;line-height:1.6;margin:0;">
                Obrigado por se inscrever. Você será um dos primeiros a ter acesso quando lançarmos.
              </p>
            </td>
          </tr>

          <!-- Parágrafo 2 -->
          <tr>
            <td style="padding-bottom:24px;">
              <p style="font-size:15px;color:#555;line-height:1.6;margin:0;">
                A Gardesa é uma plataforma feita para paisagistas brasileiros - menos planilhas,
                menos trabalho repetitivo, mais tempo criando projetos incríveis.
              </p>
            </td>
          </tr>

          <!-- Banner -->
          <tr>
            <td style="padding-bottom:24px;">
              <img src="https://i.imgur.com/wMx0tFY.png" alt="Banner Gardesa" style="width:100%; max-width:600px; display:block; border:0;" />
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td>
              <p style="font-size:13px;color:#999;margin:0;">
                Você receberá um e-mail assim que a plataforma estiver disponível.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

export default router