import type { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  async index({ auth, view }: HttpContext) {
    const user = await auth.getUser()
    return view.render('pages/home', { user })
  }
}
